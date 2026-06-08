"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { SelectBar, type SelectBarOption } from "@/components/SelectBar";
import { Spinner } from "@/components/ui/Spinner";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { getTranslation } from "@/lib/i18n/translations";
import { readAvatarFile } from "@/lib/staff/avatar";
import { PhoneInput } from "@/components/ui/PhoneInput";
import {
  defaultCoachPermissions,
  type CoachFormValues,
  type CoachPermissions,
  type GymCoach,
  type GymTrainer,
  type StaffStatus,
  type TrainerFormValues,
} from "@/lib/staff/types";
import type { Locale } from "@/lib/store/slices";

type StaffFormModalProps = {
  open: boolean;
  locale: Locale;
  kind: "coach" | "trainer";
  mode: "add" | "edit";
  coach?: GymCoach;
  trainer?: GymTrainer;
  coaches: GymCoach[];
  defaultCoachId?: string;
  saving: boolean;
  saveError?: string | null;
  onClose: () => void;
  onSubmitCoach: (values: CoachFormValues) => void | Promise<void>;
  onSubmitTrainer: (values: TrainerFormValues) => void | Promise<void>;
};

function defaultCoachValues(coach?: GymCoach): CoachFormValues {
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

function defaultTrainerValues(trainer?: GymTrainer, coaches: GymCoach[] = []): TrainerFormValues {
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  return {
    coach_id: trainer?.coach_id ?? coaches[0]?.id ?? "",
    first_name: trainer?.first_name ?? "",
    last_name: trainer?.last_name ?? "",
    phone: trainer?.phone ?? "",
    email: trainer?.email ?? "",
    specialty: trainer?.specialty ?? "",
    avatar_url: trainer?.avatar_url ?? "",
    gym_hours_start: trainer?.gym_hours_start ?? "09:00",
    gym_hours_end: trainer?.gym_hours_end ?? "21:00",
    contract_start_date: trainer?.contract_start_date ?? today,
    contract_end_date: trainer?.contract_end_date ?? nextYear.toISOString().slice(0, 10),
    salary: trainer?.salary != null ? String(trainer.salary) : "",
    active: trainer?.active ?? true,
    status: trainer?.status ?? "active",
  };
}

export function StaffFormModal({
  open,
  locale,
  kind,
  mode,
  coach,
  trainer,
  coaches,
  defaultCoachId,
  saving,
  saveError,
  onClose,
  onSubmitCoach,
  onSubmitTrainer,
}: StaffFormModalProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [coachValues, setCoachValues] = useState<CoachFormValues>(() => defaultCoachValues(coach));
  const [trainerValues, setTrainerValues] = useState<TrainerFormValues>(() =>
    defaultTrainerValues(trainer, coaches),
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCoachValues(defaultCoachValues(coach));
      const trainerDefaults = defaultTrainerValues(trainer, coaches);
      if (kind === "trainer" && mode === "add" && defaultCoachId) {
        trainerDefaults.coach_id = defaultCoachId;
      }
      setTrainerValues(trainerDefaults);
      setFormError(null);
    }
  }, [open, coach?.id, trainer?.id, mode, kind, coaches.length, defaultCoachId]);

  const statusOptions: SelectBarOption<StaffStatus>[] = useMemo(
    () => [
      { value: "active", label: t("staffStatusActive") },
      { value: "inactive", label: t("staffStatusInactive") },
      { value: "on_leave", label: t("staffStatusOnLeave") },
    ],
    [locale, t],
  );

  const coachOptions: SelectBarOption[] = useMemo(
    () =>
      coaches.map((c) => ({
        value: c.id,
        label: c.full_name,
      })),
    [coaches],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (kind === "trainer" && !trainerValues.coach_id) {
      setFormError(t("trainerCoachRequired"));
      return;
    }

    try {
      if (kind === "coach") {
        await onSubmitCoach(coachValues);
      } else {
        await onSubmitTrainer(trainerValues);
      }
    } catch {
      /* parent sets saveError */
    }
  };

  const handleAvatar = async (file: File | undefined, setter: (url: string) => void) => {
    if (!file) {
      return;
    }
    try {
      const url = await readAvatarFile(file);
      setter(url);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    }
  };

  const title =
    kind === "coach"
      ? mode === "add"
        ? t("coachAdd")
        : t("coachEdit")
      : mode === "add"
        ? t("trainerAdd")
        : t("trainerEdit");

  const firstName = kind === "coach" ? coachValues.first_name : trainerValues.first_name;
  const lastName = kind === "coach" ? coachValues.last_name : trainerValues.last_name;
  const avatarUrl = kind === "coach" ? coachValues.avatar_url : trainerValues.avatar_url;

  const togglePerm = (key: keyof CoachPermissions) => {
    setCoachValues((v) => ({
      ...v,
      permissions: { ...v.permissions, [key]: !v.permissions[key] },
    }));
  };

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
            form="staff-form"
            disabled={saving || (kind === "trainer" && coaches.length === 0)}
            className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
          >
            {saving ? <Spinner label={t("uiSaving")} /> : t("memberModalSave")}
          </button>
        </div>
      }
    >
      <form id="staff-form" className="member-form-grid grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        {saveError ? (
          <p className="panel-alert sm:col-span-2 border-danger/30 bg-danger/10 text-danger" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="sm:col-span-2 flex items-center gap-4">
          <StaffAvatar firstName={firstName} lastName={lastName} avatarUrl={avatarUrl} size="lg" />
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffPhoto")}</span>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("staffPhotoHint")}</p>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm"
              onChange={(e) =>
                void handleAvatar(e.target.files?.[0], (url) => {
                  if (kind === "coach") {
                    setCoachValues((v) => ({ ...v, avatar_url: url }));
                  } else {
                    setTrainerValues((v) => ({ ...v, avatar_url: url }));
                  }
                })
              }
            />
          </label>
        </div>

        {kind === "trainer" ? (
          <div className="sm:col-span-2">
            <SelectBar
              fullWidth
              portalMenu
              align="start"
              label={t("staffAssignedCoach")}
              value={trainerValues.coach_id || coachOptions[0]?.value || ""}
              options={coachOptions}
              onChange={(coach_id) => setTrainerValues((v) => ({ ...v, coach_id }))}
              disabled={coaches.length === 0}
            />
          </div>
        ) : null}

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberFirstName")}</span>
          <input
            required
            value={firstName}
            onChange={(e) =>
              kind === "coach"
                ? setCoachValues((v) => ({ ...v, first_name: e.target.value }))
                : setTrainerValues((v) => ({ ...v, first_name: e.target.value }))
            }
            className="w-full px-3"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberLastName")}</span>
          <input
            required
            value={lastName}
            onChange={(e) =>
              kind === "coach"
                ? setCoachValues((v) => ({ ...v, last_name: e.target.value }))
                : setTrainerValues((v) => ({ ...v, last_name: e.target.value }))
            }
            className="w-full px-3"
          />
        </label>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPhone")}</span>
          <PhoneInput
            value={kind === "coach" ? coachValues.phone : trainerValues.phone}
            onChange={(phone) =>
              kind === "coach"
                ? setCoachValues((v) => ({ ...v, phone }))
                : setTrainerValues((v) => ({ ...v, phone }))
            }
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffEmail")}</span>
          <input
            type="email"
            value={kind === "coach" ? coachValues.email : trainerValues.email}
            onChange={(e) =>
              kind === "coach"
                ? setCoachValues((v) => ({ ...v, email: e.target.value }))
                : setTrainerValues((v) => ({ ...v, email: e.target.value }))
            }
            className="w-full px-3"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffSpecialty")}</span>
          <input
            value={kind === "coach" ? coachValues.specialty : trainerValues.specialty}
            onChange={(e) =>
              kind === "coach"
                ? setCoachValues((v) => ({ ...v, specialty: e.target.value }))
                : setTrainerValues((v) => ({ ...v, specialty: e.target.value }))
            }
            className="w-full px-3"
          />
        </label>

        {kind === "trainer" ? (
          <>
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t("trainerGymHoursStart")}
              </span>
              <input
                type="time"
                value={trainerValues.gym_hours_start}
                onChange={(e) =>
                  setTrainerValues((v) => ({ ...v, gym_hours_start: e.target.value }))
                }
                className="w-full px-3"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">
                {t("trainerGymHoursEnd")}
              </span>
              <input
                type="time"
                value={trainerValues.gym_hours_end}
                onChange={(e) =>
                  setTrainerValues((v) => ({ ...v, gym_hours_end: e.target.value }))
                }
                className="w-full px-3"
              />
            </label>
          </>
        ) : null}

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPortalStarts")}</span>
          <input
            type="date"
            required
            value={kind === "coach" ? coachValues.contract_start_date : trainerValues.contract_start_date}
            onChange={(e) =>
              kind === "coach"
                ? setCoachValues((v) => ({ ...v, contract_start_date: e.target.value }))
                : setTrainerValues((v) => ({ ...v, contract_start_date: e.target.value }))
            }
            className="w-full px-3"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("memberPortalEnds")}</span>
          <input
            type="date"
            required
            value={kind === "coach" ? coachValues.contract_end_date : trainerValues.contract_end_date}
            onChange={(e) =>
              kind === "coach"
                ? setCoachValues((v) => ({ ...v, contract_end_date: e.target.value }))
                : setTrainerValues((v) => ({ ...v, contract_end_date: e.target.value }))
            }
            className="w-full px-3"
          />
        </label>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffSalary")}</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={kind === "coach" ? coachValues.salary : trainerValues.salary}
            onChange={(e) =>
              kind === "coach"
                ? setCoachValues((v) => ({ ...v, salary: e.target.value }))
                : setTrainerValues((v) => ({ ...v, salary: e.target.value }))
            }
            className="w-full px-3"
          />
        </label>

        <div className="sm:col-span-1">
          <SelectBar
            fullWidth
            portalMenu
            align="start"
            label={t("memberStatus")}
            value={kind === "coach" ? coachValues.status : trainerValues.status}
            options={statusOptions}
            onChange={(status) =>
              kind === "coach"
                ? setCoachValues((v) => ({ ...v, status }))
                : setTrainerValues((v) => ({ ...v, status }))
            }
          />
        </div>

        {kind === "coach" ? (
          <fieldset className="sm:col-span-2 space-y-2">
            <legend className="text-sm font-black text-foreground">{t("staffPermissions")}</legend>
            {(
              [
                ["manage_trainers", "permManageTrainers"],
                ["view_members", "permViewMembers"],
                ["edit_members", "permEditMembers"],
                ["view_attendance", "permViewAttendance"],
                ["record_attendance", "permRecordAttendance"],
              ] as const
            ).map(([key, labelKey]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={coachValues.permissions[key]}
                  onChange={() => togglePerm(key)}
                />
                {t(labelKey)}
              </label>
            ))}
          </fieldset>
        ) : null}

        {formError ? (
          <p className="panel-alert sm:col-span-2 border-danger/30 bg-danger/10 text-danger" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
