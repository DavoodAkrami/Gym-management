"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiEdit2, FiFilter, FiPlus, FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { MemberDetailModal } from "@/components/panel/MemberDetailModal";
import { MemberFormModal } from "@/components/panel/MemberFormModal";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { Spinner } from "@/components/ui/Spinner";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { SelectBar } from "@/components/SelectBar";
import { displayPhone } from "@/lib/phone";
import type { SelectBarOption } from "@/components/SelectBar";
import { getTranslation } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/date/format";
import { hasActiveMembership } from "@/lib/members/filters";
import type { MemberFilter, MemberFormValues, MemberWithMeta } from "@/lib/members/types";
import type { MemberSort } from "@/lib/members/sort";
import {
  createGymMember,
  deleteGymMember,
  fetchMembersPage,
  fetchLapsedMembers,
  updateGymMember,
} from "@/lib/supabase/members";
import { showToast } from "@/lib/toast/client";
import { membersActions } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import type { Locale } from "@/lib/store/slices";
import { useDebounce } from "@/lib/hooks/useDebounce";

const PAGE_SIZE = 10;

type MembersPanelProps = {
  gymId: string;
  locale: Locale;
  currency: string;
};

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; member: MemberWithMeta }
  | { type: "delete"; member: MemberWithMeta }
  | { type: "view"; member: MemberWithMeta };

