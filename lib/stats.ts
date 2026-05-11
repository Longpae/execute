import {
  addDays,
  getWeekKey,
  parseDateKey,
  toDateKey,
  todayKey,
} from "./date";
import {
  CATEGORIES,
  type Category,
  type Todo,
  type UserProgress,
} from "./types";
import {
  CATEGORY_DAILY_MAX_XP,
  calculateDensityAverage,
  calculateDensityRate,
  getRequiredXpForNextLevel,
  getWeeklyGrade,
  getWeeklyGradeMessage,
} from "./xp";

export type CategoryStat = {
  category: Category;
  earnedXp: number;
  completionRate: number;
  averageDensity: number;
  densityRate: number;
  maxXp: number;
};

export type PeriodTrendPoint = {
  label: string;
  totalXp: number;
  densityRate: number;
};

export type PeriodStats = {
  periodLabel: string;
  totalXp: number;
  grade: ReturnType<typeof getWeeklyGrade>;
  message: string;
  categoryStats: CategoryStat[];
  averageDensity: number;
  densityRate: number;
  completionRate: number;
  completedCount: number;
  totalCount: number;
  trend: PeriodTrendPoint[];
  highestDensityLabel: string | null;
  highestXpLabel: string | null;
};

export type WeeklyStats = PeriodStats;
export type MonthlyStats = PeriodStats;
export type YearlyStats = PeriodStats;

export type DensityComparison = {
  hasPreviousData: boolean;
  currentDensityRate: number;
  previousDensityRate: number;
  densityRateChange: number;
  currentTotalXp: number;
  previousTotalXp: number;
  totalXpChange: number;
  completedCountChange: number;
  interpretation: string;
};

function getCompletedTodos(todos: Todo[]): Todo[] {
  return todos.filter((todo) => todo.isCompleted);
}

function getTotalXpFromTodos(todos: Todo[]): number {
  return getCompletedTodos(todos).reduce((sum, todo) => sum + todo.earnedXp, 0);
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getYearKey(date: Date): string {
  return String(date.getFullYear());
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getDaysInYear(date: Date): number {
  return new Date(date.getFullYear(), 1, 29).getMonth() === 1 ? 366 : 365;
}

function getPreviousMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function getPreviousYear(date: Date): Date {
  return new Date(date.getFullYear() - 1, 0, 1);
}

function buildPeriodStats(
  todos: Todo[],
  periodLabel: string,
  periodDayCount: number,
  trend: PeriodTrendPoint[] = [],
): PeriodStats {
  const completedTodos = getCompletedTodos(todos);
  const totalXp = getTotalXpFromTodos(todos);
  const averageDensity = calculateDensityAverage(completedTodos);
  const densityRate = calculateDensityRate(averageDensity);
  const completionRate =
    todos.length === 0 ? 0 : Math.round((completedTodos.length / todos.length) * 100);

  const categoryStats = CATEGORIES.map((category) => {
    const categoryTodos = todos.filter((todo) => todo.category === category);
    const categoryDone = categoryTodos.filter((todo) => todo.isCompleted);
    const categoryAverageDensity = calculateDensityAverage(categoryDone);

    return {
      category,
      earnedXp: getTotalXpFromTodos(categoryTodos),
      completionRate:
        categoryTodos.length === 0
          ? 0
          : Math.round((categoryDone.length / categoryTodos.length) * 100),
      averageDensity: categoryAverageDensity,
      densityRate: calculateDensityRate(categoryAverageDensity),
      maxXp: CATEGORY_DAILY_MAX_XP[category] * periodDayCount,
    };
  });

  const highestDensity =
    trend.length === 0
      ? null
      : trend.reduce((best, point) =>
          point.densityRate > best.densityRate ? point : best,
        trend[0]);
  const highestXp =
    trend.length === 0
      ? null
      : trend.reduce((best, point) => (point.totalXp > best.totalXp ? point : best), trend[0]);

  return {
    periodLabel,
    totalXp,
    grade: getWeeklyGrade(totalXp),
    message: getWeeklyGradeMessage(totalXp),
    categoryStats,
    averageDensity,
    densityRate,
    completionRate,
    completedCount: completedTodos.length,
    totalCount: todos.length,
    trend,
    highestDensityLabel: highestDensity?.label ?? null,
    highestXpLabel: highestXp?.label ?? null,
  };
}

export function getTodosInWeek(todos: Todo[], weekKey: string): Todo[] {
  return todos.filter((todo) => getWeekKey(parseDateKey(todo.date)) === weekKey);
}

export function getTodosInMonth(todos: Todo[], monthDate: Date): Todo[] {
  const monthKey = getMonthKey(monthDate);
  return todos.filter((todo) => todo.date.startsWith(monthKey));
}

export function getTodosInYear(todos: Todo[], yearDate: Date): Todo[] {
  const yearKey = getYearKey(yearDate);
  return todos.filter((todo) => todo.date.startsWith(yearKey));
}

export function getWeeklyXp(todos: Todo[], weekKey: string): number {
  return getTotalXpFromTodos(getTodosInWeek(todos, weekKey));
}

export function getWeeklyStats(todos: Todo[], weekKey: string): WeeklyStats {
  const weekTodos = getTodosInWeek(todos, weekKey);
  return buildPeriodStats(weekTodos, "이번 주", 7);
}

export function getMonthlyStats(todos: Todo[], monthDate: Date): MonthlyStats {
  const monthTodos = getTodosInMonth(todos, monthDate);
  const weekKeys = Array.from(
    new Set(monthTodos.map((todo) => getWeekKey(parseDateKey(todo.date)))),
  ).sort();
  const trend = weekKeys.map((weekKey, index) => {
    const weekTodos = getTodosInWeek(monthTodos, weekKey);
    return {
      label: `${index + 1}주차`,
      totalXp: getTotalXpFromTodos(weekTodos),
      densityRate: calculateDensityRate(calculateDensityAverage(weekTodos)),
    };
  });

  return buildPeriodStats(monthTodos, "이번 달", getDaysInMonth(monthDate), trend);
}

export function getYearlyStats(todos: Todo[], yearDate: Date): YearlyStats {
  const yearTodos = getTodosInYear(todos, yearDate);
  const trend = Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(yearDate.getFullYear(), index, 1);
    const monthTodos = getTodosInMonth(yearTodos, monthDate);
    return {
      label: `${index + 1}월`,
      totalXp: getTotalXpFromTodos(monthTodos),
      densityRate: calculateDensityRate(calculateDensityAverage(monthTodos)),
    };
  });

  return buildPeriodStats(yearTodos, "올해", getDaysInYear(yearDate), trend);
}

