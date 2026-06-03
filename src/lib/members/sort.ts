import type { MemberWithMeta } from "./types";
import { computeDaysLeft } from "./membership-utils";

export type MemberSort =
  | "name_asc"
  | "name_desc"
  | "join_desc"
  | "join_asc"
  | "end_asc"
  | "end_desc"
  | "days_left_asc"
  | "days_left_desc";

export type MembershipSort =
  | "end_asc"
  | "end_desc"
  | "name_asc"
  | "name_desc"
  | "days_left_asc"
  | "days_left_desc";

function memberName(member: MemberWithMeta) {
  return `${member.first_name} ${member.last_name}`.trim().toLowerCase();
}

function memberEndDate(member: MemberWithMeta) {
  return member.currentMembership?.end_date ?? member.latestMembership?.end_date ?? "9999-12-31";
}

function memberDaysLeft(member: MemberWithMeta) {
  const end = member.currentMembership?.end_date ?? member.latestMembership?.end_date;
  return end ? computeDaysLeft(end) : 9999;
}

export function sortMembers(members: MemberWithMeta[], sort: MemberSort) {
  const list = [...members];

  list.sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return memberName(a).localeCompare(memberName(b));
      case "name_desc":
        return memberName(b).localeCompare(memberName(a));
      case "join_asc":
        return a.join_date.localeCompare(b.join_date);
      case "join_desc":
        return b.join_date.localeCompare(a.join_date);
      case "end_asc":
        return memberEndDate(a).localeCompare(memberEndDate(b));
      case "end_desc":
        return memberEndDate(b).localeCompare(memberEndDate(a));
      case "days_left_asc":
        return memberDaysLeft(a) - memberDaysLeft(b);
      case "days_left_desc":
        return memberDaysLeft(b) - memberDaysLeft(a);
      default:
        return 0;
    }
  });

  return list;
}
