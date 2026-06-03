export function daysBetween(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function membershipProgressPercent(startDate: string, endDate: string, daysLeft: number) {
  const total = daysBetween(startDate, endDate);
  const used = Math.max(0, total - Math.max(0, daysLeft));
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
}

export function formatMemberStatus(
  status: string,
  labels: { active: string; expired: string; inactive: string; suspended: string },
) {
  switch (status) {
    case "active":
      return labels.active;
    case "expired":
      return labels.expired;
    case "inactive":
      return labels.inactive;
    case "suspended":
      return labels.suspended;
    default:
      return status;
  }
}
