import type { AppDispatch } from "@/lib/store";
import {
  gymPlansActions,
  gymsActions,
  type AuthUser,
  type Gym,
  type GymPlan,
} from "@/lib/store/slices";
import { uniqueSlug } from "@/lib/utils/slug";
import { createSupabaseBrowserClient } from "./client";
import type { GymPlanRow, GymRow } from "./database.types";

export type OwnerBootstrapResult = {
  hasGym: boolean;
  gymSlug: string | null;
};

export type GymOnboardingInput = {
  name: string;
  address: string;
  phone: string;
  baseCurrency: string;
  plans: {
    name: string;
    price: number;
    durationDays: number;
  }[];
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

export async function ensureProfile(user: AuthUser) {
  const supabase = createSupabaseBrowserClient();

  const { error: rpcError } = await supabase.rpc("ensure_owner_profile", {
    p_full_name: user.full_name,
    p_email: user.email,
  });

  if (!rpcError) {
    return;
  }

  // Fallback if migration not applied yet (direct insert/update)
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw rpcError;
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: user.full_name, email: user.email })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }
    return;
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: user.full_name,
    email: user.email,
  });

  if (insertError) {
    throw insertError;
  }
}

export async function fetchOwnerGyms(ownerId: string) {
  const supabase = createSupabaseBrowserClient();

  const { data: gyms, error: gymsError } = await supabase
    .from("gyms")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (gymsError) {
    throw gymsError;
  }

  const gymRows = (gyms ?? []) as GymRow[];
  if (gymRows.length === 0) {
    return { gyms: [] as Gym[], plans: [] as GymPlan[] };
  }

  const gymIds = gymRows.map((gym) => gym.id);
  const { data: plans, error: plansError } = await supabase
    .from("gym_plans")
    .select("*")
    .in("gym_id", gymIds);

  if (plansError) {
    throw plansError;
  }

  return {
    gyms: gymRows.map(mapGym),
    plans: ((plans ?? []) as GymPlanRow[]).map(mapPlan),
  };
}

export function hydrateOwnerData(
  dispatch: AppDispatch,
  payload: { gyms: Gym[]; plans: GymPlan[] },
): OwnerBootstrapResult {
  payload.gyms.forEach((gym) => dispatch(gymsActions.upsertGym(gym)));
  payload.plans.forEach((plan) => dispatch(gymPlansActions.upsertGymPlan(plan)));

  const firstGym = payload.gyms[0];
  if (!firstGym) {
    return { hasGym: false, gymSlug: null };
  }

  dispatch(gymsActions.setCurrentGymId(firstGym.id));
  return { hasGym: true, gymSlug: firstGym.slug };
}

export async function bootstrapOwnerSession(
  dispatch: AppDispatch,
  user: AuthUser,
): Promise<OwnerBootstrapResult> {
  await ensureProfile(user);
  const data = await fetchOwnerGyms(user.id);
  return hydrateOwnerData(dispatch, data);
}

export async function createGymWithPlans(ownerId: string, input: GymOnboardingInput) {
  const supabase = createSupabaseBrowserClient();
  const slug = uniqueSlug(input.name, crypto.randomUUID());

  const plansPayload = input.plans.map((plan) => ({
    name: plan.name.trim(),
    price: plan.price,
    duration_days: plan.durationDays,
  }));

  const { data: rpcData, error: rpcError } = await supabase.rpc("create_owner_gym_with_plans", {
    p_name: input.name.trim(),
    p_slug: slug,
    p_address: input.address.trim(),
    p_phone: input.phone.trim(),
    p_base_currency: input.baseCurrency.trim() || "EUR",
    p_plans: plansPayload,
  });

  if (!rpcError && rpcData) {
    const payload = rpcData as { gym: GymRow; plans: GymPlanRow[] };
    return {
      gym: mapGym(payload.gym),
      plans: (payload.plans ?? []).map(mapPlan),
    };
  }

  // Fallback if SQL migration not applied yet
  if (ownerId !== (await supabase.auth.getUser()).data.user?.id) {
    throw rpcError ?? new Error("Failed to create gym");
  }

  const { data: gymRow, error: gymError } = await supabase
    .from("gyms")
    .insert({
      owner_id: ownerId,
      name: input.name.trim(),
      slug,
      address: input.address.trim(),
      phone: input.phone.trim(),
      base_currency: input.baseCurrency.trim() || "EUR",
    })
    .select("*")
    .single();

  if (gymError || !gymRow) {
    throw rpcError ?? gymError ?? new Error("Failed to create gym. Run supabase/fix-gyms-rls.sql");
  }

  const gym = mapGym(gymRow as GymRow);

  const { data: planRows, error: plansError } = await supabase
    .from("gym_plans")
    .insert(
      input.plans.map((plan) => ({
        gym_id: gym.id,
        name: plan.name.trim(),
        price: plan.price,
        duration_days: plan.durationDays,
      })),
    )
    .select("*");

  if (plansError) {
    throw plansError;
  }

  const plans = ((planRows ?? []) as GymPlanRow[]).map(mapPlan);

  await supabase.from("signup_links").insert({
    gym_id: gym.id,
    token: crypto.randomUUID().replace(/-/g, ""),
    active: true,
  });

  return { gym, plans };
}

export async function completeGymOnboarding(
  dispatch: AppDispatch,
  user: AuthUser,
  input: GymOnboardingInput,
) {
  await ensureProfile(user);
  const { gym, plans } = await createGymWithPlans(user.id, input);
  dispatch(gymsActions.upsertGym(gym));
  plans.forEach((plan) => dispatch(gymPlansActions.upsertGymPlan(plan)));
  dispatch(gymsActions.setCurrentGymId(gym.id));
  return gym.slug;
}
