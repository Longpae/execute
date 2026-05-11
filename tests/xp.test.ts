import assert from "node:assert/strict";
import test from "node:test";
import type { Todo } from "../lib/types";
import {
  completeTodoWithDensity,
  DAILY_MAX_XP,
  getPriorityWeight,
  recalculateAllocatedXp,
} from "../lib/xp";

function makeTodo(
  id: string,
  priority: Todo["priority"],
  category: Todo["category"] = "일",
): Todo {
  return {
    id,
    title: id,
    date: "2026-05-11",
    category,
    priority,
    priorityWeight: getPriorityWeight(priority),
    allocatedXp: 0,
    earnedXp: 0,
    isCompleted: false,
    completedAt: null,
    density: null,
    memo: "",
    createdAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
  };
}

test("카테고리 잔여 XP를 미완료 투두 가중치로 분배한다", () => {
  const todos = recalculateAllocatedXp([
    makeTodo("고객 응대", "중요"),
    makeTodo("제안서 수정", "핵심"),
    makeTodo("자료 정리", "보통"),
  ]);

  const byId = Object.fromEntries(todos.map((todo) => [todo.id, todo.allocatedXp]));

  assert.equal(byId["고객 응대"], 33);
  assert.equal(byId["제안서 수정"], 45);
  assert.equal(byId["자료 정리"], 22);
});

test("완료된 투두의 지급 XP는 이후 재분배에서 고정된다", () => {
  const first = completeTodoWithDensity(
    [makeTodo("아침회의", "낮음"), makeTodo("제안서", "핵심")],
    "아침회의",
    "보통",
    "2026-05-11T09:00:00.000Z",
  );
  const afterAdd = recalculateAllocatedXp([
    ...first,
    makeTodo("고객 응대", "중요"),
  ]);
  const completed = afterAdd.find((todo) => todo.id === "아침회의");
  const proposal = afterAdd.find((todo) => todo.id === "제안서");
  const support = afterAdd.find((todo) => todo.id === "고객 응대");

  assert.equal(completed?.earnedXp, 20);
  assert.equal(completed?.allocatedXp, 20);
  assert.equal(proposal?.allocatedXp, 46);
  assert.equal(support?.allocatedXp, 34);
});

test("카테고리 합산 결과는 하루 전체 최대 XP를 넘지 않는다", () => {
  const todos = recalculateAllocatedXp([
    makeTodo("일", "핵심", "일"),
    makeTodo("공부", "핵심", "공부"),
    makeTodo("운동", "핵심", "운동"),
    makeTodo("대외활동", "핵심", "대외활동"),
    makeTodo("개인", "핵심", "개인"),
  ]);

  const totalAllocated = todos.reduce((sum, todo) => sum + todo.allocatedXp, 0);

  assert.equal(totalAllocated, DAILY_MAX_XP);
  todos.forEach((todo) => assert.ok(todo.allocatedXp >= 0));
});
