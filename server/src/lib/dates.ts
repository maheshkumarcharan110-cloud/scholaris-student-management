export function dateOnly(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

/** Parse a YYYY-MM-DD string into a UTC midnight Date (stable for SQLite unique keys). */
export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function eachDateKey(from: Date, to: Date) {
  const keys: string[] = [];
  let cursor = new Date(from);
  while (cursor <= to) {
    keys.push(dateOnly(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}
