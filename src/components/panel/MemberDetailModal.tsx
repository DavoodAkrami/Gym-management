"use client";

import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { PlanRingChart } from "@/components/ui/PlanRingChart";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { getTranslation } from "@/lib/i18n/translations";
import { computeDaysLeft, planRemainingLabel } from "@/lib/members/membership-utils";
import { formatMemberStatus } from "@/lib/members/portal-utils";
import type { MemberWithMeta } from "@/lib/members/types";
import type { Locale } from "@/lib/store/slices";

type MemberDetailModalProps = {
  open: boolean;
  locale: Locale;
  member: MemberWithMeta | null;
  currency: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function MemberDetailModal({
  open,
  locale,
  member,
  currency,
  onClose,
  onEdit,
  onDelete,
}: MemberDetailModalProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  if (!member) {
    return null;
  }

  const membership = member.currentMembership ?? member.latestMembership;
  const daysLeft = membership ? computeDaysLeft(membership.end_date) : null;

  const statusLabels = {
    active: t("memberStatusActive"),
    expired: t("memberStatusExpired"),
    inactive: t("memberStatusInactive"),
    suspended: t("memberStatusSuspended"),
  };

  const ringSublabel =
    membership && daysLeft !== null
      ? planRemainingLabel(daysLeft, {
          expired: t("memberPortalExpired"),
          daysLeft: t("memberDetailDaysLeft"),
          oneDay: t("memberDetailOneDay"),
        })
      : t("memberNoPlan");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("memberDetailTitle")}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
            onClick={onClose}
          >
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
            firstName={member.first_name}
            lastName={member.last_name}
            size="lg"
          />
          <div className="min-w-0">
            <p className="text-xl font-black text-foreground">
              {member.first_name} {member.last_name}
            </p>
            <p className="text-sm font-semibold text-muted-foreground">{member.phone}</p>
            <span className="member-status-badge member-status-active mt-2 inline-block">
              {formatMemberStatus(member.status, statusLabels)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
          {membership ? (
            <PlanRingChart
              startDate={membership.start_date}
              endDate={membership.end_date}
              daysLeft={daysLeft ?? 0}
              size={150}
              label={membership.plan_name ?? t("memberPlan")}
              sublabel={ringSublabel}
            />
          ) : (
            <div className="panel-card flex min-h-[10rem] w-full max-w-[12rem] items-center justify-center p-4 text-center">
              <p className="text-sm font-bold text-muted-foreground">{t("memberNoPlan")}</p>
            </div>
          )}

          <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
            <DetailRow label={t("memberJoinDate")} value={member.join_date} />
            <DetailRow
              label={t("memberLanguage")}
              value={member.preferred_language === "fa" ? "فارسی" : "English"}
            />
            {member.zip_code ? <DetailRow label={t("memberZipCode")} value={member.zip_code} /> : null}
            {member.national_id ? (
              <DetailRow label={t("memberNationalId")} value={member.national_id} />
            ) : null}
            {membership ? (
              <>
                <DetailRow label={t("memberPortalStarts")} value={membership.start_date} />
                <DetailRow label={t("memberPortalEnds")} value={membership.end_date} />
                <DetailRow
                  label={t("memberPortalPrice")}
                  value={`${membership.price} ${currency}`}
                />
                <DetailRow
                  label={t("membershipStatus")}
                  value={formatMemberStatus(membership.status, statusLabels)}
                />
              </>
            ) : null}
            {member.lapse_visible_until ? (
              <DetailRow label={t("memberLapseUntil")} value={member.lapse_visible_until} />
            ) : null}
          </dl>
        </div>
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