export function MembersPanel({ gymId, locale, currency }: MembersPanelProps) {
  const dispatch = useAppDispatch();
  const gymPlanIds = useAppSelector((state) => state.gymPlans.ids);
  const gymPlanEntities = useAppSelector((state) => state.gymPlans.entities);

  const plans = useMemo(
    () =>
      gymPlanIds
        .map((id) => gymPlanEntities[id])
        .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan && plan.gym_id === gymId)),
    [gymId, gymPlanEntities, gymPlanIds],
  );

  const memberIds = useAppSelector((state) => state.members.ids);
  const memberEntities = useAppSelector((state) => state.members.entities);
  const members = useMemo(
    () => memberIds.map((id) => memberEntities[id]).filter(Boolean) as MemberWithMeta[],
    [memberIds, memberEntities],
  );

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [lapsedMembers, setLapsedMembers] = useState<MemberWithMeta[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [sort, setSort] = useState<MemberSort>("join_desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [filterMenuStyle, setFilterMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!filterOpen || !filterTriggerRef.current) return;
    const rect = filterTriggerRef.current.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 180);
    const gap = 6;
    const maxHeight = Math.min(256, window.innerHeight - 16);
    let top = rect.bottom + gap;
    const left = rect.right - menuWidth;
    if (top + maxHeight > window.innerHeight - 8) {
      const above = rect.top - gap - maxHeight;
      if (above >= 8) top = above;
    }
    setFilterMenuStyle({ top, left: Math.max(8, left), width: menuWidth });
  }, [filterOpen]);

  useEffect(() => {
    if (!filterOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (
        filterTriggerRef.current?.contains(event.target as Node) ||
        filterMenuRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setFilterOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [filterOpen]);

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = memberIds.length < totalCount;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    dispatch(membersActions.setMembers([]));

    try {
      const [result, lapsedList] = await Promise.all([
        fetchMembersPage(gymId, PAGE_SIZE, 0, { search: debouncedSearch, filter, sort }),
        fetchLapsedMembers(gymId),
      ]);

      const activeIds = new Set(
        result.members.filter((member) => hasActiveMembership(member)).map((member) => member.id),
      );

      const lapsedOnly = lapsedList.filter((member) => !activeIds.has(member.id));

      dispatch(membersActions.setMembers(result.members));
      setLapsedMembers(lapsedOnly);
      setTotalCount(result.total);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : getTranslation(locale, "authErrorGeneric"),
      );
    } finally {
      setLoading(false);
    }
  }, [gymId, dispatch, locale, debouncedSearch, filter, sort]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const result = await fetchMembersPage(gymId, PAGE_SIZE, memberIds.length, { search: debouncedSearch, filter, sort });
      result.members.forEach((member) => {
        dispatch(membersActions.upsertMember(member));
      });
      setTotalCount(result.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoadingMore(false);
    }
  }, [gymId, memberIds.length, loadingMore, hasMore, debouncedSearch, filter, sort, t, dispatch]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          void loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const mainListMembers = useMemo(() => {
    const lapsedIds = new Set(lapsedMembers.map((member) => member.id));
    return members.filter((member) => hasActiveMembership(member) || !lapsedIds.has(member.id));
  }, [members, lapsedMembers]);

  const sortedLapsed = useMemo(
    () => lapsedMembers, // lapsed members are already fetched and filtered; no sort needed here
    [lapsedMembers],
  );

  const sortOptions: SelectBarOption<MemberSort>[] = useMemo(
    () => [
      { value: "join_desc", label: t("memberSortJoinDesc") },
      { value: "join_asc", label: t("memberSortJoinAsc") },
      { value: "name_asc", label: t("memberSortNameAsc") },
      { value: "name_desc", label: t("memberSortNameDesc") },
      { value: "end_asc", label: t("memberSortEndAsc") },
      { value: "end_desc", label: t("memberSortEndDesc") },
      { value: "days_left_asc", label: t("memberSortDaysAsc") },
      { value: "days_left_desc", label: t("memberSortDaysDesc") },
    ],
    [locale, t],
  );

  const handleSave = async (values: MemberFormValues) => {
    setSaving(true);
    setError(null);

    try {
      if (modal.type === "add") {
        const result = await createGymMember(gymId, values);
        showToast("success", t("memberAddSuccess"));
        if (result.length > 0) {
          dispatch(membersActions.setMembers(result));
        }
      } else if (modal.type === "edit") {
        const result = await updateGymMember(gymId, modal.member.id, values);
        showToast("success", t("memberEditSuccess"));
        if (result.length > 0) {
          dispatch(membersActions.setMembers(result));
        }
      }
      setModal({ type: "none" });
    } catch (caught) {
      const msg =
        caught instanceof Error
          ? caught.message
          : caught && typeof caught === "object" && "message" in caught
            ? String((caught as Record<string, unknown>).message)
            : t("authErrorGeneric");
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (wasPaid: boolean) => {
    if (modal.type !== "delete") {
      return;
    }

    setSaving(true);
    setError(null);

    const result = await deleteGymMember(gymId, modal.member.id, wasPaid);
    if (result.success) {
      dispatch(membersActions.deleteMember(modal.member.id));
      setModal({ type: "none" });
      showToast("success", t("memberDeleteSuccess"));
    } else {
      showToast("error", result.error ?? t("authErrorGeneric"));
    }
    setSaving(false);
  };

  const viewMember = modal.type === "view" ? modal.member : null;

  const renderMemberRow = (member: MemberWithMeta, lapsed = false) => (
    <article
      key={member.id}
      role="button"
      tabIndex={0}
      className="panel-card member-card-clickable flex cursor-pointer flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      onClick={() => setModal({ type: "view", member })}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setModal({ type: "view", member });
        }
      }}
    >
      <div className="flex items-center gap-3">
        <StaffAvatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatar_url} size="sm" />
        <div className="min-w-0">
          <p className="font-black text-foreground">
            {member.first_name} {member.last_name}
          </p>
          <p className="text-sm font-semibold text-muted-foreground">{displayPhone(member.phone)}</p>
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          {member.currentMembership?.plan_name ?? member.latestMembership?.plan_name ?? t("memberNoPlan")}
          {member.currentMembership
            ? ` · ${t("memberEnds")} ${formatDate(member.currentMembership.end_date, locale)}`
            : member.latestMembership
              ? ` · ${t("memberEnded")} ${formatDate(member.latestMembership.end_date, locale)}`
              : ""}
        </p>
        {lapsed && member.lapse_visible_until ? (
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {t("memberLapseUntil")}: {formatDate(member.lapse_visible_until, locale)}
          </p>
        ) : null}
      </div>
      </div>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {!lapsed ? (
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-glass-border px-3 py-2 text-xs font-bold"
              onClick={() => setModal({ type: "edit", member })}
            >
              <FiEdit2 aria-hidden="true" />
              {t("memberEdit")}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-danger/30 px-3 py-2 text-xs font-bold text-danger"
              onClick={() => setModal({ type: "delete", member })}
            >
              <FiTrash2 aria-hidden="true" />
              {t("memberDelete")}
            </button>
          </>
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
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("memberSearchPlaceholder")}
          className="w-full max-w-md px-4"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              ref={filterTriggerRef}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-4 py-2.5 text-sm font-bold"
              onClick={() => setFilterOpen((open) => !open)}
            >
              <FiFilter aria-hidden="true" />
              {t("memberFilter")}
              {filter !== "all" ? ` · ${t(filter === "new" ? "memberFilterNew" : "memberFilterExpiring")}` : ""}
            </button>
            {filterOpen && filterMenuStyle ? createPortal(
              <div
                ref={filterMenuRef}
                className="selectbar-menu selectbar-menu-open"
                style={{ top: filterMenuStyle.top, left: filterMenuStyle.left, width: filterMenuStyle.width, zIndex: 10000, position: "fixed" }}
              >
                {(
                  [
                    ["all", "memberFilterAll"],
                    ["new", "memberFilterNew"],
                    ["expiring", "memberFilterExpiring"],
                  ] as const
                ).map(([value, labelKey]) => {
                  const isSelected = filter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`selectbar-option ${isSelected ? "selectbar-option-selected" : ""}`}
                      onClick={() => {
                        setFilter(value);
                        setFilterOpen(false);
                      }}
                    >
                      <span className="selectbar-option-copy">
                        <span className="selectbar-option-label">{t(labelKey)}</span>
                      </span>
                      {isSelected ? <FiCheck aria-hidden="true" className="selectbar-check" /> : null}
                    </button>
                  );
                })}
              </div>,
              document.body
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
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
            onClick={() => setModal({ type: "add" })}
          >
            <FiPlus aria-hidden="true" />
            {t("memberAdd")}
          </button>
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
            <h2 className="text-sm font-black text-foreground">{t("memberActiveList")}</h2>
            {mainListMembers.length === 0 ? (
              <p className="text-sm font-bold text-muted-foreground">{t("memberEmpty")}</p>
            ) : (
              <>
                {mainListMembers.map((member) => renderMemberRow(member))}
                {hasMore ? (
                  <div ref={sentinelRef} className="flex justify-center py-4">
                    {loadingMore ? <Spinner label={t("uiLoading")} /> : <div className="h-4" />}
                  </div>
                ) : members.length > 0 ? (
                  <p className="text-center text-xs font-bold text-muted-foreground">
                    {t("memberAllLoaded")}
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section className="space-y-3 border-t border-border pt-6">
            <div>
              <h2 className="text-sm font-black text-foreground">{t("memberLapsedTitle")}</h2>
              <p className="text-xs font-medium text-muted-foreground">{t("memberLapsedDesc")}</p>
            </div>
            {sortedLapsed.length === 0 ? (
              <p className="text-sm font-bold text-muted-foreground">{t("memberLapsedEmpty")}</p>
            ) : (
              sortedLapsed.map((member) => renderMemberRow(member, true))
            )}
          </section>
        </>
      )}

      <MemberDetailModal
        open={modal.type === "view"}
        locale={locale}
        member={viewMember}
        currency={currency}
        onClose={() => setModal({ type: "none" })}
        onEdit={() => {
          if (viewMember) {
            setModal({ type: "edit", member: viewMember });
          }
        }}
        onDelete={() => {
          if (viewMember) {
            setModal({ type: "delete", member: viewMember });
          }
        }}
      />

      <MemberFormModal
        open={modal.type === "add" || modal.type === "edit"}
        locale={locale}
        mode={modal.type === "edit" ? "edit" : "add"}
        member={modal.type === "edit" ? modal.member : undefined}
        plans={plans}
        saving={saving}
        onClose={() => setModal({ type: "none" })}
        onSubmit={handleSave}
      />

      <Modal
        open={modal.type === "delete"}
        onClose={() => setModal({ type: "none" })}
        title={t("memberDeleteTitle")}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
              onClick={() => setModal({ type: "none" })}
            >
              {t("memberModalCancel")}
            </button>
            <button
              type="button"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-black text-danger"
              onClick={() => void handleDelete(false)}
            >
              {saving ? <Spinner size="sm" label={t("uiDeleting")} /> : t("memberDeleteRemoveIncome")}
            </button>
            <button
              type="button"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-glass-border bg-glass px-4 py-2 text-sm font-black text-foreground"
              onClick={() => void handleDelete(true)}
            >
              {saving ? <Spinner size="sm" label={t("uiDeleting")} /> : t("memberDeleteKeepIncome")}
            </button>
          </div>
        }
      >
        {modal.type === "delete" ? (
          <div className="space-y-3 text-sm font-medium text-muted-foreground">
            <p>
              {t("memberDeleteMessage")
                .replace("{name}", `${modal.member.first_name} ${modal.member.last_name}`)
                .replace(
                  "{amount}",
                  String(
                    modal.member.currentMembership?.price ??
                      modal.member.latestMembership?.price ??
                      0,
                  ),
                )
                .replace("{currency}", currency)}
            </p>
            <p className="font-bold text-foreground">{t("memberDeletePaidQuestion")}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
