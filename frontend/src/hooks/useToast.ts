import { useState, useCallback, useEffect } from "react";

type ToastVariant = "default" | "success" | "destructive" | "warning" | "info";

interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

// Global state - module level so it works without Context
let listeners: Array<(toasts: ToastItem[]) => void> = [];
let toasts: ToastItem[] = [];

function dispatch(toast: ToastItem) {
  toasts = [...toasts, toast];
  listeners.forEach((l) => l(toasts));

  const duration = toast.duration ?? 4000;
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id);
    listeners.forEach((l) => l(toasts));
  }, duration);
}

// Exported imperative API - call toast.success(...) anywhere
export const toast = {
  show: (opts: Omit<ToastItem, "id">) =>
    dispatch({ id: crypto.randomUUID(), ...opts }),
  success: (title: string, description?: string) =>
    dispatch({
      id: crypto.randomUUID(),
      title,
      description,
      variant: "success",
    }),
  error: (title: string, description?: string) =>
    dispatch({
      id: crypto.randomUUID(),
      title,
      description,
      variant: "destructive",
    }),
  warning: (title: string, description?: string) =>
    dispatch({
      id: crypto.randomUUID(),
      title,
      description,
      variant: "warning",
    }),
  info: (title: string, description?: string) =>
    dispatch({
      id: crypto.randomUUID(),
      title,
      description,
      variant: "info",
    }),
};

// Hook for the Toaster component
export function useToast() {
  const [state, setState] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  return { toasts: state };
}