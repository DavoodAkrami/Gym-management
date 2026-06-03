"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { SelectBar, type SelectBarOption } from "@/components/SelectBar";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import type { MemberFormValues, MemberWithMeta } from "@/lib/members/types";
import type { GymPlan, Locale } from "@/lib/store/slices";

type MemberFormModalProps = {
  open: boolean;
  locale: Locale;
  mode: "add" | "edit";
  member?: MemberWithMeta;
  plans: GymPlan[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: MemberFormValues) => void;
};

function defaultValues(member: MemberWithMeta | undefined, plans: GymPlan[]): MemberFormValues {
  const defaultPlanId = member?.currentMembership?.plan_id ?? plans[0]?.id ?? "";

  return {
    first_name: member?.first_name ?? "",
    last_name: member?.last_name ?? "",
    phone: member?.phone ?? "",
    zip_code: member?.zip_code ?? "",
    national_id: member?.national_id ?? "",
    preferred_language: member?.preferred_language ?? "en",
    status: member?.status ?? "active",
    join_date: member?.join_date ?? new Date().toISOString().slice(0, 10),
    plan_id: defaultPlanId,
  };
}

export function MemberFormModal({
  open,
  locale,
  mode,
  member,
  plans,
  saving,
  onClose,
  onSubmit,
}: MemberFormModalProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [values, setValues] = useState<MemberFormValues>(() => defaultValues(member, plans));
  const [formError, setFormError] = useState<string | null>(null);

  const planIdsKey = plans.map((plan) => plan.id).join(",");

  useEffect(() => {
    if (open) {
      setValues(defaultValues(member, plans));
      setFormError(null);
    }
  }, [open, member?.id, mode, planIdsKey]);

  const languageOptions: SelectBarOption<"en" | "fa">[] = useMemo(
    () => [
      { value: "en", label: "English", hint: "EN" },
      { value: "fa", label: "فارسی", hint: "FA" },
    ],
    [],
  );

  const statusOptions: SelectBarOption<MemberFormValues["status"]>[] = useMemo(
    () => [
      { value: "active", label: getTranslation(locale, "memberStatusActive") },
      { value: "inactive", label: getTranslation(locale, "memberStatusInactive") },
      { value: "expired", label: getTranslation(locale, "memberStatusExpired") },
      { value: "suspended", label: getTranslation(locale, "memberStatusSuspended") },
    ],
    [locale],
  );

  const planOptions: SelectBarOption[] = useMemo(
    () =>
      plans.map((plan) => ({
        value: plan.id,
        label: plan.name,
        hint: `${plan.price} / ${plan.duration_days}d`,
      })),
    [plans],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (mode === "add" && !values.plan_id) {
      setFormError(plans.length === 0 ? t("memberNoPlans") : t("memberPlanRequired"));
      return;
    }

    onSubmit(values);
  };

  const title = mode === "add" ? t("memberModalAddTitle") : t("memberModalEditTitle");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
            onClick={onClose}
          >
            {t("memberModalCancel")}
          </button>
          <button
            type="submit"
            form="member-form"
            disabled={saving || (mode === "add" && plans.length === 0)}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
          >
            {saving ? <Spinner label={t("uiSaving")} /> : t("memberModalSave")}
          </button>
        </div>
      }
    >
      <form id="member-form" className="member-form-grid grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberFirstName")}</span>
          <input
            required
            value={values.first_name}
            onChange={(e) => setValues((v) => ({ ...v, first_name: e.target.value }))}
            className="w-full px-3"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberLastName")}</span>
          <input
            required
            value={values.last_name}
            onChange={(e) => setValues((v) => ({ ...v, last_name: e.target.value }))}
            className="w-full px-3"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPhone")}</span>
          <input
            required
            value={values.phone}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            className="w-full px-3"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberJoinDate")}</span>
          <input
            type="date"
            required
            value={values.join_date}
            onChange={(e) => setValues((v) => ({ ...v, join_date: e.target.value }))}
            className="w-full px-3"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberZipCode")}</span>
          <input
            value={values.zip_code}
            onChange={(e) => setValues((v) => ({ ...v, zip_code: e.target.value }))}
            className="w-full px-3"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberNationalId")}</span>
          <input
            value={values.national_id}
            onChange={(e) => setValues((v) => ({ ...v, national_id: e.target.value }))}
            className="w-full px-3"
          />
        </label>

        <div className="sm:col-span-1">
          <SelectBar
            fullWidth
            portalMenu
            align="start"
            label={t("memberLanguage")}
            value={values.preferred_language}
            options={languageOptions}
            onChange={(preferred_language) => setValues((v) => ({ ...v, preferred_language }))}
          />
        </div>

        <div className="sm:col-span-1">
          <SelectBar
            fullWidth
            portalMenu
            align="start"
            label={t("memberStatus")}
            value={values.status}
            options={statusOptions}
            onChange={(status) => setValues((v) => ({ ...v, status }))}
          />
        </div>

        {mode === "add" ? (
          <div className="sm:col-span-2">
            <SelectBar
              fullWidth
              portalMenu
              align="start"
              label={t("memberPlan")}
              value={values.plan_id || planOptions[0]?.value || ""}
              options={planOptions}
              onChange={(plan_id) => setValues((v) => ({ ...v, plan_id }))}
              disabled={plans.length === 0}
            />
            {plans.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">{t("memberNoPlans")}</p>
            ) : null}
          </div>
        ) : (
          <p className="sm:col-span-2 text-sm font-medium text-muted-foreground">{t("memberEditPlanHint")}</p>
        )}

        {formError ? (
          <p className="panel-alert sm:col-span-2 border-danger/30 bg-danger/10 text-danger" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
