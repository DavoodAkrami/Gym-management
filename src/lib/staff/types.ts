export type StaffStatus = "active" | "inactive" | "on_leave";

export type CoachPermissions = {
  manage_trainers: boolean;
  view_members: boolean;
  edit_members: boolean;
  view_attendance: boolean;
  record_attendance: boolean;
};

export const defaultCoachPermissions: CoachPermissions = {
  manage_trainers: true,
  view_members: true,
  edit_members: false,
  view_attendance: true,
  record_attendance: true,
};

export type GymCoach = {
  id: string;
  gym_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  email?: string;
  specialty?: string;
  avatar_url?: string;
  gym_hours_start?: string;
  gym_hours_end?: string;
  permissions: CoachPermissions;
  contract_start_date: string;
  contract_end_date: string;
  salary?: number;
  active: boolean;
  status: StaffStatus;
  created_at: string;
  trainer_count?: number;
};

export type GymTrainer = {
  id: string;
  gym_id: string;
  coach_id: string;
  coach_name?: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  email?: string;
  specialty?: string;
  avatar_url?: string;
  gym_hours_start?: string;
  gym_hours_end?: string;
  contract_start_date: string;
  contract_end_date: string;
  salary?: number;
  active: boolean;
  status: StaffStatus;
  created_at: string;
  member_count?: number;
};

export type CoachFormValues = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  specialty: string;
  avatar_url: string;
  gym_hours_start: string;
  gym_hours_end: string;
  contract_start_date: string;
  contract_end_date: string;
  salary: string;
  active: boolean;
  status: StaffStatus;
  permissions: CoachPermissions;
};

export type TrainerFormValues = {
  coach_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  specialty: string;
  avatar_url: string;
  gym_hours_start: string;
  gym_hours_end: string;
  contract_start_date: string;
  contract_end_date: string;
  salary: string;
  active: boolean;
  status: StaffStatus;
};
