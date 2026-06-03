"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export type SelectBarOption<T extends string = string> = {
  value: T;
  label: string;
  hint?: string;
};

type SelectBarProps<T extends string = string> = {
  value: T;
  options: SelectBarOption<T>[];
  onChange: (value: T) => void;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  align?: "start" | "end";
  fullWidth?: boolean;
  disabled?: boolean;
  /** Render dropdown in document.body (stays above modals). Default true. */
  portalMenu?: boolean;
};

const SELECTBAR_MENU_Z_INDEX = 10000;

export function SelectBar<T extends string = string>({
  value,
  options,
  onChange,
  label,
  icon,
  className = "",
  align = "end",
  fullWidth = false,
  disabled = false,
  portalMenu = true,
}: SelectBarProps<T>) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const selected = options.find((option) => option.value === value) ?? options[0];
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  useEffect(() => {
    if (open) {
      setHighlightIndex(selectedIndex);
    }
  }, [open, selectedIndex]);

  useLayoutEffect(() => {
    if (!open || !portalMenu || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const width = Math.max(rect.width, 220);
      const gap = 6;
      const maxHeight = Math.min(256, window.innerHeight - 16);
      let top = rect.bottom + gap;
      const left = align === "end" ? rect.right - width : rect.left;

      if (top + maxHeight > window.innerHeight - 8) {
        const above = rect.top - gap - maxHeight;
        if (above >= 8) {
          top = above;
        }
      }

      setMenuStyle({
        top,
        left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
        width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, portalMenu, align]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) {
        return;
      }
      const menuEl = document.getElementById(listboxId);
      if (menuEl?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, listboxId]);

  const commitSelection = (index: number) => {
    const option = options[index];
    if (!option) {
      return;
    }

    onChange(option.value);
    setOpen(false);
  };

  const menuContent = (
    <>
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isHighlighted = index === highlightIndex;

        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            className={`selectbar-option ${isSelected ? "selectbar-option-selected" : ""} ${isHighlighted ? "selectbar-option-highlight" : ""}`}
            onMouseEnter={() => setHighlightIndex(index)}
            onClick={() => commitSelection(index)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlightIndex((current) => Math.min(current + 1, options.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlightIndex((current) => Math.max(current - 1, 0));
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                commitSelection(index);
              }
            }}
          >
            <span className="selectbar-option-copy">
              <span className="selectbar-option-label">{option.label}</span>
              {option.hint ? <span className="selectbar-option-hint">{option.hint}</span> : null}
            </span>
            {isSelected ? <FiCheck aria-hidden="true" className="selectbar-check" /> : null}
          </button>
        );
      })}
    </>
  );

  if (options.length === 0) {
    return (
      <div
        className={`selectbar-empty border border-glass-border bg-glass/50 px-3 py-3 text-sm font-semibold text-muted-foreground ${className}`}
      >
        {label}: —
      </div>
    );
  }

  const menuClasses = `selectbar-menu ${open ? "selectbar-menu-open" : ""} ${
    portalMenu ? "selectbar-menu-portal" : align === "start" ? "selectbar-menu-start" : "selectbar-menu-end"
  }`;

  const menuNode = (
    <div
      id={listboxId}
      role="listbox"
      aria-label={label}
      className={menuClasses}
      style={
        portalMenu && menuStyle
          ? {
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
              zIndex: SELECTBAR_MENU_Z_INDEX,
            }
          : undefined
      }
    >
      {menuContent}
    </div>
  );

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? "w-full" : ""} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`selectbar-trigger ${fullWidth ? "selectbar-trigger-full" : ""} ${open ? "selectbar-trigger-open" : ""} ${disabled ? "opacity-60" : ""}`}
      >
        {icon ? <span className="selectbar-icon">{icon}</span> : null}
        <span className="selectbar-value">
          <span className="selectbar-label">{label}</span>
          <span className="selectbar-current">{selected?.label ?? "—"}</span>
        </span>
        <FiChevronDown
          aria-hidden="true"
          className={`selectbar-chevron ${open ? "selectbar-chevron-open" : ""}`}
        />
      </button>

      {portalMenu && open && menuStyle
        ? createPortal(menuNode, document.body)
        : !portalMenu
          ? menuNode
          : null}
    </div>
  );
}
