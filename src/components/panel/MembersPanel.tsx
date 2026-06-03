"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiFilter, FiPlus, FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { MemberDetailModal } from "@/components/panel/MemberDetailModal";
import { MemberFormModal } from "@/components/panel/MemberFormModal";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { SelectBar, type SelectBarOption } from "@/components/SelectBar";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import {
  filterMembersByQuery,
  filterMembersByType,
  hasActiveMembership,
} from "@/lib/members/filters";
import { sortMembers, type MemberSort } from "@/lib/members/sort";
import type { MemberFilter, MemberFormValues, MemberWithMeta } from "@/lib/members/types";
import {
  createGymMember,
  deleteGymMember,
  fetchGymMembers,
  fetchLapsedMembers,
  updateGymMember,
} from "@/lib/supabase/members";
import { membersActions } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import type { Locale } from "@/lib/store/slices";

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

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [members, setMembers] = useState<MemberWithMeta[]>([]);
  const [lapsedMembers, setLapsedMembers] = useState<MemberWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [sort, setSort] = useState<MemberSort>("join_desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [activeList, lapsedList] = await Promise.all([
        fetchGymMembers(gymId),
        fetchLapsedMembers(gymId),
      ]);

      const activeIds = new Set(
        activeList.filter((member) => hasActiveMembership(member)).map((member) => member.id),
      );

      const lapsedOnly = lapsedList.filter((member) => !activeIds.has(member.id));

      setMembers(activeList);
      setLapsedMembers(lapsedOnly);

      activeList.forEach((member) => {
        dispatch(
          membersActions.upsertMember({
            id: member.id,
            gym_id: member.gym_id,
            first_name: member.first_name,
            last_name: member.last_name,
            phone: member.phone,
            zip_code: member.zip_code,
            national_id: member.national_id,
            preferred_language: member.preferred_language,
            status: member.status,
            join_date: member.join_date,
          }),
        );
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : getTranslation(locale, "authErrorGeneric"),
      );
    } finally {
      setLoading(false);
    }
  }, [gymId, dispatch, locale]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const mainListMembers = useMemo(() => {
    const lapsedIds = new Set(lapsedMembers.map((member) => member.id));
    return members.filter((member) => hasActiveMembership(member) || !lapsedIds.has(member.id));
  }, [members, lapsedMembers]);

  const filteredMembers = useMemo(() => {
    return sortMembers(
      filterMembersByType(filterMembersByQuery(mainListMembers, search), filter),
      sort,
    );
  }, [mainListMembers, search, filter, sort]);

  const sortedLapsed = useMemo(
    () => sortMembers(filterMembersByQuery(lapsedMembers, search), sort),
    [lapsedMembers, search, sort],
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
        await createGymMember(gymId, values);
      } else if (modal.type === "edit") {
        await updateGymMember(gymId, modal.member.id, values);
      }
      setModal({ type: "none" });
      await loadMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (modal.type !== "delete") {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await deleteGymMember(gymId, modal.member.id);
      setModal({ type: "none" });
      await loadMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSaving(false);
    }
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
      <div>
        <p className="font-black text-foreground">
          {member.first_name} {member.last_name}
        </p>
        <p className="text-sm font-semibold text-muted-foreground">{member.phone}</p>
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          {member.currentMembership?.plan_name ?? member.latestMembership?.plan_name ?? t("memberNoPlan")}
          {member.currentMembership
            ? ` · ${t("memberEnds")} ${member.currentMembership.end_date}`
            : member.latestMembership
              ? ` · ${t("memberEnded")} ${member.latestMembership.end_date}`
              : ""}
        </p>
        {lapsed && member.lapse_visible_until ? (
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {t("memberLapseUntil")}: {member.lapse_visible_until}
          </p>
        ) : null}
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
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-4 py-2.5 text-sm font-bold"
              onClick={() => setFilterOpen((open) => !open)}
            >
              <FiFilter aria-hidden="true" />
              {t("memberFilter")}
              {filter !== "all" ? ` · ${t(filter === "new" ? "memberFilterNew" : "memberFilterExpiring")}` : ""}
            </button>
            {filterOpen ? (
              <div className="panel-card absolute end-0 z-20 mt-2 min-w-48 p-2 shadow-lift">
                {(
                  [
                    ["all", "memberFilterAll"],
                    ["new", "memberFilterNew"],
                    ["expiring", "memberFilterExpiring"],
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
            {filteredMembers.length === 0 ? (
              <p className="text-sm font-bold text-muted-foreground">{t("memberEmpty")}</p>
            ) : (
              filteredMembers.map((member) => renderMemberRow(member))
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
          <div className="flex justify-end gap-2">
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
              className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-black text-danger"
              onClick={() => void handleDelete()}
            >
              {saving ? <Spinner label={t("uiDeleting")} /> : t("memberDeleteConfirm")}
            </button>
          </div>
        }
      >
        <p className="text-sm font-medium text-muted-foreground">
          {modal.type === "delete"
            ? t("memberDeleteMessage").replace(
                "{name}",
                `${modal.member.first_name} ${modal.member.last_name}`,
              )
            : ""}
        </p>
      </Modal>
    </div>
  );
}
