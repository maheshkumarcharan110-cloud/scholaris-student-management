import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { recordAudit } from "../lib/audit.js";
import { approvalEmail, sendMail } from "../lib/mailer.js";
import { ApiError, asyncHandler } from "../lib/http.js";
import {
  canAssignRole,
  canManageRole,
  isSuperAdminRole,
  roleLabel,
  type AppRole,
} from "../lib/roles.js";
import {
  adminActivityQuerySchema,
  adminApproveSchema,
  adminRejectSchema,
  adminRoleSchema,
  adminSuspendSchema,
  adminUserQuerySchema,
} from "../schemas.js";
import { requireAdmin } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  requestedRole: true,
  status: true,
  active: true,
  emailVerifiedAt: true,
  pendingEmail: true,
  lastLoginAt: true,
  approvedAt: true,
  approvedById: true,
  rejectedAt: true,
  rejectionReason: true,
  suspendedAt: true,
  suspensionReason: true,
  createdAt: true,
  updatedAt: true,
  teacher: { select: { id: true, employeeNo: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
} as const;

function presentUser(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  requestedRole: string | null;
  status: string;
  active: boolean;
  emailVerifiedAt: Date | null;
  pendingEmail: string | null;
  lastLoginAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  teacher: { id: string; employeeNo: string } | null;
  approvedBy: { id: string; name: string; email: string } | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    requestedRole: user.requestedRole,
    status: user.status,
    active: user.active,
    emailVerified: Boolean(user.emailVerifiedAt),
    emailVerifiedAt: user.emailVerifiedAt,
    pendingEmail: user.pendingEmail,
    lastLoginAt: user.lastLoginAt,
    approvedAt: user.approvedAt,
    approvedBy: user.approvedBy,
    rejectedAt: user.rejectedAt,
    rejectionReason: user.rejectionReason,
    suspendedAt: user.suspendedAt,
    suspensionReason: user.suspensionReason,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    teacher: user.teacher,
  };
}

async function assertManageable(actorId: string, actorRole: AppRole, targetId: string) {
  if (actorId === targetId) {
    throw new ApiError(400, "Use your profile or security settings to manage your own account.");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  if (!target) throw new ApiError(404, "Account not found.");

  if (!canManageRole(actorRole, target.role as AppRole)) {
    throw new ApiError(403, "Only the Super Administrator can manage administrator accounts.");
  }

  return target;
}

async function ensureNotLastSuperAdmin(targetId: string, nextRole?: AppRole, nextStatus?: string) {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { role: true, status: true },
  });
  if (!target || target.role !== "SUPER_ADMIN") return;

  const losesSuperAdmin =
    (nextRole && nextRole !== "SUPER_ADMIN") ||
    (nextStatus && nextStatus !== "APPROVED") ||
    false;

  if (!losesSuperAdmin) return;

  const remaining = await prisma.user.count({
    where: { role: "SUPER_ADMIN", status: "APPROVED", id: { not: targetId } },
  });
  if (remaining === 0) {
    throw new ApiError(400, "The last approved Super Administrator cannot be demoted, rejected, or suspended.");
  }
}

/* -------------------------------- Overview -------------------------------- */

adminRouter.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [statusCounts, roleCounts, recent, recentLogins, totalUsers] = await Promise.all([
      prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, name: true, email: true, role: true, status: true, requestedRole: true, createdAt: true },
      }),
      prisma.loginEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          email: true,
          success: true,
          reason: true,
          ip: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count(),
    ]);

    const status = Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all]));
    const roles = Object.fromEntries(roleCounts.map((row) => [row.role, row._count._all]));

    res.json({
      totalUsers,
      pending: status.PENDING ?? 0,
      approved: status.APPROVED ?? 0,
      rejected: status.REJECTED ?? 0,
      suspended: status.SUSPENDED ?? 0,
      roles: {
        SUPER_ADMIN: roles.SUPER_ADMIN ?? 0,
        ADMIN: roles.ADMIN ?? 0,
        TEACHER: roles.TEACHER ?? 0,
        STUDENT: roles.STUDENT ?? 0,
      },
      recentRegistrations: recent,
      recentLogins,
    });
  }),
);

