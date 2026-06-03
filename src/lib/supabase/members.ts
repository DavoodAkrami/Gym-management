import type { MemberFormValues, MemberWithMeta } from "@/lib/members/types";
import type { Member, Membership } from "@/lib/store/slices";
import { createSupabaseBrowserClient } from "./client";
import type { MemberLapseRow, MemberRow, MembershipRow } from "./database.types";

function mapMember(row: MemberRow): MemberWithMeta {
  return {
    id: row.id,
    gym_id: row.gym_id,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    zip_code: row.zip_code ?? undefined,
    national_id: row.national_id ?? undefined,
    preferred_language: row.preferred_language,
    status: row.status,
    join_date: row.join_date,
    created_at: row.created_at,
    notes: row.notes ?? undefined,
  };
}

function mapMembership(row: MembershipRow, planName?: string): Membership & { plan_name?: string } {
  return {
    id: row.id,
    gym_id: row.gym_id,
    member_id: row.member_id,
    plan_id: row.plan_id,
    start_date: row.start_date,
    end_date: row.end_date,
    price: Number(row.price),
    status: row.status,
    plan_name: planName,
  };
}

function attachMemberships(
  members: MemberWithMeta[],
  memberships: (MembershipRow & { gym_plans?: { name: string } | null })[],
) {
  const today = new Date().toISOString().slice(0, 10);

  return members.map((member) => {
    const memberMemberships = memberships
      .filter((item) => item.member_id === member.id)
      .sort((a, b) => b.end_date.localeCompare(a.end_date));

    const current = memberMemberships.find(
      (item) => item.status === "active" && item.end_date >= today,
    );
    const latest = memberMemberships[0];

    return {
      ...member,
      currentMembership: current
        ? mapMembership(current, current.gym_plans?.name)
        : undefined,
      latestMembership: latest ? mapMembership(latest, latest.gym_plans?.name) : undefined,
    };
  });
}

export async function fetchGymMembers(gymId: string) {
  const supabase = createSupabaseBrowserClient();

  const { data: memberRows, error: membersError } = await supabase
    .from("members")
    .select("*")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });

  if (membersError) {
    throw membersError;
  }

  const { data: membershipRows, error: membershipsError } = await supabase
    .from("memberships")
    .select("*, gym_plans(name)")
    .eq("gym_id", gymId)
    .order("end_date", { ascending: false });

  if (membershipsError) {
    throw membershipsError;
  }

  const members = (memberRows as MemberRow[]).map(mapMember);
  return attachMemberships(members, membershipRows as (MembershipRow & { gym_plans?: { name: string } | null })[]);
}

export async function fetchLapsedMembers(gymId: string) {
  const supabase = createSupabaseBrowserClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: lapseRows, error: lapseError } = await supabase
    .from("member_lapse_log")
    .select("*")
    .eq("gym_id", gymId)
    .gte("visible_until", today);

  if (lapseError) {
    // Table may not exist yet — fall back to membership dates in the app layer
    const all = await fetchGymMembers(gymId);
    return all.filter((member) => {
      if (member.currentMembership?.status === "active") {
        return false;
      }
      const end = member.latestMembership?.end_date;
      if (!end) {
        return false;
      }
      const endDate = new Date(end);
      const visibleUntil = new Date(endDate);
      visibleUntil.setDate(visibleUntil.getDate() + 30);
      return visibleUntil >= new Date(today) && end < today;
    });
  }

  const lapseList = lapseRows as MemberLapseRow[];
  if (lapseList.length === 0) {
    return [];
  }

  const memberIds = [...new Set(lapseList.map((row) => row.member_id))];
  const { data: memberRows, error: membersError } = await supabase
    .from("members")
    .select("*")
    .in("id", memberIds);

  if (membersError) {
    throw membersError;
  }

  const { data: membershipRows, error: membershipsError } = await supabase
    .from("memberships")
    .select("*, gym_plans(name)")
    .eq("gym_id", gymId)
    .in(
      "id",
      lapseList.map((row) => row.membership_id),
    );

  if (membershipsError) {
    throw membershipsError;
  }

  const visibleUntilByMember = new Map(
    lapseList.map((row) => [row.member_id, row.visible_until]),
  );

  const members = attachMemberships(
    (memberRows as MemberRow[]).map(mapMember),
    membershipRows as (MembershipRow & { gym_plans?: { name: string } | null })[],
  );

  return members
    .filter((member) => visibleUntilByMember.has(member.id))
    .map((member) => ({
      ...member,
      lapse_visible_until: visibleUntilByMember.get(member.id),
    }));
}

export async function createGymMember(gymId: string, values: MemberFormValues) {
  if (!values.plan_id) {
    throw new Error("A membership plan is required when adding a member.");
  }

  const supabase = createSupabaseBrowserClient();

  const { error: rpcError } = await supabase.rpc("create_gym_member_with_membership", {
    p_gym_id: gymId,
    p_first_name: values.first_name.trim(),
    p_last_name: values.last_name.trim(),
    p_phone: values.phone.trim(),
    p_zip_code: values.zip_code.trim() || null,
    p_national_id: values.national_id.trim() || null,
    p_preferred_language: values.preferred_language,
    p_status: values.status,
    p_join_date: values.join_date,
    p_plan_id: values.plan_id,
  });

  if (!rpcError) {
    return fetchGymMembers(gymId);
  }

  // Fallback if SQL migration not applied yet
  const { data: memberRow, error: memberError } = await supabase
    .from("members")
    .insert({
      gym_id: gymId,
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: values.phone.trim(),
      zip_code: values.zip_code.trim() || null,
      national_id: values.national_id.trim() || null,
      preferred_language: values.preferred_language,
      status: values.status,
      join_date: values.join_date,
    })
    .select("*")
    .single();

  if (memberError || !memberRow) {
    throw rpcError ?? memberError ?? new Error("Failed to create member. Run supabase/fix-members-rls.sql");
  }

  const { data: plan, error: planError } = await supabase
    .from("gym_plans")
    .select("id, price, duration_days")
    .eq("id", values.plan_id)
    .eq("gym_id", gymId)
    .single();

  if (planError || !plan) {
    throw planError ?? new Error("Plan not found");
  }

  const start = new Date(`${values.join_date}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + Number(plan.duration_days));

  const { error: membershipError } = await supabase.from("memberships").insert({
    gym_id: gymId,
    member_id: memberRow.id,
    plan_id: plan.id,
    start_date: values.join_date,
    end_date: end.toISOString().slice(0, 10),
    price: plan.price,
    status: "active",
  });

  if (membershipError) {
    throw membershipError;
  }

  return fetchGymMembers(gymId);
}

export async function updateGymMember(gymId: string, memberId: string, values: MemberFormValues) {
  const supabase = createSupabaseBrowserClient();

  const { error: memberError } = await supabase
    .from("members")
    .update({
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: values.phone.trim(),
      zip_code: values.zip_code.trim() || null,
      national_id: values.national_id.trim() || null,
      preferred_language: values.preferred_language,
      status: values.status,
      join_date: values.join_date,
    })
    .eq("id", memberId)
    .eq("gym_id", gymId);

  if (memberError) {
    throw memberError;
  }

  return fetchGymMembers(gymId);
}

export async function deleteGymMember(gymId: string, memberId: string) {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.from("members").delete().eq("id", memberId).eq("gym_id", gymId);

  if (error) {
    throw error;
  }

  return fetchGymMembers(gymId);
}
