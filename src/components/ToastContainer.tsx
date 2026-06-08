"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FiCheckCircle, FiAlertTriangle, FiInfo, FiX } from "react-icons/fi";
import { toastActions } from "@/lib/toast/store";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

const ICON: Record<string, React.ReactNode> = {
  success: <FiCheckCircle aria-hidden="true" size={18} />,
  error: <FiAlertTriangle aria-hidden="true" size={18} />,
  info: <FiInfo aria-hidden="true" size={18} />,
};

const ACCENT: Record<string, string> = {
  success: "var(--success)",
  error: "var(--danger)",
  info: "var(--primary)",
};

const BG: Record<string, string> = {
  success: "bg-success/5",
  error: "bg-danger/5",
  info: "bg-primary/5",
};

const BORDER: Record<string, string> = {
  success: "border-success/20",
  error: "border-danger/20",
  info: "border-primary/20",
};

export function ToastContainer() {
  const toasts = useAppSelector((state) => state.toast.toasts);
  const locale = useAppSelector((state) => state.ui.locale);
  const dispatch = useAppDispatch();

  const isFa = locale === "fa";
  const slideX = isFa ? 28 : -28;

  return (
    <div
      className={`fixed top-20 z-[9999] flex flex-col gap-3 ${isFa ? "right-4" : "left-4"}`}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: slideX, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: slideX, scale: 0.95 }}
            transition={{ type: "spring", damping: 24, stiffness: 300, mass: 0.8 }}
            dir="ltr"
            className={`flex items-start gap-3 lg:gap-4 rounded-xl border px-4 py-3 lg:px-5 lg:py-4 text-sm lg:text-base font-bold backdrop-blur-xl ${BG[t.type]} ${BORDER[t.type]}`}
            style={{
              maxWidth: "420px",
              background: "color-mix(in srgb, var(--surface) 95%, transparent)",
              boxShadow: `${isFa ? "inset -3px 0 0" : "inset 3px 0 0"} ${ACCENT[t.type]}, 0 8px 32px color-mix(in srgb, ${ACCENT[t.type]} 20%, transparent), 0 2px 8px rgba(0,0,0,0.12)`,
            }}
          >
            <span className="shrink-0 mt-0.5" style={{ color: ACCENT[t.type] }}>
              {ICON[t.type]}
            </span>
            <span className="flex-1 text-foreground leading-relaxed" dir="auto">
              {t.message}
            </span>
            <button
              type="button"
              onClick={() => dispatch(toastActions.removeToast(t.id))}
              className="shrink-0 -mr-1 p-0.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
              aria-label="Dismiss"
            >
              <FiX aria-hidden="true" size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
