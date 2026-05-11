"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useExecuteStore } from "@/hooks/useExecuteStore";
import {
  formatKoreanDate,
  formatMonthLabel,
  getCalendarDays,
  getCurrentWeekKey,
  isSameMonth,
  toDateKey,
  todayKey,
} from "@/lib/date";
import {
  describeRepeatRule,
  getSchedulesForDate,
  REPEAT_TYPE_LABELS,
  WEEKDAY_OPTIONS,
  type ScheduleOccurrence,
} from "@/lib/schedules";
import {
  compareDensityPeriods,
  getMonthlyStats,
  getPreviousMonthlyStats,
  getPreviousWeekStats,
  getPreviousYearlyStats,
  getStreakDays,
  getWeeklyStats,
  getYearlyStats,
  type DensityComparison,
  type PeriodStats,
} from "@/lib/stats";
import {
  CATEGORIES,
  DENSITIES,
  PRIORITIES,
  type Category,
  type Density,
  type Schedule,
  type ScheduleDraft,
  type StatsPeriod,
  type TabKey,
  type Todo,
  type TodoDraft,
} from "@/lib/types";
import {
  DENSITY_META,
  DAILY_MAX_XP,
  getAverageDensityValue,
  getCategoryDailyXp,
  getDensitySymbolFromAverage,
  getRequiredXpForNextLevel,
} from "@/lib/xp";

const PHILOSOPHY =
  "계획이고 완료고 보다 중요한건 실행했는가, 그리고 얼마나 의식적으로 했는가 이다.";

const TABS: TabKey[] = ["오늘", "캘린더", "통계", "프로필"];
const STATS_PERIODS: StatsPeriod[] = ["주간", "월간", "연간"];

const CATEGORY_DENSITY_EXAMPLES: Record<Category, string[]> = {
  운동: ["음악 대신 오디오북", "시사 콘텐츠 청취", "집중 유지"],
  일: ["쉬는 시간 최소", "깊게 몰입", "회피하지 않음"],
  공부: ["필기", "복습", "이해 중심"],
  대외활동: ["상대에게 집중", "명확한 후속 액션", "관계의 질 점검"],
  개인: ["정리된 선택", "휴식의 질 확보", "감정 회피 줄이기"],
};

function createEmptyTodoDraft(date = todayKey()): TodoDraft {
  return {
    title: "",
    date,
    category: "일",
    priority: "보통",
    memo: "",
  };
}

function createEmptyScheduleDraft(date = todayKey()): ScheduleDraft {
  return {
    title: "",
    date,
    startTime: "09:00",
    memo: "",
    type: "single",
    repeatType: "none",
    repeatDays: [],
    isActive: true,
  };
}

