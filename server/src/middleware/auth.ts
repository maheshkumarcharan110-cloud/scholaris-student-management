import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { AUTH_COOKIE, verifyToken } from "../lib/auth.js";
import { ApiError, asyncHandler } from "../lib/http.js";
import { isAdminRole, type AppRole } from "../lib/roles.js";

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const token = req.cookies?.[AUTH_COOKIE] ?? bearer;

    if (!token) throw new ApiError(401, "Please sign in to continue.");

    const payload = verifyToken(token);
    if (!payload) throw new ApiError(401, "Your session has expired. Please sign in again.");

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        teacher: { select: { id: true } },
      },
    });

    if (!user || !user.active) {
      throw new ApiError(401, "This account is not available. Contact an administrator.");
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teacherId: user.teacher?.id ?? null,
    };
    next();
  },
);

export function requireRole(...roles: AppRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(401, "Please sign in to continue."));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, "You do not have permission to perform this action."));
      return;
    }
    next();
  };
}

/** Guards administrator-only routes for both SUPER_ADMIN and legacy ADMIN accounts. */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    next(new ApiError(401, "Please sign in to continue."));
    return;
  }
  if (!isAdminRole(req.user.role)) {
    next(new ApiError(403, "You do not have permission to perform this action."));
    return;
  }
  next();
};
