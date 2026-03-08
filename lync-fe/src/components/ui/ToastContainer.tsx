import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { useToastStore } from "../../stores/toastStore";
import { ToastItem } from "./Toast";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col gap-3"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
