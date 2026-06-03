import {
  coachProfileSectionMeta,
  panelSections,
  type PanelSection,
  type PanelSectionId,
} from "@/lib/panel/sections";
import { FiBookOpen } from "react-icons/fi";
import type { CoachPermissions } from "@/lib/staff/types";

const coachProgramsSection: PanelSection = {
  id: "programs",
  labelKey: "panelNavCoachPrograms",
  descriptionKey: "panelDescCoachPrograms",
  icon: FiBookOpen,
};

export function coachPanelSections(permissions: CoachPermissions): PanelSection[] {
  const sections = panelSections
    .filter((section) => coachCanAccessSection(section.id, permissions))
    .map((section) => coachSectionMeta(section));

  if (coachCanAccessSection("programs", permissions)) {
    sections.splice(2, 0, coachProgramsSection);
  }

  return sections;
}

const coachTraineesSectionMeta = {
  labelKey: "panelNavMyTrainees" as const,
  descriptionKey: "coachPanelDescTrainees" as const,
};

export function coachCanAccessSection(
  sectionId: PanelSectionId,
  _permissions: CoachPermissions,
): boolean {
  switch (sectionId) {
    case "overview":
    case "coaches":
    case "programs":
    case "profile":
      return true;
    case "members":
    case "memberships":
      return _permissions.view_members;
    case "revenue":
    case "signup":
      return false;
    case "attendance":
      return _permissions.view_attendance;
    default:
      return false;
  }
}

export function coachSectionMeta(section: PanelSection): PanelSection {
  if (section.id === "profile") {
    return {
      ...section,
      labelKey: coachProfileSectionMeta.labelKey,
      descriptionKey: coachProfileSectionMeta.descriptionKey,
    };
  }
  if (section.id === "coaches") {
    return {
      ...section,
      labelKey: coachTraineesSectionMeta.labelKey,
      descriptionKey: coachTraineesSectionMeta.descriptionKey,
    };
  }
  if (section.id === "overview") {
    return {
      ...section,
      descriptionKey: "coachPanelDescOverview",
    };
  }
  return section;
}

export function coachDefaultSection(_permissions: CoachPermissions): PanelSectionId {
  return "overview";
}
