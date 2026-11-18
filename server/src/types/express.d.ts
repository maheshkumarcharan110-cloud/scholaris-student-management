import type { AccountStatus, AppRole } from "../lib/roles.js";

export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        role: AppRole;
        status: AccountStatus;
        emailVerifiedAt: Date | null;
        emailVerified: boolean;
        requestedRole: AppRole | null;
        pendingEmail: string | null;
        lastLoginAt: Date | null;
        teacherId: string | null;
      };
    }
  }
}
