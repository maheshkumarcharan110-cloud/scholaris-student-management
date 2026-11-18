export const APP_ROLES = ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Public registration may only request non-administrative roles. */
export const REGISTRATION_ROLES: readonly AppRole[] = ["TEACHER", "STUDENT"];

/** Roles that may use the school management workspace. */
export const STAFF_ROLES: readonly AppRole[] = ["SUPER_ADMIN", "ADMIN", "TEACHER"];

/** Both SUPER_ADMIN and the legacy ADMIN role have administrative access. */
export const ADMIN_ROLES: readonly AppRole[] = ["SUPER_ADMIN", "ADMIN"];

export const ACCOUNT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "TEACHER";
}

export function roleLabel(role: string | null | undefined): string {
  if (role === "SUPER_ADMIN") return "Super Administrator";
  if (role === "ADMIN") return "Administrator";
  if (role === "TEACHER") return "Teacher";
  if (role === "STUDENT") return "Student";
  return role ?? "Member";
}

export function statusLabel(status: string | null | undefined): string {
  if (status === "PENDING") return "Pending approval";
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  if (status === "SUSPENDED") return "Suspended";
  return status ?? "Unknown";
}

/**
 * An ADMIN may manage non-administrative accounts only. Only a SUPER_ADMIN may
 * create, promote, suspend, or demote another administrator.
 */
export function canManageRole(actorRole: AppRole, targetRole: AppRole): boolean {
  if (actorRole === "SUPER_ADMIN") return true;
  if (actorRole !== "ADMIN") return false;
  return targetRole === "TEACHER" || targetRole === "STUDENT";
}

export function canAssignRole(actorRole: AppRole, nextRole: AppRole): boolean {
  if (actorRole === "SUPER_ADMIN") return true;
  if (actorRole !== "ADMIN") return false;
  return nextRole === "TEACHER" || nextRole === "STUDENT";
}
