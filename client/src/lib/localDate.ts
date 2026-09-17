const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
export const DEFAULT_RESTAURANT_TIME_ZONE = "Europe/Rome";

export function getLocalDateKey(date = new Date(), timeZone?: string) {
  if (timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalTimeKey(date = new Date(), timeZone?: string) {
  if (timeZone) {
    return new Intl.DateTimeFormat("it-IT", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function parseLocalDateKey(dateKey: string) {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) throw new Error(`Data locale non valida: ${dateKey}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

export function addLocalDays(dateKey: string, days: number) {
  const date = parseLocalDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
}

export function addLocalMonths(dateKey: string, months: number) {
  const date = parseLocalDateKey(dateKey);
  const targetDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate();
  date.setDate(Math.min(targetDay, lastDay));
  return getLocalDateKey(date);
}

export function getLocalWeek(dateKey: string) {
  const date = parseLocalDateKey(dateKey);
  const mondayOffset = (date.getDay() + 6) % 7;
  const monday = addLocalDays(dateKey, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addLocalDays(monday, index));
}

export function getLocalMonth(dateKey: string) {
  const date = parseLocalDateKey(dateKey);
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate();
  const first = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  return Array.from({ length: days }, (_, index) => addLocalDays(first, index));
}

export function getLocalDateRange(start: string, end: string) {
  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  const dates: string[] = [];
  for (let date = first; date <= last; date = addLocalDays(date, 1)) dates.push(date);
  return dates;
}

export function formatLocalDate(dateKey: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("it-IT", options).format(parseLocalDateKey(dateKey));
}
