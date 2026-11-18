import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";
import { ApiError } from "../lib/http.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Cookies are SameSite=Lax and CORS is allow-listed, so cross-site form POSTs
 * cannot carry the session. This adds a second layer: any state-changing
 * request that declares an Origin or Referer must come from an allowed origin.
 * Requests without those headers (server-to-server, API clients, curl) are
 * still authenticated by the httpOnly session cookie or bearer token.
 */
export function csrfGuard(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin;
  if (origin && !env.allowedOrigins.includes(origin)) {
    return next(new ApiError(403, "This request was blocked for security reasons."));
  }

  const referer = req.headers.referer;
  if (!origin && referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!env.allowedOrigins.includes(refererOrigin)) {
        return next(new ApiError(403, "This request was blocked for security reasons."));
      }
    } catch {
      return next(new ApiError(403, "This request was blocked for security reasons."));
    }
  }

  return next();
}
