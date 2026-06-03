"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authUserFromSession } from "@/lib/auth/roles";
import { formatAuthError, routeAfterAuth } from "@/lib/auth/post-login";
import { linkCoachAccount } from "@/lib/supabase/coach-portal";
import { getTranslation } from "@/lib/i18n/translations";
import { authActions } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { Spinner } from "@/components/ui/Spinner";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const status = useAppSelector((state) => state.auth.status);
  const error = useAppSelector((state) => state.auth.error);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const isLoading = status === "loading";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        throw signInError;
      }

      if (!data.session?.user) {
        throw new Error(t("authErrorGeneric"));
      }

      const authUser = authUserFromSession(data.session.user, email);

      dispatch(
        authActions.setAuth({
          user: authUser,
          session: data.session as unknown as Record<string, unknown>,
        }),
      );

      try {
        await linkCoachAccount();
      } catch {
        /* owner must add coach with same email first */
      }

      await routeAfterAuth(dispatch, router, authUser);
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
        <h1 className="text-3xl font-black text-foreground">{t("authLoginTitle")}</h1>
        <p className="mt-3 text-base font-medium leading-7 text-muted-foreground">{t("authLoginSubtitle")}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-black text-muted-foreground">{t("authEmail")}</span>
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
          <span className="mb-2 block text-sm font-black text-muted-foreground">{t("authPassword")}</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full px-4"
          />
        </label>

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
          {isLoading ? <Spinner label={t("uiLoading")} /> : t("authLoginButton")}
        </button>
      </form>

      <p className="mt-4 text-center text-sm font-bold text-muted-foreground">{t("authMemberHint")}</p>
      <p className="mt-2 text-center text-sm font-bold text-muted-foreground">{t("authCoachHint")}</p>

      <p className="mt-4 text-sm font-bold">
        <Link href="/signup" className="text-foreground no-underline hover:underline">
          {t("authSwitchToSignup")}
        </Link>
      </p>
    </div>
  );
}