/* --------------------------------- Users ---------------------------------- */

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const query = adminUserQuerySchema.parse(req.query);

    const where: Prisma.UserWhereInput = {
      ...(query.status !== "ALL" ? { status: query.status } : {}),
      ...(query.role !== "ALL" ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { email: { contains: query.search } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    res.json({
      data: users.map(presentUser),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    });
  }),
);

adminRouter.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
      select: userSelect,
    });
    if (!user) throw new ApiError(404, "Account not found.");

    const [logins, audits] = await Promise.all([
      prisma.loginEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: { id: true, success: true, reason: true, ip: true, userAgent: true, createdAt: true },
      }),
      prisma.auditLog.findMany({
        where: { OR: [{ targetUserId: user.id }, { actorId: user.id }] },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          action: true,
          detail: true,
          ip: true,
          createdAt: true,
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    res.json({ user: presentUser(user), logins, audits });
  }),
);

adminRouter.post(
  "/users/:id/approve",
  asyncHandler(async (req, res) => {
    const actor = req.user!;
    const { role, note } = adminApproveSchema.parse(req.body ?? {});
    const target = await assertManageable(actor.id, actor.role, String(req.params.id));

    if (target.status === "APPROVED") throw new ApiError(400, "This account is already approved.");

    const nextRole = (role ?? target.role) as AppRole;
    if (!canAssignRole(actor.role, nextRole)) {
      throw new ApiError(403, "Only the Super Administrator can grant administrator roles.");
    }
    if (nextRole === "SUPER_ADMIN" && !isSuperAdminRole(actor.role)) {
      throw new ApiError(403, "Only the Super Administrator can grant that role.");
    }

    const user = await prisma.user.update({
      where: { id: target.id },
      data: {
        role: nextRole,
        status: "APPROVED",
        active: true,
        approvedAt: new Date(),
        approvedById: actor.id,
        rejectedAt: null,
        rejectionReason: null,
        suspendedAt: null,
        suspensionReason: null,
        tokenVersion: { increment: 1 },
      },
      select: userSelect,
    });

    await recordAudit({
      actorId: actor.id,
      targetUserId: target.id,
      action: "ACCOUNT_APPROVED",
      detail: `Role: ${roleLabel(nextRole)}${note ? ` — ${note}` : ""}`,
      req,
    });

    await sendMail({
      to: user.email,
      ...approvalEmail(user.name, roleLabel(nextRole)),
    }).catch((error) => console.error("[mail] approval notification failed", error));

    res.json({ message: `${user.name} has been approved as ${roleLabel(nextRole)}.`, user: presentUser(user) });
  }),
);

adminRouter.post(
  "/users/:id/reject",
  asyncHandler(async (req, res) => {
    const actor = req.user!;
    const { reason } = adminRejectSchema.parse(req.body ?? {});
    const target = await assertManageable(actor.id, actor.role, String(req.params.id));
    await ensureNotLastSuperAdmin(target.id, undefined, "REJECTED");

    const user = await prisma.user.update({
      where: { id: target.id },
      data: {
        status: "REJECTED",
        active: false,
        rejectedAt: new Date(),
        rejectionReason: reason,
        tokenVersion: { increment: 1 },
      },
      select: userSelect,
    });

    await recordAudit({
      actorId: actor.id,
      targetUserId: target.id,
      action: "ACCOUNT_REJECTED",
      detail: reason,
      req,
    });

    res.json({ message: `${user.name}'s registration has been rejected.`, user: presentUser(user) });
  }),
);

adminRouter.post(
  "/users/:id/suspend",
  asyncHandler(async (req, res) => {
    const actor = req.user!;
    const { reason } = adminSuspendSchema.parse(req.body ?? {});
    const target = await assertManageable(actor.id, actor.role, String(req.params.id));
    await ensureNotLastSuperAdmin(target.id, undefined, "SUSPENDED");

    const user = await prisma.user.update({
      where: { id: target.id },
      data: {
        status: "SUSPENDED",
        active: false,
        suspendedAt: new Date(),
        suspensionReason: reason,
        tokenVersion: { increment: 1 },
      },
      select: userSelect,
    });

    await recordAudit({
      actorId: actor.id,
      targetUserId: target.id,
      action: "ACCOUNT_SUSPENDED",
      detail: reason,
      req,
    });

    res.json({ message: `${user.name}'s account has been suspended.`, user: presentUser(user) });
  }),
);

