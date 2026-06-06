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
};

export function OverviewPanel({ gymId, locale }: OverviewPanelProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const currencyLabel = t("currencyToman");
  const [timeline, setTimeline] = useState<ChartTimeline>("30d");
  const [memberSeries, setMemberSeries] = useState<{ label: string; value: number }[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  useEffect(() => {
    if (!gymId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setMemberError(null);
      setRevenueError(null);

      const [membersResult, revenueResult] = await Promise.allSettled([
        fetchMemberSignupSeries(gymId, timeline, locale),
        fetchRevenueSeries(gymId, timeline, locale),
      ]);

      if (cancelled) {
        return;
      }

      if (membersResult.status === "fulfilled") {
        setMemberSeries(membersResult.value);
      } else {
        setMemberSeries([]);
        setMemberError(
          membersResult.reason instanceof Error
            ? membersResult.reason.message
            : getTranslation(locale, "authErrorGeneric"),
        );
      }

      if (revenueResult.status === "fulfilled") {
        setRevenueSeries(revenueResult.value);
      } else {
        setRevenueSeries([]);
        setRevenueError(
          revenueResult.reason instanceof Error
            ? revenueResult.reason.message
            : getTranslation(locale, "authErrorGeneric"),
        );
      }

      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [gymId, timeline, locale]);

  const totalMembers = memberSeries.reduce((sum, point) => sum + point.value, 0);
  const totalRevenue = revenueSeries.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-muted-foreground">{t("chartTimelineLabel")}</p>
        <TimelineSelector locale={locale} value={timeline} onChange={setTimeline} />
      </div>

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
          {memberError ? (
            <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-bold text-danger">
              {memberError}
            </p>
          ) : null}
          <div className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memberSeries}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={32} />
                  <Tooltip contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: "12px", color: "var(--foreground)", fontSize: "13px", fontWeight: 600, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
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
                {t("chartRevenueTotal")}: {loading ? "…" : `${currencyLabel} ${totalRevenue.toFixed(0)}`}
              </p>
            </div>
          </div>
          {revenueError ? (
            <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-bold text-danger">
              {revenueError}
            </p>
          ) : null}
          <div className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSeries}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={40} />
                  <Tooltip
                    contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: "12px", color: "var(--foreground)", fontSize: "13px", fontWeight: 600, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                    formatter={(value) => [`${currencyLabel} ${Number(value).toFixed(0)}`, t("chartRevenueTitle")]}
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
