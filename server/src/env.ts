import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
// Works from both src/ (tsx) and dist/ (compiled)
dotenv.config({ path: path.resolve(currentDir, "../.env") });

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().min(1).default("0.0.0.0"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().default("8h"),
    COOKIE_SECURE: z
      .string()
      .optional()
      .transform((value) => value === "true"),
    ALLOW_LOCALHOST_ORIGIN: z
      .string()
      .optional()
      .transform((value) => value === "true"),
  })
  .superRefine((data, ctx) => {
    const origins = data.CLIENT_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!origins.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLIENT_ORIGIN"],
        message: "At least one CLIENT_ORIGIN is required",
      });
      return;
    }

    if (data.NODE_ENV !== "production") return;

    for (const origin of origins) {
      let url: URL;
      try {
        url = new URL(origin);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLIENT_ORIGIN"],
          message: `Not a valid origin: ${origin}`,
        });
        continue;
      }

      const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (isLocal && !data.ALLOW_LOCALHOST_ORIGIN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLIENT_ORIGIN"],
          message:
            "Production CLIENT_ORIGIN must use the public HTTPS URL, not localhost. Set ALLOW_LOCALHOST_ORIGIN=true only for local production smoke tests.",
        });
      }
      if (!isLocal && url.protocol !== "https:") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLIENT_ORIGIN"],
          message: `Production origins must use HTTPS: ${origin}`,
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
  allowedOrigins: parsed.data.CLIENT_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
