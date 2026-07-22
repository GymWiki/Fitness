/** Formats an ISO date string as dd-mm, the short date format used across the app's history/advice screens. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}`;
}

/** `yyyy-mm-dd` for a `Date`, in local time — the canonical "calendar day" string the scheduling layer stores and compares against. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayLocalDateString(): string {
  return toLocalDateString(new Date());
}
