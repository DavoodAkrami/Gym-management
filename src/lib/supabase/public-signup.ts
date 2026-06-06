import { createSupabaseBrowserClient } from "./client";

export type SignupContextGym = {
  id: string;
  name: string;
  address: string;
  phone: string;
  base_currency: string;
};

export type SignupContextPlan = {
  id: string;
  name: string;
  price: number;
  duration_days: number;
};

export type SignupContext = {
  gym: SignupContextGym;
  plans: SignupContextPlan[];
};

export type MemberRegistrationInput = {
  token: string;
  first_name: string;
  last_name: string;
  phone: string;
  plan_id: string;
  zip_code?: string;
  national_id?: string;
  preferred_language: "en" | "fa";
};

export async function fetchSignupContext(token: string): Promise<SignupContext> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_signup_context", {
    p_token: token,
  });

  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object") {
    throw new Error("Invalid signup link");
  }

  const payload = data as {
    gym: SignupContextGym;
    plans: SignupContextPlan[];
  };

  return {
    gym: payload.gym,
    plans: (payload.plans ?? []).map((plan) => ({
      ...plan,
      price: Number(plan.price),
    })),
  };
}

export type PublicGymInfo = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  logo_url: string | null;
};

export type GymSearchResult = {
  data: PublicGymInfo[];
  total: number;
};

export async function searchPublicGyms(
  query: string,
  offset: number = 0,
  limit: number = 10,
): Promise<GymSearchResult> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("search_public_gyms", {
    p_query: query,
    p_offset: offset,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  const payload = data as { data: PublicGymInfo[]; total: number };

  return {
    data: payload.data ?? [],
    total: payload.total ?? 0,
  };
}

export type PublicGymDetail = {
  gym: PublicGymInfo & { base_currency: string; public_signup_enabled: boolean };
  plans: SignupContextPlan[];
  signup_token: string | null;
};

export async function fetchPublicGym(slug: string): Promise<PublicGymDetail | null> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_public_gym", {
    p_slug: slug,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const payload = data as { gym: PublicGymDetail["gym"]; plans: SignupContextPlan[]; signup_token: string | null };

  return {
    gym: payload.gym,
    plans: (payload.plans ?? []).map((plan) => ({
      ...plan,
      price: Number(plan.price),
    })),
    signup_token: payload.signup_token ?? null,
  };
}

export async function registerMemberViaSignupLink(input: MemberRegistrationInput) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("register_member_via_signup_link", {
    p_token: input.token,
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_phone: input.phone,
    p_plan_id: input.plan_id,
    p_zip_code: input.zip_code ?? null,
    p_national_id: input.national_id ?? null,
    p_preferred_language: input.preferred_language,
  });

  if (error) {
    throw error;
  }

  return data;
}
