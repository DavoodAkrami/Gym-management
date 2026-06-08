import { sanitizeAvatarForDb } from "@/lib/staff/avatar";
import { createSupabaseBrowserClient } from "./client";
import { normalizePhone } from "@/lib/phone";

export type MemberPortalData = {
  member: {
    id: string;
    gym_id: string;
    first_name: string;
    last_name: string;
    phone: string;
    status: string;
    join_date: string;
    avatar_url?: string | null;
  };
  gym: {
    id: string;
    name: string;
    address: string;
    phone: string;
    base_currency: string;
  };
  coach: {
    id: string;
    full_name: string;
    specialty: string | null;
    avatar_url: string | null;
  } | null;
  /** Present when DB runs fix-member-coaches-list.sql (or updated get_member_portal). */
  available_coaches?: GymCoachOption[];
  membership: {
    id: string;
    plan_id: string;
    plan_name: string;
    start_date: string;
    end_date: string;
    price: number;
    status: string;
    days_left: number;
  } | null;
};

export type GymCoachOption = {
  id: string;
  full_name: string;
  specialty: string | null;
  avatar_url: string | null;
  is_mine: boolean;
};

export type CoachProgramOffer = {
  id: string;
  coach_id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
};

export type MemberProfileInput = {
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string;
};

export type MemberBootstrapResult = {
  hasMembership: boolean;
  portal: MemberPortalData | null;
};

export async function fetchMemberPortal(): Promise<MemberPortalData | null> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_member_portal");

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const payload = data as MemberPortalData;

  if ("available_coaches" in raw) {
    payload.available_coaches = normalizeCoachList(raw.available_coaches);
  }

  if (payload.coach && typeof payload.coach === "object") {
    const coachRaw = payload.coach as Record<string, unknown>;
    const first = String(coachRaw.first_name ?? "").trim();
    const last = String(coachRaw.last_name ?? "").trim();
    payload.coach = {
      id: String(coachRaw.id ?? ""),
      full_name:
        String(coachRaw.full_name ?? "").trim() || `${first} ${last}`.trim() || "Coach",
      specialty: (coachRaw.specialty as string | null) ?? null,
      avatar_url: (coachRaw.avatar_url as string | null) ?? null,
    };
  }

  if (payload.membership) {
    payload.membership = {
      ...payload.membership,
      price: Number(payload.membership.price),
      days_left: Number(payload.membership.days_left),
    };
  }

  return payload;
}

export async function bootstrapMemberSession(): Promise<MemberBootstrapResult> {
  const portal = await fetchMemberPortal();
  return {
    hasMembership: Boolean(portal?.member),
    portal,
  };
}

export async function updateMemberSelfProfile(input: MemberProfileInput) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("update_member_self", {
    p_first_name: input.first_name.trim(),
    p_last_name: input.last_name.trim(),
    p_phone: normalizePhone(input.phone),
    p_avatar_url: sanitizeAvatarForDb(input.avatar_url),
  });
  if (error) {
    throw error;
  }
}

function normalizeCoachList(raw: unknown): GymCoachOption[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }

  const list = Array.isArray(parsed) ? parsed : [];
  return list
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      const item = row as Record<string, unknown>;
      const id = String(item.id ?? "");
      if (!id) {
        return null;
      }
      const fullName = String(item.full_name ?? "").trim() || "Coach";
      return {
        id,
        full_name: fullName,
        specialty: (item.specialty as string | null) ?? null,
        avatar_url: (item.avatar_url as string | null) ?? null,
        is_mine: Boolean(item.is_mine),
      };
    })
    .filter((row): row is GymCoachOption => row !== null);
}

async function fetchGymCoachesDirect(gymId: string, memberId: string): Promise<GymCoachOption[]> {
  const supabase = createSupabaseBrowserClient();

  let rows: Record<string, unknown>[] | null = null;

  const fullSelect = await supabase
    .from("coaches")
    .select("id, first_name, last_name, full_name, specialty, avatar_url, active, status")
    .eq("gym_id", gymId);

  if (!fullSelect.error) {
    rows = (fullSelect.data ?? []) as Record<string, unknown>[];
  } else {
    const legacySelect = await supabase
      .from("coaches")
      .select("id, full_name, specialty, avatar_url, active")
      .eq("gym_id", gymId);
    if (legacySelect.error) {
      throw legacySelect.error;
    }
    rows = (legacySelect.data ?? []) as Record<string, unknown>[];
  }

  const { data: links } = await supabase
    .from("member_coaches")
    .select("coach_id")
    .eq("member_id", memberId);

  const linkedCoachIds = new Set((links ?? []).map((row) => row.coach_id as string));

  return (rows ?? [])
    .filter((row) => {
      const active = row.active as boolean | null | undefined;
      if (active === false) {
        return false;
      }
      const status = row.status as string | null | undefined;
      if (status === "inactive" || status === "on_leave") {
        return false;
      }
      return true;
    })
    .map((row) => {
      const first = String(row.first_name ?? "").trim();
      const last = String(row.last_name ?? "").trim();
      const fullName =
        String(row.full_name ?? "").trim() || `${first} ${last}`.trim() || "Coach";
      return {
        id: String(row.id),
        full_name: fullName,
        specialty: (row.specialty as string | null) ?? null,
        avatar_url: (row.avatar_url as string | null) ?? null,
        is_mine: linkedCoachIds.has(String(row.id)),
      };
    });
}

export async function fetchGymCoachesForMember(
  portal?: MemberPortalData | null,
): Promise<GymCoachOption[]> {
  const resolved = portal ?? (await fetchMemberPortal());
  if (!resolved) {
    return [];
  }

  if (resolved.available_coaches !== undefined) {
    return resolved.available_coaches;
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_gym_coaches_for_member");

  let fromRpc: GymCoachOption[] = [];
  if (!error) {
    fromRpc = normalizeCoachList(data);
  } else if (error.code !== "PGRST202") {
    throw error;
  }

  const fromDirect = await fetchGymCoachesDirect(
    resolved.member.gym_id,
    resolved.member.id,
  );

  const merged = new Map<string, GymCoachOption>();
  for (const coach of [...fromRpc, ...fromDirect]) {
    merged.set(coach.id, coach);
  }
  return [...merged.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function memberChooseCoach(coachId: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("member_choose_coach", { p_coach_id: coachId });
  if (error) {
    throw error;
  }
}

export async function fetchCoachProgramsForMember(coachId: string): Promise<CoachProgramOffer[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_coach_programs", { p_coach_id: coachId });
  if (error) {
    throw error;
  }
  return ((data ?? []) as CoachProgramOffer[]).map((p) => ({
    ...p,
    price: Number(p.price),
    duration_days: Number(p.duration_days),
  }));
}

export async function memberJoinCoachProgram(programId: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("member_join_coach_program", {
    p_program_id: programId,
  });
  if (error) {
    throw error;
  }
}

export async function leaveGym(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("leave_gym");
  if (error) throw error;
}

export async function memberChooseCoachWithProgram(coachId: string, programId: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("member_choose_coach_with_program", {
    p_coach_id: coachId,
    p_program_id: programId,
  });

  if (error) {
    if (error.code === "PGRST202") {
      await memberChooseCoach(coachId);
      await memberJoinCoachProgram(programId);
      return;
    }
    throw error;
  }
}
