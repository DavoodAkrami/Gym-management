"use client";

import { useCallback, useEffect, useState } from "react";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { MemberDashboard } from "@/components/member/MemberDashboard";
import { MemberShell } from "@/components/member/MemberShell";
import { formatAuthError } from "@/lib/auth/post-login";
import { getTranslation } from "@/lib/i18n/translations";
import { fetchMemberPortal, type MemberPortalData } from "@/lib/supabase/member-portal";
import { useAppSelector } from "@/lib/store/hooks";

export function MemberPortalView() {
  const locale = useAppSelector((state) => state.ui.locale);
  const [portal, setPortal] = useState<MemberPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMemberPortal();
      setPortal(data);
    } catch (caught) {
      setError(formatAuthError(caught, getTranslation(locale, "authErrorGeneric")));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <MemberShell>
        <ListSkeleton rows={4} />
      </MemberShell>
    );
  }

  return (
    <MemberShell gymName={portal?.gym.name}>
      <MemberDashboard portal={portal} loading={false} error={error} onRetry={() => void load()} />
    </MemberShell>
  );
}
