"use client";

import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { PlanRingChart } from "@/components/ui/PlanRingChart";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { getTranslation } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/date/format";
import { computeDaysLeft, planRemainingLabel } from "@/lib/members/membership-utils";
import type { GymCoach, GymTrainer, StaffStatus } from "@/lib/staff/types";
import type { Locale } from "@/lib/store/slices";

type StaffDetailModalProps = {
  open: boolean;
  locale: Locale;
  kind: "coach" | "trainer";
  coach?: GymCoach | null;
  trainer?: GymTrainer | null;
  currency: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function statusLabel(locale: Locale, status: StaffStatus) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  switch (status) {
    case "active":
      return t("staffStatusActive");
    case "inactive":
      return t("staffStatusInactive");
    case "on_leave":
      return t("staffStatusOnLeave");
    default:
      return status;
  }
}

export function StaffDetailModal({
  open,
  locale,
  kind,
  coach,
  trainer,
  currency,
  onClose,
  onEdit,
  onDelete,
}: StaffDetailModalProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const person = kind === "coach" ? coach : trainer;
  if (!person) {
    return null;
  }

  const contractStart = person.contract_start_date;
  const contractEnd = person.contract_end_date;
  const daysLeft = computeDaysLeft(contractEnd);
  const ringSublabel = planRemainingLabel(daysLeft, {
    expired: t("memberPortalExpired"),
    daysLeft: t("staffContractDaysLeft"),
    oneDay: t("memberDetailOneDay"),
  });

  const permissions: string[] = [];
  if (kind === "coach" && coach) {
    if (coach.permissions.manage_trainers) permissions.push(t("permManageTrainers"));
    if (coach.permissions.view_members) permissions.push(t("permViewMembers"));
    if (coach.permissions.edit_members) permissions.push(t("permEditMembers"));
    if (coach.permissions.view_attendance) permissions.push(t("permViewAttendance"));
    if (coach.permissions.record_attendance) permissions.push(t("permRecordAttendance"));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === "coach" ? t("coachDetailTitle") : t("trainerDetailTitle")}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold" onClick={onClose}>
            {t("memberModalCancel")}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
            onClick={onEdit}
          >
            <FiEdit2 aria-hidden="true" />
            {t("memberEdit")}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-black text-danger"
            onClick={onDelete}
          >
            <FiTrash2 aria-hidden="true" />
            {t("memberDelete")}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-5">
          <StaffAvatar
            firstName={person.first_name}
            lastName={person.last_name}
            avatarUrl={person.avatar_url}
            size="lg"
          />
          <div className="min-w-0">
            <p className="text-xl font-black text-foreground">{person.full_name}</p>
            <p className="text-sm font-semibold text-muted-foreground">
              {kind === "coach" ? t("staffRoleCoach") : t("staffRoleTrainer")}
              {kind === "trainer" && trainer?.coach_name
                ? ` · ${t("staffReportsTo")} ${trainer.coach_name}`
                : ""}
            </p>
            <span
              className={`member-status-badge mt-2 inline-block ${
                person.status === "active"
                  ? "member-status-active"
                  : person.status === "on_leave"
                    ? "member-status-warning"
                    : "member-status-expired"
              }`}
            >
              {statusLabel(locale, person.status)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
          <PlanRingChart
            startDate={contractStart}
            endDate={contractEnd}
            daysLeft={daysLeft}
            size={150}
            label={t("staffContractRing")}
            sublabel={ringSublabel}
          />

          <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
            {person.phone ? <DetailRow label={t("memberPhone")} value={person.phone} /> : null}
            {person.email ? <DetailRow label={t("staffEmail")} value={person.email} /> : null}
            {person.specialty ? <DetailRow label={t("staffSpecialty")} value={person.specialty} /> : null}
            <DetailRow label={t("memberPortalStarts")} value={formatDate(contractStart, locale)} />
            <DetailRow label={t("memberPortalEnds")} value={formatDate(contractEnd, locale)} />
            {person.salary != null ? (
              <DetailRow label={t("staffSalary")} value={`${person.salary} ${currency}`} />
            ) : null}
            {kind === "coach" && coach ? (
              <DetailRow
                label={t("staffTrainerCount")}
                value={String(coach.trainer_count ?? 0)}
              />
            ) : null}
            {kind === "trainer" && trainer?.coach_name ? (
              <DetailRow label={t("staffAssignedCoach")} value={trainer.coach_name} />
            ) : null}
          </dl>
        </div>

        {kind === "coach" && permissions.length > 0 ? (
          <div className="panel-card p-4">
            <p className="text-xs font-bold text-muted-foreground">{t("staffPermissions")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {permissions.map((label) => (
                <li
                  key={label}
                  className="rounded-lg border border-glass-border bg-glass px-2.5 py-1 text-xs font-bold text-foreground"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-card p-3">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-black text-foreground">{value}</dd>
    </div>
  );
}
