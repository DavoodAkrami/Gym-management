"use client";

import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { PlanRingChart } from "@/components/ui/PlanRingChart";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { getTranslation } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/date/format";
import { displayPhone } from "@/lib/phone";
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
      maxBodyHeight="min(80vh, 40rem)"
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
      <div className="space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4 sm:gap-4 sm:pb-5">
          <StaffAvatar
            firstName={member.first_name}
            lastName={member.last_name}
            avatarUrl={member.avatar_url}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-foreground sm:text-xl">
              {member.first_name} {member.last_name}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-muted-foreground">{displayPhone(member.phone)}</p>
            <span className="member-status-badge member-status-active mt-1.5 inline-block">
              {formatMemberStatus(member.status, statusLabels)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[auto_1fr]">
          {membership ? (
            <div className="flex justify-center lg:justify-start">
              <PlanRingChart
                startDate={membership.start_date}
                endDate={membership.end_date}
                daysLeft={daysLeft ?? 0}
                size={120}
                label={membership.plan_name ?? t("memberPlan")}
                sublabel={ringSublabel}
              />
            </div>
          ) : (
            <div className="panel-card mx-auto flex min-h-[8rem] w-full max-w-[10rem] items-center justify-center p-4 text-center lg:mx-0">
              <p className="text-sm font-bold text-muted-foreground">{t("memberNoPlan")}</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-2 text-sm sm:gap-3">
            <DetailRow label={t("memberJoinDate")} value={formatDate(member.join_date, locale)} />
            {member.national_id ? (
              <DetailRow label={t("memberNationalId")} value={member.national_id} />
            ) : null}
            {membership ? (
              <>
                <DetailRow label={t("memberPortalStarts")} value={formatDate(membership.start_date, locale)} />
                <DetailRow label={t("memberPortalEnds")} value={formatDate(membership.end_date, locale)} />
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
    <div className="rounded-lg border border-glass-border bg-glass/40 px-2.5 py-2 sm:px-3 sm:py-2.5">
      <dt className="text-[0.65rem] font-bold text-muted-foreground sm:text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm font-black text-foreground sm:text-base">{value}</dd>
    </div>
  );
}
