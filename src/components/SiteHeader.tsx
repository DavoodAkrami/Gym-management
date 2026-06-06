"use client";

import Link from "next/link";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { getTranslation } from "@/lib/i18n/translations";
import { useAppSelector } from "@/lib/store/hooks";
import { PreferencesBar } from "./PreferencesBar";

type SiteHeaderProps = {
  showNavLinks?: boolean;
};

export function SiteHeader({ showNavLinks = true }: SiteHeaderProps) {
  const locale = useAppSelector((state) => state.ui.locale);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const StartIcon = locale === "fa" ? FiArrowLeft : FiArrowRight;

  return (
    <nav className="surface-panel flex flex-col gap-3 px-4 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3 no-underline">
          <span className="brand-mark grid size-10 shrink-0 place-items-center rounded-2xl text-base font-black shadow-soft sm:size-11 sm:text-lg">
            GM
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-foreground sm:text-base">{t("brandName")}</span>
            <span className="block truncate text-xs font-semibold text-muted-foreground">{t("brandTagline")}</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:hidden">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-border px-3 py-2.5 text-sm font-bold text-foreground no-underline"
          >
            {t("footerLogin")}
          </Link>
          <Link
            href="/signup"
            className="interactive-lift btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-black no-underline shadow-soft"
          >
            {t("navStart")}
            <StartIcon aria-hidden="true" />
          </Link>
        </div>
      </div>

      {showNavLinks ? (
        <div className="hidden items-center gap-7 text-sm font-bold text-muted-foreground md:flex">
          <a href="/#features">{t("navFeatures")}</a>
          <Link href="/signup">{t("navSignup")}</Link>
          <Link href="/panel">{t("navPanel")}</Link>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 sm:gap-3">
        <PreferencesBar />
        <Link
          href="/login"
          className="hidden items-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-bold text-foreground no-underline hover:bg-surface sm:inline-flex"
        >
          {t("footerLogin")}
        </Link>
        <Link
          href="/signup"
          className="interactive-lift btn-primary hidden items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black no-underline shadow-soft sm:inline-flex"
        >
          {t("navStart")}
          <StartIcon aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
