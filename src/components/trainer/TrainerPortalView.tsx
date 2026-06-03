"use client";

import { useCallback, useEffect, useState } from "react";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { TrainerDashboard } from "@/components/trainer/TrainerDashboard";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { getTranslation } from "@/lib/i18n/translations";
import { fetchTrainerPortal, type TrainerPortalData } from "@/lib/supabase/trainer-portal";
import { useAppSelector } from "@/lib/store/hooks";

export function TrainerPortalView() {
  const locale = useAppSelector((state) => state.ui.locale);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [portal, setPortal] = useState<TrainerPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPortal(await fetchTrainerPortal());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <TrainerShell>
        <ListSkeleton rows={4} />
      </TrainerShell>
    );
  }

  if (error) {
    return (
      <TrainerShell>
        <p className="panel-alert border border-danger/30 bg-danger/10 text-danger">{error}</p>
      </TrainerShell>
    );
  }

  if (!portal) {
    return (
      <TrainerShell>
        <p className="text-sm font-bold text-muted-foreground">{t("trainerPortalEmpty")}</p>
      </TrainerShell>
    );
  }

  return (
    <TrainerShell gymName={portal.gym.name}>
      <TrainerDashboard locale={locale} portal={portal} onUpdated={() => void load()} />
    </TrainerShell>
  );
}
