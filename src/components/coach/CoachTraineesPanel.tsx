"use client";

import { useCallback, useEffect, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { SelectBar, type SelectBarOption } from "@/components/SelectBar";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import { showToast } from "@/lib/toast/client";
import { displayPhone } from "@/lib/phone";
import {
  coachAddTrainee,
  coachRemoveTrainee,
  fetchCoachAssignableMembers,
  fetchCoachPortal,
  fetchCoachTrainees,
  type CoachTrainee,
} from "@/lib/supabase/coach-portal";
import type { Locale } from "@/lib/store/slices";

type CoachTraineesPanelProps = {
  locale: Locale;
};

export function CoachTraineesPanel({ locale }: CoachTraineesPanelProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [trainees, setTrainees] = useState<CoachTrainee[]>([]);
  const [assignable, setAssignable] = useState<SelectBarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [coachInactive, setCoachInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const portal = await fetchCoachPortal();
      const inactive =
        !portal?.coach.active || (portal?.coach.status && portal.coach.status !== "active");
      setCoachInactive(Boolean(inactive));

      const [list, pool] = await Promise.all([
        fetchCoachTrainees(),
        inactive ? Promise.resolve([]) : fetchCoachAssignableMembers(),
      ]);

      setTrainees(list);
      setAssignable(
        pool.map((m) => ({
          value: m.member_id,
          label: `${m.full_name}${m.phone ? ` · ${displayPhone(m.phone)}` : ""}`,
        })),
      );
      setSelectedMemberId(pool[0]?.member_id ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAssign = async () => {
    if (!selectedMemberId) {
      setError(t("coachAssignTraineeRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await coachAddTrainee(selectedMemberId);
      setAssignOpen(false);
      await load();
      showToast("success", t("traineeAddSuccess"));
    } catch (caught) {
      showToast("error", caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    setSaving(true);
    setError(null);
    try {
      await coachRemoveTrainee(memberId);
      await load();
      showToast("success", t("traineeRemoveSuccess"));
    } catch (caught) {
      showToast("error", caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ListSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium leading-7 text-muted-foreground">{t("coachTraineesPanelDesc")}</p>

      {coachInactive ? (
        <p className="panel-alert border-glass-border bg-glass/60 text-foreground" role="status">
          {t("coachInactiveCannotAssign")}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={coachInactive || assignable.length === 0}
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-60"
          onClick={() => setAssignOpen(true)}
        >
          <FiPlus aria-hidden="true" />
          {t("coachAddTrainee")}
        </button>
      </div>

      {error ? (
        <p className="panel-alert border-danger/30 bg-danger/10 text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {trainees.length === 0 ? (
        <div className="panel-section-fill panel-card flex items-center justify-center p-8 text-center">
          <p className="text-sm font-bold text-muted-foreground">{t("coachTraineesEmpty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {trainees.map((trainee) => (
            <li key={trainee.member_id} className="panel-card flex items-center gap-3 p-4">
              <StaffAvatar
                firstName={trainee.first_name}
                lastName={trainee.last_name}
                avatarUrl={trainee.avatar_url ?? undefined}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="font-black text-foreground">{trainee.full_name}</p>
                <p className="text-xs font-bold text-muted-foreground">{displayPhone(trainee.phone)}</p>
              </div>
              <button
                type="button"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl border border-glass-border p-2 text-danger"
                title={t("coachRemoveTrainee")}
                onClick={() => void handleRemove(trainee.member_id)}
              >
                {saving ? <Spinner size="sm" /> : <FiTrash2 aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={t("coachAddTraineeTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
              onClick={() => setAssignOpen(false)}
            >
              {t("memberModalCancel")}
            </button>
            <button
              type="button"
              disabled={saving || !selectedMemberId}
              className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
              onClick={() => void handleAssign()}
            >
              {saving ? <Spinner size="sm" label={t("uiSaving")} /> : t("coachAddTraineeConfirm")}
            </button>
          </div>
        }
      >
        <p className="mb-4 text-sm font-medium text-muted-foreground">{t("coachAddTraineeHint")}</p>
        <SelectBar
          fullWidth
          portalMenu
          align="start"
          label={t("coachPickMember")}
          value={selectedMemberId}
          options={assignable}
          onChange={setSelectedMemberId}
        />
      </Modal>
    </div>
  );
}
