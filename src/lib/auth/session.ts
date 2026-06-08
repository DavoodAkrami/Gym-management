import type { Session, SupabaseClient } from "@supabase/supabase-js";

export async function resolveSessionAfterSignUp(
  supabase: SupabaseClient,
  identifier: string,
  password: string,
  signUpSession: Session | null,
  isPhone: boolean = false,
): Promise<Session> {
  if (signUpSession) {
    return signUpSession;
  }

  const credentials = isPhone ? { phone: identifier, password } : { email: identifier, password };
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error || !data.session) {
    throw new Error(
      "Account created. Confirm your account in Supabase, then sign in.",
    );
  }

  return data.session;
}
