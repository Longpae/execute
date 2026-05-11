export const CATEGORIES = ["일", "공부", "운동", "대외활동", "개인"] as const;
export const PRIORITIES = ["낮음", "보통", "중요", "핵심"] as const;
export const DENSITIES = ["형식적 수행", "보통", "몰입 수행"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Density = (typeof DENSITIES)[number];

export type TabKey = "오늘" | "캘린더" | "통계" | "프로필";
export type ScheduleType = "single" | "recurring";
export type RepeatType =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "weekday"
  | "weekend"
  | "custom";
export type StatsPeriod = "주간" | "월간" | "연간";

export type Schedule = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  memo: string;
  type: ScheduleType;
  repeatType: RepeatType;
  repeatDays: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Todo = {
  id: string;
  title: string;
  date: string;
  category: Category;
  priority: Priority;
  priorityWeight: number;
  allocatedXp: number;
  earnedXp: number;
  isCompleted: boolean;
  completedAt: string | null;
  density: Density | null;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

export type UserProgress = {
  level: number;
  totalXp: number;
  currentWeekXp: number;
  lastLevelUpWeek: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoryDailyXp = {
  date: string;
  category: Category;
  maxXp: number;
  earnedXp: number;
  remainingXp: number;
};

export type ExecuteState = {
  schedules: Schedule[];
  todos: Todo[];
  progress: UserProgress;
};

export type TodoDraft = {
  title: string;
  date: string;
  category: Category;
  priority: Priority;
  memo: string;
};

export type ScheduleDraft = {
  title: string;
  date: string;
  startTime: string;
  memo: string;
  type: ScheduleType;
  repeatType: RepeatType;
  repeatDays: number[];
  isActive: boolean;
};

export type DensityMeta = {
  label: Density;
  value: number;
  symbol: "○" | "◐" | "●";
  shortDescription: string;
  description: string;
};
