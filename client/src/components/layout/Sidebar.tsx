import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarCheck2,
  ChartNoAxesCombined,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn, roleLabel } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui";

const mainNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/students", label: "Students", icon: Users },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck2 },
];

const academicNav = [
  { to: "/classes", label: "Classes & subjects", icon: BookOpen },
  { to: "/exams", label: "Examinations", icon: ClipboardList },
  { to: "/reports", label: "Reports", icon: ChartNoAxesCombined },
];

const adminNav = [{ to: "/teachers", label: "Teachers", icon: GraduationCap, admin: true }];

function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid h-10 w-10 place-items-center rounded-xl bg-marigold-400 text-ink-950 shadow-sm", className)}>
      <svg viewBox="0 0 24 24" fill="none" className="h-5.5 w-5.5" aria-hidden="true">
        <path d="M12 3 22 8l-10 5L2 8l10-5Z" fill="currentColor" />
        <path d="M6 10.5V15c0 2 2.7 4 6 4s6-2 6-4v-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M22 8v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => cn("nav-link", isActive && "nav-link-active")}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    onClose();
    // Close the mobile drawer whenever the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col overflow-hidden bg-ink-950 text-white transition-transform duration-300 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Sidebar"
      >
        <div className="ink-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-marigold-400/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center justify-between px-5 pb-5 pt-6">
          <NavLink to="/" className="flex items-center gap-3" aria-label="Scholaris dashboard">
            <BrandMark />
            <span>
              <span className="block font-display text-[22px] font-semibold leading-none tracking-[-0.02em]">
                Scholaris
              </span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-300">
                Student management
              </span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative scrollbar-slim flex-1 space-y-7 overflow-y-auto px-3.5 pb-6 pt-2" aria-label="Main navigation">
          <div>
            <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-400">
              Workspace
            </p>
            <div className="space-y-1">
              {mainNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-400">
              Academics
            </p>
            <div className="space-y-1">
              {academicNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-400">
              Administration
            </p>
            <div className="space-y-1">
              {isAdmin
                ? adminNav.map((item) => <NavItem key={item.to} {...item} />)
                : null}
              <NavItem to="/profile" label="My profile" icon={UserRound} />
              <NavItem to="/settings" label="Settings" icon={Settings} />
            </div>
          </div>
        </nav>

        <div className="relative mx-3.5 mb-3 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.045] p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-marigold-300">
            Quick action
          </p>
          <p className="mt-1.5 text-[12px] leading-5 text-ink-200">
            {isAdmin ? "Start the school day with roll call." : "Record today's class attendance."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/attendance")}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-marigold-400 px-2.5 py-1.5 text-[11px] font-semibold text-ink-950 transition hover:bg-marigold-300"
          >
            <CalendarCheck2 className="h-3.5 w-3.5" />
            Take attendance
          </button>
        </div>

        <div className="relative border-t border-white/[0.08] px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name} size="md" className="bg-marigold-400/90 text-ink-950" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{user?.name}</p>
              <p className="truncate text-[10px] uppercase tracking-[0.12em] text-ink-300">
                {roleLabel(user?.role)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-ink-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