function ProgressBar({
  value,
  max,
  compact = false,
}: {
  value: number;
  max: number;
  compact?: boolean;
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-[#2A2A2A] ${compact ? "h-1.5" : "h-2.5"}`}
    >
      <div
        className="h-full rounded-full bg-[#D9D9D9] transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function ShellCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[22px] border border-[#252525] bg-[#181818] p-5 shadow-soft ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({
  title,
  caption,
}: {
  title: string;
  caption?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="text-base font-semibold text-[#F3F3F3]">{title}</h2>
      {caption ? <p className="text-xs text-[#8B8B8B]">{caption}</p> : null}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-[#D9D9D9] text-[#0D0D0D]",
    secondary: "bg-[#242424] text-[#F3F3F3]",
    danger: "bg-[#F3F3F3] text-[#0D0D0D]",
    ghost: "bg-transparent text-[#8B8B8B]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-[18px] px-4 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-[#8B8B8B]">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-[18px] border border-[#2A2A2A] bg-[#202020] px-4 text-sm text-[#F3F3F3] outline-none placeholder:text-[#666666] focus:border-[#D9D9D9]"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-[#8B8B8B]">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full resize-none rounded-[18px] border border-[#2A2A2A] bg-[#202020] px-4 py-3 text-sm text-[#F3F3F3] outline-none placeholder:text-[#666666] focus:border-[#D9D9D9]"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-[#8B8B8B]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="min-h-12 w-full rounded-[18px] border border-[#2A2A2A] bg-[#202020] px-4 text-sm text-[#F3F3F3] outline-none focus:border-[#D9D9D9]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-16 backdrop-blur-sm">
      <div className="max-h-[88svh] w-full max-w-[430px] overflow-y-auto rounded-[24px] border border-[#2A2A2A] bg-[#181818] p-5 shadow-soft">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-[#F3F3F3]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-[#242424] text-sm font-semibold text-[#8B8B8B]"
            aria-label="닫기"
          >
            닫기
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TodoCard({
  todo,
  onComplete,
  onEdit,
  onRemove,
}: {
  todo: Todo;
  onComplete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onRemove: (todo: Todo) => void;
}) {
  return (
    <article className="rounded-[20px] border border-[#252525] bg-[#1D1D1D] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-medium text-[#8B8B8B]">
            [{todo.category}] 중요도: {todo.priority}
          </p>
          <h3 className="break-words text-base font-semibold leading-snug text-[#F3F3F3]">
            {todo.title}
          </h3>
          {todo.memo ? (
            <p className="mt-2 break-words text-sm leading-relaxed text-[#8B8B8B]">
              {todo.memo}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 rounded-full bg-[#242424] px-3 py-1 text-xs font-semibold text-[#D9D9D9]">
          {todo.isCompleted ? `+${todo.earnedXp} XP` : `+${todo.allocatedXp} XP`}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {todo.isCompleted ? (
          <>
            <span className="rounded-full bg-[#242424] px-3 py-2 text-xs text-[#D9D9D9]">
              완료됨
            </span>
            {todo.density ? (
              <span className="rounded-full bg-[#242424] px-3 py-2 text-xs text-[#8B8B8B]">
                실행 밀도 {DENSITY_META[todo.density].symbol} {todo.density}
              </span>
            ) : null}
          </>
        ) : (
          <ActionButton onClick={() => onComplete(todo)}>완료</ActionButton>
        )}
        <ActionButton variant="secondary" onClick={() => onEdit(todo)}>
          제목·메모 수정
        </ActionButton>
        {!todo.isCompleted ? (
          <ActionButton variant="ghost" onClick={() => onRemove(todo)}>
            삭제
          </ActionButton>
        ) : null}
      </div>
    </article>
  );
}

function ScheduleCard({
  schedule,
  onRemove,
}: {
  schedule: ScheduleOccurrence;
  onRemove?: (schedule: ScheduleOccurrence) => void;
}) {
  return (
    <article className="rounded-[20px] border border-[#252525] bg-[#1D1D1D] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-[#8B8B8B]">
            <span className="rounded-full bg-[#242424] px-2.5 py-1 text-[#D9D9D9]">
              [{schedule.badge}]
            </span>
            <span>{schedule.startTime}</span>
            {schedule.type === "recurring" ? <span>{describeRepeatRule(schedule)}</span> : null}
          </div>
          <h3 className="break-words text-base font-semibold leading-snug text-[#F3F3F3]">
            {schedule.title}
          </h3>
          {schedule.memo ? (
            <p className="mt-2 break-words text-sm leading-relaxed text-[#8B8B8B]">
              {schedule.memo}
            </p>
          ) : null}
        </div>
        {onRemove ? (
          <ActionButton variant="ghost" onClick={() => onRemove(schedule)}>
            삭제
          </ActionButton>
        ) : null}
      </div>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#2A2A2A] px-4 py-8 text-center text-sm text-[#8B8B8B]">
      {text}
    </div>
  );
}

export function ExecuteApp() {
  const {
    isReady,
    state,
    addTodo,
    updateTodoText,
    removeTodo,
    completeTodo,
    addSchedule,
    removeSchedule,
    resetAllData,
  } = useExecuteStore();

  const [activeTab, setActiveTab] = useState<TabKey>("오늘");
  const [todoDraft, setTodoDraft] = useState<TodoDraft>(() => createEmptyTodoDraft());
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(() =>
    createEmptyScheduleDraft(),
  );
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [densityTodo, setDensityTodo] = useState<Todo | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", memo: "" });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("주간");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 서비스 워커 등록 실패는 앱 실행을 막지 않습니다.
    });
  }, []);

  const currentDateKey = todayKey();
  const currentWeekKey = getCurrentWeekKey();
  const nextLevelXp = getRequiredXpForNextLevel(state.progress.level);
  const weeklyStats = useMemo(
    () => getWeeklyStats(state.todos, currentWeekKey),
    [currentWeekKey, state.todos],
  );
  const streakDays = useMemo(() => getStreakDays(state.todos), [state.todos]);
  const monthStats = useMemo(() => getMonthlyStats(state.todos, new Date()), [state.todos]);
  const yearStats = useMemo(() => getYearlyStats(state.todos, new Date()), [state.todos]);
  const selectedPeriodStats = useMemo(() => {
    if (statsPeriod === "월간") return monthStats;
    if (statsPeriod === "연간") return yearStats;
    return weeklyStats;
  }, [monthStats, statsPeriod, weeklyStats, yearStats]);
  const previousPeriodStats = useMemo(() => {
    if (statsPeriod === "월간") return getPreviousMonthlyStats(state.todos, new Date());
    if (statsPeriod === "연간") return getPreviousYearlyStats(state.todos, new Date());
    return getPreviousWeekStats(state.todos, currentWeekKey);
  }, [currentWeekKey, state.todos, statsPeriod]);
  const densityComparison = useMemo(
    () => compareDensityPeriods(selectedPeriodStats, previousPeriodStats),
    [previousPeriodStats, selectedPeriodStats],
  );

  const todayTodos = useMemo(
    () =>
      state.todos
        .filter((todo) => todo.date === currentDateKey)
        .sort((a, b) => {
          if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
          return b.allocatedXp - a.allocatedXp;
        }),
    [currentDateKey, state.todos],
  );

  const todaySchedules = useMemo(
    () => getSchedulesForDate(state.schedules, currentDateKey),
    [currentDateKey, state.schedules],
  );

  const todayCategoryXp = useMemo(
    () => getCategoryDailyXp(state.todos, currentDateKey),
    [currentDateKey, state.todos],
  );

  function openTodoModal(date = currentDateKey) {
    setTodoDraft(createEmptyTodoDraft(date));
    setIsTodoModalOpen(true);
  }

  function openScheduleModal(date = currentDateKey) {
    setScheduleDraft(createEmptyScheduleDraft(date));
    setIsScheduleModalOpen(true);
  }

  function handleTodoSubmit(event: FormEvent) {
    event.preventDefault();
    if (!todoDraft.title.trim()) return;

    addTodo(todoDraft);
    setIsTodoModalOpen(false);
  }

  function handleScheduleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!scheduleDraft.title.trim()) return;

    const startDay = new Date(`${scheduleDraft.date}T00:00:00`).getDay();
    addSchedule({
      ...scheduleDraft,
      repeatDays:
        scheduleDraft.type === "recurring" &&
        (scheduleDraft.repeatType === "custom" || scheduleDraft.repeatType === "weekly") &&
        scheduleDraft.repeatDays.length === 0
          ? [startDay]
          : scheduleDraft.repeatDays,
    });
    setIsScheduleModalOpen(false);
  }

  function updateScheduleType(type: ScheduleDraft["type"]) {
    setScheduleDraft((draft) => ({
      ...draft,
      type,
      repeatType: type === "single" ? "none" : "daily",
      repeatDays: [],
      isActive: true,
    }));
  }

  function toggleRepeatDay(day: number) {
    setScheduleDraft((draft) => {
      const exists = draft.repeatDays.includes(day);
      return {
        ...draft,
        repeatDays: exists
          ? draft.repeatDays.filter((item) => item !== day)
          : [...draft.repeatDays, day].sort((a, b) => a - b),
      };
    });
  }

  function openEditTodoModal(todo: Todo) {
    setEditingTodo(todo);
    setEditDraft({ title: todo.title, memo: todo.memo });
  }

  function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingTodo || !editDraft.title.trim()) return;

    updateTodoText(editingTodo.id, editDraft);
    setEditingTodo(null);
  }

  function handleDensitySelect(density: Density) {
    if (!densityTodo) return;

    completeTodo(densityTodo.id, density);
    setDensityTodo(null);
  }

  function moveMonth(amount: number) {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  }

  if (!isReady) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#0D0D0D] px-6 text-center text-sm text-[#8B8B8B]">
        Execute를 준비하는 중입니다.
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-[#0D0D0D] text-[#F3F3F3]">
      <div className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pb-28 pt-4 safe-top">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#8B8B8B]">
              Execute
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#F3F3F3]">
              {activeTab}
            </h1>
          </div>
          <div className="rounded-full border border-[#2A2A2A] bg-[#181818] px-4 py-2 text-sm font-semibold text-[#D9D9D9]">
            LV.{state.progress.level}
          </div>
        </header>

        {activeTab === "오늘" ? (
          <TodayView
            nextLevelXp={nextLevelXp}
            weeklyXp={state.progress.currentWeekXp}
            todaySchedules={todaySchedules}
            todayTodos={todayTodos}
            todayCategoryXp={todayCategoryXp}
            onAddTodo={() => openTodoModal()}
            onAddSchedule={() => openScheduleModal()}
            onCompleteTodo={setDensityTodo}
            onEditTodo={openEditTodoModal}
            onRemoveTodo={removeTodo}
            onRemoveSchedule={removeSchedule}
          />
        ) : null}

        {activeTab === "캘린더" ? (
          <CalendarView
            month={calendarMonth}
            todos={state.todos}
            schedules={state.schedules}
            onMoveMonth={moveMonth}
            onToday={() => setCalendarMonth(new Date())}
            onAddTodo={openTodoModal}
            onAddSchedule={openScheduleModal}
          />
        ) : null}

        {activeTab === "통계" ? (
          <StatsView
            period={statsPeriod}
            onPeriodChange={setStatsPeriod}
            stats={selectedPeriodStats}
            comparison={densityComparison}
            streakDays={streakDays}
          />
        ) : null}

        {activeTab === "프로필" ? (
          <ProfileView
            level={state.progress.level}
            totalXp={state.progress.totalXp}
            currentWeekXp={state.progress.currentWeekXp}
            nextLevelXp={nextLevelXp}
            onReset={() => setIsResetModalOpen(true)}
          />
        ) : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#222222] bg-[#0D0D0D]/92 px-4 pb-3 pt-2 backdrop-blur-xl safe-bottom">
        <div className="mx-auto grid max-w-[430px] grid-cols-4 gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`h-12 rounded-[18px] text-sm font-semibold transition active:scale-[0.98] ${
                  isActive
                    ? "bg-[#D9D9D9] text-[#0D0D0D]"
                    : "bg-[#181818] text-[#8B8B8B]"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      {isTodoModalOpen ? (
        <Modal title="할 일 추가" onClose={() => setIsTodoModalOpen(false)}>
          <form className="space-y-4" onSubmit={handleTodoSubmit}>
            <TextField
              label="제목"
              value={todoDraft.title}
              onChange={(title) => setTodoDraft((draft) => ({ ...draft, title }))}
              placeholder="미국 경제 공부"
            />
            <TextField
              label="날짜"
              type="date"
              value={todoDraft.date}
              onChange={(date) => setTodoDraft((draft) => ({ ...draft, date }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="카테고리"
                value={todoDraft.category}
                options={CATEGORIES}
                onChange={(category) =>
                  setTodoDraft((draft) => ({ ...draft, category }))
                }
              />
              <SelectField
                label="중요도"
                value={todoDraft.priority}
                options={PRIORITIES}
                onChange={(priority) =>
                  setTodoDraft((draft) => ({ ...draft, priority }))
                }
              />
            </div>
            <TextAreaField
              label="메모"
              value={todoDraft.memo}
              onChange={(memo) => setTodoDraft((draft) => ({ ...draft, memo }))}
              placeholder="실행 전 기준이나 맥락"
            />
            <ActionButton type="submit" disabled={!todoDraft.title.trim()}>
              할 일 저장
            </ActionButton>
          </form>
        </Modal>
      ) : null}

      {isScheduleModalOpen ? (
        <Modal title="일정 추가" onClose={() => setIsScheduleModalOpen(false)}>
          <form className="space-y-4" onSubmit={handleScheduleSubmit}>
            <div>
              <span className="mb-2 block text-xs font-medium text-[#8B8B8B]">일정 유형</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "single", label: "단발 일정" },
                  { value: "recurring", label: "고정 일정" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateScheduleType(option.value as ScheduleDraft["type"])}
                    className={`min-h-11 rounded-[18px] text-sm font-semibold transition active:scale-[0.98] ${
                      scheduleDraft.type === option.value
                        ? "bg-[#D9D9D9] text-[#0D0D0D]"
                        : "bg-[#242424] text-[#8B8B8B]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <TextField
              label="제목"
              value={scheduleDraft.title}
              onChange={(title) => setScheduleDraft((draft) => ({ ...draft, title }))}
              placeholder="Washwell 장인호 대표 미팅"
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label={scheduleDraft.type === "recurring" ? "시작 날짜" : "날짜"}
                type="date"
                value={scheduleDraft.date}
                onChange={(date) => setScheduleDraft((draft) => ({ ...draft, date }))}
              />
              <TextField
                label="시작 시간"
                type="time"
                value={scheduleDraft.startTime}
                onChange={(startTime) =>
                  setScheduleDraft((draft) => ({ ...draft, startTime }))
                }
              />
            </div>
            {scheduleDraft.type === "recurring" ? (
              <div className="space-y-4 rounded-[20px] bg-[#202020] p-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[#8B8B8B]">
                    반복 유형
                  </span>
                  <select
                    value={scheduleDraft.repeatType}
                    onChange={(event) =>
                      setScheduleDraft((draft) => ({
                        ...draft,
                        repeatType: event.target.value as ScheduleDraft["repeatType"],
                        repeatDays:
                          event.target.value === "custom" || event.target.value === "weekly"
                            ? draft.repeatDays
                            : [],
                      }))
                    }
                    className="min-h-12 w-full rounded-[18px] border border-[#2A2A2A] bg-[#181818] px-4 text-sm text-[#F3F3F3] outline-none focus:border-[#D9D9D9]"
                  >
                    {(["daily", "weekly", "monthly", "weekday", "weekend", "custom"] as const).map(
                      (repeatType) => (
                        <option key={repeatType} value={repeatType}>
                          {REPEAT_TYPE_LABELS[repeatType]}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {scheduleDraft.repeatType === "custom" || scheduleDraft.repeatType === "weekly" ? (
                  <div>
                    <span className="mb-2 block text-xs font-medium text-[#8B8B8B]">
                      반복 요일
                    </span>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const isSelected = scheduleDraft.repeatDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleRepeatDay(day.value)}
                            className={`h-10 rounded-[14px] text-xs font-semibold ${
                              isSelected
                                ? "bg-[#D9D9D9] text-[#0D0D0D]"
                                : "bg-[#181818] text-[#8B8B8B]"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <label className="flex items-center justify-between gap-4 rounded-[18px] bg-[#181818] px-4 py-3">
                  <span className="text-sm font-medium text-[#F3F3F3]">활성화</span>
                  <input
                    type="checkbox"
                    checked={scheduleDraft.isActive}
                    onChange={(event) =>
                      setScheduleDraft((draft) => ({
                        ...draft,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-5 w-5 accent-[#D9D9D9]"
                  />
                </label>
              </div>
            ) : null}
            <TextAreaField
              label="메모"
              value={scheduleDraft.memo}
              onChange={(memo) => setScheduleDraft((draft) => ({ ...draft, memo }))}
              placeholder="장소, 준비물, 논의할 내용"
            />
            <ActionButton type="submit" disabled={!scheduleDraft.title.trim()}>
              일정 저장
            </ActionButton>
          </form>
        </Modal>
      ) : null}

      {densityTodo ? (
        <Modal title="실행 밀도 체크" onClose={() => setDensityTodo(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-base font-semibold text-[#F3F3F3]">
                얼마나 의식적으로 실행했나요?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#8B8B8B]">
                실행 밀도는 XP 보상과 연결하지 않고 자기 객관화 통계로만 사용합니다.
              </p>
            </div>
            <div className="space-y-2">
              {DENSITIES.map((density) => (
                <button
                  key={density}
                  type="button"
                  onClick={() => handleDensitySelect(density)}
                  className="w-full rounded-[20px] border border-[#2A2A2A] bg-[#202020] p-4 text-left transition active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[#F3F3F3]">
                      {DENSITY_META[density].symbol} {density}
                    </span>
                    <span className="text-xs text-[#8B8B8B]">
                      {DENSITY_META[density].shortDescription}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#8B8B8B]">
                    {DENSITY_META[density].description}
                  </p>
                </button>
              ))}
            </div>
            <div className="rounded-[20px] bg-[#202020] p-4">
              <p className="mb-2 text-xs font-semibold text-[#8B8B8B]">
                {densityTodo.category} 기준 예시
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_DENSITY_EXAMPLES[densityTodo.category].map((example) => (
                  <span
                    key={example}
                    className="rounded-full bg-[#2A2A2A] px-3 py-1.5 text-xs text-[#D9D9D9]"
                  >
                    {example}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {editingTodo ? (
        <Modal title="할 일 수정" onClose={() => setEditingTodo(null)}>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <TextField
              label="제목"
              value={editDraft.title}
              onChange={(title) => setEditDraft((draft) => ({ ...draft, title }))}
            />
            <TextAreaField
              label="메모"
              value={editDraft.memo}
              onChange={(memo) => setEditDraft((draft) => ({ ...draft, memo }))}
            />
            {editingTodo.isCompleted ? (
              <p className="rounded-[18px] bg-[#202020] px-4 py-3 text-xs leading-relaxed text-[#8B8B8B]">
                완료된 할 일은 카테고리, 중요도, 지급 XP, 완료 시간, 실행 밀도를 수정할 수 없습니다.
              </p>
            ) : null}
            <ActionButton type="submit" disabled={!editDraft.title.trim()}>
              수정 저장
            </ActionButton>
          </form>
        </Modal>
      ) : null}

      {isResetModalOpen ? (
        <Modal title="데이터 초기화" onClose={() => setIsResetModalOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-[#8B8B8B]">
              모든 일정, 할 일, XP, 레벨 데이터를 이 기기에서 초기화합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <ActionButton variant="secondary" onClick={() => setIsResetModalOpen(false)}>
                취소
              </ActionButton>
              <ActionButton
                variant="danger"
                onClick={() => {
                  resetAllData();
                  setIsResetModalOpen(false);
                }}
              >
                초기화
              </ActionButton>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function TodayView({
  nextLevelXp,
  weeklyXp,
  todaySchedules,
  todayTodos,
  todayCategoryXp,
  onAddTodo,
  onAddSchedule,
  onCompleteTodo,
  onEditTodo,
  onRemoveTodo,
  onRemoveSchedule,
}: {
  nextLevelXp: number;
  weeklyXp: number;
  todaySchedules: ScheduleOccurrence[];
  todayTodos: Todo[];
  todayCategoryXp: ReturnType<typeof getCategoryDailyXp>;
  onAddTodo: () => void;
  onAddSchedule: () => void;
  onCompleteTodo: (todo: Todo) => void;
  onEditTodo: (todo: Todo) => void;
  onRemoveTodo: (todoId: string) => void;
  onRemoveSchedule: (scheduleId: string) => void;
}) {
  const todayEarnedXp = todayCategoryXp.reduce((sum, item) => sum + item.earnedXp, 0);
  const hasReachedLevelUp = weeklyXp >= nextLevelXp;

  return (
    <div className="space-y-5">
      <ShellCard>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-[#8B8B8B]">이번 주 진행도</p>
            <p className="mt-1 text-2xl font-semibold text-[#F3F3F3]">
              {weeklyXp} / {nextLevelXp} XP
            </p>
          </div>
          <p className="text-xs text-[#8B8B8B]">목표 XP</p>
        </div>
        <ProgressBar value={weeklyXp} max={nextLevelXp} />
        {hasReachedLevelUp ? (
          <div className="mt-3 rounded-[18px] bg-[#202020] px-4 py-3 text-sm leading-relaxed text-[#D9D9D9]">
            이번 주 레벨업 조건 달성 · 주간 정산 시 다음 레벨로 상승합니다.
          </div>
        ) : (
          <p className="mt-3 text-xs text-[#8B8B8B]">
            다음 레벨까지 {Math.max(0, nextLevelXp - weeklyXp)} XP 남았습니다.
          </p>
        )}
        <p className="mt-3 text-xs text-[#8B8B8B]">
          오늘 획득 {todayEarnedXp} / {DAILY_MAX_XP} XP
        </p>
      </ShellCard>

      <div className="grid grid-cols-2 gap-3">
        <ActionButton onClick={onAddSchedule}>일정 추가</ActionButton>
        <ActionButton onClick={onAddTodo}>할 일 추가</ActionButton>
      </div>

      <ShellCard>
        <SectionTitle title="오늘 일정" caption={formatKoreanDate(todayKey())} />
        <div className="space-y-3">
          {todaySchedules.length > 0 ? (
            todaySchedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onRemove={(item) => onRemoveSchedule(item.id)}
              />
            ))
          ) : (
            <EmptyState text="오늘 등록된 일정이 없습니다." />
          )}
        </div>
      </ShellCard>

      <ShellCard>
        <SectionTitle title="오늘 할 일" />
        <div className="space-y-3">
          {todayTodos.length > 0 ? (
            todayTodos.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onComplete={onCompleteTodo}
                onEdit={onEditTodo}
                onRemove={(item) => onRemoveTodo(item.id)}
              />
            ))
          ) : (
            <EmptyState text="오늘 실행할 할 일이 없습니다." />
          )}
        </div>
      </ShellCard>

      <ShellCard>
        <SectionTitle title="오늘 XP 현황" />
        <div className="space-y-4">
          {todayCategoryXp.map((item) => (
            <div key={item.category}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-[#F3F3F3]">{item.category}</span>
                <span className="text-[#8B8B8B]">
                  {item.earnedXp} / {item.maxXp} XP
                </span>
              </div>
              <ProgressBar value={item.earnedXp} max={item.maxXp} compact />
            </div>
          ))}
        </div>
      </ShellCard>

      <p className="px-2 pb-2 text-center text-xs leading-relaxed text-[#8B8B8B]">
        “{PHILOSOPHY}”
      </p>
    </div>
  );
}

function CalendarView({
  month,
  todos,
  schedules,
  onMoveMonth,
  onToday,
  onAddTodo,
  onAddSchedule,
}: {
  month: Date;
  todos: Todo[];
  schedules: Schedule[];
  onMoveMonth: (amount: number) => void;
  onToday: () => void;
  onAddTodo: (date: string) => void;
  onAddSchedule: (date: string) => void;
}) {
  const days = getCalendarDays(month);
  const current = todayKey();
  const [selectedDate, setSelectedDate] = useState(current);
  const selectedTodos = todos
    .filter((todo) => todo.date === selectedDate)
    .sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return b.allocatedXp - a.allocatedXp;
    });
  const selectedCompletedTodos = selectedTodos.filter((todo) => todo.isCompleted);
  const selectedPendingTodos = selectedTodos.filter((todo) => !todo.isCompleted);
  const selectedSchedules = getSchedulesForDate(schedules, selectedDate);
  const selectedXp = selectedCompletedTodos.reduce((sum, todo) => sum + todo.earnedXp, 0);
  const selectedCompletionRate =
    selectedTodos.length === 0
      ? 0
      : Math.round((selectedCompletedTodos.length / selectedTodos.length) * 100);
  const selectedAverageDensity = getAverageDensityValue(selectedCompletedTodos);
  const selectedDensitySymbol = getDensitySymbolFromAverage(selectedAverageDensity);

  return (
    <div className="space-y-5">
      <ShellCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onMoveMonth(-1)}
            className="h-10 w-10 rounded-full bg-[#242424] text-[#D9D9D9]"
            aria-label="이전 달"
          >
            ‹
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-[#F3F3F3]">
              {formatMonthLabel(month)}
            </h2>
            <button
              type="button"
              onClick={onToday}
              className="mt-1 text-xs font-medium text-[#8B8B8B]"
            >
              오늘로 이동
            </button>
          </div>
          <button
            type="button"
            onClick={() => onMoveMonth(1)}
            className="h-10 w-10 rounded-full bg-[#242424] text-[#D9D9D9]"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold text-[#8B8B8B]">
          {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const dateKey = toDateKey(day);
            const dayTodos = todos.filter((todo) => todo.date === dateKey);
            const completed = dayTodos.filter((todo) => todo.isCompleted);
            const completionRate =
              dayTodos.length === 0 ? 0 : (completed.length / dayTodos.length) * 100;
            const densitySymbol = getDensitySymbolFromAverage(
              getAverageDensityValue(completed),
            );
            const isCurrentMonth = isSameMonth(dateKey, month);
            const isToday = dateKey === current;
            const isSelected = dateKey === selectedDate;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={`aspect-square rounded-[18px] border p-2 text-left transition active:scale-[0.98] ${
                  isSelected
                    ? "border-[#F3F3F3] bg-[#2A2A2A]"
                    : isToday
                    ? "border-[#D9D9D9] bg-[#242424]"
                    : "border-[#252525] bg-[#181818]"
                } ${isCurrentMonth ? "opacity-100" : "opacity-35"}`}
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-semibold text-[#F3F3F3]">
                      {day.getDate()}
                    </span>
                    <span className="text-[10px] text-[#8B8B8B]">{densitySymbol}</span>
                  </div>
                  <div>
                    <ProgressBar value={completionRate} max={100} compact />
                    <p className="mt-1 text-[10px] text-[#8B8B8B]">
                      {dayTodos.length === 0 ? "0" : `${completed.length}/${dayTodos.length}`}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ShellCard>

      <ShellCard>
        <SectionTitle title="날짜 상세" caption={formatKoreanDate(selectedDate)} />
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[18px] bg-[#202020] p-3">
            <p className="text-[11px] text-[#8B8B8B]">총 XP</p>
            <p className="mt-1 text-lg font-semibold text-[#F3F3F3]">{selectedXp}</p>
          </div>
          <div className="rounded-[18px] bg-[#202020] p-3">
            <p className="text-[11px] text-[#8B8B8B]">완료율</p>
            <p className="mt-1 text-lg font-semibold text-[#F3F3F3]">
              {selectedCompletionRate}%
            </p>
          </div>
          <div className="rounded-[18px] bg-[#202020] p-3">
            <p className="text-[11px] text-[#8B8B8B]">평균 밀도</p>
            <p className="mt-1 text-lg font-semibold text-[#F3F3F3]">
              {selectedDensitySymbol} {selectedAverageDensity.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ActionButton onClick={() => onAddSchedule(selectedDate)}>일정 추가</ActionButton>
          <ActionButton onClick={() => onAddTodo(selectedDate)}>할 일 추가</ActionButton>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <SectionTitle title="일정 목록" />
            <div className="space-y-2">
              {selectedSchedules.length > 0 ? (
                selectedSchedules.map((schedule) => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))
              ) : (
                <EmptyState text="이 날짜의 일정이 없습니다." />
              )}
            </div>
          </div>

          <div>
            <SectionTitle title="완료한 할 일" />
            <div className="space-y-2">
              {selectedCompletedTodos.length > 0 ? (
                selectedCompletedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="rounded-[18px] bg-[#202020] px-4 py-3 text-sm text-[#D9D9D9]"
                  >
                    [{todo.category}] {todo.title} · +{todo.earnedXp} XP
                  </div>
                ))
              ) : (
                <EmptyState text="완료한 할 일이 없습니다." />
              )}
            </div>
          </div>

          <div>
            <SectionTitle title="미완료 할 일" />
            <div className="space-y-2">
              {selectedPendingTodos.length > 0 ? (
                selectedPendingTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="rounded-[18px] bg-[#202020] px-4 py-3 text-sm text-[#8B8B8B]"
                  >
                    [{todo.category}] {todo.title} · 예정 +{todo.allocatedXp} XP
                  </div>
                ))
              ) : (
                <EmptyState text="미완료 할 일이 없습니다." />
              )}
            </div>
          </div>
        </div>
      </ShellCard>

      <ShellCard>
        <SectionTitle title="밀도 표기" />
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-[#8B8B8B]">
          <span className="rounded-[18px] bg-[#202020] px-2 py-3">○ 형식적 수행</span>
          <span className="rounded-[18px] bg-[#202020] px-2 py-3">◐ 보통</span>
          <span className="rounded-[18px] bg-[#202020] px-2 py-3">● 몰입 수행</span>
        </div>
      </ShellCard>
    </div>
  );
}

function formatSigned(value: number, suffix = ""): string {
  if (value > 0) return `+${value}${suffix}`;
  return `${value}${suffix}`;
}

function StatsView({
  period,
  onPeriodChange,
  stats,
  comparison,
  streakDays,
}: {
  period: StatsPeriod;
  onPeriodChange: (period: StatsPeriod) => void;
  stats: PeriodStats;
  comparison: DensityComparison;
  streakDays: number;
}) {
  const densitySymbol = getDensitySymbolFromAverage(stats.averageDensity);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {STATS_PERIODS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPeriodChange(item)}
            className={`h-11 rounded-[18px] text-sm font-semibold transition active:scale-[0.98] ${
              period === item
                ? "bg-[#D9D9D9] text-[#0D0D0D]"
                : "bg-[#181818] text-[#8B8B8B]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <ShellCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[#8B8B8B]">{stats.periodLabel} 총 XP</p>
            <p className="mt-1 text-4xl font-semibold text-[#F3F3F3]">
              {stats.totalXp}
            </p>
          </div>
          <div className="rounded-[20px] bg-[#D9D9D9] px-4 py-3 text-center text-[#0D0D0D]">
            <p className="text-xs font-semibold">등급</p>
            <p className="text-2xl font-bold">{stats.grade}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#8B8B8B]">“{stats.message}”</p>
      </ShellCard>

      <div className="grid grid-cols-2 gap-3">
        <ShellCard className="p-4">
          <p className="text-xs text-[#8B8B8B]">완료한 투두</p>
          <p className="mt-2 text-2xl font-semibold text-[#F3F3F3]">
            {stats.completedCount}개
          </p>
          <p className="mt-1 text-xs text-[#8B8B8B]">완료율 {stats.completionRate}%</p>
        </ShellCard>
        <ShellCard className="p-4">
          <p className="text-xs text-[#8B8B8B]">평균 실행 밀도</p>
          <p className="mt-2 text-2xl font-semibold text-[#F3F3F3]">
            {densitySymbol} {stats.averageDensity.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-[#8B8B8B]">밀도율 {stats.densityRate}%</p>
        </ShellCard>
      </div>

      <ShellCard>
        <SectionTitle title="밀도 분석" caption={`${stats.periodLabel} ${stats.densityRate}%`} />
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[18px] bg-[#202020] p-3">
            <p className="text-[11px] text-[#8B8B8B]">현재</p>
            <p className="mt-1 text-xl font-semibold text-[#F3F3F3]">
              {comparison.currentDensityRate}%
            </p>
          </div>
          <div className="rounded-[18px] bg-[#202020] p-3">
            <p className="text-[11px] text-[#8B8B8B]">이전</p>
            <p className="mt-1 text-xl font-semibold text-[#F3F3F3]">
              {comparison.hasPreviousData ? `${comparison.previousDensityRate}%` : "-"}
            </p>
          </div>
          <div className="rounded-[18px] bg-[#202020] p-3">
            <p className="text-[11px] text-[#8B8B8B]">변화</p>
            <p className="mt-1 text-xl font-semibold text-[#F3F3F3]">
              {comparison.hasPreviousData
                ? formatSigned(comparison.densityRateChange, "%")
                : "-"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#8B8B8B]">
          해석: {comparison.interpretation}
        </p>
        {comparison.hasPreviousData ? (
          <p className="mt-2 text-xs text-[#8B8B8B]">
            XP 변화 {formatSigned(comparison.totalXpChange, " XP")} · 완료 수 변화{" "}
            {formatSigned(comparison.completedCountChange, "개")}
          </p>
        ) : null}
      </ShellCard>

      <ShellCard>
        <SectionTitle title={`${period} 상세`} caption={`연속 실행일 ${streakDays}일`} />
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[18px] bg-[#202020] p-4">
            <p className="text-xs text-[#8B8B8B]">완료율</p>
            <p className="mt-2 text-xl font-semibold text-[#F3F3F3]">
              {stats.completionRate}%
            </p>
          </div>
          <div className="rounded-[18px] bg-[#202020] p-4">
            <p className="text-xs text-[#8B8B8B]">밀도율</p>
            <p className="mt-2 text-xl font-semibold text-[#F3F3F3]">
              {stats.densityRate}%
            </p>
          </div>
        </div>
      </ShellCard>

      {stats.trend.length > 0 ? (
        <ShellCard>
          <SectionTitle
            title={period === "연간" ? "월별 밀도 변화" : "주차별 밀도 변화"}
            caption={
              stats.highestDensityLabel
                ? `최고 밀도 ${stats.highestDensityLabel}`
                : undefined
            }
          />
          <div className="space-y-3">
            {stats.trend.map((point) => (
              <div key={point.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[#F3F3F3]">{point.label}</span>
                  <span className="text-[#8B8B8B]">
                    {point.densityRate}% · {point.totalXp} XP
                  </span>
                </div>
                <ProgressBar value={point.densityRate} max={100} compact />
              </div>
            ))}
          </div>
          {period === "연간" ? (
            <p className="mt-4 text-xs text-[#8B8B8B]">
              가장 실행량이 높았던 달: {stats.highestXpLabel ?? "아직 없음"}
            </p>
          ) : null}
        </ShellCard>
      ) : null}

      <ShellCard>
        <SectionTitle title="카테고리별 실행" />
        <div className="space-y-4">
          {stats.categoryStats.map((stat) => (
            <div key={stat.category}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-[#F3F3F3]">{stat.category}</span>
                <span className="text-[#8B8B8B]">
                  {stat.earnedXp} XP · 완료 {stat.completionRate}% · 밀도{" "}
                  {stat.densityRate}%
                </span>
              </div>
              <ProgressBar value={stat.completionRate} max={100} compact />
            </div>
          ))}
        </div>
      </ShellCard>
    </div>
  );
}

function ProfileView({
  level,
  totalXp,
  currentWeekXp,
  nextLevelXp,
  onReset,
}: {
  level: number;
  totalXp: number;
  currentWeekXp: number;
  nextLevelXp: number;
  onReset: () => void;
}) {
  const hasReachedLevelUp = currentWeekXp >= nextLevelXp;

  return (
    <div className="space-y-5">
      <ShellCard>
        <p className="text-sm text-[#8B8B8B]">현재 레벨</p>
        <p className="mt-1 text-5xl font-semibold text-[#F3F3F3]">LV.{level}</p>
        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-[#8B8B8B]">이번 주 XP</span>
              <span className="text-[#F3F3F3]">
                {currentWeekXp} / {nextLevelXp}
              </span>
            </div>
            <ProgressBar value={currentWeekXp} max={nextLevelXp} />
            {hasReachedLevelUp ? (
              <p className="mt-3 rounded-[18px] bg-[#202020] px-4 py-3 text-sm text-[#D9D9D9]">
                이번 주 레벨업 조건 달성 · 주간 정산 시 LV.{level + 1}로 상승합니다.
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[20px] bg-[#202020] p-4">
              <p className="text-xs text-[#8B8B8B]">총 누적 XP</p>
              <p className="mt-2 text-xl font-semibold text-[#F3F3F3]">{totalXp}</p>
            </div>
            <div className="rounded-[20px] bg-[#202020] p-4">
              <p className="text-xs text-[#8B8B8B]">다음 레벨까지</p>
              <p className="mt-2 text-xl font-semibold text-[#F3F3F3]">
                {Math.max(0, nextLevelXp - currentWeekXp)} XP
              </p>
            </div>
          </div>
        </div>
      </ShellCard>

      <ShellCard>
        <SectionTitle title="앱 철학" />
        <p className="text-sm leading-relaxed text-[#D9D9D9]">“{PHILOSOPHY}”</p>
      </ShellCard>

      <ShellCard>
        <SectionTitle title="PWA 설치 안내" />
        <p className="text-sm leading-relaxed text-[#8B8B8B]">
          iPhone Safari에서 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하면 앱처럼 사용할 수 있습니다.
        </p>
      </ShellCard>

      <ShellCard>
        <SectionTitle title="데이터 관리" />
        <ActionButton variant="secondary" onClick={onReset}>
          데이터 초기화
        </ActionButton>
      </ShellCard>
    </div>
  );
}
