"use client";

import { useCallback, useEffect, useState } from "react";
import { FiDollarSign, FiUsers } from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TimelineSelector } from "@/components/panel/TimelineSelector";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { getTranslation } from "@/lib/i18n/translations";
import type { ChartTimeline } from "@/lib/panel/timeline";
import {
  fetchCoachEarningsSeries,
  fetchCoachOverview,
  fetchCoachTraineeSeries,
} from "@/lib/supabase/coach-portal";
import type { Locale } from "@/lib/store/slices";

type CoachOverviewPanelProps = {
  locale: Locale;
  currency: string;
};

function timelineDays(timeline: ChartTimeline): number {
  if (timeline === "7d") {
    return 7;
  }
  if (timeline === "90d") {
    return 90;
  }
  if (timeline === "12m") {
    return 365;
  }
  return 30;
}

function formatMoney(amount: number, currency: string, locale: Locale) {
  try {
    return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", {
      style: "currency",
      currency: currency === "IRT" ? "IRR" : currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function CoachOverviewPanel({ locale, currency }: CoachOverviewPanelProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [timeline, setTimeline] = useState<ChartTimeline>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traineeCount, setTraineeCount] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [traineeSeries, setTraineeSeries] = useState<{ label: string; value: number }[]>([]);
  const [earningsSeries, setEarningsSeries] = useState<{ label: string; value: number }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const days = timelineDays(timeline);
    try {
      const [stats, trainees, revenue] = await Promise.all([
        fetchCoachOverview(),
        fetchCoachTraineeSeries(days),
        fetchCoachEarningsSeries(days),
      ]);
      setTraineeCount(stats?.trainee_count ?? 0);
      setEarnings(stats?.earnings_from_trainees ?? 0);
      setTraineeSeries(trainees);
      setEarningsSeries(revenue);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [locale, timeline]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && traineeSeries.length === 0) {
    return <ListSkeleton rows={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium leading-7 text-muted-foreground">{t("coachOverviewDesc")}</p>
        <TimelineSelector locale={locale} value={timeline} onChange={setTimeline} />
      </div>

      {error ? (
        <p className="panel-alert border-danger/30 bg-danger/10 text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="panel-card flex items-start gap-4 p-5">
          <span className="grid size-12 place-items-center rounded-xl bg-surface-muted text-xl text-foreground">
            <FiUsers aria-hidden="true" />
          </span>
          <div>
            <p className="text-eyebrow">{t("coachOverviewTrainees")}</p>
            <p className="mt-1 text-3xl font-black text-foreground">{traineeCount}</p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">{t("coachOverviewTraineesHint")}</p>
          </div>
        </article>

        <article className="panel-card flex items-start gap-4 p-5">
          <span className="grid size-12 place-items-center rounded-xl bg-surface-muted text-xl text-foreground">
            <FiDollarSign aria-hidden="true" />
          </span>
          <div>
            <p className="text-eyebrow">{t("coachOverviewEarnings")}</p>
            <p className="mt-1 text-3xl font-black text-foreground">
              {formatMoney(earnings, currency, locale)}
            </p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">{t("coachOverviewEarningsHint")}</p>
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-glass-border bg-glass/50 p-4 sm:p-5">
          <h2 className="text-lg font-black text-foreground">{t("coachChartTraineesTitle")}</h2>
          <div className="mt-4 h-64">
            {traineeSeries.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm font-bold text-muted-foreground">
                {t("coachChartEmpty")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={traineeSeries}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: "12px", color: "var(--foreground)", fontSize: "13px", fontWeight: 600, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--chart-line)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-glass-border bg-glass/50 p-4 sm:p-5">
          <h2 className="text-lg font-black text-foreground">{t("coachChartEarningsTitle")}</h2>
          <div className="mt-4 h-64">
            {earningsSeries.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm font-bold text-muted-foreground">
                {t("coachChartEmpty")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsSeries}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: "12px", color: "var(--foreground)", fontSize: "13px", fontWeight: 600, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                  />
                  <Bar dataKey="value" fill="var(--chart-bar)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
