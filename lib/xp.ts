import {
  CATEGORIES,
  type Category,
  type CategoryDailyXp,
  type Density,
  type DensityMeta,
  type Priority,
  type Todo,
} from "./types";

export const DAILY_MAX_XP = 300;

export const CATEGORY_DAILY_MAX_XP: Record<Category, number> = {
  운동: 120,
  공부: 120,
  일: 100,
  대외활동: 80,
  개인: 50,
};

export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  낮음: 1,
  보통: 2,
  중요: 3,
  핵심: 4,
};

export const DENSITY_META: Record<Density, DensityMeta> = {
  "형식적 수행": {
    label: "형식적 수행",
    value: 1,
    symbol: "○",
    shortDescription: "그냥 했음",
    description: "완료는 했지만 의식적인 선택과 집중은 낮았던 실행",
  },
  보통: {
    label: "보통",
    value: 2,
    symbol: "◐",
    shortDescription: "평균 이상 집중",
    description: "흐름을 유지했고 평균 이상으로 집중한 실행",
  },
  "몰입 수행": {
    label: "몰입 수행",
    value: 3,
    symbol: "●",
    shortDescription: "주체적으로 깊게 실행",
    description: "회피하지 않고 주도적으로 깊게 파고든 실행",
  },
};

export function getPriorityWeight(priority: Priority): number {
  return PRIORITY_WEIGHTS[priority];
}

export function getRequiredXpForNextLevel(level: number): number {
  return 350 + level * 50;
}

export function getWeeklyGrade(weeklyXp: number): "S" | "A" | "B" | "C" | "D" | "F" {
  if (weeklyXp >= 800) return "S";
  if (weeklyXp >= 650) return "A";
  if (weeklyXp >= 500) return "B";
  if (weeklyXp >= 350) return "C";
  if (weeklyXp >= 200) return "D";
  return "F";
}

export function getWeeklyGradeMessage(weeklyXp: number): string {
  const grade = getWeeklyGrade(weeklyXp);

  if (grade === "S") return "실행이 한 주의 기본값이 됐다. 이 흐름을 유지하면 된다.";
  if (grade === "A") return "실행은 강하게 유지됐다. 몰입 수행 비율을 조금 더 끌어올리면 좋다.";
  if (grade === "B") return "실행은 유지됐다. 다만 몰입 수행 비율을 높여야 한다.";
  if (grade === "C") return "최소 실행선은 넘었다. 다음 주에는 핵심 과제를 먼저 닫아야 한다.";
  if (grade === "D") return "실행의 흔적은 남겼다. 하루 한 가지 핵심 실행부터 다시 세우면 된다.";
  return "실행 리듬이 약했다. 계획을 줄이고 바로 실행할 작은 단위를 잡아야 한다.";
}

type WeightedItem = {
  id: string;
  weight: number;
};

function distributeIntegerPool(pool: number, items: WeightedItem[]): Record<string, number> {
  if (pool <= 0 || items.length === 0) return {};

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return {};

  const raw = items.map((item) => {
    const exact = (pool * item.weight) / totalWeight;
    const base = Math.floor(exact);
    return {
      id: item.id,
      base,
      rest: exact - base,
    };
  });

  const used = raw.reduce((sum, item) => sum + item.base, 0);
  const left = Math.max(0, pool - used);
  const result: Record<string, number> = {};

  raw.forEach((item) => {
    result[item.id] = item.base;
  });

  raw
    .slice()
    .sort((a, b) => {
      if (b.rest !== a.rest) return b.rest - a.rest;
      return a.id.localeCompare(b.id);
    })
    .slice(0, left)
    .forEach((item) => {
      result[item.id] += 1;
    });

  return result;
}

export function getEarnedXpByDate(todos: Todo[], date: string): number {
  return todos
    .filter((todo) => todo.date === date && todo.isCompleted)
    .reduce((sum, todo) => sum + todo.earnedXp, 0);
}

export function getEarnedXpByCategory(
  todos: Todo[],
  date: string,
  category: Category,
): number {
  return todos
    .filter((todo) => todo.date === date && todo.category === category && todo.isCompleted)
    .reduce((sum, todo) => sum + todo.earnedXp, 0);
}

export function calculateRemainingCategoryXp(
  todos: Todo[],
  date: string,
  category: Category,
): number {
  return Math.max(0, CATEGORY_DAILY_MAX_XP[category] - getEarnedXpByCategory(todos, date, category));
}

