"use client";

import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/Skeleton";
import { getTranslation } from "@/lib/i18n/translations";
import type { ChartTimeline } from "@/lib/panel/timeline";
import { fetchMemberSignupSeries, fetchRevenueSeries } from "@/lib/supabase/analytics";
import type { Locale } from "@/lib/store/slices";

type OverviewPanelProps = {
  gymId: string;
  locale: Locale;
  currency: string;
};

export function OverviewPanel({ gymId, locale, currency }: OverviewPanelProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [timeline, setTimeline] = useState<ChartTimeline>("30d");
  const [memberSeries, setMemberSeries] = useState<{ label: string; value: number }[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [members, revenue] = await Promise.all([
          fetchMemberSignupSeries(gymId, timeline),
          fetchRevenueSeries(gymId, timeline),
        ]);

        if (cancelled) {
          return;
        }

        setMemberSeries(members);
        setRevenueSeries(revenue);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [gymId, timeline]);

  const totalMembers = memberSeries.reduce((sum, point) => sum + point.value, 0);
  const totalRevenue = revenueSeries.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-muted-foreground">{t("chartTimelineLabel")}</p>
        <TimelineSelector locale={locale} value={timeline} onChange={setTimeline} />
      </div>

      {error ? (
        <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-glass-border bg-glass/50 p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-foreground">{t("chartMembersTitle")}</h2>
              <p className="text-sm font-semibold text-muted-foreground">
                {t("chartMembersTotal")}: {loading ? "…" : totalMembers}
              </p>
            </div>
          </div>
          <div className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memberSeries}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={32} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="var(--chart-line)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-glass-border bg-glass/50 p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-foreground">{t("chartRevenueTitle")}</h2>
              <p className="text-sm font-semibold text-muted-foreground">
                {t("chartRevenueTotal")}: {loading ? "…" : `${currency} ${totalRevenue.toFixed(2)}`}
              </p>
            </div>
          </div>
          <div className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSeries}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={40} />
                  <Tooltip formatter={(value) => [`${currency} ${Number(value).toFixed(2)}`, t("chartRevenueTitle")]} />
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
