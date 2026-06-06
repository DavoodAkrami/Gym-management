"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiFilter } from "react-icons/fi";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { SelectBar, type SelectBarOption } from "@/components/SelectBar";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/date/format";
import {
  filterMembershipsByQuery,
  filterMembershipsByType,
  sortMemberships,
} from "@/lib/members/membership-filters";
import { planRemainingLabel } from "@/lib/members/membership-utils";
import type { MembershipFilter, MembershipWithMeta } from "@/lib/members/types";
import type { MembershipSort } from "@/lib/members/sort";
import {
  fetchGymMemberships,
  updateMembershipStatus,
} from "@/lib/supabase/memberships";
import type { Locale } from "@/lib/store/slices";

type MembershipsPanelProps = {
  gymId: string;
  locale: Locale;
  currency: string;
};

export function MembershipsPanel({ gymId, locale, currency }: MembershipsPanelProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [items, setItems] = useState<MembershipWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MembershipFilter>("all");
  const [sort, setSort] = useState<MembershipSort>("end_desc");
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchGymMemberships(gymId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [gymId, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return sortMemberships(
      filterMembershipsByType(filterMembershipsByQuery(items, search), filter),
      sort,
    );
  }, [items, search, filter, sort]);

  const activeList = useMemo(() => filtered.filter((item) => item.is_active), [filtered]);
  const finishedList = useMemo(
    () => filtered.filter((item) => !item.is_active && (item.in_lapse_window || item.days_left >= -30)),
    [filtered],
  );

  const sortOptions: SelectBarOption<MembershipSort>[] = useMemo(
    () => [
      { value: "end_desc", label: t("memberSortEndDesc") },
      { value: "end_asc", label: t("memberSortEndAsc") },
      { value: "days_left_asc", label: t("memberSortDaysAsc") },
      { value: "days_left_desc", label: t("memberSortDaysDesc") },
      { value: "name_asc", label: t("memberSortNameAsc") },
      { value: "name_desc", label: t("memberSortNameDesc") },
    ],
    [locale, t],
  );

  const handleStatus = async (item: MembershipWithMeta, status: "active" | "expired" | "cancelled") => {
    setBusyId(item.id);
    setError(null);
    try {
      await updateMembershipStatus(gymId, item.id, status);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setBusyId(null);
    }
  };

  const renderRow = (item: MembershipWithMeta, finished = false) => (
    <article key={item.id} className="panel-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-black text-foreground">
          {item.member_first_name} {item.member_last_name}
        </p>
        <p className="text-sm font-semibold text-muted-foreground">{item.member_phone}</p>
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          {item.plan_name} · {formatDate(item.start_date, locale)} → {formatDate(item.end_date, locale)}
        </p>
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          {planRemainingLabel(item.days_left, {
            expired: t("memberPortalExpired"),
            daysLeft: t("memberDetailDaysLeft"),
            oneDay: t("memberDetailOneDay"),
          })}{" "}
          · {item.price} {currency}
        </p>
        {finished && item.lapse_visible_until ? (
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {t("memberLapseUntil")}: {formatDate(item.lapse_visible_until, locale)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {item.is_active ? (
          <button
            type="button"
            disabled={busyId === item.id}
            className="rounded-xl border border-glass-border px-3 py-2 text-xs font-bold"
            onClick={() => void handleStatus(item, "expired")}
          >
            {busyId === item.id ? <Spinner size="sm" label={t("uiSaving")} /> : t("membershipMarkExpired")}
          </button>
        ) : null}
        {item.status !== "cancelled" ? (
          <button
            type="button"
            disabled={busyId === item.id}
            className="rounded-xl border border-danger/30 px-3 py-2 text-xs font-bold text-danger"
            onClick={() => void handleStatus(item, "cancelled")}
          >
            {t("membershipMarkCancelled")}
          </button>
        ) : null}
      </div>
    </article>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("membershipSearchPlaceholder")}
          className="w-full max-w-md px-4"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-4 py-2.5 text-sm font-bold"
              onClick={() => setFilterOpen((o) => !o)}
            >
              <FiFilter aria-hidden="true" />
              {t("memberFilter")}
            </button>
            {filterOpen ? (
              <div className="panel-card absolute end-0 z-20 mt-2 min-w-52 p-2 shadow-lift">
                {(
                  [
                    ["all", "memberFilterAll"],
                    ["active", "membershipFilterActive"],
                    ["expiring", "memberFilterExpiring"],
                    ["finished", "membershipFilterFinished"],
                  ] as const
                ).map(([value, labelKey]) => (
                  <button
                    key={value}
                    type="button"
                    className={`block w-full rounded-xl px-3 py-2 text-start text-sm font-bold ${
                      filter === value ? "bg-glass text-foreground" : "text-muted-foreground"
                    }`}
                    onClick={() => {
                      setFilter(value);
                      setFilterOpen(false);
                    }}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="min-w-[11rem]">
            <SelectBar
              portalMenu
              align="end"
              label={t("memberSort")}
              value={sort}
              options={sortOptions}
              onChange={setSort}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p className="panel-alert border border-danger/30 bg-danger/10 text-danger">{error}</p>
      ) : null}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-black text-foreground">{t("membershipActiveTitle")}</h2>
            {activeList.length === 0 ? (
              <p className="text-sm font-bold text-muted-foreground">{t("membershipActiveEmpty")}</p>
            ) : (
              activeList.map((item) => renderRow(item))
            )}
          </section>

          <section className="space-y-3 border-t border-border pt-6">
            <div>
              <h2 className="text-sm font-black text-foreground">{t("membershipFinishedTitle")}</h2>
              <p className="text-xs font-medium text-muted-foreground">{t("membershipFinishedDesc")}</p>
            </div>
            {finishedList.length === 0 ? (
              <p className="text-sm font-bold text-muted-foreground">{t("membershipFinishedEmpty")}</p>
            ) : (
              finishedList.map((item) => renderRow(item, true))
            )}
          </section>
        </>
      )}
    </div>
  );
}
