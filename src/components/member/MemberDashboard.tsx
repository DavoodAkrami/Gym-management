"use client";

import { useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiLogOut,
  FiMapPin,
  FiPhone,
  FiUser,
  FiUserCheck,
  FiBookOpen,
} from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { MemberCoachSection } from "@/components/member/MemberCoachSection";
import { MemberProfileSection } from "@/components/member/MemberProfileSection";
import { MemberProgramsSection } from "@/components/member/MemberProgramsSection";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/date/format";
import { displayPhone } from "@/lib/phone";
import { leaveGym } from "@/lib/supabase/member-portal";
import { showToast } from "@/lib/toast/client";
import {
  formatMemberStatus,
  membershipProgressPercent,
} from "@/lib/members/portal-utils";
import type { MemberPortalData } from "@/lib/supabase/member-portal";
import { useAppSelector } from "@/lib/store/hooks";

type MemberDashboardProps = {
  portal: MemberPortalData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

type MemberTab = "home" | "coach" | "programs" | "profile";

function ProgressRing({
  percent,
  size = 48,
  strokeWidth = 4,
  status,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  status?: "active" | "warning" | "expired";
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const fgClass =
    status === "expired"
      ? "progress-ring-fg-expired"
      : status === "warning"
        ? "progress-ring-fg-warning"
        : "progress-ring-fg-success";

  return (
    <svg width={size} height={size} className="progress-ring-svg">
      <circle
        className="progress-ring-bg"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <circle
        className={`progress-ring-fg ${fgClass}`}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function MemberDashboard({ portal, loading, error, onRetry }: MemberDashboardProps) {
  const locale = useAppSelector((state) => state.ui.locale);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [tab, setTab] = useState<MemberTab>("home");
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (error) {
    return (
      <div className="panel-card space-y-4 p-6">
        <p className="panel-alert border border-danger/30 bg-danger/10 text-danger">{error}</p>
        <button type="button" className="btn-primary px-4 py-2 text-sm font-black" onClick={onRetry}>
          {t("memberPortalRetry")}
        </button>
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="panel-empty-state">
        <div className="panel-empty-icon">
          <FiUser aria-hidden="true" />
        </div>
        <p className="panel-empty-title">{t("memberPortalEmptyTitle")}</p>
        <p className="panel-empty-desc">{t("memberPortalEmptyDesc")}</p>
      </div>
    );
  }

  const membership = portal.membership;
  const daysLeft = membership?.days_left ?? 0;
  const isExpired = membership ? daysLeft < 0 : true;
  const isExpiringSoon = membership && daysLeft >= 0 && daysLeft <= 7;
  const progress =
    membership && !isExpired
      ? membershipProgressPercent(membership.start_date, membership.end_date, daysLeft)
      : isExpired
        ? 100
        : 0;

  const statusLabels = {
    active: t("memberStatusActive"),
    expired: t("memberStatusExpired"),
    inactive: t("memberStatusInactive"),
    suspended: t("memberStatusSuspended"),
  };

  const planStatusLabel = membership
    ? formatMemberStatus(membership.status, statusLabels)
    : t("memberNoPlan");

  const ringStatus = isExpired ? "expired" : isExpiringSoon ? "warning" : "active";

  const tabs: { id: MemberTab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: t("memberTabHome"), icon: <FiCalendar aria-hidden="true" /> },
    { id: "coach", label: t("memberTabCoach"), icon: <FiUserCheck aria-hidden="true" /> },
    { id: "programs", label: t("memberTabPrograms"), icon: <FiBookOpen aria-hidden="true" /> },
    { id: "profile", label: t("memberTabProfile"), icon: <FiUser aria-hidden="true" /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-foreground sm:text-3xl">
          {t("memberPortalGreeting").replace(
            "{name}",
            `${portal.member.first_name} ${portal.member.last_name}`,
          )}
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{t("memberPortalSubtitle")}</p>
      </div>

      <div className="passport-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`passport-tab ${tab === item.id ? "passport-tab-active" : ""}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div className="passport-page">
        {tab === "home" ? (
          <div className="space-y-5">
            {membership ? (
              <article className="member-wallet-card">
                <p className="member-wallet-brand">{t("memberPortalPlanTitle")}</p>
                <p className="member-wallet-name">
                  {portal.member.first_name} {portal.member.last_name}
                </p>
                <p className="member-wallet-plan">{membership.plan_name}</p>
                <div className="flex items-center justify-between gap-3 mt-3">
                  <span className={`member-wallet-status ${isExpired || isExpiringSoon ? "" : ""}`}>
                    <span className="member-wallet-status-dot" />
                    {isExpired ? t("memberPortalExpired") : planStatusLabel}
                  </span>
                  <ProgressRing percent={progress} size={40} strokeWidth={3} status={ringStatus} />
                </div>
                <div className="member-wallet-footer">
                  <div>
                    <p className="member-wallet-footer-label">{t("memberPortalDaysLeft")}</p>
                    <p className="member-wallet-footer-value">
                      {isExpired ? t("memberPortalExpired") : daysLeft}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="member-wallet-footer-label">{t("memberPortalEnds")}</p>
                    <p className="member-wallet-footer-value">
                      {formatDate(membership.end_date, locale)}
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              <article className="panel-card p-6 text-center">
                <p className="text-sm font-bold text-muted-foreground">{t("memberNoPlan")}</p>
              </article>
            )}

            {membership ? (
              <div className="member-timeline">
                <div className="member-timeline-item">
                  <div className="member-timeline-dot">
                    <FiUser aria-hidden="true" style={{ fontSize: "0.5rem" }} />
                  </div>
                  <div className="member-timeline-content">
                    <p className="member-timeline-title">{t("memberPortalPlanTitle")}</p>
                    <p className="member-timeline-date">
                      {t("memberStatusActive")} · {formatDate(membership.start_date, locale)}
                    </p>
                  </div>
                </div>
                <div className="member-timeline-item">
                  <div
                    className="member-timeline-dot"
                    style={{
                      background: isExpired
                        ? "var(--danger)"
                        : isExpiringSoon
                          ? "var(--warning)"
                          : "var(--success)",
                      color: "white",
                    }}
                  >
                    <FiCalendar aria-hidden="true" style={{ fontSize: "0.5rem" }} />
                  </div>
                  <div className="member-timeline-content">
                    <p className="member-timeline-title">
                      {isExpired ? t("memberPortalExpired") : t("memberPortalEnds")}
                    </p>
                    <p className="member-timeline-date">{formatDate(membership.end_date, locale)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <article className="scoreboard-card">
              <FiMapPin aria-hidden="true" className="shrink-0 text-xl" style={{ color: "var(--muted-foreground)" }} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{t("memberPortalGymTitle")}</p>
                <p className="text-base font-black text-foreground mt-0.5">{portal.gym.name}</p>
                {portal.gym.phone ? (
                  <a href={`tel:${portal.gym.phone}`} className="inline-flex items-center gap-2 mt-1 text-sm font-bold" style={{ color: "var(--muted-foreground)" }}>
                    <FiPhone aria-hidden="true" />
                    {displayPhone(portal.gym.phone)}
                  </a>
                ) : null}
                {portal.coach ? (
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {t("memberCurrentCoach")}: <span className="text-foreground">{portal.coach.full_name}</span>
                  </p>
                ) : null}
              </div>
            </article>

            <div className="pt-4 text-center">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-xs font-bold text-danger hover:text-danger/80"
                onClick={() => setLeaveConfirm(true)}
              >
                <FiLogOut aria-hidden="true" />
                {t("memberLeaveGym")}
              </button>
            </div>
          </div>
        ) : null}

        {tab === "coach" ? (
          <MemberCoachSection
            locale={locale}
            currency={portal.gym.base_currency}
            portal={portal}
            currentCoachId={portal.coach?.id}
            onUpdated={onRetry}
          />
        ) : null}

        {tab === "programs" ? (
          <MemberProgramsSection
            locale={locale}
            coachId={portal.coach?.id}
            currency={portal.gym.base_currency}
            onJoined={onRetry}
          />
        ) : null}

        {tab === "profile" ? (
          <MemberProfileSection portal={portal} locale={locale} onUpdated={onRetry} />
        ) : null}
      </div>

      <Modal open={leaveConfirm} onClose={() => setLeaveConfirm(false)} title={t("memberLeaveTitle")}>
        <p className="text-sm font-semibold text-muted-foreground">{t("memberLeaveMessage")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
            onClick={() => setLeaveConfirm(false)}
          >
            {t("memberModalCancel")}
          </button>
          <button
            type="button"
            disabled={leaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-black text-danger"
            onClick={async () => {
              setLeaving(true);
              try {
                await leaveGym();
                showToast("success", t("memberLeaveSuccess"));
                setLeaveConfirm(false);
                onRetry();
              } catch {
                showToast("error", t("authErrorGeneric"));
              } finally {
                setLeaving(false);
              }
            }}
          >
            {leaving ? <Spinner label="" /> : <FiLogOut aria-hidden="true" />}
            {t("memberLeaveGym")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
