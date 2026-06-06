import type { TranslationKey } from "@/lib/i18n/translations";
import type { IconType } from "react-icons";
import {
  FiActivity,
  FiBarChart2,
  FiGrid,
  FiLayers,
  FiSmartphone,
  FiSettings,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

export type PanelSectionId =
  | "overview"
  | "members"
  | "memberships"
  | "revenue"
  | "coaches"
  | "programs"
  | "attendance"
  | "signup"
  | "profile";

export type PanelSection = {
  id: PanelSectionId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: IconType;
};

export const panelSections: PanelSection[] = [
  {
    id: "overview",
    labelKey: "panelNavOverview",
    descriptionKey: "panelDescOverview",
    icon: FiGrid,
  },
  {
    id: "members",
    labelKey: "panelNavMembers",
    descriptionKey: "panelDescMembers",
    icon: FiUsers,
  },
  {
    id: "memberships",
    labelKey: "panelNavMemberships",
    descriptionKey: "panelDescMemberships",
    icon: FiLayers,
  },
  {
    id: "revenue",
    labelKey: "panelNavRevenue",
    descriptionKey: "panelDescRevenue",
    icon: FiBarChart2,
  },
  {
    id: "coaches",
    labelKey: "panelNavCoaches",
    descriptionKey: "panelDescCoaches",
    icon: FiUserCheck,
  },
  {
    id: "attendance",
    labelKey: "panelNavAttendance",
    descriptionKey: "panelDescAttendance",
    icon: FiActivity,
  },
  {
    id: "signup",
    labelKey: "panelNavSignup",
    descriptionKey: "panelDescSignup",
    icon: FiSmartphone,
  },
  {
    id: "profile",
    labelKey: "panelNavGymProfile",
    descriptionKey: "panelDescProfile",
    icon: FiSettings,
  },
];

export const DEFAULT_ENABLED_SECTIONS: PanelSectionId[] = [
  "overview",
  "members",
  "memberships",
  "revenue",
  "coaches",
  "attendance",
  "signup",
  "profile",
];

/** Coach portal: same section ids, personal profile nav label */
export const coachProfileSectionMeta = {
  labelKey: "panelNavProfile" as const,
  descriptionKey: "coachPanelDescProfile" as const,
};

export function isPanelSectionId(value: string | null | undefined): value is PanelSectionId {
  return panelSections.some((section) => section.id === value);
}
