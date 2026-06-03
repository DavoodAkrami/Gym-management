"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelSkeleton } from "@/components/panel/PanelSkeleton";
import { authUserFromSession } from "@/lib/auth/roles";
import { fetchCoachPortal, linkCoachAccount } from "@/lib/supabase/coach-portal";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { authActions, type AuthUser } from "@/lib/store/slices";
import { useAppDispatch } from "@/lib/store/hooks";

type CoachAuthGateProps = {
  children: React.ReactNode;
  gymSlug: string;
};

export function CoachAuthGate({ children, gymSlug }: CoachAuthGateProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!isSupabaseConfigured()) {
        router.replace("/login");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (!data.session?.user) {
        dispatch(authActions.clearAuth());
        router.replace("/login");
        return;
      }

      const authUser: AuthUser = authUserFromSession(data.session.user);
      dispatch(
        authActions.setAuth({
          user: authUser,
          session: data.session as unknown as Record<string, unknown>,
        }),
      );

      try {
        await linkCoachAccount(gymSlug);
      } catch {
        /* not linked yet */
      }

      const portal = await fetchCoachPortal();
      if (cancelled) {
        return;
      }

      if (!portal) {
        router.replace("/coach/login?pending=1");
        return;
      }

      if (portal.gym.slug !== gymSlug) {
        router.replace(`/coach/${portal.gym.slug}`);
        return;
      }

      setReady(true);
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [dispatch, gymSlug, router]);

  if (!ready) {
    return <PanelSkeleton />;
  }

  return children;
}
