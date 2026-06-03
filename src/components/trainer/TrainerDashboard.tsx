"use client";

import { FormEvent, useState } from "react";
import { FiClock, FiEdit2, FiMapPin, FiPhone, FiUser } from "react-icons/fi";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import { readAvatarFile } from "@/lib/staff/avatar";
import type { TrainerPortalData, TrainerProfileInput } from "@/lib/supabase/trainer-portal";
import { updateTrainerSelfProfile } from "@/lib/supabase/trainer-portal";
import type { Locale } from "@/lib/store/slices";

type TrainerDashboardProps = {
  locale: Locale;
  portal: TrainerPortalData;
  onUpdated: () => void;
};

function toProfileInput(portal: TrainerPortalData): TrainerProfileInput {
  return {
    first_name: portal.trainer.first_name,
    last_name: portal.trainer.last_name,
    phone: portal.trainer.phone ?? "",
    email: portal.trainer.email ?? "",
    specialty: portal.trainer.specialty ?? "",
    avatar_url: portal.trainer.avatar_url ?? "",
    gym_hours_start: portal.trainer.gym_hours_start ?? "09:00",
    gym_hours_end: portal.trainer.gym_hours_end ?? "21:00",
  };
}

export function TrainerDashboard({ locale, portal, onUpdated }: TrainerDashboardProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TrainerProfileInput>(() => toProfileInput(portal));

  const coachName =
    portal.coach?.full_name ||
    `${portal.coach?.first_name ?? ""} ${portal.coach?.last_name ?? ""}`.trim() ||
    "—";

  const handleAvatar = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const url = await readAvatarFile(file);
      setForm((v) => ({ ...v, avatar_url: url }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateTrainerSelfProfile(form);
      setEditing(false);
      onUpdated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">
            {t("trainerPortalGreeting").replace(
              "{name}",
              `${portal.trainer.first_name} ${portal.trainer.last_name}`,
            )}
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">{portal.gym.name}</p>
        </div>
        {!editing ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
            onClick={() => {
              setForm(toProfileInput(portal));
              setEditing(true);
            }}
          >
            <FiEdit2 aria-hidden="true" />
            {t("trainerPortalEdit")}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="panel-alert border border-danger/30 bg-danger/10 text-danger">{error}</p>
      ) : null}

      {editing ? (
        <form className="panel-card space-y-4 p-5" onSubmit={(e) => void handleSubmit(e)}>
          <div className="flex items-center gap-4">
            <StaffAvatar
              firstName={form.first_name}
              lastName={form.last_name}
              avatarUrl={form.avatar_url}
              size="lg"
            />
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t("staffPhoto")}
              </span>
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm"
                onChange={(e) => void handleAvatar(e.target.files?.[0])}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t("memberFirstName")}
              </span>
              <input
                required
                value={form.first_name}
                onChange={(e) => setForm((v) => ({ ...v, first_name: e.target.value }))}
                className="w-full px-3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t("memberLastName")}
              </span>
              <input
                required
                value={form.last_name}
                onChange={(e) => setForm((v) => ({ ...v, last_name: e.target.value }))}
                className="w-full px-3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t("memberPhone")}
              </span>
              <input
                value={form.phone}
                onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
                className="w-full px-3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t("staffEmail")}
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                className="w-full px-3"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t("staffSpecialty")}
              </span>
              <input
                value={form.specialty}
                onChange={(e) => setForm((v) => ({ ...v, specialty: e.target.value }))}
                className="w-full px-3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t("trainerGymHoursStart")}
              </span>
              <input
                type="time"
                value={form.gym_hours_start}
                onChange={(e) => setForm((v) => ({ ...v, gym_hours_start: e.target.value }))}
                className="w-full px-3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t("trainerGymHoursEnd")}
              </span>
              <input
                type="time"
                value={form.gym_hours_end}
                onChange={(e) => setForm((v) => ({ ...v, gym_hours_end: e.target.value }))}
                className="w-full px-3"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
              onClick={() => setEditing(false)}
            >
              {t("memberModalCancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
            >
              {saving ? <Spinner label={t("uiSaving")} /> : t("memberModalSave")}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="panel-card flex items-center gap-4 p-5">
            <StaffAvatar
              firstName={portal.trainer.first_name}
              lastName={portal.trainer.last_name}
              avatarUrl={portal.trainer.avatar_url ?? undefined}
              size="lg"
            />
            <div>
              <p className="text-lg font-black text-foreground">
                {portal.trainer.first_name} {portal.trainer.last_name}
              </p>
              <p className="text-sm font-semibold text-muted-foreground">
                {portal.trainer.specialty || t("staffRoleTrainer")}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="member-stat-tile">
              <FiUser className="shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="member-stat-label">{t("staffReportsTo")}</p>
                <p className="member-stat-value">{coachName}</p>
              </div>
            </div>
            <div className="member-stat-tile">
              <FiClock className="shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="member-stat-label">{t("trainerGymHours")}</p>
                <p className="member-stat-value">
                  {portal.trainer.gym_hours_start && portal.trainer.gym_hours_end
                    ? `${portal.trainer.gym_hours_start} – ${portal.trainer.gym_hours_end}`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="member-stat-tile">
              <FiPhone className="shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="member-stat-label">{t("memberPhone")}</p>
                <p className="member-stat-value">{portal.trainer.phone || "—"}</p>
              </div>
            </div>
            <div className="member-stat-tile">
              <FiMapPin className="shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="member-stat-label">{t("onboardingAddress")}</p>
                <p className="member-stat-value text-sm leading-6">{portal.gym.address || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