adminRouter.post(
  "/users/:id/reactivate",
  asyncHandler(async (req, res) => {
    const actor = req.user!;
    const target = await assertManageable(actor.id, actor.role, String(req.params.id));

    if (target.status === "APPROVED") throw new ApiError(400, "This account is already active.");

    const user = await prisma.user.update({
      where: { id: target.id },
      data: {
        status: "APPROVED",
        active: true,
        approvedAt: new Date(),
        approvedById: actor.id,
        rejectedAt: null,
        rejectionReason: null,
        suspendedAt: null,
        suspensionReason: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        tokenVersion: { increment: 1 },
      },
      select: userSelect,
    });

    await recordAudit({
      actorId: actor.id,
      targetUserId: target.id,
      action: "ACCOUNT_REACTIVATED",
      req,
    });

    res.json({ message: `${user.name}'s account has been reactivated.`, user: presentUser(user) });
  }),
);

adminRouter.patch(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    const actor = req.user!;
    const { role } = adminRoleSchema.parse(req.body);
    const target = await assertManageable(actor.id, actor.role, String(req.params.id));

    if (!canAssignRole(actor.role, role)) {
      throw new ApiError(403, "Only the Super Administrator can grant administrator roles.");
    }
    if (target.role === role) throw new ApiError(400, "This account already has that role.");

    await ensureNotLastSuperAdmin(target.id, role);

    const user = await prisma.user.update({
      where: { id: target.id },
      data: { role, tokenVersion: { increment: 1 } },
      select: userSelect,
    });

    await recordAudit({
      actorId: actor.id,
      targetUserId: target.id,
      action: "ROLE_CHANGED",
      detail: `${roleLabel(target.role)} → ${roleLabel(role)}`,
      req,
    });

    res.json({ message: `${user.name} is now ${roleLabel(role)}.`, user: presentUser(user) });
  }),
);

/* -------------------------------- Activity -------------------------------- */

adminRouter.get(
  "/activity",
  asyncHandler(async (req, res) => {
    const query = adminActivityQuerySchema.parse(req.query);
    const where: Prisma.AuditLogWhereInput = query.action ? { action: query.action } : {};

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          action: true,
          detail: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          actor: { select: { id: true, name: true, email: true } },
          targetUser: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const actions = await prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    });

    res.json({
      data: logs,
      actions: actions.map((row) => row.action),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    });
  }),
);

adminRouter.get(
  "/login-events",
  asyncHandler(async (req, res) => {
    const query = adminActivityQuerySchema.parse(req.query);
    const [total, events] = await Promise.all([
      prisma.loginEvent.count(),
      prisma.loginEvent.findMany({
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          email: true,
          success: true,
          reason: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    res.json({
      data: events,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    });
  }),
);

/* --------------------------------- Roles ---------------------------------- */

adminRouter.get("/roles", (_req, res) => {
  res.json({
    roles: [
      {
        key: "SUPER_ADMIN",
        name: "Super Administrator",
        description: "Full control over accounts, roles, approvals, and security settings.",
        permissions: ["Manage all users and roles", "Approve and suspend accounts", "View all activity and login history", "Manage administrator privileges"],
      },
      {
        key: "ADMIN",
        name: "Administrator",
        description: "Day-to-day school administration and management of teacher/student accounts.",
        permissions: ["Manage students, teachers, classes, exams", "Approve teacher and student registrations", "Suspend teacher and student accounts", "View activity logs"],
      },
      {
        key: "TEACHER",
        name: "Teacher",
        description: "Teaching staff with access to the academic workspace.",
        permissions: ["View students and classes", "Record attendance", "Enter examination marks", "View reports"],
      },
      {
        key: "STUDENT",
        name: "Student",
        description: "Learners with access limited to their own account.",
        permissions: ["Maintain own profile and contact details", "Manage own password and sessions"],
      },
    ],
  });
});
