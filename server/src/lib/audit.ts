import type { Request } from "express";
import { prisma } from "../db.js";

export function requestMeta(req: Request) {
  return {
    ip: req.ip?.slice(0, 64) ?? null,
    userAgent: req.headers["user-agent"]?.slice(0, 300) ?? null,
  };
}

export async function recordAudit(input: {
  actorId?: string | null;
  targetUserId?: string | null;
  action: string;
  detail?: string | null;
  req?: Request;
}) {
  const meta = input.req ? requestMeta(input.req) : { ip: null, userAgent: null };
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        targetUserId: input.targetUserId ?? null,
        action: input.action,
        detail: input.detail?.slice(0, 1000) ?? null,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  } catch (error) {
    // Auditing must never break the user-facing operation.
    console.error("[audit] failed to record event", error);
  }
}

export async function recordLogin(input: {
  userId?: string | null;
  email: string;
  success: boolean;
  reason?: string | null;
  req?: Request;
}) {
  const meta = input.req ? requestMeta(input.req) : { ip: null, userAgent: null };
  try {
    await prisma.loginEvent.create({
      data: {
        userId: input.userId ?? null,
        email: input.email.slice(0, 200),
        success: input.success,
        reason: input.reason ?? null,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  } catch (error) {
    console.error("[login-event] failed to record event", error);
  }
}
