"use client";

import type { ChartTimeline } from "@/lib/panel/timeline";
import { getTranslation } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/store/slices";

const timelines: ChartTimeline[] = ["7d", "30d", "90d", "12m"];

type TimelineSelectorProps = {
  locale: Locale;
  value: ChartTimeline;
  onChange: (value: ChartTimeline) => void;
};

export function TimelineSelector({ locale, value, onChange }: TimelineSelectorProps) {
  const labelKey = (timeline: ChartTimeline) => {
    const map = {
      "7d": "chartTimeline7d",
      "30d": "chartTimeline30d",
      "90d": "chartTimeline90d",
      "12m": "chartTimeline12m",
    } as const;
    return getTranslation(locale, map[timeline]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {timelines.map((timeline) => (
        <button
          key={timeline}
          type="button"
          onClick={() => onChange(timeline)}
          className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
            value === timeline
              ? "border-glass-border bg-glass text-foreground"
              : "border-transparent bg-transparent text-muted-foreground hover:border-glass-border hover:bg-glass/60"
          }`}
        >
          {labelKey(timeline)}
        </button>
      ))}
    </div>
  );
}
