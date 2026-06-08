"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SelectBar, type SelectBarOption } from "@/components/SelectBar";
import { PreferencesBar } from "@/components/PreferencesBar";
import { authUserFromSession } from "@/lib/auth/roles";
import { formatAuthError } from "@/lib/auth/post-login";
import { resolveSessionAfterSignUp } from "@/lib/auth/session";
import { getTranslation } from "@/lib/i18n/translations";
import { authActions } from "@/lib/store/slices";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchSignupContext,
  registerMemberViaSignupLink,
  type SignupContext,
} from "@/lib/supabase/public-signup";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { Spinner } from "@/components/ui/Spinner";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast/client";

type JoinSignupFormProps = {
  token: string;
};

export function JoinSignupForm({ token }: JoinSignupFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);

  const [context, setContext] = useState<SignupContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState("");
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingContext(true);
      setContextError(null);

      try {
        if (!isSupabaseConfigured()) {
          throw new Error(
            "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
          );
        }

        const data = await fetchSignupContext(token);
        if (cancelled) {
          return;
        }
        setContext(data);
        setPlanId(data.plans[0]?.id ?? "");
      } catch (caught) {
        if (!cancelled) {
          setContextError(formatAuthError(caught, getTranslation(locale, "joinInvalidLink")));
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
  }, [token, locale]);

  const planOptions: SelectBarOption[] = useMemo(
    () =>
      (context?.plans ?? []).map((plan) => ({
        value: plan.id,
        label: plan.name,
        hint: `${plan.price} ${context?.gym.base_currency ?? ""} · ${plan.duration_days}d`,
      })),
    [context],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!context || !planId) {
      setFormError(t("memberPlanRequired"));
      return;
    }

    if (nationalId && !/^\d{10}$/.test(nationalId)) {
      setFormError(t("memberNationalIdFormat"));
      return;
    }

    if (!isSupabaseConfigured()) {
      setFormError("Supabase is not configured.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const usePhone = !email.trim();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
        usePhone
          ? { phone, password, options: { data: { role: "member", full_name: fullName } } }
          : { email, password, options: { data: { role: "member", full_name: fullName } } },
      );

      if (signUpError) {
        throw signUpError;
      }

      const session = await resolveSessionAfterSignUp(
        supabase,
        usePhone ? phone : email,
        password,
        signUpData.session,
        usePhone,
      );

      const authUser = authUserFromSession(session.user, usePhone ? phone : email);

      dispatch(
        authActions.setAuth({
          user: authUser,
          session: session as unknown as Record<string, unknown>,
        }),
      );

      await registerMemberViaSignupLink({
        token,
        first_name: firstName,
        last_name: lastName,
        phone,
        plan_id: planId,
        national_id: nationalId,
        email: email.trim() || undefined,
      });

      setSuccess(true);
      showToast("success", t("joinSuccessDesc"));
      window.setTimeout(() => {
        router.replace("/member");
      }, 1200);
    } catch (caught) {
      const msg = formatAuthError(caught, t("authErrorGeneric"));
      setFormError(msg);
      showToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingContext) {
    return (
      <div className="surface-panel w-full max-w-lg p-8 text-center">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (contextError || !context) {
    return (
      <div className="surface-panel w-full max-w-lg p-8 text-center">
        <h1 className="text-2xl font-black text-foreground">{t("joinInvalidLink")}</h1>
        <p className="mt-4 text-sm font-medium text-muted-foreground">{contextError}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-bold text-foreground no-underline hover:underline">
          {t("authBackHome")}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="surface-panel w-full max-w-lg p-8 text-center">
        <h1 className="text-2xl font-black text-foreground">{t("joinSuccessTitle")}</h1>
        <p className="mt-4 text-sm font-medium text-muted-foreground">{t("joinSuccessDesc")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-4 flex justify-end">
        <PreferencesBar />
      </div>

      <div className="surface-panel p-7 sm:p-9">
        <p className="text-eyebrow">{t("joinEyebrow")}</p>
        <h1 className="mt-2 text-2xl font-black text-foreground">{context.gym.name}</h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{t("joinSubtitle")}</p>

        {context.gym.address ? (
          <p className="mt-3 text-xs font-semibold text-muted-foreground">{context.gym.address}</p>
        ) : null}

        <form className="member-form-grid mt-6 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block sm:col-span-1">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberFirstName")}</span>
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3" />
          </label>
          <label className="block sm:col-span-1">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberLastName")}</span>
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPhone")}</span>
            <PhoneInput required value={phone} onChange={setPhone} />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberNationalId")}</span>
            <input required value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="w-full px-3" />
          </label>

          <div className="sm:col-span-2">
            <SelectBar
              fullWidth
              portalMenu
              align="start"
              label={t("memberPlan")}
              value={planId || planOptions[0]?.value || ""}
              options={planOptions}
              onChange={setPlanId}
            />
          </div>

          <fieldset className="space-y-3 sm:col-span-2">
            <legend className="text-sm font-black text-foreground">{t("joinAccountSection")}</legend>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("authEmail")} ({t("authOptional")})</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("authPassword")}</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3"
              />
            </label>
          </fieldset>

          {formError ? (
            <p className="panel-alert sm:col-span-2 border border-danger/30 bg-danger/10 text-danger" role="alert">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary inline-flex items-center justify-center gap-2 sm:col-span-2 w-full px-4 py-3 text-sm font-black disabled:opacity-70"
          >
            {submitting ? <Spinner label={t("uiSaving")} /> : t("joinSubmit")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-bold">
          <Link href="/login" className="text-foreground no-underline hover:underline">
            {t("joinAlreadyMember")}
          </Link>
        </p>
      </div>
    </div>
  );
}
