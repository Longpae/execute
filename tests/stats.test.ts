import assert from "node:assert/strict";
import test from "node:test";
import type { Todo } from "../lib/types";
import {
  compareDensityPeriods,
  getMonthlyStats,
  getWeeklyStats,
  getYearlyStats,
} from "../lib/stats";
import { calculateDensityAverage, calculateDensityRate, getPriorityWeight } from "../lib/xp";

function makeTodo(id: string, date: string, earnedXp: number, density: Todo["density"]): Todo {
  return {
    id,
    title: id,
    date,
    category: "공부",
    priority: "중요",
    priorityWeight: getPriorityWeight("중요"),
    allocatedXp: earnedXp,
    earnedXp,
    isCompleted: true,
    completedAt: `${date}T09:00:00.000Z`,
    density,
    memo: "",
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T09:00:00.000Z`,
  };
}

test("밀도 평균과 밀도율을 계산한다", () => {
  const todos = [
    makeTodo("a", "2026-05-11", 30, "보통"),
    makeTodo("b", "2026-05-12", 40, "몰입 수행"),
  ];

  assert.equal(calculateDensityAverage(todos), 2.5);
  assert.equal(calculateDensityRate(todos), 83);
});

test("주간/월간/연간 통계를 계산하고 이전 기간과 비교한다", () => {
  const todos = [
    makeTodo("current", "2026-05-11", 50, "몰입 수행"),
    makeTodo("previous", "2026-05-04", 20, "보통"),
  ];
  const current = getWeeklyStats(todos, "2026-05-11");
  const previous = getWeeklyStats(todos, "2026-05-04");
  const monthly = getMonthlyStats(todos, new Date(2026, 4, 1));
  const yearly = getYearlyStats(todos, new Date(2026, 0, 1));
  const comparison = compareDensityPeriods(current, previous);

  assert.equal(current.totalXp, 50);
  assert.equal(monthly.totalXp, 70);
  assert.equal(yearly.totalXp, 70);
  assert.equal(comparison.densityRateChange, 33);
  assert.ok(comparison.interpretation.includes("좋은 흐름"));
});
