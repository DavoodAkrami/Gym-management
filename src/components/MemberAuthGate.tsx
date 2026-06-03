"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserFromSession, getRoleFromUser } from "@/lib/auth/roles";
import { authActions } from "@/lib/store/slices";
import { useAppDispatch } from "@/lib/store/hooks";
import { bootstrapOwnerSession } from "@/lib/supabase/owner";
import { fetchMemberPortal } from "@/lib/supabase/member-portal";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type MemberAuthGateProps = {
  children: React.ReactNode;
};

export function MemberAuthGate({ children }: MemberAuthGateProps) {
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

      const user = data.session.user;
      const role = getRoleFromUser(user);

      if (role === "owner") {
        const authUser = authUserFromSession(user);
        const owner = await bootstrapOwnerSession(dispatch, authUser);
        if (!cancelled && owner.hasGym && owner.gymSlug) {
          router.replace(`/panel/${owner.gymSlug}`);
          return;
        }
      }

      const authUser = authUserFromSession(user);
      dispatch(
        authActions.setAuth({
          user: authUser,
          session: data.session as unknown as Record<string, unknown>,
        }),
      );

      const portal = await fetchMemberPortal();
      if (cancelled) {
        return;
      }

      if (!portal && role !== "member") {
        router.replace("/signup");
        return;
      }

      setReady(true);
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [dispatch, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="glass-card px-6 py-4 text-sm font-bold text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return children;
}
