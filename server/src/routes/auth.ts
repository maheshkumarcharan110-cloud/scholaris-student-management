import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../db.js";
import { env } from "../env.js";
import {
  clearAuthCookie,
  hashPassword,
  setAuthCookie,
  signToken,
  verifyPassword,
} from "../lib/auth.js";
import { recordAudit, recordLogin } from "../lib/audit.js";
import { ApiError, asyncHandler } from "../lib/http.js";
import {
  emailChangeEmail,
  passwordResetEmail,
  sendMail,
  verificationEmail,
} from "../lib/mailer.js";
import { generateToken, hashToken, TOKEN_TTL, tokenExpiry } from "../lib/tokens.js";
import {
  changePasswordSchema,
  emailChangeSchema,
  forgotPasswordSchema,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../schemas.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProduction ? 20 : 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please wait 15 minutes and try again." },
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProduction ? 10 : 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please wait 15 minutes and try again." },
});

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  requestedRole: true,
  pendingEmail: true,
  lastLoginAt: true,
  teacher: { select: { id: true } },
} as const;

type PublicUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  requestedRole: string | null;
  pendingEmail: string | null;
  lastLoginAt: Date | null;
  teacher: { id: string } | null;
};

export function presentUser(user: PublicUserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    emailVerifiedAt: user.emailVerifiedAt,
    requestedRole: user.requestedRole,
    pendingEmail: user.pendingEmail,
    lastLoginAt: user.lastLoginAt,
    teacherId: user.teacher?.id ?? null,
  };
}

const STATUS_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  PENDING: {
    status: 403,
    code: "PENDING",
    message:
      "Your registration is awaiting administrator approval. You will be able to sign in once your account has been approved.",
  },
  REJECTED: {
    status: 403,
    code: "REJECTED",
    message:
      "Your registration was not approved. Please contact the administrator if you believe this is a mistake.",
  },
  SUSPENDED: {
    status: 403,
    code: "SUSPENDED",
    message: "This account has been suspended. Please contact the administrator to restore access.",
  },
};

function accountBlock(user: { status: string; active: boolean }) {
  if (user.status !== "APPROVED" || !user.active) {
    return (
      STATUS_ERRORS[user.status] ?? {
        status: 403,
        code: user.status,
        message: "This account is not available. Please contact the administrator.",
      }
    );
  }

  if (env.REQUIRE_EMAIL_VERIFICATION) {
    return {
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
      message:
        "Please verify your email address before signing in. Check your inbox for the verification link.",
    };
  }

  return null;
}

function devLink(path: string, token: string) {
  return env.exposeDevEmailLinks ? `${env.appUrl}${path}?token=${encodeURIComponent(token)}` : undefined;
}

async function issueEmailVerification(user: { id: string; name: string; email: string }) {
  const token = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: tokenExpiry(TOKEN_TTL.emailVerification),
    },
  });
  const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail({ to: user.email, ...verificationEmail(user.name, link) });
  return devLink("/verify-email", token);
}

/* --------------------------------- Login --------------------------------- */

authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...publicUserSelect, passwordHash: true, active: true, tokenVersion: true, failedLoginAttempts: true, lockedUntil: true },
    });

    // Always run a bcrypt comparison so response timing does not reveal whether
    // the email is registered.
    const comparisonHash =
      user?.passwordHash ?? "$2b$12$a/zKWkpTtPKBET1U3mkY7ecsJZteToihfwLdggAQ1ikYwUltZVOeS";
    const valid = await verifyPassword(password, comparisonHash);

    if (!user || !valid) {
      if (user) {
        const attempts = user.failedLoginAttempts + 1;
        const locked = attempts >= env.LOGIN_MAX_ATTEMPTS;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: locked ? 0 : attempts,
            lockedUntil: locked ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60 * 1000) : user.lockedUntil,
          },
        });
      }
      await recordLogin({ userId: user?.id, email, success: false, reason: "INVALID_CREDENTIALS", req });
      throw new ApiError(401, "Incorrect email or password.", undefined, "INVALID_CREDENTIALS");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await recordLogin({ userId: user.id, email, success: false, reason: "LOCKED", req });
      throw new ApiError(
        429,
        `Too many failed sign-in attempts. Please try again in ${env.LOGIN_LOCK_MINUTES} minutes.`,
        undefined,
        "LOCKED",
      );
    }

    const blocked = accountBlock(user);
    if (blocked) {
      await recordLogin({ userId: user.id, email, success: false, reason: blocked.code, req });
      throw new ApiError(blocked.status, blocked.message, undefined, blocked.code);
    }

    const refreshed = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
      select: publicUserSelect,
    });

    await recordLogin({ userId: user.id, email, success: true, req });

    const token = signToken({ sub: user.id, role: user.role as never, ver: user.tokenVersion });
    setAuthCookie(res, token);

    res.json({ user: presentUser(refreshed) });
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Signed out." });
});

