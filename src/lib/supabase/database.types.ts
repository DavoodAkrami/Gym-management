export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export type GymRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  logo_url: string | null;
  base_currency: string;
  enabled_sections: string[] | null;
  public_signup_enabled: boolean;
  created_at: string;
};

export type GymPlanRow = {
  id: string;
  gym_id: string;
  name: string;
  price: number;
  duration_days: number;
  created_at: string;
};

export type MemberRow = {
  id: string;
  gym_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  zip_code: string | null;
  national_id: string | null;
  preferred_language: "en" | "fa";
  birth_date: string | null;
  gender: string | null;
  status: "active" | "inactive" | "expired" | "suspended";
  notes: string | null;
  join_date: string;
  created_at: string;
};

export type MembershipRow = {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  price: number;
  status: "active" | "expired" | "cancelled";
  created_at: string;
};

export type PaymentRow = {
  id: string;
  gym_id: string;
  member_id: string | null;
  membership_id: string | null;
  amount: number;
  payment_method: "cash" | "card" | "transfer";
  paid_at: string;
  counts_toward_revenue: boolean;
};

export type SignupLinkRow = {
  id: string;
  gym_id: string;
  token: string;
  active: boolean;
  created_at: string;
};

export type MemberLapseRow = {
  id: string;
  gym_id: string;
  member_id: string;
  membership_id: string;
  lapsed_at: string;
  visible_until: string;
  created_at: string;
};
