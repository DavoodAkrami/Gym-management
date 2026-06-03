"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
  /** Max height of scrollable body (default: capped viewport height) */
  maxBodyHeight?: string;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  maxBodyHeight,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const bodyStyle = maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined;

  return createPortal(
    <div className="modal-root" role="presentation" onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-panel ${size === "lg" ? "modal-panel-lg" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId} className="text-xl font-black text-foreground">
            {title}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <FiX aria-hidden="true" className="text-xl" />
          </button>
        </div>
        <div className="modal-body panel-scroll-region" style={bodyStyle}>
          {children}
        </div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
