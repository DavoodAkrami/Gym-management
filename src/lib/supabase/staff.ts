import {
  defaultCoachPermissions,
  type CoachFormValues,
  type CoachPermissions,
  type GymCoach,
  type GymTrainer,
  type TrainerFormValues,
} from "@/lib/staff/types";
import { sanitizeAvatarForDb, staffFullName } from "@/lib/staff/avatar";
import { createSupabaseBrowserClient } from "./client";
import { normalizePhone } from "@/lib/phone";

type CoachRow = {
  id: string;
  gym_id: string;
  user_id?: string | null;
  first_name?: string;
  last_name?: string;
  full_name: string;
  phone: string | null;
  email?: string | null;
  specialty: string | null;
  avatar_url?: string | null;
  gym_hours_start?: string | null;
  gym_hours_end?: string | null;
  permissions?: CoachPermissions;
  contract_start_date?: string;
  contract_end_date?: string;
  salary: number | null;
  active: boolean;
  status?: GymCoach["status"];
  created_at: string;
};

type TrainerRow = {
  id: string;
  gym_id: string;
  coach_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  avatar_url: string | null;
  contract_start_date: string;
  contract_end_date: string;
  salary: number | null;
  active: boolean;
  status: GymTrainer["status"];
  created_at: string;
  user_id?: string | null;
  gym_hours_start?: string | null;
  gym_hours_end?: string | null;
  coaches?: { first_name: string; last_name: string; full_name?: string } | null;
};

const COACH_SELECT_COLUMNS =
  "id, gym_id, user_id, first_name, last_name, full_name, phone, email, specialty, avatar_url, gym_hours_start, gym_hours_end, permissions, contract_start_date, contract_end_date, salary, active, status, created_at";

function normalizePermissions(raw: unknown): CoachPermissions {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...defaultCoachPermissions, ...(raw as CoachPermissions) };
  }
  return { ...defaultCoachPermissions };
}

function parseCoachRow(row: CoachRow, trainerCount = 0): GymCoach {
  const fullNameRaw = typeof row.full_name === "string" ? row.full_name.trim() : "";
  const first = row.first_name?.trim() || fullNameRaw.split(/\s+/)[0] || "";
  const last =
    row.last_name?.trim() ||
    fullNameRaw.split(/\s+/).slice(1).join(" ") ||
    "";
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  return {
    id: row.id,
    gym_id: row.gym_id,
    first_name: first,
    last_name: last,
    full_name: fullNameRaw || staffFullName(first, last),
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    specialty: row.specialty ?? undefined,
    avatar_url: row.avatar_url ?? undefined,
    gym_hours_start: row.gym_hours_start?.toString().slice(0, 5) ?? undefined,
    gym_hours_end: row.gym_hours_end?.toString().slice(0, 5) ?? undefined,
    user_id: row.user_id ?? undefined,
    permissions: normalizePermissions(row.permissions),
    contract_start_date: row.contract_start_date ?? today,
    contract_end_date: row.contract_end_date ?? nextYear.toISOString().slice(0, 10),
    salary: row.salary != null ? Number(row.salary) : undefined,
    active: row.active,
    status: row.status ?? "active",
    created_at: row.created_at,
    trainer_count: trainerCount,
  };
}

function mapTrainer(row: TrainerRow): GymTrainer {
  const coachName = row.coaches
    ? staffFullName(row.coaches.first_name, row.coaches.last_name)
    : undefined;

  return {
    id: row.id,
    gym_id: row.gym_id,
    coach_id: row.coach_id,
    coach_name: coachName,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: staffFullName(row.first_name, row.last_name),
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    specialty: row.specialty ?? undefined,
    avatar_url: row.avatar_url ?? undefined,
    user_id: row.user_id ?? undefined,
    gym_hours_start: row.gym_hours_start?.slice(0, 5) ?? undefined,
    gym_hours_end: row.gym_hours_end?.slice(0, 5) ?? undefined,
    contract_start_date: row.contract_start_date,
    contract_end_date: row.contract_end_date,
    salary: row.salary != null ? Number(row.salary) : undefined,
    active: row.active,
    status: row.status,
    created_at: row.created_at,
  };
}

