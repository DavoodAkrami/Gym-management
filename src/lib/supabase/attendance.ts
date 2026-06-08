import { createSupabaseBrowserClient } from "./client";

export type AttendanceRecord = {
  id: string;
  check_in: string;
  member_id: string;
  members: { first_name: string; last_name: string } | null;
};

export async function fetchAttendance(gymId: string, since: string) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("attendance")
    .select("id, check_in, member_id, members(first_name, last_name)")
    .eq("gym_id", gymId)
    .gte("check_in", since)
    .order("check_in", { ascending: false });

  if (error) throw error;
  return data as unknown as AttendanceRecord[];
}

export async function createCheckIn(gymId: string, memberId: string, checkIn: string) {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.from("attendance").insert({
    gym_id: gymId,
    member_id: memberId,
    check_in: checkIn,
  });

  if (error) throw error;
}
