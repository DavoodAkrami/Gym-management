"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authActions, gymsActions, type AuthUser } from "@/lib/store/slices";
import { useAppDispatch } from "@/lib/store/hooks";
import { PanelSkeleton } from "@/components/panel/PanelSkeleton";
import { authUserFromSession } from "@/lib/auth/roles";
import { fetchCoachPortal } from "@/lib/supabase/coach-portal";
import { bootstrapOwnerSession } from "@/lib/supabase/owner";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthGateMode = "panel" | "onboarding";

type AuthGateProps = {
  children: React.ReactNode;
  mode: AuthGateMode;
  gymSlug?: string;
};

export function AuthGate({ children, mode, gymSlug }: AuthGateProps) {
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

      const coachPortal = await fetchCoachPortal();
      if (cancelled) {
        return;
      }

      if (coachPortal) {
        router.replace(`/coach/${coachPortal.gym.slug}`);
        return;
      }

      const bootstrap = await bootstrapOwnerSession(dispatch, authUser);

      if (cancelled) {
        return;
      }

      if (mode === "onboarding") {
        if (bootstrap.hasGym && bootstrap.gymSlug) {
          router.replace(`/panel/${bootstrap.gymSlug}`);
          return;
        }
        setReady(true);
        return;
      }

      if (!bootstrap.hasGym || !bootstrap.gymSlug) {
        router.replace("/signup");
        return;
      }

      if (gymSlug) {
        const { data: gymRows } = await supabase.from("gyms").select("id, slug").eq("owner_id", authUser.id);
        const match = (gymRows ?? []).find((gym) => gym.slug === gymSlug);

        if (!match) {
          router.replace(`/panel/${bootstrap.gymSlug}`);
          return;
        }

        dispatch(gymsActions.setCurrentGymId(match.id));
      }

      setReady(true);
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [dispatch, gymSlug, mode, router]);

  if (!ready) {
    return <PanelSkeleton />;
  }

  return children;
}
