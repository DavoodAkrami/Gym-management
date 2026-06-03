import { sanitizeAvatarForDb } from "@/lib/staff/avatar";
import { staffFullName } from "@/lib/staff/avatar";
import { createSupabaseBrowserClient } from "./client";

export type TrainerPortalData = {
  trainer: {
    id: string;
    gym_id: string;
    coach_id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    specialty: string | null;
    avatar_url: string | null;
    gym_hours_start: string | null;
    gym_hours_end: string | null;
    contract_start_date: string;
    contract_end_date: string;
    status: string;
  };
  gym: {
    id: string;
    name: string;
    address: string;
    phone: string;
    base_currency: string;
    slug: string;
  };
  coach: {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
  } | null;
};

export type TrainerProfileInput = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  specialty: string;
  avatar_url: string;
  gym_hours_start: string;
  gym_hours_end: string;
};

export type TrainerSignupInput = TrainerProfileInput & {
  gym_slug: string;
  coach_id: string;
  contract_start_date: string;
  contract_end_date: string;
};

function mapPortalPayload(data: {
  trainer: TrainerPortalData["trainer"];
  gym: TrainerPortalData["gym"];
  coach: TrainerPortalData["coach"] | null;
}): TrainerPortalData {
  return {
    trainer: {
      ...data.trainer,
      gym_hours_start: data.trainer.gym_hours_start?.slice(0, 5) ?? null,
      gym_hours_end: data.trainer.gym_hours_end?.slice(0, 5) ?? null,
    },
    gym: data.gym,
    coach: data.coach,
  };
}

export async function fetchTrainerPortal(): Promise<TrainerPortalData | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_trainer_portal");

  if (error) {
    if (error.code === "PGRST202") {
      return fetchTrainerPortalFallback();
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPortalPayload(data as TrainerPortalData);
}

async function fetchTrainerPortalFallback(): Promise<TrainerPortalData | null> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return null;
  }

  const { data: trainer, error } = await supabase
    .from("trainers")
    .select("*, gyms(*), coaches(id, first_name, last_name, full_name)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !trainer) {
    return null;
  }

  const row = trainer as TrainerPortalData["trainer"] & {
    gyms: TrainerPortalData["gym"];
    coaches: TrainerPortalData["coach"];
  };

  return mapPortalPayload({
    trainer: row,
    gym: row.gyms,
    coach: row.coaches,
  });
}

export async function registerTrainerAccount(input: TrainerSignupInput) {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.rpc("register_gym_trainer", {
    p_gym_slug: input.gym_slug,
    p_coach_id: input.coach_id,
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

export async function updateTrainerSelfProfile(input: TrainerProfileInput) {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.rpc("update_trainer_self", {
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

export async function fetchGymCoachesForTrainerSignup(gymSlug: string) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_trainer_signup_context", {
    p_gym_slug: gymSlug,
  });

  if (!error && data) {
    const payload = data as {
      gym: { id: string; name: string; slug: string };
      coaches: { id: string; first_name?: string; last_name?: string; full_name?: string }[];
    };
    return {
      gym: payload.gym,
      coaches: (payload.coaches ?? []).map((coach) => ({
        id: coach.id,
        full_name:
          coach.full_name ||
          staffFullName(coach.first_name ?? "", coach.last_name ?? ""),
      })),
    };
  }

  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("id, name, slug")
    .eq("slug", gymSlug)
    .maybeSingle();

  if (gymError || !gym) {
    throw new Error("Gym not found");
  }

  const { data: coaches, error: coachesError } = await supabase
    .from("coaches")
    .select("id, first_name, last_name, full_name")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: true });

  if (coachesError) {
    throw coachesError;
  }

  return {
    gym,
    coaches: (coaches ?? []).map((coach) => ({
      id: coach.id,
      full_name:
        coach.full_name ||
        staffFullName(coach.first_name ?? "", coach.last_name ?? ""),
    })),
  };
}
