import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import type { ReactNode } from "react";

export function FullScreenLoader({ label = "Opening your workspace…" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <div className="flex flex-col items-center gap-4">
        <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-ink-950">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 animate-pulse text-marigold-400">
            <path d="M12 3 22 8l-10 5L2 8l10-5Z" fill="currentColor" />
            <path d="M6 10.5V15c0 2 2.7 4 6 4s6-2 6-4v-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-ink-400">{label}</p>
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;
  return <>{children}</>;
}
