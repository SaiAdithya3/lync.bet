import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

const DEFAULT_DURATION = 5000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = crypto.randomUUID();
    const full: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? DEFAULT_DURATION,
    };
    set((s) => ({ toasts: [...s.toasts, full] }));

    if (full.duration && full.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, full.duration);
    }
    return id;
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  success: (message, title) => get().addToast({ type: "success", message, title }),
  error: (message, title) => get().addToast({ type: "error", message, title }),
  info: (message, title) => get().addToast({ type: "info", message, title }),
}));
