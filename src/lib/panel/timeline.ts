export type ChartTimeline = "7d" | "30d" | "90d" | "12m";

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

export function buildDateBuckets(timeline: ChartTimeline) {
  const { start, end } = getTimelineRange(timeline);
  const buckets: { key: string; label: string; date: Date }[] = [];

  if (timeline === "12m") {
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        label: cursor.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        date: new Date(cursor),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.push({
      key,
      label: cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      date: new Date(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

export function dateKeyForBucket(date: Date, timeline: ChartTimeline) {
  if (timeline === "12m") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  return date.toISOString().slice(0, 10);
}
