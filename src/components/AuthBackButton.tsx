"use client";

import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { getTranslation } from "@/lib/i18n/translations";
import { useAppSelector } from "@/lib/store/hooks";

export function AuthBackButton() {
  const locale = useAppSelector((state) => state.ui.locale);

  return (
    <Link
      href="/"
      aria-label={getTranslation(locale, "authBackHome")}
      className="interactive-lift fixed top-5 left-5 z-50 grid size-11 place-items-center rounded-2xl border border-glass-border bg-glass text-foreground no-underline shadow-soft backdrop-blur-xl sm:top-8 sm:left-8"
    >
      <FiArrowLeft className="text-xl" aria-hidden="true" />
    </Link>
  );
}
