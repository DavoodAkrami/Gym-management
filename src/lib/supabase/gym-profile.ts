import { sanitizeAvatarForDb } from "@/lib/staff/avatar";
import type { Gym, GymPlan } from "@/lib/store/slices";
import { createSupabaseBrowserClient } from "./client";
import type { GymPlanRow, GymRow } from "./database.types";

export type GymProfileInput = {
  name: string;
  address: string;
  phone: string;
  public_signup_enabled?: boolean;
};

export type GymPlanInput = {
  name: string;
  price: number;
  duration_days: number;
};

function mapGym(row: GymRow): Gym {
  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    slug: row.slug,
    address: row.address,
    phone: row.phone,
    logo_url: row.logo_url ?? undefined,
    base_currency: row.base_currency,
    enabled_sections: row.enabled_sections ?? undefined,
    public_signup_enabled: row.public_signup_enabled,
  };
}

function mapPlan(row: GymPlanRow): GymPlan {
  return {
    id: row.id,
    gym_id: row.gym_id,
    name: row.name,
    price: Number(row.price),
    duration_days: row.duration_days,
  };
}

export async function fetchGymProfile(gymId: string) {
  const supabase = createSupabaseBrowserClient();

  const { data: gymRow, error: gymError } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", gymId)
    .maybeSingle();

  if (gymError) {
    throw gymError;
  }

  if (!gymRow) {
    throw new Error("Gym not found.");
  }

  const { data: planRows, error: plansError } = await supabase
    .from("gym_plans")
    .select("*")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: true });

  if (plansError) {
    throw plansError;
  }

  return {
    gym: mapGym(gymRow as GymRow),
    plans: ((planRows ?? []) as GymPlanRow[]).map(mapPlan),
  };
}

export async function updateGymProfile(gymId: string, input: GymProfileInput) {
  const supabase = createSupabaseBrowserClient();

  const updateData: Record<string, unknown> = {
    name: input.name.trim(),
    address: input.address.trim(),
    phone: input.phone.trim(),
    base_currency: "IRT",
  };

  if (input.public_signup_enabled !== undefined) {
    updateData.public_signup_enabled = input.public_signup_enabled;
  }

  const { data, error } = await supabase
    .from("gyms")
    .update(updateData)
    .eq("id", gymId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapGym(data as GymRow);
}

export async function updateGymSections(gymId: string, sections: string[]) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("gyms")
    .update({ enabled_sections: sections })
    .eq("id", gymId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapGym(data as GymRow);
}

export async function createGymPlan(gymId: string, input: GymPlanInput) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("gym_plans")
    .insert({
      gym_id: gymId,
      name: input.name.trim(),
      price: input.price,
      duration_days: input.duration_days,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapPlan(data as GymPlanRow);
}

export async function updateGymPlan(gymId: string, planId: string, input: GymPlanInput) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("gym_plans")
    .update({
      name: input.name.trim(),
      price: input.price,
      duration_days: input.duration_days,
    })
    .eq("id", planId)
    .eq("gym_id", gymId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapPlan(data as GymPlanRow);
}

export async function updateOwnerProfile(fullName: string, avatarUrl: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("update_owner_profile", {
    p_full_name: fullName.trim(),
    p_avatar_url: sanitizeAvatarForDb(avatarUrl),
  });
  if (error) {
    throw error;
  }
}

export async function deleteGymPlan(gymId: string, planId: string) {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.from("gym_plans").delete().eq("id", planId).eq("gym_id", gymId);

  if (error) {
    if (error.code === "23503") {
      throw new Error("This plan is used by memberships and cannot be deleted.");
    }
    throw error;
  }
}
