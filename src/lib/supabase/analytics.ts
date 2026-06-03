import type { ChartTimeline } from "@/lib/panel/timeline";
import { buildDateBuckets, dateKeyForBucket, getTimelineRange } from "@/lib/panel/timeline";
import { createSupabaseBrowserClient } from "./client";
import type { MemberRow, PaymentRow } from "./database.types";

export type ChartPoint = {
  key: string;
  label: string;
  value: number;
};

export async function fetchMemberSignupSeries(gymId: string, timeline: ChartTimeline) {
  const supabase = createSupabaseBrowserClient();
  const { start, end } = getTimelineRange(timeline);

  const { data, error } = await supabase
    .from("members")
    .select("created_at, join_date")
    .eq("gym_id", gymId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (error) {
    throw error;
  }

  const buckets = buildDateBuckets(timeline);
  const counts = new Map(buckets.map((bucket) => [bucket.key, 0]));

  (data as Pick<MemberRow, "created_at" | "join_date">[]).forEach((row) => {
    const source = row.created_at || row.join_date;
    if (!source) {
      return;
    }
    const key = dateKeyForBucket(new Date(source), timeline);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });

  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: counts.get(bucket.key) ?? 0,
  }));
}

export async function fetchRevenueSeries(gymId: string, timeline: ChartTimeline) {
  const supabase = createSupabaseBrowserClient();
  const { start, end } = getTimelineRange(timeline);

  const { data, error } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("gym_id", gymId)
    .gte("paid_at", start.toISOString())
    .lte("paid_at", end.toISOString());

  if (error) {
    throw error;
  }

  const buckets = buildDateBuckets(timeline);
  const totals = new Map(buckets.map((bucket) => [bucket.key, 0]));

  (data as Pick<PaymentRow, "amount" | "paid_at">[]).forEach((row) => {
    const key = dateKeyForBucket(new Date(row.paid_at), timeline);
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + Number(row.amount));
    }
  });

  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: totals.get(bucket.key) ?? 0,
  }));
}
