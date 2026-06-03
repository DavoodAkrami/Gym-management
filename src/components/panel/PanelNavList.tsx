"use client";

import { getTranslation } from "@/lib/i18n/translations";
import { panelSections, type PanelSection, type PanelSectionId } from "@/lib/panel/sections";
import type { Locale } from "@/lib/store/slices";

type PanelNavListProps = {
  locale: Locale;
  activeSection: PanelSectionId;
  onSelect: (sectionId: PanelSectionId) => void;
  layout?: "row" | "column";
  /** When set, only these sections are shown (e.g. coach permission filter). */
  sections?: PanelSection[];
};

export function PanelNavList({
  locale,
  activeSection,
  onSelect,
  layout = "column",
  sections = panelSections,
}: PanelNavListProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  return (
    <nav
      className={
        layout === "row"
          ? "flex flex-row gap-1 overflow-x-auto"
          : "flex flex-col gap-1"
      }
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === activeSection;

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            className={`panel-nav-item ${isActive ? "panel-nav-item-active" : ""}`}
          >
            <Icon aria-hidden="true" className="shrink-0 text-lg" />
            <span className="truncate">{t(section.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
