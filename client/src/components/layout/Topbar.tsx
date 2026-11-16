import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, Search, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

const titles: Array<{ match: RegExp; title: string }> = [
  { match: /^\/$/, title: "Dashboard" },
  { match: /^\/students\/.+/, title: "Student profile" },
  { match: /^\/students/, title: "Students" },
  { match: /^\/teachers/, title: "Teachers" },
  { match: /^\/classes/, title: "Classes & subjects" },
  { match: /^\/attendance/, title: "Attendance" },
  { match: /^\/exams\/.+/, title: "Exam detail" },
  { match: /^\/exams/, title: "Examinations" },
  { match: /^\/reports/, title: "Reports" },
  { match: /^\/settings/, title: "Settings" },
];

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const title = titles.find((item) => item.match.test(location.pathname))?.title ?? "Scholaris";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/students?q=${encodeURIComponent(query)}`);
    setSearch("");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg border border-line bg-white p-2 text-ink-600 shadow-sm transition hover:text-ink-900 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-300 sm:block">
            Scholaris / Workspace
          </p>
          <h1 className="truncate text-sm font-semibold text-ink-800">{title}</h1>
        </div>

        <form onSubmit={submitSearch} className="relative hidden w-64 md:block xl:w-80" role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a student…"
            aria-label="Search students"
            className="h-9 w-full rounded-xl border border-line bg-white pl-9 pr-8 text-[13px] text-ink-800 placeholder:text-ink-300 transition focus:border-ink-300 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-paper px-1.5 py-0.5 text-[9px] font-medium text-ink-300">
            /
          </kbd>
        </form>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-transparent p-1.5 transition hover:border-line hover:bg-white",
              menuOpen && "border-line bg-white",
            )}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            <Avatar name={user?.name} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block max-w-[120px] truncate text-[12px] font-semibold leading-4 text-ink-800">
                {user?.name}
              </span>
              <span className="block text-[9px] uppercase tracking-[0.12em] text-ink-300">
                {user?.role === "ADMIN" ? "Administrator" : "Teacher"}
              </span>
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-ink-300 transition", menuOpen && "rotate-180")} />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-float animate-scale-in"
            >
              <div className="border-b border-line px-3 py-2.5">
                <p className="truncate text-[13px] font-semibold text-ink-800">{user?.name}</p>
                <p className="truncate text-[11px] text-ink-400">{user?.email}</p>
              </div>
              <Link
                to="/settings"
                role="menuitem"
                className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-600 transition hover:bg-paper hover:text-ink-900"
              >
                <Settings className="h-4 w-4" />
                Account settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-clay-600 transition hover:bg-clay-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