function isMissingTableOrColumn(error: { message?: string; code?: string }) {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the column")
  );
}

function isMissingRpc(error: { message?: string; code?: string }) {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST202" ||
    msg.includes("could not find the function") ||
    msg.includes("function public.create_gym_coach") ||
    msg.includes("function public.create_gym_trainer")
  );
}

function buildCoachInsertPayload(gymId: string, values: CoachFormValues) {
  return {
    gym_id: gymId,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    full_name: staffFullName(values.first_name, values.last_name),
    phone: normalizePhone(values.phone) || null,
    email: values.email.trim() || null,
    specialty: values.specialty.trim() || null,
    avatar_url: sanitizeAvatarForDb(values.avatar_url),
    gym_hours_start: values.gym_hours_start || null,
    gym_hours_end: values.gym_hours_end || null,
    permissions: values.permissions,
    contract_start_date: values.contract_start_date,
    contract_end_date: values.contract_end_date,
    salary: values.salary ? Number(values.salary) : null,
    active: values.active,
    status: values.status,
  };
}

function buildTrainerInsertPayload(gymId: string, values: TrainerFormValues) {
  return {
    gym_id: gymId,
    coach_id: values.coach_id,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    phone: normalizePhone(values.phone) || null,
    email: values.email.trim() || null,
    specialty: values.specialty.trim() || null,
    avatar_url: sanitizeAvatarForDb(values.avatar_url),
    gym_hours_start: values.gym_hours_start || null,
    gym_hours_end: values.gym_hours_end || null,
    contract_start_date: values.contract_start_date,
    contract_end_date: values.contract_end_date,
    salary: values.salary ? Number(values.salary) : null,
    active: values.active,
    status: values.status,
  };
}

function safeParseCoachRows(rows: CoachRow[], trainerCounts: Map<string, number>) {
  const parsed: GymCoach[] = [];
  for (const row of rows) {
    try {
      parsed.push(parseCoachRow(row, trainerCounts.get(row.id) ?? 0));
    } catch {
      /* skip malformed row */
    }
  }
  return parsed;
}

async function loadTrainerCounts(gymId: string) {
  const supabase = createSupabaseBrowserClient();
  const trainerCounts = new Map<string, number>();

  const { data: trainers, error } = await supabase
    .from("trainers")
    .select("coach_id")
    .eq("gym_id", gymId);

  if (error) {
    return trainerCounts;
  }

  (trainers ?? []).forEach((row: { coach_id: string }) => {
    trainerCounts.set(row.coach_id, (trainerCounts.get(row.coach_id) ?? 0) + 1);
  });

  return trainerCounts;
}

export async function fetchGymCoaches(gymId: string) {
  const supabase = createSupabaseBrowserClient();
  const trainerCounts = await loadTrainerCounts(gymId);

  const { data: coaches, error } = await supabase
    .from("coaches")
    .select(COACH_SELECT_COLUMNS)
    .eq("gym_id", gymId)
    .order("created_at", { ascending: true });

  if (!error) {
    return safeParseCoachRows((coaches ?? []) as CoachRow[], trainerCounts);
  }

  if (!isMissingTableOrColumn(error)) {
    throw error;
  }

  const { data: legacy, error: legacyError } = await supabase
    .from("coaches")
    .select("id, gym_id, full_name, phone, specialty, salary, active, created_at")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: true });

  if (legacyError) {
    throw legacyError;
  }

  return safeParseCoachRows((legacy ?? []) as CoachRow[], trainerCounts);
}