/* ------------------------------ Registration ------------------------------ */

authRouter.post(
  "/register",
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, phone, password, requestedRole } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ApiError(409, "An account with this email already exists.", undefined, "EMAIL_TAKEN");
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash: await hashPassword(password),
        role: requestedRole,
        requestedRole,
        status: "PENDING",
        active: false,
      },
      select: { id: true, name: true, email: true },
    });

    await recordAudit({
      actorId: null,
      targetUserId: user.id,
      action: "ACCOUNT_REGISTERED",
      detail: `Requested role: ${requestedRole}`,
      req,
    });

    const verificationUrl = env.smtpConfigured || !env.isProduction
      ? await issueEmailVerification(user)
      : undefined;

    res.status(201).json({
      message:
        "Your account has been created successfully. Your registration is awaiting approval from the administrator. You will be able to access Scholaris once your account has been approved.",
      status: "PENDING",
      ...(verificationUrl ? { verificationUrl } : {}),
    });
  }),
);

authRouter.post(
  "/verify-email",
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const { token } = verifyEmailSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationTokenHash: hashToken(token),
        emailVerificationExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(
        400,
        "This verification link is invalid or has expired. Request a new link to continue.",
        undefined,
        "INVALID_TOKEN",
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    await recordAudit({ targetUserId: user.id, action: "EMAIL_VERIFIED", req });

    res.json({ message: "Your email address has been verified. You can now sign in once your account is approved." });
  }),
);

authRouter.post(
  "/resend-verification",
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const { email } = resendVerificationSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, emailVerifiedAt: true } });

    let verificationUrl: string | undefined;
    if (user && !user.emailVerifiedAt) {
      verificationUrl = await issueEmailVerification(user);
      await recordAudit({ targetUserId: user.id, action: "VERIFICATION_EMAIL_RESENT", req });
    }

    res.json({
      message: "If an account with that email is awaiting verification, a new verification link has been sent.",
      ...(verificationUrl ? { verificationUrl } : {}),
    });
  }),
);

/* ----------------------------- Password reset ----------------------------- */

authRouter.post(
  "/forgot-password",
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, status: true } });

    let resetUrl: string | undefined;
    if (user && user.status !== "REJECTED") {
      const token = generateToken();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: hashToken(token),
          passwordResetExpiresAt: tokenExpiry(TOKEN_TTL.passwordReset),
        },
      });
      const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
      await sendMail({ to: user.email, ...passwordResetEmail(user.name, link) });
      resetUrl = devLink("/reset-password", token);
      await recordAudit({ targetUserId: user.id, action: "PASSWORD_RESET_REQUESTED", req });
    }

    res.json({
      message: "If an account exists for that email, a password reset link has been sent.",
      ...(resetUrl ? { resetUrl } : {}),
    });
  }),
);

authRouter.post(
  "/reset-password",
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: hashToken(token),
        passwordResetExpiresAt: { gt: new Date() },
      },
      select: { id: true, tokenVersion: true },
    });

    if (!user) {
      throw new ApiError(400, "This password reset link is invalid or has expired.", undefined, "INVALID_TOKEN");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        passwordChangedAt: new Date(),
        tokenVersion: user.tokenVersion + 1,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await recordAudit({ targetUserId: user.id, action: "PASSWORD_RESET_COMPLETED", req });
    clearAuthCookie(res);

    res.json({ message: "Your password has been reset. Please sign in with your new password." });
  }),
);

/* ------------------------------- Own account ------------------------------ */

authRouter.patch(
  "/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, phone } = profileUpdateSchema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, phone },
      select: publicUserSelect,
    });
    await recordAudit({ actorId: req.user!.id, targetUserId: req.user!.id, action: "PROFILE_UPDATED", req });
    res.json({ message: "Profile updated.", user: presentUser(updated) });
  }),
);

