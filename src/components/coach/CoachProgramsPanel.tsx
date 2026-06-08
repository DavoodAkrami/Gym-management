"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { FiBookOpen, FiEdit2, FiPlus } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import { showToast } from "@/lib/toast/client";
import {
  fetchCoachPrograms,
  upsertCoachProgram,
  type CoachProgram,
} from "@/lib/supabase/coach-portal";
import type { Locale } from "@/lib/store/slices";

type CoachProgramsPanelProps = {
  locale: Locale;
  currency: string;
};

function emptyForm(): Omit<CoachProgram, "id" | "coach_id" | "gym_id" | "active"> {
  return { name: "", description: "", price: 0, duration_days: 30 };
}

export function CoachProgramsPanel({ locale, currency }: CoachProgramsPanelProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [programs, setPrograms] = useState<CoachProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CoachProgram | null>(null);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPrograms(await fetchCoachPrograms());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (program: CoachProgram) => {
    setEditing(program);
    setForm({
      name: program.name,
      description: program.description,
      price: program.price,
      duration_days: program.duration_days,
    });
    setOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await upsertCoachProgram({
        id: editing?.id,
        ...form,
      });
      setOpen(false);
      await load();
      showToast("success", editing ? t("programEditSuccess") : t("programAddSuccess"));
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium leading-7 text-muted-foreground">{t("coachProgramsPanelDesc")}</p>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
          onClick={openAdd}
        >
          <FiPlus aria-hidden="true" />
          {t("coachProgramAdd")}
        </button>
      </div>

      {error ? (
        <p className="panel-alert border-danger/30 bg-danger/10 text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {programs.length === 0 ? (
        <div className="panel-empty-state">
          <div className="panel-empty-icon">
            <FiBookOpen aria-hidden="true" />
          </div>
          <p className="panel-empty-title">{t("coachProgramsEmpty")}</p>
          <p className="panel-empty-desc">{t("coachProgramsPanelDesc")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {programs.map((program) => (
            <div
              key={program.id}
              className="playbook-card"
              onClick={() => openEdit(program)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  openEdit(program);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="playbook-card-header">
                <p className="playbook-card-name">{program.name}</p>
                <span className="playbook-card-price">{program.price.toLocaleString("en-US")} {currency}</span>
              </div>
              {program.description ? (
                <p className="playbook-card-desc">{program.description}</p>
              ) : null}
              <div className="playbook-card-footer">
                <span>{program.duration_days} {t("profilePlanDays")}</span>
                <FiEdit2 aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("coachProgramEdit") : t("coachProgramAdd")}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
              onClick={() => setOpen(false)}
            >
              {t("memberModalCancel")}
            </button>
            <button
              type="submit"
              form="coach-program-form"
              disabled={saving}
              className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
            >
              {saving ? <Spinner size="sm" label={t("uiSaving")} /> : t("memberModalSave")}
            </button>
          </div>
        }
      >
        <form id="coach-program-form" className="grid gap-3" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingPlanName")}</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("coachProgramDescription")}</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2"
              rows={3}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingPlanPrice")}</span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.price || ""}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingPlanDuration")}</span>
            <input
              required
              type="number"
              min={1}
              value={form.duration_days}
              onChange={(e) => setForm((f) => ({ ...f, duration_days: Number(e.target.value) || 1 }))}
              className="w-full px-3"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
