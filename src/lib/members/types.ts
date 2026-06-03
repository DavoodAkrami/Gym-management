import type { Member, Membership } from "@/lib/store/slices";

export type MemberWithMeta = Member & {
  created_at: string;
  notes?: string;
  lapse_visible_until?: string;
  currentMembership?: Membership & { plan_name?: string };
  latestMembership?: Membership & { plan_name?: string };
};

export type MembershipWithMeta = Membership & {
  plan_name: string;
  member_first_name: string;
  member_last_name: string;
  member_phone: string;
  days_left: number;
  is_active: boolean;
  in_lapse_window: boolean;
  lapse_visible_until?: string;
};

export type MemberFormValues = {
  first_name: string;
  last_name: string;
  phone: string;
  zip_code: string;
  national_id: string;
  preferred_language: "en" | "fa";
  status: Member["status"];
  join_date: string;
  plan_id: string;
};

export type MemberFilter = "all" | "new" | "expiring";
export type MembershipFilter = "all" | "active" | "expiring" | "finished";
