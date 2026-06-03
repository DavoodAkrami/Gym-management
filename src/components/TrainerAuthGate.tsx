"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserFromSession } from "@/lib/auth/roles";
import { authActions } from "@/lib/store/slices";
import { useAppDispatch } from "@/lib/store/hooks";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type TrainerAuthGateProps = {
  children: React.ReactNode;
};

export function TrainerAuthGate({ children }: TrainerAuthGateProps) {
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

      dispatch(
        authActions.setAuth({
          user: authUserFromSession(data.session.user),
          session: data.session as unknown as Record<string, unknown>,
        }),
      );

      setReady(true);
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [dispatch, router]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
