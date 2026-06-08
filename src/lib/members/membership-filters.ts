import type { MembershipFilter, MembershipWithMeta } from "./types";

export function filterMembershipsByQuery(list: MembershipWithMeta[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return list;
  }

  return list.filter((item) => {
    const haystack = [
      item.member_first_name,
      item.member_last_name,
      item.member_phone,
      item.plan_name,
      item.status,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function filterMembershipsByType(list: MembershipWithMeta[], filter: MembershipFilter) {
  if (filter === "active") {
    return list.filter((item) => item.is_active);
  }
  if (filter === "expiring") {
    return list.filter((item) => item.is_active && item.days_left >= 0 && item.days_left <= 3);
  }
  if (filter === "finished") {
    return list.filter((item) => !item.is_active);
  }
  return list;
}

export function sortMemberships(
  list: MembershipWithMeta[],
  sort: import("./sort").MembershipSort,
) {
  const copy = [...list];
  const name = (item: MembershipWithMeta) =>
    `${item.member_first_name} ${item.member_last_name}`.trim().toLowerCase();

  copy.sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return name(a).localeCompare(name(b));
      case "name_desc":
        return name(b).localeCompare(name(a));
      case "end_asc":
        return a.end_date.localeCompare(b.end_date);
      case "end_desc":
        return b.end_date.localeCompare(a.end_date);
      case "days_left_asc":
        return a.days_left - b.days_left;
      case "days_left_desc":
        return b.days_left - a.days_left;
      default:
        return 0;
    }
  });

  return copy;
}
