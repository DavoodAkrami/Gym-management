"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { CurrencySelect } from "@/components/CurrencySelect";
import { normalizeGymCurrency } from "@/lib/currency/options";
import { getTranslation } from "@/lib/i18n/translations";
import { DEFAULT_ENABLED_SECTIONS, panelSections } from "@/lib/panel/sections";
import { authActions } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { completeGymOnboarding } from "@/lib/supabase/owner";

type PlanDraft = {
  id: string;
  name: string;
  price: string;
  durationDays: string;
};

function createPlanDraft(partial?: Partial<PlanDraft>): PlanDraft {
  return {
    id: crypto.randomUUID(),
    name: partial?.name ?? "",
    price: partial?.price ?? "",
    durationDays: partial?.durationDays ?? "30",
  };
}

export function GymOnboardingForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const user = useAppSelector((state) => state.auth.user);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [gymName, setGymName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("IRT");
  const [enabledSections, setEnabledSections] = useState<string[]>(DEFAULT_ENABLED_SECTIONS);
  const [publicSignupEnabled, setPublicSignupEnabled] = useState(false);
  const [plans, setPlans] = useState<PlanDraft[]>([
    createPlanDraft({ name: locale === "fa" ? "ماهانه" : "Monthly", price: "49", durationDays: "30" }),
    createPlanDraft({ name: locale === "fa" ? "سالانه" : "Yearly", price: "499", durationDays: "365" }),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updatePlan = (id: string, field: keyof PlanDraft, value: string) => {
    setPlans((current) => current.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!user) {
      router.replace("/login");
      return;
    }

    const parsedPlans = plans
      .map((plan) => ({
        name: plan.name.trim(),
        price: Number(plan.price),
        durationDays: Number(plan.durationDays),
      }))
      .filter((plan) => plan.name && plan.price > 0 && plan.durationDays > 0);

    if (!gymName.trim() || !address.trim() || !phone.trim() || parsedPlans.length === 0) {
      setError(t("onboardingErrorRequired"));
      return;
    }

    setLoading(true);
    dispatch(authActions.setAuthStatus({ status: "loading", error: null }));

    try {
      const slug = await completeGymOnboarding(dispatch, user, {
        name: gymName,
        address,
        phone,
        baseCurrency,
        enabledSections,
        publicSignupEnabled,
        plans: parsedPlans,
      });
      router.push(`/panel/${slug}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t("authErrorGeneric");
      setError(message);
      dispatch(authActions.setAuthStatus({ status: "error", error: message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-2xl p-7 sm:p-9">
      <div className="mb-7">
        <p className="text-eyebrow">{t("onboardingEyebrow")}</p>
        <h1 className="mt-3 text-3xl font-black text-foreground">{t("onboardingTitle")}</h1>
        <p className="mt-3 text-base font-medium leading-7 text-muted-foreground">{t("onboardingSubtitle")}</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <fieldset className="space-y-4">
          <legend className="mb-2 text-sm font-black text-foreground">{t("onboardingGymSection")}</legend>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-muted-foreground">{t("onboardingGymName")}</span>
            <input
              type="text"
              required
              value={gymName}
              onChange={(event) => setGymName(event.target.value)}
              className="w-full px-4"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-muted-foreground">{t("onboardingAddress")}</span>
            <input
              type="text"
              required
              value={address}
              onChange={(event) => setAddress(event.target.value)}
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
                onChange={(event) => setPhone(event.target.value)}
                className="w-full px-4"
              />
            </label>
            <div className="block">
              <CurrencySelect
                locale={locale}
                value={normalizeGymCurrency(baseCurrency)}
                onChange={setBaseCurrency}
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
              onClick={() => setPlans((current) => [...current, createPlanDraft()])}
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
                    onClick={() => setPlans((current) => current.filter((item) => item.id !== plan.id))}
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

        <fieldset className="space-y-3">
          <legend className="text-sm font-black text-foreground">{t("onboardingPanelsSection")}</legend>
          <p className="text-xs font-medium text-muted-foreground">{t("onboardingPanelsDesc")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {panelSections.map((section) => (
              <label
                key={section.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-glass-border bg-glass/40 px-3 py-2.5 text-sm font-bold text-foreground has-checked:border-primary/40 has-checked:bg-primary/5"
              >
                <input
                  type="checkbox"
                  checked={enabledSections.includes(section.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEnabledSections([...enabledSections, section.id]);
                    } else {
                      setEnabledSections(enabledSections.filter((id) => id !== section.id));
                    }
                  }}
                  className="size-4 accent-primary"
                />
                {t(section.labelKey)}
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-bold text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="interactive-lift btn-primary w-full rounded-2xl px-5 py-3.5 text-sm font-black shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? t("authLoading") : t("onboardingSubmit")}
        </button>
      </form>
    </div>
  );
}
