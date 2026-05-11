import { parseDateKey } from "./date";
import type { RepeatType, Schedule } from "./types";

export type ScheduleOccurrence = Schedule & {
  occurrenceDate: string;
  badge: "단발" | "고정";
};

export const REPEAT_TYPE_LABELS: Record<RepeatType, string> = {
  none: "없음",
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
  weekday: "평일",
  weekend: "주말",
  custom: "사용자 지정 요일",
};

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "일" },
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
] as const;

export function normalizeSchedule(schedule: Schedule): Schedule {
  const type = schedule.type ?? "single";
  return {
    ...schedule,
    type,
    repeatType: type === "single" ? "none" : schedule.repeatType ?? "daily",
    repeatDays: Array.isArray(schedule.repeatDays) ? schedule.repeatDays : [],
    isActive: schedule.isActive ?? true,
  };
}

function isDateOnOrAfter(targetDateKey: string, startDateKey: string): boolean {
  return targetDateKey >= startDateKey;
}

function matchesRecurringSchedule(schedule: Schedule, targetDateKey: string): boolean {
  if (!schedule.isActive || schedule.type !== "recurring") return false;
  if (!isDateOnOrAfter(targetDateKey, schedule.date)) return false;

  const targetDate = parseDateKey(targetDateKey);
  const startDate = parseDateKey(schedule.date);
  const day = targetDate.getDay();

  if (schedule.repeatType === "daily") return true;
  if (schedule.repeatType === "weekly") {
    return schedule.repeatDays.length > 0
      ? schedule.repeatDays.includes(day)
      : day === startDate.getDay();
  }
  if (schedule.repeatType === "monthly") return targetDate.getDate() === startDate.getDate();
  if (schedule.repeatType === "weekday") return day >= 1 && day <= 5;
  if (schedule.repeatType === "weekend") return day === 0 || day === 6;
  if (schedule.repeatType === "custom") return schedule.repeatDays.includes(day);

  return false;
}

export function getSchedulesForDate(
  schedules: Schedule[],
  dateKey: string,
): ScheduleOccurrence[] {
  return schedules
    .map(normalizeSchedule)
    .filter((schedule) => {
      if (schedule.type === "single") return schedule.date === dateKey;
      return matchesRecurringSchedule(schedule, dateKey);
    })
    .map((schedule) => ({
      ...schedule,
      occurrenceDate: dateKey,
      badge: schedule.type === "recurring" ? ("고정" as const) : ("단발" as const),
    }))
    .sort((a, b) => {
      const time = a.startTime.localeCompare(b.startTime);
      if (time !== 0) return time;
      return a.title.localeCompare(b.title);
    });
}

export function describeRepeatRule(schedule: Schedule): string {
  const normalized = normalizeSchedule(schedule);
  if (normalized.type === "single") return "단발 일정";
  if (normalized.repeatType === "custom") {
    const labels = normalized.repeatDays
      .slice()
      .sort((a, b) => a - b)
      .map((day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.label)
      .filter(Boolean)
      .join(", ");
    return labels ? `매주 ${labels}` : "사용자 지정 요일";
  }

  return REPEAT_TYPE_LABELS[normalized.repeatType];
}
