import assert from "node:assert/strict";
import test from "node:test";
import type { Schedule } from "../lib/types";
import { getSchedulesForDate } from "../lib/schedules";

function makeSchedule(patch: Partial<Schedule>): Schedule {
  return {
    id: patch.id ?? "schedule",
    title: patch.title ?? "러닝",
    date: patch.date ?? "2026-05-11",
    startTime: patch.startTime ?? "06:30",
    memo: patch.memo ?? "",
    type: patch.type ?? "single",
    repeatType: patch.repeatType ?? "none",
    repeatDays: patch.repeatDays ?? [],
    isActive: patch.isActive ?? true,
    createdAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
  };
}

test("오늘 날짜의 단발 일정과 반복 조건에 맞는 고정 일정을 함께 표시한다", () => {
  const schedules = [
    makeSchedule({ id: "single", title: "회의", type: "single", date: "2026-05-13" }),
    makeSchedule({
      id: "weekday",
      title: "경제 공부",
      type: "recurring",
      repeatType: "weekday",
      date: "2026-05-01",
    }),
    makeSchedule({
      id: "weekend",
      title: "주말 산책",
      type: "recurring",
      repeatType: "weekend",
      date: "2026-05-01",
    }),
  ];

  const result = getSchedulesForDate(schedules, "2026-05-13");

  assert.deepEqual(
    result.map((schedule) => schedule.id),
    ["weekday", "single"],
  );
  assert.equal(result[0].badge, "고정");
  assert.equal(result[1].badge, "단발");
});

test("사용자 지정 요일 반복은 지정한 요일에만 표시한다", () => {
  const schedules = [
    makeSchedule({
      id: "custom",
      title: "대외활동 미팅",
      type: "recurring",
      repeatType: "custom",
      repeatDays: [1, 3, 5],
      date: "2026-05-01",
    }),
  ];

  assert.equal(getSchedulesForDate(schedules, "2026-05-13").length, 1);
  assert.equal(getSchedulesForDate(schedules, "2026-05-14").length, 0);
});
