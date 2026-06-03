"use client";

import { FormEvent, useState } from "react";
import { FiEdit2, FiLogOut } from "react-icons/fi";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import { readAvatarFile } from "@/lib/staff/avatar";
import {
  updateMemberSelfProfile,
  type MemberPortalData,
} from "@/lib/supabase/member-portal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { authActions } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import type { Locale } from "@/lib/store/slices";

type MemberProfileSectionProps = {
  portal: MemberPortalData;
  locale: Locale;
  onUpdated: () => void;
};

export function MemberProfileSection({ portal, locale, onUpdated }: MemberProfileSectionProps) {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(portal.member.first_name);
  const [lastName, setLastName] = useState(portal.member.last_name);
  const [phone, setPhone] = useState(portal.member.phone);
  const [avatarUrl, setAvatarUrl] = useState(portal.member.avatar_url ?? "");

  const handleAvatar = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      setAvatarUrl(await readAvatarFile(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateMemberSelfProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        avatar_url: avatarUrl,
      });
      setSuccess(t("memberProfileSaved"));
      setEditing(false);
      onUpdated();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-foreground">{t("memberPortalProfile")}</h2>
        {!editing ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-glass-border px-3 py-2 text-sm font-bold"
            onClick={() => setEditing(true)}
          >
            <FiEdit2 aria-hidden="true" />
            {t("memberEdit")}
          </button>
        ) : null}
      </div>

      {editing ? (
        <form className="panel-card space-y-4 p-5" onSubmit={(e) => void handleSubmit(e)}>
          <div className="flex items-center gap-4">
            <StaffAvatar firstName={firstName} lastName={lastName} avatarUrl={avatarUrl} size="lg" />
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffPhoto")}</span>
              <input type="file" accept="image/*" className="w-full text-sm" onChange={(e) => void handleAvatar(e.target.files?.[0])} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberFirstName")}</span>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberLastName")}</span>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPhone")}</span>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3" />
            </label>
          </div>
          {error ? <p className="panel-alert border-danger/30 bg-danger/10 text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <button type="button" className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold" onClick={() => setEditing(false)}>
              {t("memberModalCancel")}
            </button>
            <button type="submit" disabled={saving} className="btn-primary rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70">
              {saving ? <Spinner label={t("uiSaving")} /> : t("memberModalSave")}
            </button>
          </div>
        </form>
      ) : (
        <div className="panel-card flex items-center gap-4 p-5">
          <StaffAvatar
            firstName={portal.member.first_name}
            lastName={portal.member.last_name}
            avatarUrl={portal.member.avatar_url ?? undefined}
            size="lg"
          />
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-bold text-muted-foreground">{t("authEmail")}</dt>
              <dd className="font-black">{authUser?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-bold text-muted-foreground">{t("memberPhone")}</dt>
              <dd className="font-black">{portal.member.phone}</dd>
            </div>
          </dl>
        </div>
      )}

      {success ? <p className="text-sm font-bold text-success">{success}</p> : null}

      <section className="panel-card border-t border-border p-5">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-4 py-2.5 text-sm font-bold"
        >
          <FiLogOut aria-hidden="true" />
          {t("memberPortalSignOut")}
        </button>
      </section>
    </div>
  );
}
