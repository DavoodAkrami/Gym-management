"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { PreferencesBar } from "@/components/PreferencesBar";
import { CoachSectionContent } from "@/components/coach/CoachSectionContent";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { PanelNavList } from "@/components/panel/PanelNavList";
import { getTranslation } from "@/lib/i18n/translations";
import {
  coachDefaultSection,
  coachPanelSections,
} from "@/lib/panel/coach-access";
import { isPanelSectionId, type PanelSectionId } from "@/lib/panel/sections";
import { fetchCoachPortal, type CoachPortalData } from "@/lib/supabase/coach-portal";
import { useAppSelector } from "@/lib/store/hooks";
import type { Locale } from "@/lib/store/slices";

type CoachPanelShellProps = {
  slug: string;
};

export function CoachPanelShell({ slug }: CoachPanelShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useAppSelector((state) => state.ui.locale) as Locale;
  const authUser = useAppSelector((state) => state.auth.user);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portal, setPortal] = useState<CoachPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCoachPortal();
      if (!data) {
        setPortal(null);
        return;
      }
      if (data.gym.slug !== slug) {
        router.replace(`/coach/${data.gym.slug}`);
        return;
      }
      setPortal(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [slug, locale, router]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  const sections = useMemo(
    () => (portal ? coachPanelSections(portal.coach.permissions) : []),
    [portal],
  );

  const sectionParam = searchParams.get("section");
  const defaultSection = portal ? coachDefaultSection(portal.coach.permissions) : "profile";
  const activeSection: PanelSectionId =
    sectionParam && sections.some((s) => s.id === sectionParam)
      ? (sectionParam as PanelSectionId)
      : defaultSection;

  const active = sections.find((item) => item.id === activeSection) ?? sections[0];

  const setSection = useCallback(
    (sectionId: PanelSectionId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sectionId === defaultSection) {
        params.delete("section");
      } else {
        params.set("section", sectionId);
      }
      const query = params.toString();
      router.replace(query ? `/coach/${slug}?${query}` : `/coach/${slug}`, { scroll: false });
      setMobileMenuOpen(false);
    },
    [router, searchParams, slug, defaultSection],
  );

  useEffect(() => {
    document.documentElement.classList.add("panel-viewport-lock");
    return () => {
      document.documentElement.classList.remove("panel-viewport-lock");
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  const ActiveIcon = active?.icon;

  if (loading) {
    return <ListSkeleton rows={6} />;
  }

  if (error) {
    return (
      <div className="panel-card p-6">
        <p className="panel-alert border-danger/30 bg-danger/10 text-danger">{error}</p>
      </div>
    );
  }

  if (!portal || !active || !ActiveIcon) {
    return (
      <div className="panel-card p-6 text-center">
        <p className="text-sm font-bold text-muted-foreground">{t("coachPortalEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="panel-page-body flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        className={`panel-mobile-menu-btn ${mobileMenuOpen ? "panel-mobile-menu-btn-open" : ""}`}
        aria-expanded={mobileMenuOpen}
        aria-controls="coach-mobile-drawer"
        onClick={() => setMobileMenuOpen((open) => !open)}
      >
        {mobileMenuOpen ? (
          <FiX aria-hidden="true" className="text-xl" />
        ) : (
          <FiMenu aria-hidden="true" className="text-xl" />
        )}
        <span className="sr-only">{mobileMenuOpen ? t("panelMenuClose") : t("panelMenuOpen")}</span>
      </button>

      {mobileMenuOpen ? (
        <div className="panel-drawer-backdrop" role="presentation" onClick={() => setMobileMenuOpen(false)} />
      ) : null}

      <aside
        id="coach-mobile-drawer"
        className={`panel-drawer surface-panel ${mobileMenuOpen ? "panel-drawer-open" : ""}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-foreground">{portal.gym.name}</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">
              {portal.coach.full_name || authUser?.email || t("coachPortalEyebrow")}
            </p>
          </div>
          <button
            type="button"
            className="panel-drawer-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={t("panelMenuClose")}
          >
            <FiX aria-hidden="true" className="text-lg" />
          </button>
        </div>
        <div className="p-3">
          <p className="mb-3 px-2 text-eyebrow">{t("panelMenu")}</p>
          <PanelNavList
            locale={locale}
            sections={sections}
            activeSection={activeSection}
            onSelect={setSection}
          />
        </div>
      </aside>

      <header className="panel-shell-header surface-panel mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-5 lg:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="brand-mark grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black">
            GM
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-foreground sm:text-base">{portal.gym.name}</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">
              {portal.coach.full_name || authUser?.email || t("coachPortalEyebrow")}
            </p>
          </div>
        </div>
        <PreferencesBar className="ms-auto" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <aside className="surface-panel hidden w-full shrink-0 overflow-y-auto p-3 lg:block lg:w-64 lg:max-h-full lg:p-4">
          <p className="mb-3 px-2 text-eyebrow">{t("panelMenu")}</p>
          <PanelNavList
            locale={locale}
            sections={sections}
            activeSection={activeSection}
            onSelect={setSection}
          />
        </aside>

        <main className="panel-main-card surface-panel flex min-h-0 flex-1 flex-col">
          <div className="panel-main-header border-b border-border p-5 sm:p-7 sm:pb-5">
            <div className="flex items-start gap-4">
              <span className="grid size-12 place-items-center rounded-lg bg-surface-muted text-xl text-foreground">
                <ActiveIcon aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-foreground sm:text-3xl">{t(active.labelKey)}</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-muted-foreground sm:text-base">
                  {t(active.descriptionKey)}
                </p>
              </div>
            </div>
          </div>

          <div className="panel-scroll-region p-5 pt-4 sm:p-7 sm:pt-5">
            <CoachSectionContent
              section={activeSection}
              gymId={portal.gym.id}
              currency={portal.gym.base_currency}
              locale={locale}
              permissions={portal.coach.permissions}
              onProfileUpdated={() => void loadPortal()}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
