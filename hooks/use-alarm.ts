"use client";

import { useCallback, useRef, useEffect } from "react";

export function useAlarm() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopFnsRef = useRef<Map<string, () => void>>(new Map());
  const firingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const triggerAlarm = useCallback((id: string, taskText: string) => {
    if (firingIds.current.has(id)) return;
    firingIds.current.add(id);

    playSound(id);
    showNotification(taskText);

    setTimeout(() => {
      stopAlarm(id);
    }, 30000);
  }, []);

  function playSound(id: string) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;

      let stopped = false;
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      const offsets = Array.from({ length: 50 }, (_, i) => i * 600);

      offsets.forEach((offset) => {
        const t = setTimeout(() => {
          if (stopped) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
          gain.gain.setValueAtTime(0.35, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
        }, offset);
        timeouts.push(t);
      });

      const stop = () => {
        stopped = true;
        timeouts.forEach(clearTimeout);
      };

      stopFnsRef.current.set(id, stop);
    } catch (e) {
      console.error("Audio error:", e);
    }
  }

  function showNotification(taskText: string) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏰ Task Due Now!", {
        body: taskText,
        icon: "/favicon.ico",
        requireInteraction: true,
      });
    }
  }

  const stopAlarm = useCallback((id: string) => {
    stopFnsRef.current.get(id)?.();
    stopFnsRef.current.delete(id);
    firingIds.current.delete(id);
  }, []);

  return { triggerAlarm, stopAlarm, firingIds };
}
