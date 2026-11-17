import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(first: string, last?: string) {
  const source = `${first} ${last ?? ""}`.trim();
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(value?: string | Date | null, pattern = "d MMM yyyy") {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  // Date-only values are stored at UTC midnight. Format a local-noon surrogate
  // so the calendar date stays stable in timezones behind UTC.
  const isUtcMidnight =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  if (isUtcMidnight) {
    return format(
      new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12),
      pattern,
    );
  }

  return format(date, pattern);
}

export function formatDateKey(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

export function daysAgoKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return format(date, "yyyy-MM-dd");
}

export function classLabel(value?: { name: string; section: string } | null) {
  if (!value) return "—";
  return `${value.name} ${value.section}`;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function roleLabel(role?: string | null) {
  if (role === "SUPER_ADMIN") return "Super Administrator";
  if (role === "ADMIN") return "Administrator";
  if (role === "TEACHER") return "Teacher";
  return role ?? "Member";
}

export function isAdminRole(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function gradeTone(grade: string) {
  if (grade === "A+" || grade === "A") return "success" as const;
  if (grade === "B" || grade === "C") return "info" as const;
  if (grade === "D" || grade === "E") return "warning" as const;
  return "danger" as const;
}

export function gradeForPercentage(value: number) {
  if (value >= 90) return "A+";
  if (value >= 80) return "A";
  if (value >= 70) return "B";
  if (value >= 60) return "C";
  if (value >= 50) return "D";
  if (value >= 40) return "E";
  return "F";
}

export function attendanceTone(rate: number | null) {
  if (rate === null) return "neutral" as const;
  if (rate >= 90) return "success" as const;
  if (rate >= 75) return "info" as const;
  if (rate >= 60) return "warning" as const;
  return "danger" as const;
}

export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const escape = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const statusLabel: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Archived",
  GRADUATED: "Graduated",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};
