import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const nextLabel = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-line bg-white px-2.5 text-ink-600 shadow-sm transition hover:border-ink-200 hover:text-ink-900",
        className,
      )}
      aria-label={`Switch to ${nextLabel} mode`}
      title={`Switch to ${nextLabel} mode`}
      aria-pressed={isDark}
      data-testid="theme-toggle"
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
      ) : (
        <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
      )}
      {showLabel ? (
        <span className="text-[12px] font-semibold">{isDark ? "Light mode" : "Dark mode"}</span>
      ) : null}
    </button>
  );
}
