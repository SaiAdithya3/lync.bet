import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { Toast as ToastType } from "../../stores/toastStore";
import { useToastStore } from "../../stores/toastStore";

const typeStyles = {
  success:
    "border-yes/50 bg-[#0d2818] text-[#6ee7b7] shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
  error:
    "border-no/50 bg-[#2a1515] text-[#fca5a5] shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
  info:
    "border-primary-400/50 bg-[#0f1729] text-primary-200 shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
};

const icons = {
  success: (
    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

interface ToastItemProps {
  toast: ToastType;
}

export function ToastItem({ toast }: ToastItemProps) {
  const removeToast = useToastStore((s) => s.removeToast);
  const { id, type, message, title } = toast;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, x: 24 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 8, x: 24 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={clsx(
        "flex items-center gap-3 rounded-xl border-2 px-4 py-3 min-w-[280px] max-w-[360px] backdrop-blur-sm",
        typeStyles[type]
      )}
    >
      <span className="shrink-0 flex items-center justify-center [&>svg]:size-5">
        {icons[type]}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-sm leading-tight">{title}</p>}
        <p className={clsx("text-sm leading-snug", title ? "mt-0.5" : "")}>
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => removeToast(id)}
        className="shrink-0 flex h-8 w-8 items-center justify-center rounded text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/30 transition-colors"
        aria-label="Dismiss"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    </motion.div>
  );
}
