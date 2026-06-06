export type ChartTimeline = "7d" | "30d" | "90d" | "12m";

import { formatChartLabel } from "@/lib/date/format";

export function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toLocalMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getTimelineRange(timeline: ChartTimeline) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);

  switch (timeline) {
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      break;
    case "90d":
      start.setDate(start.getDate() - 89);
      break;
    case "12m":
      start.setMonth(start.getMonth() - 11);
      start.setDate(1);
      break;
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export function buildDateBuckets(timeline: ChartTimeline, locale?: string) {
  const { start, end } = getTimelineRange(timeline);
  const buckets: { key: string; label: string; date: Date }[] = [];

  if (timeline === "12m") {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= endMonth) {
      const key = toLocalMonthKey(cursor);
      buckets.push({
        key,
        label: locale ? formatChartLabel(cursor, locale, true) : cursor.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        date: new Date(cursor),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    const key = toLocalDateKey(cursor);
    buckets.push({
      key,
      label: locale ? formatChartLabel(cursor, locale, false) : cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      date: new Date(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

export function dateKeyForBucket(date: Date, timeline: ChartTimeline) {
  if (timeline === "12m") {
    return toLocalMonthKey(date);
  }
  return toLocalDateKey(date);
}

export function parseChartDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  return new Date(value);
}

export function isDateKeyInRange(dateKey: string, start: Date, end: Date, timeline: ChartTimeline) {
  if (timeline === "12m") {
    const startKey = toLocalMonthKey(start);
    const endKey = toLocalMonthKey(end);
    return dateKey >= startKey && dateKey <= endKey;
  }

  const startKey = toLocalDateKey(start);
  const endKey = toLocalDateKey(end);
  return dateKey >= startKey && dateKey <= endKey;
}
