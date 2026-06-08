"use client";

import { AttendancePanel } from "@/components/panel/AttendancePanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CoachesPanel } from "@/components/panel/CoachesPanel";
import { MembersPanel } from "@/components/panel/MembersPanel";
import { MembershipsPanel } from "@/components/panel/MembershipsPanel";
import { OverviewPanel } from "@/components/panel/OverviewPanel";
import { GymProfilePanel } from "@/components/panel/GymProfilePanel";
import { SignupLinkPanel } from "@/components/panel/SignupLinkPanel";
import { getTranslation } from "@/lib/i18n/translations";
import type { PanelSectionId } from "@/lib/panel/sections";
import type { Locale } from "@/lib/store/slices";

type PanelSectionContentProps = {
  section: PanelSectionId;
  gymId: string;
  gymSlug: string;
  gymName: string;
  currency: string;
  locale: Locale;
};

export function PanelSectionContent({
  section,
  gymId,
  gymSlug,
  currency,
  locale,
}: PanelSectionContentProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  let content: React.ReactNode;

  if (section === "overview") {
    content = <OverviewPanel gymId={gymId} locale={locale} />;
  } else if (section === "members") {
    content = <MembersPanel gymId={gymId} locale={locale} currency={currency} />;
  } else if (section === "memberships") {
    content = <MembershipsPanel gymId={gymId} locale={locale} currency={currency} />;
  } else if (section === "coaches") {
    content = <CoachesPanel gymId={gymId} locale={locale} currency={currency} />;
  } else if (section === "signup") {
    content = <SignupLinkPanel gymId={gymId} locale={locale} />;
  } else if (section === "attendance") {
    content = <AttendancePanel gymId={gymId} locale={locale} />;
  } else if (section === "profile") {
    content = <GymProfilePanel gymId={gymId} gymSlug={gymSlug} locale={locale} />;
  } else {
    content = (
      <div className="panel-section-fill flex items-center justify-center rounded-2xl border border-dashed border-glass-border bg-glass/40 px-6 py-12 text-center">
        <p className="max-w-md text-sm font-bold text-muted-foreground">{t("panelComingSoon")}</p>
      </div>
    );
  }

  return (
    <div className="panel-section-root">
      <ErrorBoundary>{content}</ErrorBoundary>
    </div>
  );
}
