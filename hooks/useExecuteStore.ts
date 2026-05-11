"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentWeekKey, nowIso } from "@/lib/date";
import {
  applyPendingWeeklyLevelUps,
  syncProgressWithTodos,
} from "@/lib/stats";
import {
  createInitialState,
  localStorageDriver,
  normalizeState,
  resetStoredState,
} from "@/lib/storage";
import type {
  Density,
  ExecuteState,
  Schedule,
  ScheduleDraft,
  Todo,
  TodoDraft,
} from "@/lib/types";
import {
  completeTodoWithDensity,
  getPriorityWeight,
  recalculateAllocatedXp,
} from "@/lib/xp";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function commitTodos(state: ExecuteState, todos: Todo[]): ExecuteState {
  const currentWeekKey = getCurrentWeekKey();
  const recalculatedTodos = recalculateAllocatedXp(todos);
  const leveledProgress = applyPendingWeeklyLevelUps(
    state.progress,
    recalculatedTodos,
    currentWeekKey,
  );
  const progress = syncProgressWithTodos(
    leveledProgress,
    recalculatedTodos,
    currentWeekKey,
  );

  return {
    ...state,
    todos: recalculatedTodos,
    progress,
  };
}

export function useExecuteStore() {
  const [state, setState] = useState<ExecuteState>(() => createInitialState());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loaded = localStorageDriver.load();
    setState(loaded ?? createInitialState());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    localStorageDriver.save(normalizeState(state));
  }, [isReady, state]);

  const addTodo = useCallback((draft: TodoDraft) => {
    setState((current) => {
      const now = nowIso();
      const todo: Todo = {
        id: createId("todo"),
        title: draft.title.trim(),
        date: draft.date,
        category: draft.category,
        priority: draft.priority,
        priorityWeight: getPriorityWeight(draft.priority),
        allocatedXp: 0,
        earnedXp: 0,
        isCompleted: false,
        completedAt: null,
        density: null,
        memo: draft.memo.trim(),
        createdAt: now,
        updatedAt: now,
      };

      return commitTodos(current, [...current.todos, todo]);
    });
  }, []);

  const updateTodoText = useCallback(
    (todoId: string, patch: Pick<TodoDraft, "title" | "memo">) => {
      setState((current) =>
        commitTodos(
          current,
          current.todos.map((todo) => {
            if (todo.id !== todoId) return todo;

            return {
              ...todo,
              title: patch.title.trim(),
              memo: patch.memo.trim(),
              updatedAt: nowIso(),
            };
          }),
        ),
      );
    },
    [],
  );

  const removeTodo = useCallback((todoId: string) => {
    setState((current) => {
      const target = current.todos.find((todo) => todo.id === todoId);
      if (target?.isCompleted) return current;

      return commitTodos(
        current,
        current.todos.filter((todo) => todo.id !== todoId),
      );
    });
  }, []);

  const completeTodo = useCallback((todoId: string, density: Density) => {
    setState((current) =>
      commitTodos(
        current,
        completeTodoWithDensity(current.todos, todoId, density, nowIso()),
      ),
    );
  }, []);

  const addSchedule = useCallback((draft: ScheduleDraft) => {
    setState((current) => {
      const now = nowIso();
      const schedule: Schedule = {
        id: createId("schedule"),
        title: draft.title.trim(),
        date: draft.date,
        startTime: draft.startTime,
        memo: draft.memo.trim(),
        type: draft.type,
        repeatType: draft.type === "single" ? "none" : draft.repeatType,
        repeatDays: draft.type === "recurring" ? draft.repeatDays : [],
        isActive: draft.type === "single" ? true : draft.isActive,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...current,
        schedules: [...current.schedules, schedule],
      };
    });
  }, []);

  const removeSchedule = useCallback((scheduleId: string) => {
    setState((current) => ({
      ...current,
      schedules: current.schedules.filter((schedule) => schedule.id !== scheduleId),
    }));
  }, []);

  const resetAllData = useCallback(() => {
    setState(resetStoredState());
  }, []);

  const readyState = useMemo(() => normalizeState(state), [state]);

  return {
    isReady,
    state: readyState,
    addTodo,
    updateTodoText,
    removeTodo,
    completeTodo,
    addSchedule,
    removeSchedule,
    resetAllData,
  };
}
