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
import { authenticate, requireStaff } from "./middleware/auth.js";
import { csrfGuard } from "./middleware/csrf.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
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
    origin: (origin, callback) => {
      // Same-origin requests and non-browser clients may omit the Origin header.
      if (!origin || env.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
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

app.use("/api/auth", csrfGuard, authRouter);
app.use("/api/admin", csrfGuard, authenticate, adminRouter);
app.use("/api/dashboard", csrfGuard, authenticate, requireStaff, dashboardRouter);
app.use("/api/students", csrfGuard, authenticate, requireStaff, studentsRouter);
app.use("/api/teachers", csrfGuard, authenticate, requireStaff, teachersRouter);
app.use("/api/classes", csrfGuard, authenticate, requireStaff, classesRouter);
app.use("/api/subjects", csrfGuard, authenticate, requireStaff, subjectsRouter);
app.use("/api/attendance", csrfGuard, authenticate, requireStaff, attendanceRouter);
app.use("/api/exams", csrfGuard, authenticate, requireStaff, examsRouter);
app.use("/api/reports", csrfGuard, authenticate, requireStaff, reportsRouter);

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