export async function fetchGymTrainers(gymId: string, coachId?: string) {
  const supabase = createSupabaseBrowserClient();

  let query = supabase
    .from("trainers")
    .select("*")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });

  if (coachId) {
    query = query.eq("coach_id", coachId);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingTableOrColumn(error)) {
      return [];
    }
    throw error;
  }

  const rows = (data ?? []) as TrainerRow[];
  if (rows.length === 0) {
    return [];
  }

  const coachIds = [...new Set(rows.map((row) => row.coach_id))];
  const coachNames = new Map<string, { first_name: string; last_name: string }>();

  const { data: coaches, error: coachesError } = await supabase
    .from("coaches")
    .select("id, first_name, last_name, full_name")
    .in("id", coachIds);

  if (!coachesError && coaches) {
    coaches.forEach((coach) => {
      const first =
        coach.first_name?.trim() ||
        coach.full_name?.split(" ")[0] ||
        "";
      const last =
        coach.last_name?.trim() ||
        coach.full_name?.split(" ").slice(1).join(" ") ||
        "";
      coachNames.set(coach.id, { first_name: first, last_name: last });
    });
  }

  return rows.map((row) => {
    const coach = coachNames.get(row.coach_id);
    return mapTrainer(
      coach
        ? { ...row, coaches: coach }
        : row,
    );
  });
}

export async function createGymCoach(gymId: string, values: CoachFormValues) {
  const supabase = createSupabaseBrowserClient();
  const fullName = staffFullName(values.first_name, values.last_name);

  const payload = buildCoachInsertPayload(gymId, values);
  const { data: inserted, error: insertError } = await supabase
    .from("coaches")
    .insert(payload)
    .select(COACH_SELECT_COLUMNS)
    .single();

  if (!insertError) {
    const list = await fetchGymCoaches(gymId);
    if (inserted && !list.some((coach) => coach.id === inserted.id)) {
      return [...list, parseCoachRow(inserted as CoachRow)];
    }
    return list;
  }

  if (isMissingTableOrColumn(insertError)) {
    const { error: legacyError } = await supabase.from("coaches").insert({
      gym_id: gymId,
      full_name: fullName,
      phone: normalizePhone(values.phone) || null,
      specialty: values.specialty.trim() || null,
      salary: values.salary ? Number(values.salary) : null,
      active: values.active,
    });

    if (legacyError) {
      throw new Error(legacyError.message);
    }

    return fetchGymCoaches(gymId);
  }

  const { error: rpcError } = await supabase.rpc("create_gym_coach", {
    p_gym_id: gymId,
    p_first_name: values.first_name.trim(),
    p_last_name: values.last_name.trim(),
    p_phone: normalizePhone(values.phone) || null,
    p_email: values.email.trim() || null,
    p_specialty: values.specialty.trim() || null,
    p_avatar_url: sanitizeAvatarForDb(values.avatar_url),
    p_permissions: values.permissions,
    p_contract_start_date: values.contract_start_date,
    p_contract_end_date: values.contract_end_date,
    p_salary: values.salary ? Number(values.salary) : null,
    p_active: values.active,
    p_status: values.status,
  });

  if (!rpcError) {
    return fetchGymCoaches(gymId);
  }

  if (isMissingRpc(rpcError)) {
    throw new Error(
      `${insertError.message} — Run supabase/coaches-trainers-structure.sql in the Supabase SQL Editor.`,
    );
  }

  throw new Error(
    rpcError.message +
      " — Run supabase/coaches-trainers-structure.sql and supabase/fix-coaches-staff-rpc.sql in Supabase.",
  );
}

export async function updateGymCoach(gymId: string, coachId: string, values: CoachFormValues) {
  const supabase = createSupabaseBrowserClient();
  const avatar = sanitizeAvatarForDb(values.avatar_url);

  const payload: Record<string, unknown> = {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    full_name: staffFullName(values.first_name, values.last_name),
    phone: normalizePhone(values.phone) || null,
    email: values.email.trim() || null,
    specialty: values.specialty.trim() || null,
    avatar_url: avatar,
    gym_hours_start: values.gym_hours_start || null,
    gym_hours_end: values.gym_hours_end || null,
    permissions: values.permissions,
    contract_start_date: values.contract_start_date,
    contract_end_date: values.contract_end_date,
    salary: values.salary ? Number(values.salary) : null,
    active: values.active,
    status: values.status,
  };

  const { error } = await supabase
    .from("coaches")
    .update(payload)
    .eq("id", coachId)
    .eq("gym_id", gymId);

  if (error) {
    if (isMissingTableOrColumn(error)) {
      const { error: legacyError } = await supabase
        .from("coaches")
        .update({
          full_name: staffFullName(values.first_name, values.last_name),
          phone: normalizePhone(values.phone) || null,
          specialty: values.specialty.trim() || null,
          salary: values.salary ? Number(values.salary) : null,
          active: values.active,
        })
        .eq("id", coachId)
        .eq("gym_id", gymId);

      if (legacyError) {
        throw legacyError;
      }
    } else {
      throw error;
    }
  }

  return fetchGymCoaches(gymId);
}

