import type { MemberFilter, MemberWithMeta } from "./types";
import { computeDaysLeft } from "./membership-utils";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDate(value: string) {
  return startOfDay(new Date(value));
}

export function isNewMember(member: MemberWithMeta, now = new Date()) {
  const today = startOfDay(now);
  const threshold = new Date(today.getTime() - 3 * MS_PER_DAY);
  const joined = parseDate(member.join_date);
  const created = member.created_at ? parseDate(member.created_at) : joined;
  return joined >= threshold || created >= threshold;
}

export function isExpiringSoon(member: MemberWithMeta, now = new Date()) {
  const membership = member.currentMembership;
  if (!membership || membership.status !== "active") {
    return false;
  }
  return computeDaysLeft(membership.end_date, now) < 3;
}

export function hasActiveMembership(member: MemberWithMeta) {
  return member.currentMembership?.status === "active" && parseDate(member.currentMembership.end_date) >= startOfDay(new Date());
}

export function filterMembersByQuery(members: MemberWithMeta[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return members;
  }

  return members.filter((member) => {
    const haystack = [
      member.first_name,
      member.last_name,
      member.phone,
      member.zip_code,
      member.national_id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function filterMembersByType(members: MemberWithMeta[], filter: MemberFilter) {
  if (filter === "new") {
    return members.filter((member) => isNewMember(member));
  }
  if (filter === "expiring") {
    return members.filter((member) => isExpiringSoon(member));
  }
  return members;
}

export function isLapsedVisible(member: MemberWithMeta, visibleUntil?: string, now = new Date()) {
  if (hasActiveMembership(member)) {
    return false;
  }

  if (visibleUntil) {
    return parseDate(visibleUntil) >= startOfDay(now);
  }

  const latest = member.latestMembership;
  if (!latest) {
    return false;
  }

  const end = parseDate(latest.end_date);
  const windowEnd = new Date(end.getTime() + 30 * MS_PER_DAY);
  return windowEnd >= startOfDay(now) && end < startOfDay(now);
}
