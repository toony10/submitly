"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "info";

type Toast = { id: number; tone: Tone; text: string };

export type LogEntry = { id: number; time: string; source: string; text: string; tone: Tone };

type Feedback = {
  toast: (tone: Tone, text: string) => void;
  log: (source: string, text: string, tone?: Tone) => void;
  clearLog: () => void;
  entries: LogEntry[];
};

const FeedbackContext = createContext<Feedback | null>(null);

/** Tiny toast + event log, standing in for whatever toast library an app uses. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((tone: Tone, text: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, tone, text }]);
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3500);
  }, []);

  const log = useCallback((source: string, text: string, tone: Tone = "info") => {
    const id = nextId.current++;
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setEntries((current) => [{ id, time, source, text, tone }, ...current].slice(0, 40));
  }, []);

  const clearLog = useCallback(() => setEntries([]), []);

  const value = useMemo(() => ({ toast, log, clearLog, entries }), [toast, log, clearLog, entries]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast-${item.tone}`} role="status">
            {item.text}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): Feedback {
  const feedback = useContext(FeedbackContext);

  if (!feedback) {
    throw new Error("useFeedback must be used within <FeedbackProvider>");
  }

  return feedback;
}
