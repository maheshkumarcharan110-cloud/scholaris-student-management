import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn, gradeTone, initials as toInitials, statusLabel } from "@/lib/utils";

/* ------------------------------- Spinner ------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden="true" />;
}

/* -------------------------------- Button -------------------------------- */

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink-900 text-white shadow-sm hover:bg-ink-800 active:bg-ink-950 disabled:bg-ink-400",
  secondary:
    "bg-marigold-400 text-ink-950 shadow-sm hover:bg-marigold-300 active:bg-marigold-500 disabled:bg-marigold-200",
  outline:
    "border border-line bg-white text-ink-800 hover:border-ink-200 hover:bg-paper/60 active:bg-paper",
  ghost: "text-ink-600 hover:bg-ink-900/[0.06] hover:text-ink-900",
  danger: "bg-clay-600 text-white shadow-sm hover:bg-clay-700 active:bg-clay-800",
  accent: "bg-sage-600 text-white shadow-sm hover:bg-sage-700",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-11 gap-2 rounded-xl px-5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marigold-400/30 disabled:cursor-not-allowed disabled:opacity-70",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
    </button>
  );
}

/* -------------------------------- Inputs -------------------------------- */

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  leftIcon,
  className,
  children,
}: {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marigold-400/30",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
    >
      {leftIcon}
      {children}
    </Link>
  );
}