export function getCategoryDailyXp(
  todos: Todo[],
  date: string,
): CategoryDailyXp[] {
  return CATEGORIES.map((category) => {
    const maxXp = CATEGORY_DAILY_MAX_XP[category];
    const earnedXp = getEarnedXpByCategory(todos, date, category);

    return {
      date,
      category,
      maxXp,
      earnedXp,
      remainingXp: Math.max(0, maxXp - earnedXp),
    };
  });
}

export function recalculateAllocatedXp(todos: Todo[]): Todo[] {
  const nextTodos = todos.map((todo) => ({
    ...todo,
    priorityWeight: getPriorityWeight(todo.priority),
    allocatedXp: todo.isCompleted ? todo.earnedXp : 0,
  }));

  const dates = Array.from(new Set(nextTodos.map((todo) => todo.date)));
  const preliminary: Record<string, number> = {};

  dates.forEach((date) => {
    CATEGORIES.forEach((category) => {
      const remainingXp = Math.max(
        0,
        CATEGORY_DAILY_MAX_XP[category] - getEarnedXpByCategory(nextTodos, date, category),
      );
      const incompletedTodos = nextTodos.filter(
        (todo) => todo.date === date && todo.category === category && !todo.isCompleted,
      );

      const categoryAllocation = distributeIntegerPool(
        remainingXp,
        incompletedTodos.map((todo) => ({
          id: todo.id,
          weight: todo.priorityWeight,
        })),
      );

      Object.assign(preliminary, categoryAllocation);
    });
  });

  dates.forEach((date) => {
    const earnedToday = getEarnedXpByDate(nextTodos, date);
    const remainingDailyXp = Math.max(0, DAILY_MAX_XP - earnedToday);
    const incompletedToday = nextTodos.filter(
      (todo) => todo.date === date && !todo.isCompleted,
    );
    const potentialToday = incompletedToday.reduce(
      (sum, todo) => sum + (preliminary[todo.id] ?? 0),
      0,
    );

    if (potentialToday <= remainingDailyXp) return;

    const scaled = distributeIntegerPool(
      remainingDailyXp,
      incompletedToday.map((todo) => ({
        id: todo.id,
        weight: preliminary[todo.id] ?? 0,
      })),
    );

    incompletedToday.forEach((todo) => {
      preliminary[todo.id] = scaled[todo.id] ?? 0;
    });
  });

  return nextTodos.map((todo) => ({
    ...todo,
    allocatedXp: todo.isCompleted ? todo.earnedXp : preliminary[todo.id] ?? 0,
  }));
}

export function calculateAllocatedXp(todos: Todo[]): Todo[] {
  return recalculateAllocatedXp(todos);
}

export function completeTodoWithDensity(
  todos: Todo[],
  todoId: string,
  density: Density,
  completedAt: string,
): Todo[] {
  const allocatedTodos = recalculateAllocatedXp(todos);
  const completedTodos = allocatedTodos.map((todo) => {
    if (todo.id !== todoId || todo.isCompleted) return todo;

    return {
      ...todo,
      earnedXp: todo.allocatedXp,
      isCompleted: true,
      completedAt,
      density,
      updatedAt: completedAt,
    };
  });

  return recalculateAllocatedXp(completedTodos);
}

export function getAverageDensityValue(todos: Todo[]): number {
  const completedWithDensity = todos.filter((todo) => todo.isCompleted && todo.density);
  if (completedWithDensity.length === 0) return 0;

  return (
    completedWithDensity.reduce(
      (sum, todo) => sum + DENSITY_META[todo.density as Density].value,
      0,
    ) / completedWithDensity.length
  );
}

export function calculateDensityAverage(todos: Todo[]): number {
  return getAverageDensityValue(todos);
}

export function calculateDensityRate(todosOrAverage: Todo[] | number): number {
  const average =
    typeof todosOrAverage === "number"
      ? todosOrAverage
      : calculateDensityAverage(todosOrAverage);

  if (average <= 0) return 0;
  return Math.round((average / 3) * 100);
}

export function getDensitySymbolFromAverage(value: number): "○" | "◐" | "●" | "·" {
  if (value <= 0) return "·";
  if (value < 1.67) return "○";
  if (value < 2.34) return "◐";
  return "●";
}
