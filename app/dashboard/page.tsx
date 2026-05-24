"use client";

import {
  useGetTodos,
  useCreateTodo,
  useDeleteTodo,
  useToggleTodo,
} from "@/hooks/use-todos";
import { useAlarm } from "@/hooks/use-alarm";
import { DueCountdown } from "@/components/due-countdown";
import { useUser } from "@clerk/nextjs";
import { useCallback, useMemo, useState } from "react";

const categories: Record<string, string> = {
  Work: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  Design: "bg-green-500/10 text-green-300 border-green-500/20",
  Personal: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  General: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
};

const categoryDots: Record<string, string> = {
  Work: "bg-purple-400",
  Design: "bg-green-400",
  Personal: "bg-orange-400",
  General: "bg-zinc-400",
};

const priorities: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const priorityText: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-green-400",
};

function formatDueDate(date: Date | string | null) {
  if (!date) return null;

  const d = new Date(date);
  const now = new Date();

  const isOverdue = d < now;
  const isToday = d.toDateString() === now.toDateString();

  const formatted = d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return { formatted, isOverdue, isToday };
}

export default function TodoPage() {
  const { user } = useUser();

  const { data: todos = [], isLoading } = useGetTodos();

  const { mutate: createTodo, isPending: isCreating } = useCreateTodo();

  const { mutate: deleteTodo, isPending: isDeleting } = useDeleteTodo();

  const { mutate: toggleTodo, isPending: isToggling } = useToggleTodo();

  const { triggerAlarm, stopAlarm, firingIds } = useAlarm();

  const [task, setTask] = useState("");
  const [category, setCategory] = useState("Work");
  const [priority, setPriority] = useState("medium");
  const [dueAt, setDueAt] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [dismissedAlarms, setDismissedAlarms] = useState<Set<string>>(
    new Set(),
  );

  const handleAlarm = useCallback(
    (id: string, text: string) => {
      if (dismissedAlarms.has(id)) return;

      triggerAlarm(id, text);
    },
    [triggerAlarm, dismissedAlarms],
  );

  const handleDismiss = (id: string) => {
    stopAlarm(id);

    setDismissedAlarms((prev) => new Set([...prev, id]));
  };

  const addTodo = () => {
    if (!task.trim()) return;

    createTodo(
      {
        text: task,
        priority,
        category,
        dueAt: dueAt || undefined,
      },
      {
        onSuccess: () => {
          setTask("");
          setDueAt("");
          setShowForm(false);
        },
      },
    );
  };

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      const matchesSearch = todo.text
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "active"
            ? !todo.completed
            : todo.completed;

      return matchesSearch && matchesFilter;
    });
  }, [todos, filter, search]);

  const completedCount = todos.filter((t) => t.completed).length;

  const progress = todos.length
    ? Math.round((completedCount / todos.length) * 100)
    : 0;

  const overdueCount = todos.filter(
    (t) => t.dueAt && new Date(t.dueAt) < new Date() && !t.completed,
  ).length;

  const activeAlarms = todos.filter(
    (t) =>
      t.dueAt &&
      !t.completed &&
      !dismissedAlarms.has(t.id) &&
      firingIds.current.has(t.id),
  );

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-72 flex-col overflow-y-auto border-r border-zinc-800/60 bg-zinc-950 p-6 lg:flex">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
              <span className="text-sm font-bold">F</span>
            </div>

            <span className="text-xl font-bold tracking-tight">focus.</span>
          </div>

          {/* Progress */}
          <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-purple-950/40 to-zinc-900 p-5">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Today's Progress
            </p>

            <div className="mt-3 flex items-end justify-between">
              <h2 className="text-5xl font-bold tracking-tight">{progress}%</h2>

              <span className="mb-1 text-xs text-zinc-500">
                {completedCount}/{todos.length}
              </span>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>

            {overdueCount > 0 && (
              <p className="mt-3 text-xs text-red-400">
                ⚠ {overdueCount} overdue {overdueCount === 1 ? "task" : "tasks"}
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-1">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-600">
              Views
            </p>

            {[
              {
                key: "all",
                label: "All Tasks",
                icon: "⊞",
              },
              {
                key: "active",
                label: "Active",
                icon: "◎",
              },
              {
                key: "completed",
                label: "Completed",
                icon: "✓",
              },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  filter === key
                    ? "bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/30"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{icon}</span>

                  {label}
                </span>

                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs ${
                    filter === key
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {key === "all"
                    ? todos.length
                    : key === "active"
                      ? todos.filter((t) => !t.completed).length
                      : completedCount}
                </span>
              </button>
            ))}
          </div>

          {/* Categories */}
          <div className="mt-auto">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-600">
              Categories
            </p>

            <div className="space-y-2">
              {Object.keys(categories).map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between text-sm text-zinc-400"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2 w-2 rounded-full ${categoryDots[item]}`}
                    />

                    {item}
                  </div>

                  <span className="text-xs text-zinc-600">
                    {todos.filter((t) => t.category === item).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-8 py-4 backdrop-blur">
            <div>
              <p className="text-xs text-zinc-600">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>

              <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowForm((v) => !v)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  showForm
                    ? "bg-zinc-800 text-zinc-300"
                    : "bg-purple-600 text-white hover:bg-purple-500"
                }`}
              >
                <span className="text-base">{showForm ? "✕" : "+"}</span>

                {showForm ? "Cancel" : "New Task"}
              </button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300 ring-1 ring-purple-500/30">
                {initials}
              </div>
            </div>
          </header>

          {/* Alarm Banner */}
          {activeAlarms.length > 0 && (
            <div className="border-b border-red-900/50 bg-red-950/40 px-8 py-3">
              {activeAlarms.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="animate-ping text-lg text-red-400">
                      ⏰
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-red-300">
                        "{todo.text}" is due now!
                      </p>

                      <p className="text-xs text-red-600">
                        Alarm stops in 30 seconds
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDismiss(todo.id)}
                    className="rounded-xl border border-red-800/60 bg-red-900/40 px-4 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-900/70"
                  >
                    Dismiss ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {/* Add Form */}
            {showForm && (
              <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-900 p-5 shadow-xl shadow-black/30">
                <p className="mb-4 text-sm font-medium text-zinc-400">
                  New Task
                </p>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="What needs to be done?"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTodo()}
                    autoFocus
                    className="w-full rounded-xl border border-zinc-700/60 bg-black/60 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-600">Category</label>

                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="rounded-xl border border-zinc-700/60 bg-black/60 px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                      >
                        <option value="Work">Work</option>

                        <option value="Design">Design</option>

                        <option value="Personal">Personal</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-600">Priority</label>

                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="rounded-xl border border-zinc-700/60 bg-black/60 px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                      >
                        <option value="high">🔴 High</option>

                        <option value="medium">🟡 Medium</option>

                        <option value="low">🟢 Low</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-600">
                        Due date & time
                      </label>

                      <input
                        type="datetime-local"
                        value={dueAt}
                        onChange={(e) => setDueAt(e.target.value)}
                        className="rounded-xl border border-zinc-700/60 bg-black/60 px-3 py-2.5 text-sm text-zinc-400 outline-none focus:border-purple-500 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={addTodo}
                      disabled={isCreating || !task.trim()}
                      className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-medium transition hover:bg-purple-500 disabled:opacity-40"
                    >
                      {isCreating ? "Adding..." : "Add Task"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800/60 bg-zinc-900 py-2.5 pl-8 pr-4 text-sm outline-none transition focus:border-purple-500"
                />
              </div>

              <p className="text-xs text-zinc-600">
                {filteredTodos.length}{" "}
                {filteredTodos.length === 1 ? "task" : "tasks"}
              </p>
            </div>

            {/* Todo List */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-purple-500" />

                <p className="text-sm text-zinc-600">Loading your tasks...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTodos.map((todo) => {
                  const due = formatDueDate(todo.dueAt);

                  const isFiring =
                    firingIds.current.has(todo.id) &&
                    !dismissedAlarms.has(todo.id);

                  return (
                    <div
                      key={todo.id}
                      className={`group relative flex items-start gap-4 overflow-hidden rounded-2xl border bg-zinc-900 p-4 transition hover:border-zinc-700/80 ${
                        isFiring
                          ? "border-red-500/50 shadow-lg shadow-red-500/10"
                          : todo.completed
                            ? "border-zinc-800/40 opacity-50"
                            : due?.isOverdue
                              ? "border-red-900/40 hover:border-red-800/60"
                              : "border-zinc-800/60"
                      }`}
                    >
                      {/* Priority stripe */}
                      <div
                        className={`absolute left-0 top-0 h-full w-1 ${
                          priorities[todo.priority] ?? priorities.medium
                        }`}
                      />

                      {/* Checkbox */}
                      <button
                        onClick={() => toggleTodo(todo.id)}
                        disabled={isToggling}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition disabled:opacity-50 ${
                          todo.completed
                            ? "border-purple-500 bg-purple-500"
                            : "border-zinc-600 hover:border-purple-400"
                        }`}
                      >
                        {todo.completed && (
                          <span className="text-[10px] font-bold">✓</span>
                        )}
                      </button>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium leading-snug ${
                            todo.completed
                              ? "text-zinc-600 line-through"
                              : isFiring
                                ? "text-red-300"
                                : "text-zinc-100"
                          }`}
                        >
                          {isFiring && (
                            <span className="mr-1 animate-pulse">⏰</span>
                          )}

                          {todo.text}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {/* Category */}
                          <span
                            className={`rounded-lg border px-2.5 py-0.5 text-xs ${
                              categories[todo.category] ?? categories.General
                            }`}
                          >
                            {todo.category}
                          </span>

                          {/* Priority */}
                          <span
                            className={`text-xs font-medium ${
                              priorityText[todo.priority] ?? priorityText.medium
                            }`}
                          >
                            <span
                              className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                                priorities[todo.priority]
                              }`}
                            />

                            {todo.priority}
                          </span>

                          {/* Due Date */}
                          {due && (
                            <span
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs ${
                                due.isOverdue && !todo.completed
                                  ? "bg-red-500/10 text-red-400"
                                  : due.isToday
                                    ? "bg-yellow-500/10 text-yellow-400"
                                    : "bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              <span>
                                {due.isOverdue && !todo.completed ? "⚠" : "🗓"}
                              </span>

                              {due.formatted}

                              {due.isOverdue && !todo.completed && " · overdue"}

                              {due.isToday && !due.isOverdue && " · today"}
                            </span>
                          )}

                          {/* Alarm */}
                          {isFiring && (
                            <span className="animate-pulse rounded-lg bg-red-500/10 px-2.5 py-0.5 text-xs text-red-400">
                              Alarm Active
                            </span>
                          )}
                        </div>

                        {/* Countdown */}
                        {todo.dueAt && !todo.completed && (
                          <div className="mt-3">
                            <DueCountdown
                              dueAt={todo.dueAt}
                              todoId={todo.id}
                              todoText={todo.text}
                              onAlarm={handleAlarm}
                            />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2">
                        {isFiring && (
                          <button
                            onClick={() => handleDismiss(todo.id)}
                            className="rounded-lg border border-red-800/60 bg-red-900/30 px-2.5 py-1 text-[11px] font-medium text-red-400 transition hover:bg-red-900/50"
                          >
                            Dismiss
                          </button>
                        )}

                        <button
                          onClick={() => deleteTodo(todo.id)}
                          disabled={isDeleting}
                          className="rounded-lg p-1.5 text-zinc-700 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredTodos.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-800 py-24 text-center">
                    <p className="text-3xl">◌</p>

                    <p className="text-sm text-zinc-600">No tasks found</p>

                    {filter !== "all" && (
                      <button
                        onClick={() => setFilter("all")}
                        className="text-xs text-purple-500 hover:underline"
                      >
                        View all tasks
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
