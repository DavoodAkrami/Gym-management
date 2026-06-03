import {
  computeDaysLeft,
  isInLapseWindow,
  isMembershipActive,
} from "@/lib/members/membership-utils";
import type { MembershipWithMeta } from "@/lib/members/types";
import { createSupabaseBrowserClient } from "./client";
import type { MemberLapseRow, MembershipRow } from "./database.types";

type MembershipQueryRow = MembershipRow & {
  gym_plans: { name: string } | null;
  members: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
};

function mapMembershipRow(row: MembershipQueryRow, lapseVisible?: string): MembershipWithMeta {
  const daysLeft = computeDaysLeft(row.end_date);
  const isActive = isMembershipActive(row.end_date, row.status);
  const inLapse = !isActive && isInLapseWindow(row.end_date);

  return {
    id: row.id,
    gym_id: row.gym_id,
    member_id: row.member_id,
    plan_id: row.plan_id,
    start_date: row.start_date,
    end_date: row.end_date,
    price: Number(row.price),
    status: row.status,
    plan_name: row.gym_plans?.name ?? "—",
    member_first_name: row.members?.first_name ?? "",
    member_last_name: row.members?.last_name ?? "",
    member_phone: row.members?.phone ?? "",
    days_left: daysLeft,
    is_active: isActive,
    in_lapse_window: inLapse,
    lapse_visible_until: lapseVisible,
  };
}

export async function fetchGymMemberships(gymId: string) {
  const supabase = createSupabaseBrowserClient();

  const { data: rows, error } = await supabase
    .from("memberships")
    .select("*, gym_plans(name), members(first_name, last_name, phone)")
    .eq("gym_id", gymId)
    .order("end_date", { ascending: false });

  if (error) {
    throw error;
  }

  const lapseByMembership = new Map<string, string>();
  const { data: lapseRows } = await supabase
    .from("member_lapse_log")
    .select("membership_id, visible_until")
    .eq("gym_id", gymId);

  (lapseRows as MemberLapseRow[] | null)?.forEach((row) => {
    lapseByMembership.set(row.membership_id, row.visible_until);
  });

  return (rows as MembershipQueryRow[]).map((row) =>
    mapMembershipRow(row, lapseByMembership.get(row.id)),
  );
}

export async function updateMembershipStatus(
  gymId: string,
  membershipId: string,
  status: "active" | "expired" | "cancelled",
) {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase
    .from("memberships")
    .update({ status })
    .eq("id", membershipId)
    .eq("gym_id", gymId);

  if (error) {
    throw error;
  }

  return fetchGymMemberships(gymId);
}
