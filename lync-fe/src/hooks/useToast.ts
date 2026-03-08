import { useToastStore } from "../stores/toastStore";

/** Hook for showing toasts from any component. Use toast.success(), toast.error(), toast.info(). */
export function useToast() {
  return {
    success: useToastStore((s) => s.success),
    error: useToastStore((s) => s.error),
    info: useToastStore((s) => s.info),
    add: useToastStore((s) => s.addToast),
    remove: useToastStore((s) => s.removeToast),
  };
}