export const Input = ({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) => (
  <input
    className={cn("text-input", invalid && "text-input-error", className)}
    aria-invalid={invalid || undefined}
    {...props}
  />
);

export const Textarea = ({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) => (
  <textarea
    className={cn("text-input min-h-[88px] resize-y", invalid && "text-input-error", className)}
    aria-invalid={invalid || undefined}
    {...props}
  />
);

export const Select = ({
  className,
  invalid,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) => (
  <select
    className={cn("text-input cursor-pointer appearance-none pr-9", invalid && "text-input-error", className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236486A8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
    }}
    aria-invalid={invalid || undefined}
    {...props}
  >
    {children}
  </select>
);

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-clay-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] font-medium text-clay-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------- Badge --------------------------------- */

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const badgeVariants: Record<BadgeVariant, string> = {
  neutral: "border-ink-200 bg-ink-50 text-ink-600",
  success: "border-sage-200 bg-sage-50 text-sage-700",
  warning: "border-marigold-200 bg-marigold-50 text-marigold-700",
  danger: "border-clay-200 bg-clay-50 text-clay-700",
  info: "border-ink-200 bg-white text-ink-600",
  accent: "border-marigold-300 bg-marigold-100 text-marigold-800",
};

export function Badge({
  children,
  variant = "neutral",
  dot,
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        badgeVariants[variant],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

const statusVariants: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  GRADUATED: "info",
  DRAFT: "warning",
  PUBLISHED: "success",
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  EXCUSED: "info",
};

export function StatusBadge({ status, dot = true }: { status: string; dot?: boolean }) {
  return (
    <Badge variant={statusVariants[status] ?? "neutral"} dot={dot}>
      {statusLabel[status] ?? status}
    </Badge>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  return <Badge variant={gradeTone(grade)}>{grade}</Badge>;
}

/* --------------------------------- Card --------------------------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("cut-card", className)}>{children}</div>;
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-ink-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ Page header ------------------------------ */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink-950 sm:text-[34px]">
          {title}
        </h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------- Empty state ------------------------------ */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-paper text-ink-300">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink-800">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* -------------------------------- Avatar -------------------------------- */

const avatarTones = [
  "bg-ink-100 text-ink-700",
  "bg-marigold-100 text-marigold-800",
  "bg-sage-100 text-sage-700",
  "bg-clay-100 text-clay-700",
  "bg-ink-900 text-white",
];

export function Avatar({
  name,
  firstName,
  lastName,
  size = "md",
  className,
}: {
  name?: string;
  firstName?: string;
  lastName?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const display = name ?? `${firstName ?? ""} ${lastName ?? ""}`;
  const parts = display.trim().split(/\s+/);
  const initials = toInitials(parts[0] ?? "", parts.slice(1).join(" "));
  let hash = 0;
  for (let index = 0; index < display.length; index++) hash = (hash * 31 + display.charCodeAt(index)) >>> 0;
  const tone = avatarTones[hash % avatarTones.length];
  const sizes = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-9 w-9 text-[11px]",
    lg: "h-12 w-12 text-sm",
    xl: "h-20 w-20 text-xl",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide",
        sizes[size],
        tone,
        className,
      )}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

/* -------------------------------- Stat card ------------------------------- */

const statAccents = {
  marigold: "border-marigold-200 bg-marigold-50 text-marigold-700",
  sage: "border-sage-200 bg-sage-50 text-sage-700",
  ink: "border-ink-200 bg-ink-50 text-ink-700",
  clay: "border-clay-200 bg-clay-50 text-clay-700",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "ink",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  accent?: keyof typeof statAccents;
  className?: string;
}) {
  return (
    <Card className={cn("group relative overflow-hidden p-5 transition-shadow hover:shadow-float/50", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{label}</p>
          <p className="mt-3 font-display text-[32px] font-semibold leading-none tracking-[-0.03em] text-ink-950 tabular-nums">
            {value}
          </p>
        </div>
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border", statAccents[accent])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      {hint ? <div className="mt-3 text-[12px] leading-5 text-ink-400">{hint}</div> : null}
    </Card>
  );
}

/* -------------------------------- Progress ------------------------------- */

export function ProgressBar({
  value,
  tone = "marigold",
  className,
}: {
  value: number;
  tone?: "marigold" | "sage" | "clay" | "ink";
  className?: string;
}) {
  const widths = {
    marigold: "bg-marigold-400",
    sage: "bg-sage-500",
    clay: "bg-clay-500",
    ink: "bg-ink-700",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink-100", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", widths[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* --------------------------------- Modal -------------------------------- */

const modalSizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof modalSizes;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const getFocusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);

    const frame = window.requestAnimationFrame(() => getFocusable()[0]?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-ink-950/45 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            "relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-float animate-scale-in",
            modalSizes[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 id={titleId} className="font-display text-xl font-semibold text-ink-950">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-[13px] leading-5 text-ink-400">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-paper hover:text-ink-800"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="scrollbar-slim overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-paper/40 px-5 py-4 sm:px-6">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  loading = false,
  destructive = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full",
            destructive ? "bg-clay-50 text-clay-600" : "bg-marigold-50 text-marigold-700",
          )}
        >
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="pt-1.5 text-sm leading-6 text-ink-600">{description}</p>
      </div>
    </Modal>
  );
}

/* --------------------------------- Tabs --------------------------------- */

export function Tabs({
  items,
  value,
  onChange,
  variant = "underline",
  className,
}: {
  items: Array<{ id: string; label: string; count?: number }>;
  value: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}) {
  if (variant === "pills") {
    return (
      <div className={cn("inline-flex flex-wrap gap-1 rounded-xl border border-line bg-paper/60 p-1", className)} role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={value === item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-[13px] font-semibold transition",
              value === item.id
                ? "bg-white text-ink-900 shadow-sm"
                : "text-ink-400 hover:text-ink-700",
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="ml-1.5 text-[11px] opacity-60">{item.count}</span>
            ) : null}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-5 overflow-x-auto border-b border-line", className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "relative whitespace-nowrap pb-3 text-[13px] font-semibold transition-colors",
            value === item.id ? "text-ink-900" : "text-ink-400 hover:text-ink-700",
          )}
        >
          {item.label}
          {item.count !== undefined ? (
            <span className="ml-1.5 rounded-full bg-paper px-1.5 py-0.5 text-[10px] text-ink-400">
              {item.count}
            </span>
          ) : null}
          {value === item.id ? (
            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-marigold-400" />
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- Pagination ------------------------------ */

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <p className="text-[12px] text-ink-400">
        Showing <span className="font-semibold text-ink-700">{from}–{to}</span> of{" "}
        <span className="font-semibold text-ink-700">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="px-2 text-[12px] font-medium text-ink-500">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Search input ----------------------------- */

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="text-input pl-10"
      />
    </div>
  );
}

/* ------------------------------- Skeletons ------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-shell">
      <div className="border-b border-line bg-paper/60 px-5 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-line/70">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn("h-4", colIndex === 0 ? "w-44" : colIndex === 1 ? "w-24" : "w-16")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-4 h-80 rounded-2xl" />
    </div>
  );
}

/* ------------------------------- Print header ----------------------------- */

export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="print-only mb-6 border-b border-ink-900 pb-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink-500">Scholaris Academy</p>
          <h1 className="font-display text-2xl font-semibold text-ink-950">{title}</h1>
          {subtitle ? <p className="mt-1 text-xs text-ink-500">{subtitle}</p> : null}
        </div>
        <p className="text-xs text-ink-500">Generated {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}

/* ------------------------------ Error state ------------------------------ */

export function ErrorState({
  title = "We couldn’t load this page",
  description = "Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-clay-50 text-clay-600">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold text-ink-900">{title}</h2>
      <p className="mt-1 text-sm text-ink-400">{description}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Card>
  );
}
