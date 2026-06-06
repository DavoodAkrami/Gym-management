import type { ChartTimeline } from "@/lib/panel/timeline";
import {
  buildDateBuckets,
  dateKeyForBucket,
  getTimelineRange,
  isDateKeyInRange,
  parseChartDate,
  toLocalDateKey,
  toLocalMonthKey,
} from "@/lib/panel/timeline";
import { createSupabaseBrowserClient } from "./client";
import type { MemberRow, MembershipRow, PaymentRow } from "./database.types";

export type ChartPoint = {
  key: string;
  label: string;
  value: number;
};

function bucketRows<T>(
  rows: T[],
  timeline: ChartTimeline,
  getDate: (row: T) => string | null | undefined,
  getValue: (row: T) => number,
  locale?: string,
) {
  const buckets = buildDateBuckets(timeline, locale);
  const totals = new Map(buckets.map((bucket) => [bucket.key, 0]));

  rows.forEach((row) => {
    const raw = getDate(row);
    if (!raw) {
      return;
    }

    const key = dateKeyForBucket(parseChartDate(raw), timeline);
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + getValue(row));
    }
  });

  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: totals.get(bucket.key) ?? 0,
  }));
}

export async function fetchMemberSignupSeries(gymId: string, timeline: ChartTimeline, locale?: string) {
  const supabase = createSupabaseBrowserClient();
  const { start, end } = getTimelineRange(timeline);

  const { data, error } = await supabase
    .from("members")
    .select("join_date, created_at")
    .eq("gym_id", gymId);

  if (error) {
    throw error;
  }

  const rows = (data as Pick<MemberRow, "join_date" | "created_at">[]).filter((row) => {
    const source = row.join_date || row.created_at;
    if (!source) {
      return false;
    }

    const key =
      timeline === "12m"
        ? toLocalMonthKey(parseChartDate(source))
        : toLocalDateKey(parseChartDate(source));

    return isDateKeyInRange(key, start, end, timeline);
  });

  return bucketRows(
    rows,
    timeline,
    (row) => row.join_date || row.created_at,
    () => 1,
    locale,
  );
}

async function fetchPaymentRows(gymId: string, start: Date, end: Date) {
  const supabase = createSupabaseBrowserClient();

  const withFlag = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("gym_id", gymId)
    .eq("counts_toward_revenue", true)
    .gte("paid_at", start.toISOString())
    .lte("paid_at", end.toISOString());

  if (!withFlag.error) {
    return withFlag.data as Pick<PaymentRow, "amount" | "paid_at">[];
  }

  if (!/counts_toward_revenue/i.test(withFlag.error.message)) {
    throw withFlag.error;
  }

  const fallback = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("gym_id", gymId)
    .gte("paid_at", start.toISOString())
    .lte("paid_at", end.toISOString());

  if (fallback.error) {
    throw fallback.error;
  }

  return fallback.data as Pick<PaymentRow, "amount" | "paid_at">[];
}

async function fetchMembershipRevenueRows(gymId: string, start: Date, end: Date) {
  const supabase = createSupabaseBrowserClient();
  const startKey = toLocalDateKey(start);
  const endKey = toLocalDateKey(end);

  const { data, error } = await supabase
    .from("memberships")
    .select("price, start_date")
    .eq("gym_id", gymId)
    .gte("start_date", startKey)
    .lte("start_date", endKey);

  if (error) {
    throw error;
  }

  return data as Pick<MembershipRow, "price" | "start_date">[];
}

export async function fetchRevenueSeries(gymId: string, timeline: ChartTimeline, locale?: string) {
  const { start, end } = getTimelineRange(timeline);

  let paymentRows: Pick<PaymentRow, "amount" | "paid_at">[] = [];

  try {
    paymentRows = await fetchPaymentRows(gymId, start, end);
  } catch {
    paymentRows = [];
  }

  if (paymentRows.length > 0) {
    return bucketRows(
      paymentRows,
      timeline,
      (row) => row.paid_at,
      (row) => Number(row.amount),
      locale,
    );
  }

  const membershipRows = await fetchMembershipRevenueRows(gymId, start, end);

  return bucketRows(
    membershipRows,
    timeline,
    (row) => row.start_date,
    (row) => Number(row.price),
    locale,
  );
}

export type OverviewStats = {
  activeMembers: number;
  expiringMembers: number;
  expiredMembers: number;
  totalRevenue: number;
};

export async function fetchOverviewStats(gymId: string, timeline: ChartTimeline): Promise<OverviewStats> {
  const supabase = createSupabaseBrowserClient();
  const today = new Date().toISOString().slice(0, 10);
  const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { start: rangeStart } = getTimelineRange(timeline);
  const rangeStartKey = toLocalDateKey(rangeStart);

  const { count: activeCount, error: activeErr } = await supabase
    .from("memberships")
    .select("member_id", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .eq("status", "active")
    .gte("end_date", today);

  if (activeErr) throw activeErr;

  const { count: expiringCount, error: expiringErr } = await supabase
    .from("memberships")
    .select("member_id", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .eq("status", "active")
    .gte("end_date", today)
    .lte("end_date", threeDaysLater);

  if (expiringErr) throw expiringErr;

  const { count: expiredCount, error: expiredErr } = await supabase
    .from("memberships")
    .select("member_id", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .lt("end_date", today)
    .gte("end_date", rangeStartKey);

  if (expiredErr) throw expiredErr;

  let totalRevenue = 0;
  try {
    const paymentRows = await fetchPaymentRows(gymId, rangeStart, new Date());
    totalRevenue = paymentRows.reduce((sum, row) => sum + Number(row.amount), 0);
  } catch {
    try {
      const membershipRows = await fetchMembershipRevenueRows(gymId, rangeStart, new Date());
      totalRevenue = membershipRows.reduce((sum, row) => sum + Number(row.price), 0);
    } catch {
      totalRevenue = 0;
    }
  }

  return {
    activeMembers: activeCount ?? 0,
    expiringMembers: expiringCount ?? 0,
    expiredMembers: expiredCount ?? 0,
    totalRevenue,
  };
}