export async function deleteGymCoach(gymId: string, coachId: string) {
  const supabase = createSupabaseBrowserClient();

  try {
    const { count, error: countError } = await supabase
      .from("trainers")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coachId);

    if (countError && !isMissingTableOrColumn(countError)) {
      throw countError;
    }

    if ((count ?? 0) > 0) {
      throw new Error("Remove or reassign trainers before deleting this coach.");
    }
  } catch (caught) {
    if (caught instanceof Error && caught.message.includes("reassign")) {
      throw caught;
    }
  }

  const { error } = await supabase.from("coaches").delete().eq("id", coachId).eq("gym_id", gymId);

  if (error) {
    throw error;
  }

  return fetchGymCoaches(gymId);
}

export async function createGymTrainer(gymId: string, values: TrainerFormValues) {
  const supabase = createSupabaseBrowserClient();

  const { error: insertError } = await supabase
    .from("trainers")
    .insert(buildTrainerInsertPayload(gymId, values));

  if (!insertError) {
    return fetchGymTrainers(gymId);
  }

  if (isMissingTableOrColumn(insertError)) {
    throw new Error(
      `${insertError.message} — Run supabase/coaches-trainers-structure.sql in the Supabase SQL Editor.`,
    );
  }

  const { error: rpcError } = await supabase.rpc("create_gym_trainer", {
    p_gym_id: gymId,
    p_coach_id: values.coach_id,
    p_first_name: values.first_name.trim(),
    p_last_name: values.last_name.trim(),
    p_phone: normalizePhone(values.phone) || null,
    p_email: values.email.trim() || null,
    p_specialty: values.specialty.trim() || null,
    p_avatar_url: sanitizeAvatarForDb(values.avatar_url),
    p_contract_start_date: values.contract_start_date,
    p_contract_end_date: values.contract_end_date,
    p_salary: values.salary ? Number(values.salary) : null,
    p_active: values.active,
    p_status: values.status,
  });

  if (!rpcError) {
    return fetchGymTrainers(gymId);
  }

  if (isMissingRpc(rpcError)) {
    throw new Error(insertError.message);
  }

  throw new Error(
    rpcError.message +
      " — Run supabase/coaches-trainers-structure.sql and supabase/fix-coaches-staff-rpc.sql in Supabase.",
  );
}

export async function updateGymTrainer(
  gymId: string,
  trainerId: string,
  values: TrainerFormValues,
) {
  const supabase = createSupabaseBrowserClient();
  const avatar = sanitizeAvatarForDb(values.avatar_url);

  const { error } = await supabase
    .from("trainers")
    .update({
      coach_id: values.coach_id,
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: normalizePhone(values.phone) || null,
      email: values.email.trim() || null,
      specialty: values.specialty.trim() || null,
      avatar_url: avatar,
      gym_hours_start: values.gym_hours_start || null,
      gym_hours_end: values.gym_hours_end || null,
      contract_start_date: values.contract_start_date,
      contract_end_date: values.contract_end_date,
      salary: values.salary ? Number(values.salary) : null,
      active: values.active,
      status: values.status,
    })
    .eq("id", trainerId)
    .eq("gym_id", gymId);

  if (error) {
    throw error;
  }

  return fetchGymTrainers(gymId);
}

export async function deleteGymTrainer(gymId: string, trainerId: string) {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.from("trainers").delete().eq("id", trainerId).eq("gym_id", gymId);

  if (error) {
    throw error;
  }

  return fetchGymTrainers(gymId);
}
