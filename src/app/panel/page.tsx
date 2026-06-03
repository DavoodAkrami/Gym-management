"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authActions, type AuthUser } from "@/lib/store/slices";
import { useAppDispatch } from "@/lib/store/hooks";
import { bootstrapOwnerSession } from "@/lib/supabase/owner";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function PanelIndexPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const redirect = async () => {
      if (!isSupabaseConfigured()) {
        router.replace("/login");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      const authUser: AuthUser = {
        id: data.session.user.id,
        email: data.session.user.email ?? "",
        full_name: (data.session.user.user_metadata?.full_name as string) || "",
      };

      dispatch(
        authActions.setAuth({
          user: authUser,
          session: data.session as unknown as Record<string, unknown>,
        }),
      );

      const bootstrap = await bootstrapOwnerSession(dispatch, authUser);

      if (bootstrap.gymSlug) {
        router.replace(`/panel/${bootstrap.gymSlug}`);
        return;
      }

      router.replace("/signup");
    };

    void redirect();
  }, [dispatch, router]);

  return null;
}
