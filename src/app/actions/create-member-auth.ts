"use server";

import { createClient } from "@supabase/supabase-js";

export async function createMemberAuthUser(
  phone: string,
  password: string,
  memberId: string,
  gymId: string,
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { role: "member" },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const { error: updateError } = await supabaseAdmin
    .from("members")
    .update({ user_id: data.user.id })
    .eq("id", memberId)
    .eq("gym_id", gymId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, userId: data.user.id };
}
