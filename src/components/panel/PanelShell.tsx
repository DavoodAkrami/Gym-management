"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { PreferencesBar } from "@/components/PreferencesBar";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { PanelNavList } from "@/components/panel/PanelNavList";
import { PanelSectionContent } from "@/components/panel/PanelSectionContent";
import { getTranslation } from "@/lib/i18n/translations";
import {
  DEFAULT_ENABLED_SECTIONS,
  isPanelSectionId,
  panelSections,
  type PanelSectionId,
} from "@/lib/panel/sections";
import { useAppSelector } from "@/lib/store/hooks";

type PanelShellProps = {
  slug: string;
};

export function PanelShell({ slug }: PanelShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useAppSelector((state) => state.ui.locale);
  const gyms = useAppSelector((state) => state.gyms.entities);
  const authUser = useAppSelector((state) => state.auth.user);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const gym = Object.values(gyms).find((item) => item?.slug === slug);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const visibleSections = useMemo(() => {
    const enabled = gym?.enabled_sections ?? DEFAULT_ENABLED_SECTIONS;
    const enabledSet = new Set(enabled);
    return panelSections.filter((s) => enabledSet.has(s.id));
  }, [gym?.enabled_sections]);

  const sectionParam = searchParams.get("section");
  const activeSection: PanelSectionId =
    isPanelSectionId(sectionParam) && visibleSections.some((s) => s.id === sectionParam)
      ? sectionParam
      : (visibleSections[0]?.id ?? "overview");
  const active = visibleSections.find((item) => item.id === activeSection) ?? visibleSections[0];

  const setSection = useCallback(
    (sectionId: PanelSectionId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sectionId === "overview") {
        params.delete("section");
      } else {
        params.set("section", sectionId);
      }
      const query = params.toString();
      router.replace(query ? `/panel/${slug}?${query}` : `/panel/${slug}`, { scroll: false });
      setMobileMenuOpen(false);
    },
    [router, searchParams, slug],
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

  const ActiveIcon = active.icon;

  return (
    <div className="panel-owner panel-page-body flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        className={`panel-mobile-menu-btn ${mobileMenuOpen ? "panel-mobile-menu-btn-open" : ""}`}
        aria-expanded={mobileMenuOpen}
        aria-controls="panel-mobile-drawer"
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
        <div
          className="panel-drawer-backdrop"
          role="presentation"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <aside
        id="panel-mobile-drawer"
        className={`panel-drawer surface-panel ${mobileMenuOpen ? "panel-drawer-open" : ""}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-foreground">{gym?.name ?? slug}</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">
              {authUser?.full_name || authUser?.email || t("panelWorkspace")}
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
            activeSection={activeSection}
            onSelect={setSection}
            sections={visibleSections}
          />
        </div>
      </aside>

      <header className="panel-shell-header surface-panel mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-5 lg:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="brand-mark grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black">
            GM
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-foreground sm:text-base">{gym?.name ?? slug}</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">
              {authUser?.full_name || authUser?.email || t("panelWorkspace")}
            </p>
          </div>
        </div>
        <PreferencesBar className="ms-auto" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <aside className="panel-sidebar-rail surface-panel hidden w-full shrink-0 overflow-y-auto p-3 lg:block lg:w-64 lg:max-h-full lg:p-4">
          <p className="mb-3 px-2 text-eyebrow">{t("panelMenu")}</p>
          <PanelNavList
            locale={locale}
            activeSection={activeSection}
            onSelect={setSection}
            sections={visibleSections}
          />
        </aside>

        <main className="panel-main-card surface-panel flex min-h-0 flex-1 flex-col">
          <div className="panel-main-header border-b border-border p-3 sm:p-7 sm:pb-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-sm text-primary sm:size-11 sm:text-lg">
                <ActiveIcon aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-lg font-black text-foreground sm:text-3xl">{t(active.labelKey)}</h1>
                <p className="mt-0.5 max-w-2xl text-xs font-medium leading-5 text-muted-foreground sm:mt-2 sm:text-base sm:leading-7">
                  {t(active.descriptionKey)}
                </p>
              </div>
            </div>
          </div>

          <div className="panel-scroll-region p-5 pt-4 sm:p-7 sm:pt-5">
            {gym ? (
              <PanelSectionContent
                section={activeSection}
                gymId={gym.id}
                gymSlug={gym.slug}
                gymName={gym.name}
                currency={gym.base_currency}
                locale={locale}
              />
            ) : (
              <ListSkeleton rows={4} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
