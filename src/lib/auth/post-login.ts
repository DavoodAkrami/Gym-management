import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { AppDispatch } from "@/lib/store";
import { fetchMemberPortal } from "@/lib/supabase/member-portal";
import { bootstrapOwnerSession } from "@/lib/supabase/owner";
import { fetchCoachPortal, linkCoachAccount } from "@/lib/supabase/coach-portal";
import type { AuthUser } from "@/lib/store/slices";

export async function routeAfterAuth(
  dispatch: AppDispatch,
  router: AppRouterInstance,
  user: AuthUser,
) {
  if (user.role === "member") {
    router.replace("/member");
    return;
  }

  try {
    await linkCoachAccount();
  } catch {
    /* no matching owner-created coach row */
  }

  const coachPortal = await fetchCoachPortal();
  if (coachPortal) {
    router.replace(`/coach/${coachPortal.gym.slug}`);
    return;
  }

  if (user.role === "coach") {
    router.replace("/coach/login?pending=1");
    return;
  }

  const portal = await fetchMemberPortal();
  if (portal) {
    router.replace("/member");
    return;
  }

  const owner = await bootstrapOwnerSession(dispatch, user);

  if (!owner.hasGym || !owner.gymSlug) {
    router.replace("/signup");
    return;
  }

  router.replace(`/panel/${owner.gymSlug}`);
}

/** @deprecated Use routeAfterAuth */
export async function routeAfterLogin(
  dispatch: AppDispatch,
  router: AppRouterInstance,
  user: AuthUser,
) {
  return routeAfterAuth(dispatch, router, user);
}

export function formatAuthError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return fallback;
}