export function getPreviousMonthlyStats(todos: Todo[], monthDate: Date): MonthlyStats {
  return getMonthlyStats(todos, getPreviousMonth(monthDate));
}

export function getPreviousYearlyStats(todos: Todo[], yearDate: Date): YearlyStats {
  return getYearlyStats(todos, getPreviousYear(yearDate));
}

export function compareDensityPeriods(
  current: PeriodStats,
  previous: PeriodStats,
): DensityComparison {
  const hasPreviousData = previous.totalCount > 0;
  if (!hasPreviousData) {
    return {
      hasPreviousData,
      currentDensityRate: current.densityRate,
      previousDensityRate: 0,
      densityRateChange: 0,
      currentTotalXp: current.totalXp,
      previousTotalXp: 0,
      totalXpChange: 0,
      completedCountChange: 0,
      interpretation: "비교할 이전 데이터가 아직 없습니다.",
    };
  }

  const densityRateChange = current.densityRate - previous.densityRate;
  const totalXpChange = current.totalXp - previous.totalXp;
  const completedCountChange = current.completedCount - previous.completedCount;
  const executionIncreased = completedCountChange >= 0;
  const densityIncreased = densityRateChange >= 0;

  let interpretation = "실행량과 밀도 모두 보완이 필요합니다.";
  if (executionIncreased && densityIncreased) {
    interpretation = "좋은 흐름입니다. 더 많이, 더 깊게 실행했습니다.";
  } else if (executionIncreased && !densityIncreased) {
    interpretation = "많이 실행했지만 형식적 수행 비율이 늘었습니다.";
  } else if (!executionIncreased && densityIncreased) {
    interpretation = "실행량은 줄었지만 더 깊게 수행했습니다.";
  }

  return {
    hasPreviousData,
    currentDensityRate: current.densityRate,
    previousDensityRate: previous.densityRate,
    densityRateChange,
    currentTotalXp: current.totalXp,
    previousTotalXp: previous.totalXp,
    totalXpChange,
    completedCountChange,
    interpretation,
  };
}

export function getTotalXp(todos: Todo[]): number {
  return getTotalXpFromTodos(todos);
}

export function getStreakDays(todos: Todo[], baseDateKey = todayKey()): number {
  let streak = 0;
  let cursor = parseDateKey(baseDateKey);

  while (true) {
    const key = toDateKey(cursor);
    const hasCompleted = todos.some((todo) => todo.date === key && todo.isCompleted);
    if (!hasCompleted) break;

    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function getPreviousWeekChange(todos: Todo[], currentWeekKey: string): number {
  const currentWeekStart = parseDateKey(currentWeekKey);
  const previousWeekKey = getWeekKey(addDays(currentWeekStart, -1));
  return getWeeklyXp(todos, currentWeekKey) - getWeeklyXp(todos, previousWeekKey);
}

export function getPreviousWeekStats(todos: Todo[], currentWeekKey: string): WeeklyStats {
  const currentWeekStart = parseDateKey(currentWeekKey);
  return getWeeklyStats(todos, getWeekKey(addDays(currentWeekStart, -1)));
}

export function syncProgressWithTodos(
  progress: UserProgress,
  todos: Todo[],
  currentWeekKey: string,
): UserProgress {
  const totalXp = getTotalXp(todos);
  const currentWeekXp = getWeeklyXp(todos, currentWeekKey);

  return {
    ...progress,
    totalXp,
    currentWeekXp,
    updatedAt: new Date().toISOString(),
  };
}

export function applyPendingWeeklyLevelUps(
  progress: UserProgress,
  todos: Todo[],
  currentWeekKey: string,
): UserProgress {
  const completedWeekKeys = Array.from(
    new Set(
      todos
        .filter((todo) => todo.isCompleted)
        .map((todo) => getWeekKey(parseDateKey(todo.date)))
        .filter((weekKey) => weekKey < currentWeekKey),
    ),
  ).sort();

  let nextProgress = { ...progress };

  completedWeekKeys.forEach((weekKey) => {
    if (nextProgress.lastLevelUpWeek && weekKey <= nextProgress.lastLevelUpWeek) return;

    const weeklyXp = getWeeklyXp(todos, weekKey);
    if (weeklyXp >= getRequiredXpForNextLevel(nextProgress.level)) {
      nextProgress = {
        ...nextProgress,
        level: nextProgress.level + 1,
      };
    }

    nextProgress = {
      ...nextProgress,
      lastLevelUpWeek: weekKey,
      updatedAt: new Date().toISOString(),
    };
  });

  return syncProgressWithTodos(nextProgress, todos, currentWeekKey);
}
