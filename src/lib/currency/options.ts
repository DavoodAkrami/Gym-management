import type { SelectBarOption } from "@/components/SelectBar";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/store/slices";
import { getTranslation } from "@/lib/i18n/translations";

export const GYM_CURRENCY_CODES = ["IRT"] as const;
export type GymCurrencyCode = (typeof GYM_CURRENCY_CODES)[number];

const currencyLabelKeys: Record<GymCurrencyCode, TranslationKey> = {
  IRT: "currencyToman",
};

export function isGymCurrencyCode(value: string): value is GymCurrencyCode {
  return GYM_CURRENCY_CODES.includes(value as GymCurrencyCode);
}

export function normalizeGymCurrency(value: string | undefined | null): GymCurrencyCode {
  const upper = (value ?? "").trim().toUpperCase();
  if (upper === "IRT" || upper === "TOMAN" || upper === "IRR") {
    return "IRT";
  }
  return "IRT";
}

export function gymCurrencyOptions(locale: Locale): SelectBarOption<GymCurrencyCode>[] {
  return GYM_CURRENCY_CODES.map((value) => ({
    value,
    label: getTranslation(locale, currencyLabelKeys[value]),
  }));
}
