import type { MemberFilter, MemberFormValues, MemberWithMeta } from "@/lib/members/types";
import type { MemberSort } from "@/lib/members/sort";
import { sortMembers } from "@/lib/members/sort";
import type { Member, Membership } from "@/lib/store/slices";
import { createSupabaseBrowserClient } from "./client";
import type { MemberLapseRow, MemberRow, MembershipRow } from "./database.types";
import { normalizePhone } from "@/lib/phone";

function extractError(caught: unknown): string {
  if (caught instanceof Error) return caught.message;
  if (caught && typeof caught === "object") {
    const obj = caught as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.code === "string") return `${obj.code}: ${obj.message ?? obj.details ?? ""}`;
  }
  return String(caught);
}

function mapMember(row: MemberRow): MemberWithMeta {
  return {
    id: row.id,
    gym_id: row.gym_id,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    email: row.email ?? undefined,
    zip_code: row.zip_code ?? undefined,
    national_id: row.national_id ?? undefined,
    status: row.status,
    join_date: row.join_date,
    created_at: row.created_at,
    notes: row.notes ?? undefined,
    avatar_url: row.avatar_url ?? undefined,
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

export async function fetchMembersPage(
  gymId: string,
  limit: number,
  offset: number,
  options?: {
    search?: string;
    filter?: MemberFilter;
    sort?: MemberSort;
  },
): Promise<{ members: MemberWithMeta[]; total: number }> {
  const supabase = createSupabaseBrowserClient();
  const today = new Date().toISOString().slice(0, 10);
  const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const membershipSorts: MemberSort[] = ["end_asc", "end_desc", "days_left_asc", "days_left_desc"];
  const needsMembershipOp =
    options?.filter === "expiring" ||
    (options?.sort && membershipSorts.includes(options.sort));

  // ── Simple path: no membership dependency, direct DB pagination ──
  if (!needsMembershipOp) {
    let query = supabase
      .from("members")
      .select("*", { count: "exact" })
      .eq("gym_id", gymId);

    if (options?.search) {
      query = query.or(
        `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,phone.ilike.%${options.search}%,national_id.ilike.%${options.search}%`,
      );
    }

    if (options?.filter === "new") {
      query = query.gte("join_date", threeDaysAgo);
    }

    if (options?.sort) {
      switch (options.sort) {
        case "name_asc":
          query = query.order("first_name", { ascending: true }).order("last_name", { ascending: true });
          break;
        case "name_desc":
          query = query.order("first_name", { ascending: false }).order("last_name", { ascending: false });
          break;
        case "join_asc":
          query = query.order("join_date", { ascending: true });
          break;
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data: memberRows, count, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;
    if (!memberRows || memberRows.length === 0) {
      return { members: [], total: count ?? 0 };
    }

    const memberIds = memberRows.map((row) => row.id);

    const { data: membershipRows } = await supabase
      .from("memberships")
      .select("*, gym_plans(name)")
      .eq("gym_id", gymId)
      .in("member_id", memberIds)
      .order("end_date", { ascending: false });

    const members = (memberRows as MemberRow[]).map(mapMember);
    return {
      members: attachMemberships(members, membershipRows as (MembershipRow & { gym_plans?: { name: string } | null })[]),
      total: count ?? 0,
    };
  }

  // ── Complex path: membership-dependent filter/sort ──
  // Step 1: get base member IDs (search + "new" filter)
  let baseIdQuery = supabase
    .from("members")
    .select("id")
    .eq("gym_id", gymId);

  if (options?.search) {
    baseIdQuery = baseIdQuery.or(
      `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,phone.ilike.%${options.search}%,national_id.ilike.%${options.search}%`,
    );
  }

  if (options?.filter === "new") {
    baseIdQuery = baseIdQuery.gte("join_date", threeDaysAgo);
  }

  const { data: baseMemberRows } = await baseIdQuery;
  const baseIds = new Set((baseMemberRows ?? []).map((r) => r.id));

  // Step 2: get membership data for ordering / "expiring" filter
  let membershipQuery = supabase
    .from("memberships")
    .select("member_id, end_date")
    .eq("gym_id", gymId);

  if (options?.filter === "expiring") {
    membershipQuery = membershipQuery
      .eq("status", "active")
      .gte("end_date", today)
      .lte("end_date", threeDaysLater);
  }

  const { data: membershipRows } = await membershipQuery.order("end_date", { ascending: false });

  // Step 3: deduplicate (keep latest membership per member), intersect with baseIds
  const seen = new Set<string>();
  const ordered: { member_id: string; end_date: string }[] = [];

  for (const m of membershipRows ?? []) {
    if (!seen.has(m.member_id) && baseIds.has(m.member_id)) {
      seen.add(m.member_id);
      ordered.push(m);
    }
  }

  // Step 4: sort by end_date / days_left (membership sorts only)
  const membershipSortsList: MemberSort[] = ["end_asc", "end_desc", "days_left_asc", "days_left_desc"];
  if (options?.sort && membershipSortsList.includes(options.sort)) {
    const asc = options.sort === "end_asc" || options.sort === "days_left_asc";
    ordered.sort((a, b) =>
      asc ? a.end_date.localeCompare(b.end_date) : b.end_date.localeCompare(a.end_date),
    );
  }

  // Step 5: paginate
  const total = ordered.length;
  const pageItems = ordered.slice(offset, offset + limit);
  if (pageItems.length === 0) {
    return { members: [], total };
  }

  const pageIds = pageItems.map((m) => m.member_id);

  // Step 6: fetch member rows for this page
  const { data: memberRows, error: memberError } = await supabase
    .from("members")
    .select("*")
    .eq("gym_id", gymId)
    .in("id", pageIds);

  if (memberError) throw memberError;

  // Reorder to match pageIds
  const memberMap = new Map((memberRows ?? []).map((r) => [r.id, r]));
  const orderedMembers = pageIds.map((id) => memberMap.get(id)).filter(Boolean) as MemberRow[];

  // Step 7: attach memberships
  const { data: membershipRowsFull } = await supabase
    .from("memberships")
    .select("*, gym_plans(name)")
    .eq("gym_id", gymId)
    .in("member_id", pageIds)
    .order("end_date", { ascending: false });

  let result: MemberWithMeta[] = attachMemberships(
    orderedMembers.map(mapMember),
    membershipRowsFull as (MembershipRow & { gym_plans?: { name: string } | null })[],
  );

  // Apply non-membership sort in memory (name / join_date)
  if (options?.sort && !membershipSortsList.includes(options.sort)) {
    result = sortMembers(result, options.sort);
  }

  return { members: result, total };
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

type RpcMemberResult = {
  member: { id: string };
  membership: { id: string } | null;
};

export async function createGymMember(gymId: string, values: MemberFormValues) {
  if (!values.plan_id) {
    throw new Error("A membership plan is required when adding a member.");
  }

  const supabase = createSupabaseBrowserClient();

  const { data: rpcResult, error: rpcError } = await supabase
    .rpc("create_gym_member_with_membership", {
      p_gym_id: gymId,
      p_first_name: values.first_name.trim(),
      p_last_name: values.last_name.trim(),
      p_phone: normalizePhone(values.phone),
      p_national_id: values.national_id.trim() || null,
      p_status: values.status,
      p_join_date: values.join_date,
      p_plan_id: values.plan_id,
    });

  if (!rpcError) {
    const rpcData = rpcResult as unknown as RpcMemberResult | null;
    const memberId = rpcData?.member?.id;
    const normalizedPhone = normalizePhone(values.phone);
    if (memberId && normalizedPhone && values.national_id) {
      try {
        const { createMemberAuthUser } = await import("@/app/actions/create-member-auth");
        const authResult = await createMemberAuthUser(normalizedPhone, values.national_id, memberId, gymId);
        if (!authResult.success) {
          console.warn("Auth user not created for new member:", authResult.error);
        }
      } catch (err) {
        console.warn("Auth user creation threw:", err);
      }
    }
    return fetchGymMembers(gymId);
  }

  // Fallback if SQL migration not applied yet
  const { data: memberRow, error: memberError } = await supabase
    .from("members")
    .insert({
      gym_id: gymId,
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: normalizePhone(values.phone),
      national_id: values.national_id.trim() || null,
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

  const { data: membershipRow, error: membershipError } = await supabase
    .from("memberships")
    .insert({
      gym_id: gymId,
      member_id: memberRow.id,
      plan_id: plan.id,
      start_date: values.join_date,
      end_date: end.toISOString().slice(0, 10),
      price: plan.price,
      status: "active",
    })
    .select("id")
    .single();

  if (membershipError || !membershipRow) {
    throw membershipError ?? new Error("Failed to create membership");
  }

  const paidAt = `${values.join_date}T12:00:00.000Z`;
  try {
    const { error: paymentError } = await supabase.from("payments").insert({
      gym_id: gymId,
      member_id: memberRow.id,
      membership_id: membershipRow.id,
      amount: plan.price,
      payment_method: "cash",
      paid_at: paidAt,
      counts_toward_revenue: true,
    });

    if (paymentError && !/counts_toward_revenue|column/i.test(paymentError.message)) {
      await supabase.from("payments").insert({
        gym_id: gymId,
        member_id: memberRow.id,
        membership_id: membershipRow.id,
        amount: plan.price,
        payment_method: "cash",
        paid_at: paidAt,
      });
    }
  } catch {
    /* payment is best-effort */
  }

  const normalizedPhone = normalizePhone(values.phone);
  if (normalizedPhone && values.national_id) {
    try {
      const { createMemberAuthUser } = await import("@/app/actions/create-member-auth");
      const authResult = await createMemberAuthUser(normalizedPhone, values.national_id, memberRow.id, gymId);
      if (!authResult.success) {
        console.warn("Auth user not created for new member:", authResult.error);
      }
    } catch (err) {
      console.warn("Auth user creation threw:", err);
    }
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
      phone: normalizePhone(values.phone),
      national_id: values.national_id.trim() || null,
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

export async function deleteGymMember(
  gymId: string,
  memberId: string,
  wasPaid: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseBrowserClient();

  try {
    const { error: rpcError } = await supabase.rpc("delete_gym_member_with_income_choice", {
      p_gym_id: gymId,
      p_member_id: memberId,
      p_was_paid: wasPaid,
    });

    if (rpcError) {
      console.warn("delete RPC failed, trying manual path:", rpcError);
    }

    if (!rpcError) {
      try {
        await fetchGymMembers(gymId);
      } catch {
        console.warn("delete succeeded but refetch failed");
      }
      return { success: true };
    }

    if (wasPaid) {
      const { error: nullifyError } = await supabase
        .from("payments")
        .update({ membership_id: null })
        .eq("gym_id", gymId)
        .eq("member_id", memberId);
      if (nullifyError) throw nullifyError;

      const { error: membershipError } = await supabase
        .from("memberships")
        .delete()
        .eq("member_id", memberId)
        .eq("gym_id", gymId);
      if (membershipError) throw membershipError;

      const { error: memberError } = await supabase.from("members").delete().eq("id", memberId).eq("gym_id", gymId);
      if (memberError) throw memberError;
    } else {
      const { error: paymentError } = await supabase
        .from("payments")
        .delete()
        .eq("gym_id", gymId)
        .eq("member_id", memberId);
      if (paymentError) throw paymentError;

      const { error: membershipError } = await supabase
        .from("memberships")
        .delete()
        .eq("member_id", memberId)
        .eq("gym_id", gymId);
      if (membershipError) throw membershipError;

      const { error: memberError } = await supabase
        .from("members")
        .delete()
        .eq("id", memberId)
        .eq("gym_id", gymId);
      if (memberError) throw memberError;
    }

    try {
      await fetchGymMembers(gymId);
    } catch {
      console.warn("delete succeeded but refetch failed");
    }
    return { success: true };
  } catch (caught) {
    const message = extractError(caught);
    console.error("deleteGymMember failed:", message, caught);
    return { success: false, error: message };
  }
}
