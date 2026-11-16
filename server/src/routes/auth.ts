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
import { ApiError, asyncHandler } from "../lib/http.js";
import { changePasswordSchema, loginSchema } from "../schemas.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProduction ? 20 : 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please wait 15 minutes and try again." },
});

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  teacher: { select: { id: true } },
} as const;

authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email }, select: { ...publicUser, passwordHash: true, active: true } });
    if (!user || !user.active) {
      throw new ApiError(401, "Incorrect email or password.");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Incorrect email or password.");

    const token = signToken({ sub: user.id, role: user.role });
    setAuthCookie(res, token);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teacherId: user.teacher?.id ?? null,
      },
    });
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

authRouter.patch(
  "/password",
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new ApiError(404, "Account not found.");

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(400, "Your current password is incorrect.");

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    res.json({ message: "Password updated successfully." });
  }),
);
