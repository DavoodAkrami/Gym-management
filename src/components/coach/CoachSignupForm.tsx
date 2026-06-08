"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PreferencesBar } from "@/components/PreferencesBar";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { authUserFromSession } from "@/lib/auth/roles";
import { formatAuthError } from "@/lib/auth/post-login";
import { resolveSessionAfterSignUp } from "@/lib/auth/session";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { getTranslation } from "@/lib/i18n/translations";
import { readAvatarFile } from "@/lib/staff/avatar";
import { authActions } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchCoachSignupContext,
  linkCoachAccount,
  registerCoachAccount,
} from "@/lib/supabase/coach-portal";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type CoachSignupFormProps = {
  gymSlug: string;
};

export function CoachSignupForm({ gymSlug }: CoachSignupFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [gymName, setGymName] = useState("");
  const [loadingContext, setLoadingContext] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [gymHoursStart, setGymHoursStart] = useState("09:00");
  const [gymHoursEnd, setGymHoursEnd] = useState("21:00");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingContext(true);
      setContextError(null);
      try {
        const gym = await fetchCoachSignupContext(gymSlug);
        if (!cancelled) {
          setGymName(gym.name);
        }
      } catch (caught) {
        if (!cancelled) {
          setContextError(formatAuthError(caught, t("coachSignupInvalidGym")));
        }
      } finally {
        if (!cancelled) {
          setLoadingContext(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [gymSlug, locale]);

  const handleAvatar = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      setAvatarUrl(await readAvatarFile(file));
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!isSupabaseConfigured()) {
      setFormError(t("authErrorGeneric"));
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const today = new Date().toISOString().slice(0, 10);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            role: "coach",
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      const session = await resolveSessionAfterSignUp(
        supabase,
        email,
        password,
        signUpData.session,
      );

      if (!session?.user) {
        throw new Error(t("authErrorGeneric"));
      }

      dispatch(
        authActions.setAuth({
          user: authUserFromSession(session.user, email),
          session: session as unknown as Record<string, unknown>,
        }),
      );

      let linked = false;
      try {
        linked = await linkCoachAccount(gymSlug);
      } catch {
        linked = false;
      }

      if (!linked) {
        await registerCoachAccount({
          gym_slug: gymSlug,
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
          specialty,
          avatar_url: avatarUrl,
          gym_hours_start: gymHoursStart,
          gym_hours_end: gymHoursEnd,
          contract_start_date: today,
          contract_end_date: nextYear.toISOString().slice(0, 10),
        });
      }

      router.replace(`/coach/${gymSlug}`);
    } catch (caught) {
      setFormError(formatAuthError(caught, t("authErrorGeneric")));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingContext) {
    return <ListSkeleton rows={5} />;
  }

  if (contextError) {
    return (
      <div className="panel-card space-y-4 p-6">
        <p className="panel-alert border border-danger/30 bg-danger/10 text-danger">{contextError}</p>
        <Link href="/" className="text-sm font-bold text-muted-foreground">
          {t("authBackHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel w-full max-w-xl p-7 sm:p-9">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-eyebrow">{t("coachSignupEyebrow")}</p>
          <h1 className="mt-2 text-2xl font-black text-foreground">{gymName}</h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">{t("coachSignupSubtitle")}</p>
        </div>
        <PreferencesBar className="self-end sm:shrink-0" />
      </div>

      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <div className="flex items-center gap-4">
          <StaffAvatar firstName={firstName} lastName={lastName} avatarUrl={avatarUrl} size="lg" />
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

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberFirstName")}</span>
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberLastName")}</span>
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPhone")}</span>
            <PhoneInput value={phone} onChange={setPhone} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffSpecialty")}</span>
            <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full px-3" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("trainerGymHoursStart")}</span>
            <input type="time" value={gymHoursStart} onChange={(e) => setGymHoursStart(e.target.value)} className="w-full px-3" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("trainerGymHoursEnd")}</span>
            <input type="time" value={gymHoursEnd} onChange={(e) => setGymHoursEnd(e.target.value)} className="w-full px-3" />
          </label>
        </div>

        <fieldset className="space-y-3 border-t border-border pt-4">
          <legend className="text-sm font-black text-foreground">{t("joinAccountSection")}</legend>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("authEmail")}</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("authPassword")}</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3"
            />
          </label>
        </fieldset>

        {formError ? (
          <p className="panel-alert border border-danger/30 bg-danger/10 text-danger">{formError}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary inline-flex items-center justify-center gap-2 w-full rounded-2xl px-5 py-3.5 text-sm font-black disabled:opacity-70"
        >
          {submitting ? <Spinner label={t("uiSaving")} /> : t("coachSignupSubmit")}
        </button>
      </form>
    </div>
  );
}
