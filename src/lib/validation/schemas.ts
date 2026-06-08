import { z } from "zod";

export const memberFormSchema = z.object({
  first_name: z.string().min(2, "At least 2 characters"),
  last_name: z.string().min(2, "At least 2 characters"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^[0-9+\-\s()]+$/, "Phone numbers only"),
  zip_code: z.string().optional(),
  national_id: z
    .string()
    .regex(/^\d{10}$/, "National code must be exactly 10 digits")
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "inactive", "expired", "suspended"]),
  join_date: z.string().min(1, "Join date is required"),
  plan_id: z.string().min(1, "A membership plan is required"),
});

export const coachFormSchema = z.object({
  first_name: z.string().min(2, "At least 2 characters"),
  last_name: z.string().min(2, "At least 2 characters"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^[0-9+\-\s()]+$/, "Phone numbers only")
    .optional()
    .or(z.literal("")),
  specialty: z.string().optional(),
  active: z.boolean(),
});

export type MemberFormSchema = z.infer<typeof memberFormSchema>;
export type CoachFormSchema = z.infer<typeof coachFormSchema>;
