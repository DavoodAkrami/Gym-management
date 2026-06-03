import type { Session, SupabaseClient } from "@supabase/supabase-js";

export async function resolveSessionAfterSignUp(
  supabase: SupabaseClient,
  email: string,
  password: string,
  signUpSession: Session | null,
): Promise<Session> {
  if (signUpSession) {
    return signUpSession;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw new Error(
      "Account created. Confirm your email in Supabase (or disable email confirmation for local dev), then sign in.",
    );
  }

  return data.session;
}
