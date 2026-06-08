"use client";

import { FiEdit2, FiTrash2, FiPhone, FiMail, FiStar, FiCalendar } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { PlanRingChart } from "@/components/ui/PlanRingChart";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { getTranslation } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/date/format";
import { displayPhone } from "@/lib/phone";
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
        {/* Profile header */}
        <div className="flex items-center gap-5 border-b border-border pb-5">
          <StaffAvatar
            firstName={person.first_name}
            lastName={person.last_name}
            avatarUrl={person.avatar_url}
            size="lg"
          />
          <div className="min-w-0">
            <p className="text-2xl font-black text-foreground">{person.full_name}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">
                {kind === "coach" ? t("staffRoleCoach") : t("staffRoleTrainer")}
              </span>
              <span className="text-muted-foreground">·</span>
              <span
                className={`member-status-badge ${
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
            {kind === "trainer" && trainer?.coach_name ? (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {t("staffReportsTo")} {trainer.coach_name}
              </p>
            ) : null}
          </div>
        </div>

        {/* Body: ring + detail grid */}
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
          <div className="flex flex-col items-center">
            <PlanRingChart
              startDate={contractStart}
              endDate={contractEnd}
              daysLeft={daysLeft}
              size={140}
              label={t("staffContractRing")}
              sublabel={ringSublabel}
            />
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3">
            {person.phone ? (
              <InfoCard icon={<FiPhone />} label={t("memberPhone")} value={displayPhone(person.phone)} />
            ) : null}
            {person.email ? (
              <InfoCard icon={<FiMail />} label={t("staffEmail")} value={person.email} />
            ) : null}
            {person.specialty ? (
              <InfoCard icon={<FiStar />} label={t("staffSpecialty")} value={person.specialty} />
            ) : null}
            <InfoCard icon={<FiCalendar />} label={t("memberPortalStarts")} value={formatDate(contractStart, locale)} />
            <InfoCard icon={<FiCalendar />} label={t("memberPortalEnds")} value={formatDate(contractEnd, locale)} />
            {person.salary != null ? (
              <InfoCard icon={null} label={t("staffSalary")} value={`${person.salary} ${currency}`} />
            ) : null}
            {kind === "coach" && coach ? (
              <InfoCard icon={null} label={t("staffTrainerCount")} value={String(coach.trainer_count ?? 0)} />
            ) : null}
          </div>
        </div>

        {/* Permissions */}
        {kind === "coach" && permissions.length > 0 ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full bg-accent" />
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">{t("staffPermissions")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {permissions.map((label) => (
                <span
                  key={label}
                  className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode | null; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-glass-border bg-glass/40 p-3.5">
      {icon ? <div className="mb-1.5 text-muted-foreground">{icon}</div> : null}
      <dt className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</dt>
      <dd className="mt-0.5 font-black text-foreground">{value}</dd>
    </div>
  );
}
