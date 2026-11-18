import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { AUTH_COOKIE, verifyToken } from "../lib/auth.js";
import { ApiError, asyncHandler } from "../lib/http.js";
import { isAdminRole, isStaffRole, type AppRole } from "../lib/roles.js";

const STATUS_MESSAGES: Record<string, string> = {
  PENDING:
    "Your registration is still awaiting administrator approval. You will be able to sign in once your account is approved.",
  REJECTED:
    "Your registration was not approved. Please contact the administrator if you believe this is a mistake.",
  SUSPENDED:
    "This account is suspended. Please contact the administrator to restore access.",
};

/**
 * Validates the session cookie (or bearer token), re-checks the account on every
 * request, and rejects accounts whose status or token version has changed since
 * the token was issued. The role stored in the token is never trusted.
 */
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
        phone: true,
        role: true,
        status: true,
        active: true,
        emailVerifiedAt: true,
        requestedRole: true,
        pendingEmail: true,
        lastLoginAt: true,
        tokenVersion: true,
        teacher: { select: { id: true } },
      },
    });

    if (!user) {
      throw new ApiError(401, "Your session is no longer valid. Please sign in again.", undefined, "SESSION_INVALID");
    }

    if (user.tokenVersion !== payload.ver) {
      throw new ApiError(
        401,
        "Your session has expired because your account security changed. Please sign in again.",
        undefined,
        "SESSION_INVALID",
      );
    }

    if (user.status !== "APPROVED" || !user.active) {
      throw new ApiError(403, STATUS_MESSAGES[user.status] ?? "This account is not available.", undefined, user.status);
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      emailVerified: Boolean(user.emailVerifiedAt),
      requestedRole: user.requestedRole,
      pendingEmail: user.pendingEmail,
      lastLoginAt: user.lastLoginAt,
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

/** Only the SUPER_ADMIN may manage administrative accounts or critical settings. */
export const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    next(new ApiError(401, "Please sign in to continue."));
    return;
  }
  if (req.user.role !== "SUPER_ADMIN") {
    next(new ApiError(403, "Only the Super Administrator can perform this action."));
    return;
  }
  next();
};

/**
 * Guards the school-management workspace. Students are intentionally limited to
 * their own profile and security settings, which live under /api/auth.
 */
export const requireStaff = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    next(new ApiError(401, "Please sign in to continue."));
    return;
  }
  if (!isStaffRole(req.user.role)) {
    next(new ApiError(403, "Your account does not have access to this area."));
    return;
  }
  next();
};
