"use client";

import Link from "next/link";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { getTranslation } from "@/lib/i18n/translations";
import { useAppSelector } from "@/lib/store/hooks";
import { LanguageSelect } from "./LanguageSelect";

type SiteHeaderProps = {
  showNavLinks?: boolean;
};

export function SiteHeader({ showNavLinks = true }: SiteHeaderProps) {
  const locale = useAppSelector((state) => state.ui.locale);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const StartIcon = locale === "fa" ? FiArrowLeft : FiArrowRight;

  return (
    <nav className="surface-panel flex items-center justify-between gap-4 px-5 py-4">
      <Link href="/" className="flex items-center gap-3 no-underline">
        <span className="brand-mark grid size-11 place-items-center rounded-2xl text-lg font-black shadow-soft">
          GM
        </span>
        <span>
          <span className="block text-base font-black text-foreground">{t("brandName")}</span>
          <span className="block text-xs font-semibold text-muted-foreground">{t("brandTagline")}</span>
        </span>
      </Link>

      {showNavLinks ? (
        <div className="hidden items-center gap-7 text-sm font-bold text-muted-foreground md:flex">
          <a href="/#features">{t("navFeatures")}</a>
          <a href="/#signup">{t("navSignup")}</a>
          <a href="/#data">{t("navData")}</a>
          <Link href="/panel">{t("navPanel")}</Link>
        </div>
      ) : (
        <span className="hidden md:block" />
      )}

      <div className="flex items-center gap-3">
        <LanguageSelect className="hidden sm:block" />
        <Link
          href="/signup"
          className="interactive-lift btn-primary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black no-underline shadow-soft"
        >
          {t("navStart")}
          <StartIcon aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
