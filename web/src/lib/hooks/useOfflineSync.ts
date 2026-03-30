"use client";

import { useCallback, useEffect, useState } from "react";

const QUEUE_KEY = "ilist_offline_actions";

export type QueuedAction = {
  id: string;
  type: string;
  payload: unknown;
  at: number;
};

export function useOfflineSync() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const readQueue = useCallback((): QueuedAction[] => {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedAction[];
    } catch {
      return [];
    }
  }, []);

  const enqueue = useCallback((type: string, payload: unknown) => {
    const q = readQueue();
    q.push({ id: crypto.randomUUID(), type, payload, at: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  }, [readQueue]);

  const clearQueue = useCallback(() => {
    localStorage.removeItem(QUEUE_KEY);
  }, []);

  return { online, enqueue, readQueue, clearQueue };
}
