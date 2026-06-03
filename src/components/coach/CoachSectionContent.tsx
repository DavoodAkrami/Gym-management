"use client";

import { CoachOverviewPanel } from "@/components/coach/CoachOverviewPanel";
import { CoachSelfProfilePanel } from "@/components/coach/CoachSelfProfilePanel";
import { CoachTraineesPanel } from "@/components/coach/CoachTraineesPanel";
import { CoachProgramsPanel } from "@/components/coach/CoachProgramsPanel";
import { MembersPanel } from "@/components/panel/MembersPanel";
import { MembershipsPanel } from "@/components/panel/MembershipsPanel";
import { getTranslation } from "@/lib/i18n/translations";
import type { PanelSectionId } from "@/lib/panel/sections";
import type { CoachPermissions } from "@/lib/staff/types";
import type { Locale } from "@/lib/store/slices";

type CoachSectionContentProps = {
  section: PanelSectionId;
  gymId: string;
  currency: string;
  locale: Locale;
  permissions: CoachPermissions;
  onProfileUpdated?: () => void;
};

export function CoachSectionContent({
  section,
  gymId,
  currency,
  locale,
  permissions,
  onProfileUpdated,
}: CoachSectionContentProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  let content: React.ReactNode;

  if (section === "overview") {
    content = <CoachOverviewPanel locale={locale} currency={currency} />;
  } else if (section === "coaches") {
    content = <CoachTraineesPanel locale={locale} />;
  } else if (section === "programs") {
    content = <CoachProgramsPanel locale={locale} currency={currency} />;
  } else if (section === "members" && permissions.view_members) {
    content = <MembersPanel gymId={gymId} locale={locale} currency={currency} />;
  } else if (section === "memberships" && permissions.view_members) {
    content = <MembershipsPanel gymId={gymId} locale={locale} currency={currency} />;
  } else if (section === "profile") {
    content = <CoachSelfProfilePanel locale={locale} onUpdated={onProfileUpdated} />;
  } else {
    content = (
      <div className="panel-section-fill flex items-center justify-center rounded-2xl border border-dashed border-glass-border bg-glass/40 px-6 py-12 text-center">
        <p className="max-w-md text-sm font-bold text-muted-foreground">{t("panelComingSoon")}</p>
      </div>
    );
  }

  return <div className="panel-section-root">{content}</div>;
}
