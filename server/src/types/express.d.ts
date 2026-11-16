export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: "ADMIN" | "TEACHER";
        teacherId: string | null;
      };
    }
  }
}
