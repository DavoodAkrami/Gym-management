"use client";

import { FiPlus, FiTrash2 } from "react-icons/fi";
import { CurrencySelect } from "@/components/CurrencySelect";
import { getTranslation } from "@/lib/i18n/translations";
import { normalizeGymCurrency, type GymCurrencyCode } from "@/lib/currency/options";
import type { Locale } from "@/lib/store/slices";

export type PlanDraft = {
  id: string;
  name: string;
  price: string;
  durationDays: string;
};

export function createPlanDraft(partial?: Partial<PlanDraft>): PlanDraft {
  return {
    id: crypto.randomUUID(),
    name: partial?.name ?? "",
    price: partial?.price ?? "",
    durationDays: partial?.durationDays ?? "30",
  };
}

export function defaultPlanDrafts(locale: Locale): PlanDraft[] {
  return [
    createPlanDraft({ name: locale === "fa" ? "ماهانه" : "Monthly", price: "49", durationDays: "30" }),
    createPlanDraft({ name: locale === "fa" ? "سالانه" : "Yearly", price: "499", durationDays: "365" }),
  ];
}

export function parseGymPlans(plans: PlanDraft[]) {
  return plans
    .map((plan) => ({
      name: plan.name.trim(),
      price: Number(plan.price),
      durationDays: Number(plan.durationDays),
    }))
    .filter((plan) => plan.name && plan.price > 0 && plan.durationDays > 0);
}

type GymSetupFieldsProps = {
  locale: Locale;
  gymName: string;
  address: string;
  phone: string;
  baseCurrency: string;
  plans: PlanDraft[];
  onGymNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onBaseCurrencyChange: (value: string) => void;
  onPlansChange: (plans: PlanDraft[]) => void;
};

export function GymSetupFields({
  locale,
  gymName,
  address,
  phone,
  baseCurrency,
  plans,
  onGymNameChange,
  onAddressChange,
  onPhoneChange,
  onBaseCurrencyChange,
  onPlansChange,
}: GymSetupFieldsProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const updatePlan = (id: string, field: keyof PlanDraft, value: string) => {
    onPlansChange(plans.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan)));
  };

  return (
    <>
      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-black text-foreground">{t("onboardingGymSection")}</legend>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted-foreground">{t("onboardingGymName")}</span>
          <input
            type="text"
            required
            value={gymName}
            onChange={(event) => onGymNameChange(event.target.value)}
            className="w-full px-4"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-muted-foreground">{t("onboardingAddress")}</span>
          <input
            type="text"
            required
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            className="w-full px-4"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-muted-foreground">{t("onboardingPhone")}</span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              className="w-full px-4"
            />
          </label>
          <div className="block">
            <CurrencySelect
              locale={locale}
              value={normalizeGymCurrency(baseCurrency)}
              onChange={(value: GymCurrencyCode) => onBaseCurrencyChange(value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <legend className="text-sm font-black text-foreground">{t("onboardingPlansSection")}</legend>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2 text-sm font-bold text-foreground"
            onClick={() => onPlansChange([...plans, createPlanDraft()])}
          >
            <FiPlus aria-hidden="true" />
            {t("onboardingAddPlan")}
          </button>
        </div>

        {plans.map((plan) => (
          <div key={plan.id} className="rounded-2xl border border-glass-border bg-glass/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-black text-muted-foreground">{t("onboardingPlanRow")}</span>
              {plans.length > 1 ? (
                <button
                  type="button"
                  aria-label={t("onboardingRemovePlan")}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-muted-foreground hover:text-foreground"
                  onClick={() => onPlansChange(plans.filter((item) => item.id !== plan.id))}
                >
                  <FiTrash2 aria-hidden="true" />
                  {t("onboardingRemovePlan")}
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-1">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingPlanName")}</span>
                <input
                  type="text"
                  required
                  value={plan.name}
                  onChange={(event) => updatePlan(plan.id, "name", event.target.value)}
                  className="w-full px-3"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingPlanPrice")}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={plan.price}
                  onChange={(event) => updatePlan(plan.id, "price", event.target.value)}
                  className="w-full px-3"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingPlanDuration")}</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={plan.durationDays}
                  onChange={(event) => updatePlan(plan.id, "durationDays", event.target.value)}
                  className="w-full px-3"
                />
              </label>
            </div>
          </div>
        ))}
      </fieldset>
    </>
  );
}
