export const APP_ROLES = ["SUPER_ADMIN", "ADMIN", "TEACHER"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Both SUPER_ADMIN and the legacy ADMIN role have full administrative access. */
export const ADMIN_ROLES: readonly AppRole[] = ["SUPER_ADMIN", "ADMIN"];

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function roleLabel(role: string | null | undefined): string {
  if (role === "SUPER_ADMIN") return "Super Administrator";
  if (role === "ADMIN") return "Administrator";
  if (role === "TEACHER") return "Teacher";
  return role ?? "Member";
}
