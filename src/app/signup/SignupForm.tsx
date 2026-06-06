"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { formatAuthError } from "@/lib/auth/post-login";
import { resolveSessionAfterSignUp } from "@/lib/auth/session";
import {
  defaultPlanDrafts,
  GymSetupFields,
  parseGymPlans,
  type PlanDraft,
} from "@/components/GymSetupFields";
import { getTranslation } from "@/lib/i18n/translations";
import { DEFAULT_ENABLED_SECTIONS } from "@/lib/panel/sections";
import { authActions, type AuthUser } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { bootstrapOwnerSession, completeGymOnboarding } from "@/lib/supabase/owner";
import { Spinner } from "@/components/ui/Spinner";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const status = useAppSelector((state) => state.auth.status);
  const error = useAppSelector((state) => state.auth.error);

  const [gymOnlyMode, setGymOnlyMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gymName, setGymName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("IRT");
  const [enabledSections, setEnabledSections] = useState<string[]>(DEFAULT_ENABLED_SECTIONS);
  const [publicSignupEnabled, setPublicSignupEnabled] = useState(false);
  const [plans, setPlans] = useState<PlanDraft[]>(() => defaultPlanDrafts(locale));

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const isLoading = status === "loading";

  useEffect(() => {
    setPlans(defaultPlanDrafts(locale));
  }, [locale]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        return;
      }

      const authUser: AuthUser = {
        id: data.session.user.id,
        email: data.session.user.email ?? "",
        full_name: (data.session.user.user_metadata?.full_name as string) || "",
      };

      dispatch(
        authActions.setAuth({
          user: authUser,
          session: data.session as unknown as Record<string, unknown>,
        }),
      );

      void bootstrapOwnerSession(dispatch, authUser).then((bootstrap) => {
        if (bootstrap.hasGym && bootstrap.gymSlug) {
          router.replace(`/panel/${bootstrap.gymSlug}`);
          return;
        }
        setGymOnlyMode(true);
      });
    });
  }, [dispatch, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedPlans = parseGymPlans(plans);

    if (!gymName.trim() || !address.trim() || !phone.trim() || parsedPlans.length === 0) {
      dispatch(
        authActions.setAuthStatus({
          status: "error",
          error: t("onboardingErrorRequired"),
        }),
      );
      return;
    }

    if (!isSupabaseConfigured()) {
      dispatch(
        authActions.setAuthStatus({
          status: "error",
          error:
            "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
        }),
      );
      return;
    }

    dispatch(authActions.setAuthStatus({ status: "loading", error: null }));

    try {
      const supabase = createSupabaseBrowserClient();
      let authUser: AuthUser | null = null;

      const { data: sessionData } = await supabase.auth.getSession();
      const existingUser = sessionData.session?.user;

      if (gymOnlyMode && existingUser) {
        authUser = {
          id: existingUser.id,
          email: existingUser.email ?? "",
          full_name: (existingUser.user_metadata?.full_name as string) || "",
        };
      } else {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
          throw new Error(t("onboardingErrorRequired"));
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role: "owner" } },
        });

        if (signUpError) {
          throw signUpError;
        }

        const session = await resolveSessionAfterSignUp(
          supabase,
          email,
          password,
          data.session,
        );

        authUser = {
          id: session.user.id,
          email: session.user.email ?? email,
          full_name: fullName || (session.user.user_metadata?.full_name as string) || "",
        };

        dispatch(
          authActions.setAuth({
            user: authUser,
            session: session as unknown as Record<string, unknown>,
          }),
        );
      }

      if (!authUser) {
        throw new Error(t("authErrorGeneric"));
      }

      const slug = await completeGymOnboarding(dispatch, authUser, {
        name: gymName,
        address,
        phone,
        baseCurrency,
        enabledSections,
        publicSignupEnabled,
        plans: parsedPlans,
      });

      router.replace(`/panel/${slug}`);
    } catch (caught) {
      dispatch(
        authActions.setAuthStatus({
          status: "error",
          error: formatAuthError(caught, t("authErrorGeneric")),
        }),
      );
    }
  };

  return (
    <div className="glass-panel w-full p-7 sm:p-9">
      <div className="mb-7">
        <p className="text-eyebrow">{t("onboardingEyebrow")}</p>
        <h1 className="mt-3 text-3xl font-black text-foreground">
          {gymOnlyMode ? t("onboardingTitle") : t("authSignupTitle")}
        </h1>
        <p className="mt-3 text-base font-medium leading-7 text-muted-foreground">
          {gymOnlyMode ? t("onboardingSubtitle") : t("authSignupSubtitle")}
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {!gymOnlyMode ? (
          <fieldset className="space-y-4">
            <legend className="mb-2 text-sm font-black text-foreground">{t("authAccountSection")}</legend>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-muted-foreground">{t("authFullName")}</span>
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full px-4"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-muted-foreground">{t("authEmail")}</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-muted-foreground">{t("authPassword")}</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4"
              />
            </label>
          </fieldset>
        ) : null}

        <GymSetupFields
          locale={locale}
          gymName={gymName}
          address={address}
          phone={phone}
          baseCurrency={baseCurrency}
          enabledSections={enabledSections}
          publicSignupEnabled={publicSignupEnabled}
          plans={plans}
          onGymNameChange={setGymName}
          onAddressChange={setAddress}
          onPhoneChange={setPhone}
          onBaseCurrencyChange={setBaseCurrency}
          onEnabledSectionsChange={setEnabledSections}
          onPublicSignupEnabledChange={setPublicSignupEnabled}
          onPlansChange={setPlans}
        />

        {error ? (
          <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-bold text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="interactive-lift btn-primary w-full rounded-2xl px-5 py-3.5 text-sm font-black shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <Spinner label={gymOnlyMode ? t("uiSaving") : t("uiLoading")} />
          ) : gymOnlyMode ? (
            t("onboardingSubmit")
          ) : (
            t("authSignupButton")
          )}
        </button>
      </form>

      {!gymOnlyMode ? (
        <p className="mt-6 text-sm font-bold">
          <Link href="/login" className="text-foreground no-underline hover:underline">
            {t("authSwitchToLogin")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
