"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { FiLogOut } from "react-icons/fi";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import { readAvatarFile } from "@/lib/staff/avatar";
import {
  fetchCoachPortal,
  updateCoachSelfProfile,
  type CoachPortalData,
  type CoachProfileInput,
} from "@/lib/supabase/coach-portal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { authActions } from "@/lib/store/slices";
import { useAppDispatch } from "@/lib/store/hooks";
import type { Locale } from "@/lib/store/slices";

type CoachSelfProfilePanelProps = {
  locale: Locale;
  onUpdated?: (data: CoachPortalData) => void;
};

function toForm(data: CoachPortalData): CoachProfileInput {
  return {
    first_name: data.coach.first_name,
    last_name: data.coach.last_name,
    phone: data.coach.phone ?? "",
    email: data.coach.email ?? "",
    specialty: data.coach.specialty ?? "",
    avatar_url: data.coach.avatar_url ?? "",
    gym_hours_start: data.coach.gym_hours_start ?? "09:00",
    gym_hours_end: data.coach.gym_hours_end ?? "21:00",
  };
}

export function CoachSelfProfilePanel({ locale, onUpdated }: CoachSelfProfilePanelProps) {
  const dispatch = useAppDispatch();
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [portal, setPortal] = useState<CoachPortalData | null>(null);
  const [form, setForm] = useState<CoachProfileInput | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCoachPortal();
      if (!data) {
        setPortal(null);
        setForm(null);
        return;
      }
      setPortal(data);
      setForm(toForm(data));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAvatar = async (file: File | undefined) => {
    if (!file || !form) {
      return;
    }
    try {
      const url = await readAvatarFile(file);
      setForm((prev) => (prev ? { ...prev, avatar_url: url } : prev));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateCoachSelfProfile(form);
      const data = await fetchCoachPortal();
      if (data) {
        setPortal(data);
        setForm(toForm(data));
        onUpdated?.(data);
      }
      setSuccess(t("coachProfileSaved"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    dispatch(authActions.clearAuth());
    window.location.href = "/login";
  };

  if (loading) {
    return <ListSkeleton rows={5} />;
  }

  if (!portal || !form) {
    return (
      <div className="panel-card p-6 text-center">
        <p className="text-sm font-bold text-muted-foreground">{t("coachPortalEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm font-medium leading-7 text-muted-foreground">{t("coachProfilePanelDesc")}</p>

      <form className="panel-card space-y-4 p-5 sm:p-6" onSubmit={(e) => void handleSubmit(e)}>
        <div className="flex items-center gap-4">
          <StaffAvatar
            firstName={form.first_name}
            lastName={form.last_name}
            avatarUrl={form.avatar_url}
            size="lg"
          />
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffPhoto")}</span>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("staffPhotoHint")}</p>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm"
              onChange={(e) => void handleAvatar(e.target.files?.[0])}
            />
          </label>
        </div>

        <div className="member-form-grid grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberFirstName")}</span>
            <input
              required
              value={form.first_name}
              onChange={(e) => setForm((f) => (f ? { ...f, first_name: e.target.value } : f))}
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberLastName")}</span>
            <input
              required
              value={form.last_name}
              onChange={(e) => setForm((f) => (f ? { ...f, last_name: e.target.value } : f))}
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPhone")}</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => (f ? { ...f, phone: e.target.value } : f))}
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffEmail")}</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => (f ? { ...f, email: e.target.value } : f))}
              className="w-full px-3"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffSpecialty")}</span>
            <input
              value={form.specialty}
              onChange={(e) => setForm((f) => (f ? { ...f, specialty: e.target.value } : f))}
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("trainerGymHoursStart")}</span>
            <input
              type="time"
              value={form.gym_hours_start}
              onChange={(e) => setForm((f) => (f ? { ...f, gym_hours_start: e.target.value } : f))}
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("trainerGymHoursEnd")}</span>
            <input
              type="time"
              value={form.gym_hours_end}
              onChange={(e) => setForm((f) => (f ? { ...f, gym_hours_end: e.target.value } : f))}
              className="w-full px-3"
            />
          </label>
        </div>

        {error ? (
          <p className="panel-alert border-danger/30 bg-danger/10 text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="panel-alert border-success/30 bg-success/10 text-success" role="status">
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-70"
        >
          {saving ? <Spinner label={t("uiSaving")} /> : t("coachProfileSave")}
        </button>
      </form>

      <section className="panel-card border-t border-border p-5 sm:p-6">
        <h2 className="text-lg font-black text-foreground">{t("profileAccountSection")}</h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{t("profileLogoutDesc")}</p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-4 py-2.5 text-sm font-bold"
        >
          <FiLogOut aria-hidden="true" />
          {t("profileLogout")}
        </button>
      </section>
    </div>
  );
}
