import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";
import { errorHandler, notFoundHandler } from "./lib/http.js";
import { authenticate } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { teachersRouter } from "./routes/teachers.js";
import { classesRouter, subjectsRouter } from "./routes/classes.js";
import { studentsRouter } from "./routes/students.js";
import { attendanceRouter } from "./routes/attendance.js";
import { examsRouter } from "./routes/exams.js";
import { reportsRouter } from "./routes/reports.js";
import { dashboardRouter } from "./routes/dashboard.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (!env.isTest) {
  app.use(morgan(env.isProduction ? "combined" : "dev"));
}

if (!env.isTest) {
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1200,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { message: "Too many requests. Please slow down and try again shortly." },
    }),
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "scholaris-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", authenticate, dashboardRouter);
app.use("/api/students", authenticate, studentsRouter);
app.use("/api/teachers", authenticate, teachersRouter);
app.use("/api/classes", authenticate, classesRouter);
app.use("/api/subjects", authenticate, subjectsRouter);
app.use("/api/attendance", authenticate, attendanceRouter);
app.use("/api/exams", authenticate, examsRouter);
app.use("/api/reports", authenticate, reportsRouter);

app.use("/api", notFoundHandler);

// Serve the compiled single-page app in production.
if (env.isProduction) {
  const clientDist = path.resolve(currentDir, "../../client/dist");
  app.use(express.static(clientDist, { maxAge: "1h", index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
