"use client";

import { useEffect, useState } from "react";

type Props = {
  dueAt: Date | string;
  todoId: string;
  todoText: string;
  onAlarm: (id: string, text: string) => void;
};

export function DueCountdown({ dueAt, todoId, todoText, onAlarm }: Props) {
  const [msLeft, setMsLeft] = useState<number>(0);
  const [alarmFired, setAlarmFired] = useState(false);

  useEffect(() => {
    const due = new Date(dueAt).getTime();

    const tick = () => {
      const diff = due - Date.now();
      setMsLeft(diff);

      if (diff <= 0 && !alarmFired) {
        setAlarmFired(true);
        onAlarm(todoId, todoText);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [dueAt, todoId, todoText, alarmFired, onAlarm]);

  const isOverdue = msLeft <= 0;
  const isUrgent = msLeft <= 5 * 60 * 1000 && msLeft > 0; // under 5 mins
  const isAlarm = msLeft <= 30000 && msLeft > 0; // under 30s

  // Only show countdown if within 1 hour
  if (msLeft > 60 * 60 * 1000) return null;

  const absMs = Math.abs(msLeft);
  const hours = Math.floor(absMs / 3600000);
  const mins = Math.floor((absMs % 3600000) / 60000);
  const secs = Math.floor((absMs % 60000) / 1000);

  const timeStr = isOverdue
    ? `${mins}m ${secs}s overdue`
    : hours > 0
      ? `${hours}h ${mins}m left`
      : mins > 0
        ? `${mins}m ${secs}s left`
        : `${secs}s left`;

  // Progress bar — full hour = 0%, now = 100%
  const totalWindow = 60 * 60 * 1000;
  const elapsed = totalWindow - Math.max(msLeft, 0);
  const progress = Math.min((elapsed / totalWindow) * 100, 100);

  const barColor = isAlarm
    ? "bg-red-500"
    : isUrgent
      ? "bg-yellow-500"
      : "bg-purple-500";

  const textColor = isOverdue
    ? "text-red-400"
    : isAlarm
      ? "text-red-400"
      : isUrgent
        ? "text-yellow-400"
        : "text-zinc-500";

  return (
    <div className="mt-2 w-full">
      {/* Label row */}
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`text-[11px] font-medium ${textColor} flex items-center gap-1`}
        >
          {isAlarm && (
            <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-red-500" />
          )}
          {isOverdue ? "⚠ " : "⏱ "}
          {timeStr}
        </span>
        {isAlarm && (
          <span className="animate-pulse text-[10px] font-bold text-red-400">
            ALARM
          </span>
        )}
      </div>

      {/* Progress bar track */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor} ${
            isAlarm ? "animate-pulse" : ""
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
