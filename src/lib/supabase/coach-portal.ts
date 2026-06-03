import { defaultCoachPermissions, type CoachPermissions } from "@/lib/staff/types";
import { sanitizeAvatarForDb } from "@/lib/staff/avatar";
import { createSupabaseBrowserClient } from "./client";

export type CoachPortalData = {
  coach: {
    id: string;
    gym_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    specialty: string | null;
    avatar_url: string | null;
    gym_hours_start: string | null;
    gym_hours_end: string | null;
    permissions: CoachPermissions;
    contract_start_date: string;
    contract_end_date: string;
    status: string;
    active: boolean;
  };
  gym: {
    id: string;
    name: string;
    address: string;
    phone: string;
    base_currency: string;
    slug: string;
  };
};

export type CoachProfileInput = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  specialty: string;
  avatar_url: string;
  gym_hours_start: string;
  gym_hours_end: string;
};

export type CoachSignupInput = CoachProfileInput & {
  gym_slug: string;
  contract_start_date: string;
  contract_end_date: string;
};

function normalizePermissions(raw: unknown): CoachPermissions {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...defaultCoachPermissions, ...(raw as CoachPermissions) };
  }
  return { ...defaultCoachPermissions };
}

function mapPortalPayload(data: {
  coach: CoachPortalData["coach"] & { permissions?: unknown };
  gym: CoachPortalData["gym"];
}): CoachPortalData {
  return {
    coach: {
      ...data.coach,
      permissions: normalizePermissions(data.coach.permissions),
      gym_hours_start: data.coach.gym_hours_start?.slice(0, 5) ?? null,
      gym_hours_end: data.coach.gym_hours_end?.slice(0, 5) ?? null,
      active: Boolean(data.coach.active),
    },
    gym: data.gym,
  };
}

export type CoachOverviewStats = {
  trainee_count: number;
  earnings_from_trainees: number;
};

export type CoachTrainee = {
  member_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  avatar_url?: string | null;
  status: string;
  join_date: string;
};

export type CoachAssignableMember = {
  member_id: string;
  full_name: string;
  phone: string;
};

export type CoachProgram = {
  id: string;
  coach_id: string;
  gym_id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  active: boolean;
};

export type ChartPoint = { label: string; value: number };

/** Links auth user to owner-created coach row (same email). No-op if already linked. */
export async function linkCoachAccount(gymSlug?: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("link_coach_account", {
    p_gym_slug: gymSlug ?? null,
  });

  if (error) {
    if (error.code === "PGRST202") {
      return false;
    }
    throw error;
  }

  return Boolean(data);
}

export async function fetchCoachOverview(): Promise<CoachOverviewStats | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_coach_overview");

  if (error) {
    if (error.code === "PGRST202") {
      return { trainee_count: 0, earnings_from_trainees: 0 };
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  const payload = data as {
    trainee_count?: number;
    earnings_from_trainees?: number;
    trainer_count?: number;
    earnings_from_trainers?: number;
  };
  return {
    trainee_count: Number(payload.trainee_count ?? payload.trainer_count) || 0,
    earnings_from_trainees:
      Number(payload.earnings_from_trainees ?? payload.earnings_from_trainers) || 0,
  };
}

export async function fetchCoachTraineeSeries(days = 30): Promise<ChartPoint[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_coach_trainee_series", { p_days: days });
  if (error) {
    return [];
  }
  return (data ?? []) as ChartPoint[];
}

export async function fetchCoachEarningsSeries(days = 30): Promise<ChartPoint[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_coach_earnings_series", { p_days: days });
  if (error) {
    return [];
  }
  return ((data ?? []) as ChartPoint[]).map((p) => ({ ...p, value: Number(p.value) }));
}

export async function fetchCoachTrainees(): Promise<CoachTrainee[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_coach_trainees");
  if (error) {
    throw error;
  }
  return (data ?? []) as CoachTrainee[];
}

export async function fetchCoachAssignableMembers(): Promise<CoachAssignableMember[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_coach_assignable_members");
  if (error) {
    if (error.code === "PGRST202") {
      return [];
    }
    throw error;
  }
  return (data ?? []) as CoachAssignableMember[];
}

export async function coachAddTrainee(memberId: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("coach_add_trainee", { p_member_id: memberId });
  if (error) {
    throw error;
  }
}

export async function coachRemoveTrainee(memberId: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("coach_remove_trainee", { p_member_id: memberId });
  if (error) {
    throw error;
  }
}

export async function fetchCoachPrograms(coachId?: string): Promise<CoachProgram[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_coach_programs", {
    p_coach_id: coachId ?? null,
  });
  if (error) {
    throw error;
  }
  return ((data ?? []) as CoachProgram[]).map((p) => ({
    ...p,
    price: Number(p.price),
    duration_days: Number(p.duration_days),
  }));
}

export async function upsertCoachProgram(input: {
  id?: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
}) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("coach_upsert_program", {
    p_id: input.id ?? null,
    p_name: input.name,
    p_description: input.description,
    p_price: input.price,
    p_duration_days: input.duration_days,
  });
  if (error) {
    throw error;
  }
}

export async function fetchCoachPortal(): Promise<CoachPortalData | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_coach_portal");

  if (error) {
    if (error.code === "PGRST202") {
      return fetchCoachPortalFallback();
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPortalPayload(data as { coach: CoachPortalData["coach"]; gym: CoachPortalData["gym"] });
}

async function fetchCoachPortalFallback(): Promise<CoachPortalData | null> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return null;
  }

  const { data: coach, error } = await supabase
    .from("coaches")
    .select("*, gyms(*)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !coach) {
    return null;
  }

  const row = coach as CoachPortalData["coach"] & { gyms: CoachPortalData["gym"]; permissions?: unknown };

  return mapPortalPayload({
    coach: row,
    gym: row.gyms,
  });
}

export async function registerCoachAccount(input: CoachSignupInput) {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.rpc("register_gym_coach_account", {
    p_gym_slug: input.gym_slug,
    p_first_name: input.first_name.trim(),
    p_last_name: input.last_name.trim(),
    p_phone: input.phone.trim() || null,
    p_email: input.email.trim() || null,
    p_specialty: input.specialty.trim() || null,
    p_avatar_url: sanitizeAvatarForDb(input.avatar_url),
    p_gym_hours_start: input.gym_hours_start || null,
    p_gym_hours_end: input.gym_hours_end || null,
    p_contract_start_date: input.contract_start_date,
    p_contract_end_date: input.contract_end_date,
  });

  if (error) {
    throw error;
  }
}

export async function updateCoachSelfProfile(input: CoachProfileInput) {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.rpc("update_coach_self", {
    p_first_name: input.first_name.trim(),
    p_last_name: input.last_name.trim(),
    p_phone: input.phone.trim() || null,
    p_email: input.email.trim() || null,
    p_specialty: input.specialty.trim() || null,
    p_avatar_url: sanitizeAvatarForDb(input.avatar_url),
    p_gym_hours_start: input.gym_hours_start || null,
    p_gym_hours_end: input.gym_hours_end || null,
  });

  if (error) {
    throw error;
  }
}

export async function fetchCoachSignupContext(gymSlug: string) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_coach_signup_context", {
    p_gym_slug: gymSlug,
  });

  if (!error && data) {
    const payload = data as { gym: { id: string; name: string; slug: string } };
    return payload.gym;
  }

  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("id, name, slug")
    .eq("slug", gymSlug)
    .maybeSingle();

  if (gymError || !gym) {
    throw new Error("Gym not found");
  }

  return gym;
}
