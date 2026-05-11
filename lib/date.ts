const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function formatKoreanDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_LABELS[date.getDay()]}요일`;
}

export function formatMonthLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getWeekKey(date: Date): string {
  return toDateKey(getWeekStart(date));
}

export function getCurrentWeekKey(): string {
  return getWeekKey(new Date());
}

export function isSameWeek(dateKey: string, baseDate = new Date()): boolean {
  return getWeekKey(parseDateKey(dateKey)) === getWeekKey(baseDate);
}

export function isSameMonth(dateKey: string, monthDate: Date): boolean {
  const date = parseDateKey(dateKey);
  return (
    date.getFullYear() === monthDate.getFullYear() &&
    date.getMonth() === monthDate.getMonth()
  );
}

export function getCalendarDays(monthDate: Date): Date[] {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = getWeekStart(firstDay);
  return Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));
}

export function getPreviousWeekKey(baseDate = new Date()): string {
  return getWeekKey(addDays(getWeekStart(baseDate), -1));
}

export function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export function nowIso(): string {
  return new Date().toISOString();
}
