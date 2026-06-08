"use client";

import { Spinner } from "@/components/ui/Spinner";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { panelSections } from "@/lib/panel/sections";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { GymProfileInput } from "@/lib/supabase/gym-profile";

type GymDetailsSectionProps = {
  gymForm: GymProfileInput;
  onChange: (form: GymProfileInput) => void;
  slug: string;
  enabledSections: string[];
  onToggleSection: (sectionId: string) => void;
  savingSections: boolean;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  t: (key: TranslationKey) => string;
};

export function GymDetailsSection({
  gymForm,
  onChange,
  slug,
  enabledSections,
  onToggleSection,
  savingSections,
  dirty,
  saving,
  onSave,
  t,
}: GymDetailsSectionProps) {
  return (
    <>
      <section className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingGymName")}</span>
          <input
            required
            value={gymForm.name}
            onChange={(e) => onChange({ ...gymForm, name: e.target.value })}
            className="w-full px-3"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("profileGymSlug")}</span>
          <input readOnly value={slug} className="w-full px-3 opacity-80" />
          <p className="mt-1 text-xs font-medium text-muted-foreground">{t("profileGymSlugHint")}</p>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingAddress")}</span>
          <textarea
            required
            rows={2}
            value={gymForm.address}
            onChange={(e) => onChange({ ...gymForm, address: e.target.value })}
            className="w-full px-3 py-2"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingPhone")}</span>
            <PhoneInput required value={gymForm.phone} onChange={(phone) => onChange({ ...gymForm, phone })} />
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-glass-border bg-glass/40 px-3 py-2.5 text-sm font-bold text-foreground has-checked:border-primary/40 has-checked:bg-primary/5">
          <input
            type="checkbox"
            checked={gymForm.public_signup_enabled === true}
            onChange={(e) => onChange({ ...gymForm, public_signup_enabled: e.target.checked })}
            className="size-4 accent-primary"
          />
          <span className="flex flex-col">
            <span>{t("publicSignupProfileLabel")}</span>
            <span className="text-xs font-medium text-muted-foreground">{t("publicSignupProfileDesc")}</span>
          </span>
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!dirty || saving}
            className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black disabled:opacity-70"
            onClick={() => onSave()}
          >
            {saving ? <Spinner label={t("uiSaving")} /> : t("profileSaveChanges")}
          </button>
        </div>
      </section>

      <div className="my-8 border-t border-glass-border" />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-foreground">{t("profilePanelsSection")}</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{t("profilePanelsDesc")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {panelSections.map((section) => {
            const locked = section.id === "members" || section.id === "profile";
            const isChecked = enabledSections.includes(section.id);
            return (
              <label
                key={section.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold ${
                  locked
                    ? "border-glass-border bg-glass/20 text-muted-foreground cursor-not-allowed"
                    : "border-glass-border bg-glass/40 text-foreground hover:bg-glass/60 has-checked:border-primary/40 has-checked:bg-primary/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={locked}
                  onChange={() => onToggleSection(section.id)}
                  className="size-4 accent-primary"
                />
                <span className="flex items-center gap-2">
                  {t(section.labelKey)}
                  {locked ? (
                    <span className="rounded-md bg-glass px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {t("profilePanelsLocked")}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        {savingSections ? (
          <p className="text-xs font-medium text-muted-foreground">{t("uiSaving")}</p>
        ) : null}
      </section>
    </>
  );
}
