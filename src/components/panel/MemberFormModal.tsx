"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { SelectBar, type SelectBarOption } from "@/components/SelectBar";
import { Spinner } from "@/components/ui/Spinner";
import { JalaliDatePicker } from "@/components/ui/JalaliDatePicker";
import { getTranslation } from "@/lib/i18n/translations";
import type { MemberFormValues, MemberWithMeta } from "@/lib/members/types";
import { toLocalDateKey } from "@/lib/panel/timeline";
import type { GymPlan, Locale } from "@/lib/store/slices";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { memberFormSchema } from "@/lib/validation/schemas";
import { translateFieldErrors } from "@/lib/validation/translate-errors";

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
    national_id: member?.national_id ?? "",
    status: member?.status ?? "active",
    join_date: member?.join_date ?? toLocalDateKey(new Date()),
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const planIdsKey = plans.map((plan) => plan.id).join(",");

  useEffect(() => {
    if (open) {
      setValues(defaultValues(member, plans));
      setFormError(null);
      setFieldErrors({});
    }
  }, [open, member?.id, mode, planIdsKey]);

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
    setFieldErrors({});

    const result = memberFormSchema.safeParse(values);
    if (!result.success) {
      setFieldErrors(translateFieldErrors(result.error.flatten().fieldErrors, t));
      return;
    }

    if (mode === "add" && !values.plan_id) {
      setFormError(plans.length === 0 ? t("memberNoPlans") : t("memberPlanRequired"));
      return;
    }

    onSubmit(values);
  };

  const fieldError = (name: string) =>
    fieldErrors[name] ? (
      <p className="mt-1 text-xs font-semibold text-danger">{fieldErrors[name][0]}</p>
    ) : null;

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
            className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
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
          {fieldError("first_name")}
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberLastName")}</span>
          <input
            required
            value={values.last_name}
            onChange={(e) => setValues((v) => ({ ...v, last_name: e.target.value }))}
            className="w-full px-3"
          />
          {fieldError("last_name")}
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPhone")}</span>
          <PhoneInput required value={values.phone} onChange={(phone) => setValues((v) => ({ ...v, phone }))} />
          {fieldError("phone")}
        </label>

        <div className="sm:col-span-1">
          <JalaliDatePicker
            value={values.join_date}
            onChange={(join_date) => setValues((v) => ({ ...v, join_date }))}
            label={t("memberJoinDate")}
            required
          />
          {fieldError("join_date")}
        </div>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberNationalId")}</span>
          <input
            value={values.national_id}
            onChange={(e) => setValues((v) => ({ ...v, national_id: e.target.value }))}
            className="w-full px-3"
          />
          {fieldError("national_id")}
        </label>

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
