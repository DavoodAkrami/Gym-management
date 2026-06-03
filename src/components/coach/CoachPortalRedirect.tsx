"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PanelSkeleton } from "@/components/panel/PanelSkeleton";
import { fetchCoachPortal } from "@/lib/supabase/coach-portal";

export function CoachPortalRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const portal = await fetchCoachPortal();
        if (cancelled) {
          return;
        }
        if (portal) {
          router.replace(`/coach/${portal.gym.slug}`);
          return;
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) {
        router.replace("/login");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return <PanelSkeleton />;
}
