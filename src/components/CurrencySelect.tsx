"use client";

import { SelectBar } from "@/components/SelectBar";
import {
  gymCurrencyOptions,
  normalizeGymCurrency,
  type GymCurrencyCode,
} from "@/lib/currency/options";
import { getTranslation } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/store/slices";

type CurrencySelectProps = {
  locale: Locale;
  value: GymCurrencyCode | string;
  onChange: (value: GymCurrencyCode) => void;
  label?: string;
  fullWidth?: boolean;
};

export function CurrencySelect({
  locale,
  value,
  onChange,
  label,
  fullWidth = true,
}: CurrencySelectProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  return (
    <SelectBar
      fullWidth={fullWidth}
      portalMenu
      align="start"
      label={label ?? t("onboardingCurrency")}
      value={normalizeGymCurrency(value)}
      options={gymCurrencyOptions(locale)}
      onChange={onChange}
    />
  );
}
