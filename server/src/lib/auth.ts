import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Response } from "express";
import { env } from "../env.js";
import type { AppRole } from "./roles.js";

export const AUTH_COOKIE = "scholaris_token";
const SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export type TokenPayload = {
  sub: string;
  role: AppRole;
  ver: number;
};

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "string" || !decoded.sub || !decoded.role) return null;
    return {
      sub: String(decoded.sub),
      role: decoded.role as TokenPayload["role"],
      ver: typeof decoded.ver === "number" ? decoded.ver : 0,
    };
  } catch {
    return null;
  }
}

function sessionMaxAge() {
  const match = /^(\d+)\s*([smhd])$/.exec(env.JWT_EXPIRES_IN);
  if (!match) return 8 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const seconds = unit === "s" ? value : unit === "m" ? value * 60 : unit === "h" ? value * 3600 : value * 86400;
  return seconds * 1000;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.COOKIE_SECURE || env.isProduction,
  path: "/",
  maxAge: sessionMaxAge(),
};

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, cookieOptions);
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
}

export function generateSecret() {
  return crypto.randomBytes(48).toString("hex");
}
