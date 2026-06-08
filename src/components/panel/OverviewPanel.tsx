"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Modal } from "@/components/Modal";
import { TimelineSelector } from "@/components/panel/TimelineSelector";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { getTranslation } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/date/format";
import { displayPhone } from "@/lib/phone";
import type { ChartTimeline } from "@/lib/panel/timeline";
import { fetchMemberSignupSeries, fetchOverviewMembersPaginated, fetchOverviewStats, fetchRevenueSeries } from "@/lib/supabase/analytics";
import type { OverviewMemberRow, OverviewStats } from "@/lib/supabase/analytics";
import type { Locale } from "@/lib/store/slices";
import { showToast } from "@/lib/toast/client";

const PAGE_SIZE = 10;

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
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  /* Paginated member modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFilter, setModalFilter] = useState<"active" | "expired" | "expiring">("active");
  const [modalRows, setModalRows] = useState<OverviewMemberRow[]>([]);
  const [modalTotal, setModalTotal] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const openModal = useCallback(async (filter: "active" | "expired" | "expiring") => {
    setModalFilter(filter);
    setModalRows([]);
    setModalTotal(0);
    setModalOpen(true);
    setLoadingInitial(true);
    try {
      const result = await fetchOverviewMembersPaginated(gymId, filter, 0, PAGE_SIZE);
      setModalRows(result.rows);
      setModalTotal(result.total);
    } catch {
      setModalRows([]);
      setModalTotal(0);
    } finally {
      setLoadingInitial(false);
    }
  }, [gymId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || modalRows.length >= modalTotal) return;
    setLoadingMore(true);
    try {
      const result = await fetchOverviewMembersPaginated(gymId, modalFilter, modalRows.length, PAGE_SIZE);
      setModalRows((prev) => [...prev, ...result.rows]);
    } catch {
      // swallow
    } finally {
      setLoadingMore(false);
    }
  }, [gymId, modalFilter, modalRows.length, modalTotal, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalRows([]);
    setModalTotal(0);
  }, []);

  const filterLabelKey = {
    active: "overviewActiveMembers" as const,
    expired: "overviewExpiredMembers" as const,
    expiring: "overviewExpiringMembers" as const,
  };

  useEffect(() => {
    setFetchKey((k) => k + 1);
  }, []);

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
      setStatsError(null);

      const [membersResult, revenueResult, statsResult] = await Promise.allSettled([
        fetchMemberSignupSeries(gymId, timeline, locale),
        fetchRevenueSeries(gymId, timeline, locale),
        fetchOverviewStats(gymId, timeline),
      ]);

      if (cancelled) return;

      if (membersResult.status === "fulfilled") {
        setMemberSeries(membersResult.value);
      } else {
        setMemberSeries([]);
        const msg =
          membersResult.reason instanceof Error
            ? membersResult.reason.message
            : getTranslation(locale, "authErrorGeneric");
        setMemberError(msg);
        showToast("error", msg);
      }

      if (revenueResult.status === "fulfilled") {
        setRevenueSeries(revenueResult.value);
      } else {
        setRevenueSeries([]);
        const msg =
          revenueResult.reason instanceof Error
            ? revenueResult.reason.message
            : getTranslation(locale, "authErrorGeneric");
        setRevenueError(msg);
        showToast("error", msg);
      }

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      } else {
        setStats(null);
        const msg =
          statsResult.reason instanceof Error
            ? statsResult.reason.message
            : getTranslation(locale, "authErrorGeneric");
        setStatsError(msg);
        showToast("error", msg);
      }

      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [gymId, timeline, locale, fetchKey]);

  const totalMembers = memberSeries.reduce((sum, point) => sum + point.value, 0);
  const totalRevenue = revenueSeries.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-muted-foreground">{t("chartTimelineLabel")}</p>
        <TimelineSelector locale={locale} value={timeline} onChange={setTimeline} />
      </div>

      {statsError ? (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-bold text-danger">
          {statsError}
        </p>
      ) : null}

      <div className="cockpit-layout">
        <div className="space-y-5">
          <div className="space-y-4">
            <article className="observatory-stat">
              <p className="observatory-stat-label">{t("chartMembersTotal")}</p>
              <p className="observatory-stat-value">{loading ? "…" : totalMembers}</p>
              <span className="observatory-stat-accent" />
            </article>
            <button type="button" className="observatory-stat w-full text-start" onClick={() => openModal("active")}>
              <p className="observatory-stat-label">{t("overviewActiveMembers")}</p>
              <p className="observatory-stat-value" style={{ color: "var(--success)" }}>{loading ? "…" : stats?.activeMembers ?? "—"}</p>
              <span className="observatory-stat-accent" style={{ background: "var(--success)" }} />
            </button>
            <button type="button" className="observatory-stat w-full text-start" onClick={() => openModal("expiring")}>
              <p className="observatory-stat-label">{t("overviewExpiringMembers")}</p>
              <p className="observatory-stat-value" style={{ color: "var(--warning)" }}>{loading ? "…" : stats?.expiringMembers ?? "—"}</p>
              <span className="observatory-stat-accent" style={{ background: "var(--warning)" }} />
            </button>
            <button type="button" className="observatory-stat w-full text-start" onClick={() => openModal("expired")}>
              <p className="observatory-stat-label">{t("overviewExpiredMembers")}</p>
              <p className="observatory-stat-value" style={{ color: "var(--danger)" }}>{loading ? "…" : stats?.expiredMembers ?? "—"}</p>
              <span className="observatory-stat-accent" style={{ background: "var(--danger)" }} />
            </button>
          </div>
        </div>

        <article className="rounded-2xl border border-glass-border bg-glass/50 p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-foreground">{t("chartMembersTitle")}</h2>
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
                  <Tooltip contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: "12px", color: "var(--foreground)", fontSize: "13px", fontWeight: 600, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} formatter={(value) => [Number(value).toLocaleString("en-US"), t("chartMembersTitle")]} />
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
                {t("chartRevenueTotal")}: {loading ? "…" : `${currencyLabel} ${totalRevenue.toLocaleString("en-US")}`}
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
                    formatter={(value) => [`${currencyLabel} ${Number(value).toLocaleString("en-US")}`, t("chartRevenueTitle")]}
                  />
                  <Bar dataKey="value" fill="var(--chart-bar)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={t(filterLabelKey[modalFilter] as "overviewActiveMembers")} size="md">
        {loadingInitial ? (
          <div className="flex justify-center py-8">
            <Spinner label={t("uiLoading")} />
          </div>
        ) : modalRows.length === 0 ? (
          <p className="py-8 text-center text-sm font-bold text-muted-foreground">{t("memberEmpty")}</p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {modalRows.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">{m.first_name} {m.last_name}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{displayPhone(m.phone)} · {m.plan_name}</p>
                  <p className="text-xs font-bold text-muted-foreground">
                    {modalFilter === "expired"
                      ? `${t("memberEnded")} ${formatDate(m.end_date, locale)}`
                      : `${t("memberEnds")} ${formatDate(m.end_date, locale)}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-black ${
                    modalFilter === "expired" ? "text-danger" : modalFilter === "expiring" ? "text-warning" : "text-success"
                  }`}
                >
                  {modalFilter === "expired" ? t("memberPortalExpired") : modalFilter === "expiring" ? t("staffContractDaysLeft") : t("staffStatusActive")}
                </span>
              </div>
            ))}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore ? (
              <div className="flex justify-center py-2">
                <Spinner label={t("uiLoading")} />
              </div>
            ) : null}
            {modalRows.length < modalTotal ? (
              <p className="pb-2 text-center text-xs font-bold text-muted-foreground">
                {modalRows.length} / {modalTotal}
              </p>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
