"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { CoachFormModal } from "@/components/panel/CoachFormModal";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { StaffDetailModal } from "@/components/panel/StaffDetailModal";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import type { CoachFormValues, GymCoach } from "@/lib/staff/types";
import {
  createGymCoach,
  deleteGymCoach,
  fetchGymCoaches,
  updateGymCoach,
} from "@/lib/supabase/staff";
import type { Locale } from "@/lib/store/slices";
import { useAppSelector } from "@/lib/store/hooks";

type CoachesPanelProps = {
  gymId: string;
  locale: Locale;
  currency: string;
};

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; coach: GymCoach }
  | { type: "delete"; coach: GymCoach }
  | { type: "view"; coach: GymCoach };

export function CoachesPanel({ gymId, locale, currency }: CoachesPanelProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const gymSlug = useAppSelector((state) => state.gyms.entities[gymId]?.slug);
  const coachSignupUrl =
    typeof window !== "undefined" && gymSlug
      ? `${window.location.origin}/coach/join/${gymSlug}`
      : "";

  const [coaches, setCoaches] = useState<GymCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCoaches(await fetchGymCoaches(gymId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [gymId, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCoaches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return coaches;
    }
    return coaches.filter((coach) =>
      `${coach.full_name} ${coach.phone ?? ""} ${coach.specialty ?? ""}`.toLowerCase().includes(q),
    );
  }, [coaches, search]);

  const handleSave = async (values: CoachFormValues) => {
    setSaving(true);
    setError(null);
    try {
      const coachList =
        modal.type === "add"
          ? await createGymCoach(gymId, values)
          : modal.type === "edit"
            ? await updateGymCoach(gymId, modal.coach.id, values)
            : coaches;

      setCoaches(coachList);
      setModal({ type: "none" });
      void load().catch((caught) => {
        setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
      throw caught;
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
      await deleteGymCoach(gymId, modal.coach.id);
      setModal({ type: "none" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const viewCoach = modal.type === "view" ? modal.coach : null;

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium leading-7 text-muted-foreground">{t("coachesPanelDesc")}</p>
      <p className="text-sm font-medium text-muted-foreground">{t("coachOwnerLoginHint")}</p>

      {coachSignupUrl ? (
        <p className="text-sm font-medium text-muted-foreground">
          {t("coachSignupLinkLabel")}:{" "}
          <a href={coachSignupUrl} className="font-bold text-foreground underline">
            {coachSignupUrl}
          </a>
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("coachesSearchPlaceholder")}
          className="w-full max-w-md px-4"
        />
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
          onClick={() => setModal({ type: "add" })}
        >
          <FiPlus aria-hidden="true" />
          {t("coachAdd")}
        </button>
      </div>

      {error ? (
        <p className="panel-alert border border-danger/30 bg-danger/10 text-danger">{error}</p>
      ) : null}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : filteredCoaches.length === 0 ? (
        <div className="panel-section-fill panel-card flex items-center justify-center p-8 text-center">
          <p className="text-sm font-bold text-muted-foreground">{t("coachesEmpty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredCoaches.map((coach) => (
            <li
              key={coach.id}
              role="button"
              tabIndex={0}
              className="member-card-clickable panel-card flex cursor-pointer items-center gap-3 p-4"
              onClick={() => setModal({ type: "view", coach })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setModal({ type: "view", coach });
                }
              }}
            >
              <StaffAvatar
                firstName={coach.first_name}
                lastName={coach.last_name}
                avatarUrl={coach.avatar_url}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="font-black text-foreground">{coach.full_name}</p>
                <p className="text-xs font-bold text-muted-foreground">
                  {coach.specialty || coach.phone || coach.email || "—"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <StaffDetailModal
        open={modal.type === "view"}
        locale={locale}
        kind="coach"
        coach={viewCoach}
        currency={currency}
        onClose={() => setModal({ type: "none" })}
        onEdit={() => viewCoach && setModal({ type: "edit", coach: viewCoach })}
        onDelete={() => viewCoach && setModal({ type: "delete", coach: viewCoach })}
      />

      <CoachFormModal
        open={modal.type === "add" || modal.type === "edit"}
        locale={locale}
        mode={modal.type === "edit" ? "edit" : "add"}
        coach={modal.type === "edit" ? modal.coach : undefined}
        saving={saving}
        saveError={modal.type === "add" || modal.type === "edit" ? error : null}
        onClose={() => {
          setError(null);
          setModal({ type: "none" });
        }}
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
          {modal.type === "delete" ? modal.coach.full_name : ""}
        </p>
      </Modal>

    </div>
  );
}
