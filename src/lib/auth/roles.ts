import type { User } from "@supabase/supabase-js";
import type { AuthUser } from "@/lib/store/slices";

export type AppRole = "owner" | "member" | "coach";

export function getRoleFromUser(user: User | null | undefined): AppRole {
  const role = user?.user_metadata?.role;
  if (role === "member") {
    return "member";
  }
  if (role === "coach" || role === "trainer") {
    return "coach";
  }
  return "owner";
}

export function authUserFromSession(user: User, emailFallback = ""): AuthUser {
  return {
    id: user.id,
    email: user.email ?? emailFallback,
    full_name: (user.user_metadata?.full_name as string) || "",
    role: getRoleFromUser(user),
  };
}
