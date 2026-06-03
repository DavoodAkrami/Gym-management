"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { SelectBar, type SelectBarOption } from "@/components/SelectBar";
import { Spinner } from "@/components/ui/Spinner";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { getTranslation } from "@/lib/i18n/translations";
import { readAvatarFile } from "@/lib/staff/avatar";
import {
  defaultCoachPermissions,
  type CoachFormValues,
  type CoachPermissions,
  type GymCoach,
  type StaffStatus,
} from "@/lib/staff/types";
import type { Locale } from "@/lib/store/slices";

type CoachFormModalProps = {
  open: boolean;
  locale: Locale;
  mode: "add" | "edit";
  coach?: GymCoach;
  saving: boolean;
  saveError?: string | null;
  onClose: () => void;
  onSubmit: (values: CoachFormValues) => void | Promise<void>;
};

function defaultValues(coach?: GymCoach): CoachFormValues {
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  return {
    first_name: coach?.first_name ?? "",
    last_name: coach?.last_name ?? "",
    phone: coach?.phone ?? "",
    email: coach?.email ?? "",
    specialty: coach?.specialty ?? "",
    avatar_url: coach?.avatar_url ?? "",
    gym_hours_start: coach?.gym_hours_start ?? "09:00",
    gym_hours_end: coach?.gym_hours_end ?? "21:00",
    contract_start_date: coach?.contract_start_date ?? today,
    contract_end_date: coach?.contract_end_date ?? nextYear.toISOString().slice(0, 10),
    salary: coach?.salary != null ? String(coach.salary) : "",
    active: coach?.active ?? true,
    status: coach?.status ?? "active",
    permissions: coach?.permissions ?? { ...defaultCoachPermissions },
  };
}

export function CoachFormModal({
  open,
  locale,
  mode,
  coach,
  saving,
  saveError,
  onClose,
  onSubmit,
}: CoachFormModalProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [values, setValues] = useState<CoachFormValues>(() => defaultValues(coach));
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(defaultValues(coach));
      setFormError(null);
    }
  }, [open, coach?.id, mode]);

  const statusOptions: SelectBarOption<StaffStatus>[] = useMemo(
    () => [
      { value: "active", label: t("staffStatusActive") },
      { value: "inactive", label: t("staffStatusInactive") },
      { value: "on_leave", label: t("staffStatusOnLeave") },
    ],
    [locale],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    try {
      await onSubmit(values);
    } catch {
      /* parent sets saveError */
    }
  };

  const handleAvatar = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const url = await readAvatarFile(file);
      setValues((v) => ({ ...v, avatar_url: url }));
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    }
  };

  const togglePerm = (key: keyof CoachPermissions) => {
    setValues((v) => ({
      ...v,
      permissions: { ...v.permissions, [key]: !v.permissions[key] },
    }));
  };

  const title = mode === "add" ? t("coachAdd") : t("coachEdit");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold" onClick={onClose}>
            {t("memberModalCancel")}
          </button>
          <button
            type="submit"
            form="coach-form"
            disabled={saving}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
          >
            {saving ? <Spinner label={t("uiSaving")} /> : t("memberModalSave")}
          </button>
        </div>
      }
    >
      <form id="coach-form" className="member-form-grid grid gap-3 sm:grid-cols-2" onSubmit={(e) => void handleSubmit(e)}>
        {saveError ? (
          <p className="panel-alert sm:col-span-2 border-danger/30 bg-danger/10 text-danger" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="sm:col-span-2 flex items-center gap-4">
          <StaffAvatar
            firstName={values.first_name}
            lastName={values.last_name}
            avatarUrl={values.avatar_url}
            size="lg"
          />
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffPhoto")}</span>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("staffPhotoHint")}</p>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm"
              onChange={(e) => void handleAvatar(e.target.files?.[0])}
            />
          </label>
        </div>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberFirstName")}</span>
          <input required value={values.first_name} onChange={(e) => setValues((v) => ({ ...v, first_name: e.target.value }))} className="w-full px-3" />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberLastName")}</span>
          <input required value={values.last_name} onChange={(e) => setValues((v) => ({ ...v, last_name: e.target.value }))} className="w-full px-3" />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPhone")}</span>
          <input value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} className="w-full px-3" />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffEmail")}</span>
          <input type="email" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} className="w-full px-3" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffSpecialty")}</span>
          <input value={values.specialty} onChange={(e) => setValues((v) => ({ ...v, specialty: e.target.value }))} className="w-full px-3" />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("trainerGymHoursStart")}</span>
          <input type="time" value={values.gym_hours_start} onChange={(e) => setValues((v) => ({ ...v, gym_hours_start: e.target.value }))} className="w-full px-3" />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("trainerGymHoursEnd")}</span>
          <input type="time" value={values.gym_hours_end} onChange={(e) => setValues((v) => ({ ...v, gym_hours_end: e.target.value }))} className="w-full px-3" />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPortalStarts")}</span>
          <input type="date" required value={values.contract_start_date} onChange={(e) => setValues((v) => ({ ...v, contract_start_date: e.target.value }))} className="w-full px-3" />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPortalEnds")}</span>
          <input type="date" required value={values.contract_end_date} onChange={(e) => setValues((v) => ({ ...v, contract_end_date: e.target.value }))} className="w-full px-3" />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffSalary")}</span>
          <input type="number" min={0} step="0.01" value={values.salary} onChange={(e) => setValues((v) => ({ ...v, salary: e.target.value }))} className="w-full px-3" />
        </label>
        <div className="sm:col-span-1">
          <SelectBar fullWidth portalMenu align="start" label={t("memberStatus")} value={values.status} options={statusOptions} onChange={(status) => setValues((v) => ({ ...v, status }))} />
        </div>

        <fieldset className="sm:col-span-2 space-y-2">
          <legend className="text-sm font-black text-foreground">{t("staffPermissions")}</legend>
          {(
            [
              ["manage_trainers", "permManageCoaches"],
              ["view_members", "permViewMembers"],
              ["edit_members", "permEditMembers"],
              ["view_attendance", "permViewAttendance"],
              ["record_attendance", "permRecordAttendance"],
            ] as const
          ).map(([key, labelKey]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={values.permissions[key]} onChange={() => togglePerm(key)} />
              {t(labelKey)}
            </label>
          ))}
        </fieldset>

        {formError ? (
          <p className="panel-alert sm:col-span-2 border-danger/30 bg-danger/10 text-danger" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
