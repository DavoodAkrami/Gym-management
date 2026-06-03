"use client";

import { FiGlobe } from "react-icons/fi";
import { getTranslation } from "@/lib/i18n/translations";
import { uiActions, type Locale } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { SelectBar } from "./SelectBar";

const localeOptions: { value: Locale; label: string; hint: string }[] = [
  { value: "en", label: "English", hint: "EN" },
  { value: "fa", label: "فارسی", hint: "FA" },
];

export function LanguageSelect({ className = "" }: { className?: string }) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);

  return (
    <SelectBar
      className={className}
      label={getTranslation(locale, "languageLabel")}
      value={locale}
      options={localeOptions}
      icon={<FiGlobe aria-hidden="true" />}
      onChange={(nextLocale) => dispatch(uiActions.setLocale(nextLocale))}
    />
  );
}
