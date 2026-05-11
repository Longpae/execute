import { getCurrentWeekKey, nowIso } from "./date";
import { normalizeSchedule } from "./schedules";
import { syncProgressWithTodos } from "./stats";
import type { ExecuteState } from "./types";
import { recalculateAllocatedXp } from "./xp";

export const EXECUTE_STORAGE_KEY = "execute.local.v1";

type StorageDriver = {
  load: () => ExecuteState | null;
  save: (state: ExecuteState) => void;
};

export function createInitialState(): ExecuteState {
  const now = nowIso();

  return {
    schedules: [],
    todos: [],
    progress: {
      level: 1,
      totalXp: 0,
      currentWeekXp: 0,
      lastLevelUpWeek: null,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export const localStorageDriver: StorageDriver = {
  load() {
    if (typeof window === "undefined") return null;

    const raw = window.localStorage.getItem(EXECUTE_STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as ExecuteState;
      return normalizeState(parsed);
    } catch {
      return null;
    }
  },
  save(state) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EXECUTE_STORAGE_KEY, JSON.stringify(state));
  },
};

export function normalizeState(state: ExecuteState): ExecuteState {
  const todos = recalculateAllocatedXp(state.todos ?? []);
  const schedules = (state.schedules ?? []).map(normalizeSchedule);
  const progress = syncProgressWithTodos(
    state.progress ?? createInitialState().progress,
    todos,
    getCurrentWeekKey(),
  );

  return {
    schedules,
    todos,
    progress,
  };
}

export function resetStoredState(): ExecuteState {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(EXECUTE_STORAGE_KEY);
  }

  return createInitialState();
}
