import { createSupabaseBrowserClient } from "./client";
import type { SignupLinkRow } from "./database.types";

export type SignupLinkInfo = {
  id: string;
  gym_id: string;
  token: string;
  active: boolean;
  url: string;
  created_at: string;
};

export function buildPublicSignupUrl(token: string) {
  if (typeof window === "undefined") {
    return `/join/${token}`;
  }
  return `${window.location.origin}/join/${token}`;
}

function mapSignupLink(row: SignupLinkRow): SignupLinkInfo {
  return {
    id: row.id,
    gym_id: row.gym_id,
    token: row.token,
    active: row.active,
    created_at: row.created_at,
    url: buildPublicSignupUrl(row.token),
  };
}

export async function fetchActiveSignupLink(gymId: string) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("signup_links")
    .select("*")
    .eq("gym_id", gymId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapSignupLink(data as SignupLinkRow);
}

export async function ensureSignupLink(gymId: string) {
  const existing = await fetchActiveSignupLink(gymId);
  if (existing) {
    return existing;
  }

  const supabase = createSupabaseBrowserClient();
  const token = crypto.randomUUID().replace(/-/g, "");

  const { data, error } = await supabase
    .from("signup_links")
    .insert({
      gym_id: gymId,
      token,
      active: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create signup link");
  }

  return mapSignupLink(data as SignupLinkRow);
}

export async function regenerateSignupLink(gymId: string) {
  const supabase = createSupabaseBrowserClient();

  await supabase.from("signup_links").update({ active: false }).eq("gym_id", gymId).eq("active", true);

  const token = crypto.randomUUID().replace(/-/g, "");

  const { data, error } = await supabase
    .from("signup_links")
    .insert({
      gym_id: gymId,
      token,
      active: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to regenerate signup link");
  }

  return mapSignupLink(data as SignupLinkRow);
}