authRouter.post(
  "/email-change",
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const { newEmail, currentPassword } = emailChangeSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
    if (!user) throw new ApiError(404, "Account not found.");
    if (newEmail === user.email) {
      throw new ApiError(400, "That is already your sign-in email address.");
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(400, "Your current password is incorrect.");

    const taken = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (taken) throw new ApiError(409, "An account with this email already exists.", undefined, "EMAIL_TAKEN");

    const token = generateToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingEmail: newEmail,
        emailChangeTokenHash: hashToken(token),
        emailChangeExpiresAt: tokenExpiry(TOKEN_TTL.emailChange),
      },
    });

    const link = `${env.appUrl}/verify-email-change?token=${encodeURIComponent(token)}`;
    await sendMail({ to: newEmail, ...emailChangeEmail(user.name, link, newEmail) });
    await recordAudit({
      actorId: user.id,
      targetUserId: user.id,
      action: "EMAIL_CHANGE_REQUESTED",
      detail: `Requested new email: ${newEmail}`,
      req,
    });

    res.json({
      message: `A confirmation link has been sent to ${newEmail}. Your sign-in email will change once it is verified.`,
      ...(devLink("/verify-email-change", token) ? { verificationUrl: devLink("/verify-email-change", token) } : {}),
    });
  }),
);

authRouter.post(
  "/verify-email-change",
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const { token } = verifyEmailSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: {
        emailChangeTokenHash: hashToken(token),
        emailChangeExpiresAt: { gt: new Date() },
        pendingEmail: { not: null },
      },
      select: { id: true, pendingEmail: true, tokenVersion: true },
    });

    if (!user || !user.pendingEmail) {
      throw new ApiError(400, "This email change link is invalid or has expired.", undefined, "INVALID_TOKEN");
    }

    const taken = await prisma.user.findUnique({ where: { email: user.pendingEmail }, select: { id: true } });
    if (taken && taken.id !== user.id) {
      throw new ApiError(409, "That email address is no longer available.", undefined, "EMAIL_TAKEN");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        emailChangeTokenHash: null,
        emailChangeExpiresAt: null,
        emailVerifiedAt: new Date(),
        tokenVersion: user.tokenVersion + 1,
      },
      select: publicUserSelect,
    });

    await recordAudit({ actorId: user.id, targetUserId: user.id, action: "EMAIL_CHANGED", req });
    clearAuthCookie(res);

    res.json({
      message: "Your email address has been updated. Please sign in with your new email.",
      user: presentUser(updated),
    });
  }),
);

authRouter.patch(
  "/password",
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new ApiError(404, "Account not found.");

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(400, "Your current password is incorrect.");

    if (await verifyPassword(newPassword, user.passwordHash)) {
      throw new ApiError(400, "Your new password must be different from your current password.");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        passwordChangedAt: new Date(),
        tokenVersion: user.tokenVersion + 1,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: { tokenVersion: true, role: true },
    });

    // Keep this session usable while invalidating every other issued token.
    setAuthCookie(res, signToken({ sub: user.id, role: updated.role as never, ver: updated.tokenVersion }));
    await recordAudit({ actorId: user.id, targetUserId: user.id, action: "PASSWORD_CHANGED", req });

    res.json({ message: "Password updated successfully. Other sessions have been signed out." });
  }),
);

authRouter.post(
  "/logout-all",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { tokenVersion: true } });
    if (!user) throw new ApiError(404, "Account not found.");
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { tokenVersion: user.tokenVersion + 1 },
    });
    clearAuthCookie(res);
    await recordAudit({ actorId: req.user!.id, targetUserId: req.user!.id, action: "SESSIONS_REVOKED", req });
    res.json({ message: "All sessions have been signed out." });
  }),
);

authRouter.get(
  "/activity",
  authenticate,
  asyncHandler(async (req, res) => {
    const [logins, audits] = await Promise.all([
      prisma.loginEvent.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: { id: true, success: true, reason: true, ip: true, userAgent: true, createdAt: true },
      }),
      prisma.auditLog.findMany({
        where: { OR: [{ actorId: req.user!.id }, { targetUserId: req.user!.id }] },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: { id: true, action: true, detail: true, ip: true, createdAt: true },
      }),
    ]);

    res.json({ logins, audits });
  }),
);
