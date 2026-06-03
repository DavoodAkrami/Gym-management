"use client";

import Link from "next/link";
import { FiLogOut } from "react-icons/fi";
import { LanguageSelect } from "@/components/LanguageSelect";
import { getTranslation } from "@/lib/i18n/translations";
import { authActions } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TrainerShellProps = {
  children: React.ReactNode;
  gymName?: string;
};

export function TrainerShell({ children, gymName }: TrainerShellProps) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const authUser = useAppSelector((state) => state.auth.user);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    dispatch(authActions.clearAuth());
    window.location.href = "/login";
  };

  return (
    <div className="panel-page-body mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
      <header className="surface-panel flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="brand-mark grid size-10 shrink-0 place-items-center rounded-lg text-sm font-black">
            GM
          </span>
          <div className="min-w-0">
            <p className="text-eyebrow">{t("trainerPortalEyebrow")}</p>
            <p className="truncate text-base font-black text-foreground">
              {gymName ?? t("brandName")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelect />
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-2 border border-glass-border bg-glass px-3 py-2 text-sm font-bold"
            title={t("trainerPortalSignOut")}
          >
            <FiLogOut aria-hidden="true" />
            <span className="hidden sm:inline">{t("trainerPortalSignOut")}</span>
          </button>
        </div>
      </header>

      <div className="panel-main-card surface-panel flex min-h-0 flex-1 flex-col">
        <div className="panel-scroll-region flex-1 p-5 sm:p-7">{children}</div>
      </div>

      <footer className="shrink-0 pb-2 text-center">
        {authUser?.email ? (
          <p className="text-xs font-semibold text-muted-foreground">
            {t("memberPortalAccount")}: {authUser.email}
          </p>
        ) : null}
        <Link
          href="/"
          className="mt-2 inline-block text-xs font-bold text-muted-foreground no-underline hover:underline"
        >
          {t("authBackHome")}
        </Link>
      </footer>
    </div>
  );
}
