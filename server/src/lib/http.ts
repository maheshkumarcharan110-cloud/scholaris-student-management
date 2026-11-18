import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ message: err.message, code: err.code, details: err.details });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      message: "Please check the highlighted fields and try again.",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta?.target as string[]).join(", ")
        : "unique field";
      res.status(409).json({ message: `A record with this ${target} already exists.` });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ message: "The requested record could not be found." });
      return;
    }
    if (err.code === "P2003") {
      res.status(409).json({
        message: "This record is linked to other data and cannot be changed or removed.",
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ message: "The data sent was invalid." });
    return;
  }

  console.error("[server error]", err);
  const isProduction = process.env.NODE_ENV === "production";
  res.status(500).json({
    message: isProduction
      ? "Something went wrong on our side. Please try again."
      : err instanceof Error
        ? err.message
        : "Unexpected server error",
  });
}
