"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserFromSession } from "@/lib/auth/roles";
import { routeAfterAuth } from "@/lib/auth/post-login";
import { authActions } from "@/lib/store/slices";
import { useAppDispatch } from "@/lib/store/hooks";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function HomeAuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (!data.session?.user) {
        setChecking(false);
        return;
      }

      const authUser = authUserFromSession(data.session.user);
      dispatch(
        authActions.setAuth({
          user: authUser,
          session: data.session as unknown as Record<string, unknown>,
        }),
      );

      await routeAfterAuth(dispatch, router, authUser);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [dispatch, router]);

  if (checking && isSupabaseConfigured()) {
    return null;
  }

  return children;
}
