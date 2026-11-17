import type { AppRole } from "../lib/roles.js";

export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: AppRole;
        teacherId: string | null;
      };
    }
  }
}
