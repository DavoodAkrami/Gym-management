"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import {
  fetchCoachProgramsForMember,
  fetchGymCoachesForMember,
  memberChooseCoachWithProgram,
  type CoachProgramOffer,
  type GymCoachOption,
} from "@/lib/supabase/member-portal";
import type { Locale } from "@/lib/store/slices";

type MemberCoachSectionProps = {
  locale: Locale;
  currency: string;
  currentCoachId?: string | null;
  onUpdated: () => void;
};

export function MemberCoachSection({
  locale,
  currency,
  currentCoachId,
  onUpdated,
}: MemberCoachSectionProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [coaches, setCoaches] = useState<GymCoachOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<GymCoachOption | null>(null);
  const [programs, setPrograms] = useState<CoachProgramOffer[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCoaches(await fetchGymCoachesForMember());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCoachModal = async (coach: GymCoachOption) => {
    setSelectedCoach(coach);
    setSelectedProgramId("");
    setPrograms([]);
    setModalOpen(true);
    setProgramsLoading(true);
    setError(null);
    try {
      const list = await fetchCoachProgramsForMember(coach.id);
      setPrograms(list);
      setSelectedProgramId(list[0]?.id ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setProgramsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCoach || !selectedProgramId) {
      setError(t("memberCoachProgramRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await memberChooseCoachWithProgram(selectedCoach.id, selectedProgramId);
      setModalOpen(false);
      setSelectedCoach(null);
      await load();
      onUpdated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ListSkeleton rows={3} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium leading-7 text-muted-foreground">{t("memberCoachSectionDesc")}</p>
      {error && !modalOpen ? (
        <p className="panel-alert border-danger/30 bg-danger/10 text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {coaches.length === 0 ? (
        <p className="text-sm font-bold text-muted-foreground">{t("memberCoachEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {coaches.map((coach) => {
            const isMine = coach.is_mine || coach.id === currentCoachId;
            return (
              <li key={coach.id} className="panel-card flex items-center gap-3 p-4">
                <StaffAvatar
                  firstName={coach.full_name.split(" ")[0] ?? ""}
                  lastName={coach.full_name.split(" ").slice(1).join(" ") ?? ""}
                  avatarUrl={coach.avatar_url ?? undefined}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-foreground">{coach.full_name}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{coach.specialty ?? "—"}</p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${
                    isMine ? "border border-success/30 bg-success/10 text-success" : "btn-primary"
                  }`}
                  onClick={() => void openCoachModal(coach)}
                >
                  {isMine ? t("memberCoachChange") : t("memberCoachChoose")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCoach(null);
          setError(null);
        }}
        title={t("memberCoachModalTitle")}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
              onClick={() => setModalOpen(false)}
            >
              {t("memberModalCancel")}
            </button>
            <button
              type="button"
              disabled={saving || !selectedProgramId || programs.length === 0}
              className="btn-primary rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
              onClick={() => void handleConfirm()}
            >
              {saving ? <Spinner label={t("uiSaving")} /> : t("memberCoachModalConfirm")}
            </button>
          </div>
        }
      >
        {selectedCoach ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <StaffAvatar
                firstName={selectedCoach.full_name.split(" ")[0] ?? ""}
                lastName={selectedCoach.full_name.split(" ").slice(1).join(" ") ?? ""}
                avatarUrl={selectedCoach.avatar_url ?? undefined}
                size="md"
              />
              <div>
                <p className="font-black text-foreground">{selectedCoach.full_name}</p>
                <p className="text-sm font-medium text-muted-foreground">{t("memberCoachModalSubtitle")}</p>
              </div>
            </div>

            {programsLoading ? (
              <ListSkeleton rows={2} />
            ) : programs.length === 0 ? (
              <p className="text-sm font-bold text-muted-foreground">{t("memberCoachModalNoPrograms")}</p>
            ) : (
              <fieldset className="space-y-2">
                <legend className="text-sm font-black text-foreground">{t("memberCoachModalProgramsLabel")}</legend>
                {programs.map((program) => (
                  <label
                    key={program.id}
                    className={`member-card-clickable flex cursor-pointer gap-3 rounded-xl border p-3 ${
                      selectedProgramId === program.id
                        ? "border-foreground/40 bg-glass-strong"
                        : "border-glass-border bg-glass/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="coach-program"
                      className="mt-1"
                      checked={selectedProgramId === program.id}
                      onChange={() => setSelectedProgramId(program.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-foreground">{program.name}</p>
                      {program.description ? (
                        <p className="mt-1 text-xs font-medium text-muted-foreground">{program.description}</p>
                      ) : null}
                      <p className="mt-2 text-xs font-bold text-muted-foreground">
                        {program.price} {currency} · {program.duration_days} {t("profilePlanDays")}
                      </p>
                    </div>
                  </label>
                ))}
              </fieldset>
            )}

            {error ? (
              <p className="panel-alert border-danger/30 bg-danger/10 text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
