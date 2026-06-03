"use client";

import { useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiPhone,
  FiUser,
  FiUserCheck,
  FiBookOpen,
} from "react-icons/fi";
import { MemberCoachSection } from "@/components/member/MemberCoachSection";
import { MemberProfileSection } from "@/components/member/MemberProfileSection";
import { MemberProgramsSection } from "@/components/member/MemberProgramsSection";
import { getTranslation } from "@/lib/i18n/translations";
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

export function MemberDashboard({ portal, loading, error, onRetry }: MemberDashboardProps) {
  const locale = useAppSelector((state) => state.ui.locale);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [tab, setTab] = useState<MemberTab>("home");

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
      <div className="panel-card p-8 text-center">
        <h1 className="text-xl font-black text-foreground">{t("memberPortalEmptyTitle")}</h1>
        <p className="mt-3 text-sm font-medium leading-7 text-muted-foreground">
          {t("memberPortalEmptyDesc")}
        </p>
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

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
              tab === item.id ? "bg-glass-strong text-foreground" : "text-muted-foreground"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "home" ? (
        <>
          {membership ? (
            <article className="panel-card overflow-hidden p-0">
              <div
                className={`px-5 py-4 ${
                  isExpired ? "bg-danger/15" : isExpiringSoon ? "bg-warning/15" : "bg-glass-strong"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-eyebrow">{t("memberPortalPlanTitle")}</p>
                    <p className="mt-1 text-xl font-black text-foreground">{membership.plan_name}</p>
                  </div>
                  <span
                    className={`member-status-badge ${
                      isExpired
                        ? "member-status-expired"
                        : isExpiringSoon
                          ? "member-status-warning"
                          : "member-status-active"
                    }`}
                  >
                    {isExpired ? t("memberPortalExpired") : planStatusLabel}
                  </span>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <div className="mb-2 flex justify-between text-xs font-bold text-muted-foreground">
                    <span>{t("memberPortalProgress")}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="member-progress-track" aria-hidden="true">
                    <div
                      className={`member-progress-fill ${
                        isExpired
                          ? "member-progress-expired"
                          : isExpiringSoon
                            ? "member-progress-warning"
                            : ""
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="member-stat-tile">
                    <FiClock className="text-lg text-muted-foreground" aria-hidden="true" />
                    <div>
                      <p className="member-stat-label">{t("memberPortalDaysLeft")}</p>
                      <p className="member-stat-value">{isExpired ? t("memberPortalExpired") : daysLeft}</p>
                    </div>
                  </div>
                  <div className="member-stat-tile">
                    <FiCalendar className="text-lg text-muted-foreground" aria-hidden="true" />
                    <div>
                      <p className="member-stat-label">{t("memberPortalEnds")}</p>
                      <p className="member-stat-value">{membership.end_date}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          <article className="panel-card space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-sm font-black text-foreground">
              <FiMapPin aria-hidden="true" />
              {t("memberPortalGymTitle")}
            </h2>
            <p className="text-lg font-black">{portal.gym.name}</p>
            {portal.gym.phone ? (
              <a href={`tel:${portal.gym.phone}`} className="inline-flex items-center gap-2 text-sm font-bold">
                <FiPhone aria-hidden="true" />
                {portal.gym.phone}
              </a>
            ) : null}
            {portal.coach ? (
              <p className="text-sm font-medium text-muted-foreground">
                {t("memberCurrentCoach")}: <strong className="text-foreground">{portal.coach.full_name}</strong>
              </p>
            ) : null}
          </article>
        </>
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
  );
}
