const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function computeDaysLeft(endDate: string, now = new Date()) {
  const today = startOfDay(now);
  const end = startOfDay(new Date(endDate));
  return Math.ceil((end.getTime() - today.getTime()) / MS_PER_DAY);
}

export function isMembershipActive(endDate: string, status: string, now = new Date()) {
  return status === "active" && computeDaysLeft(endDate, now) >= 0;
}

export function isInLapseWindow(endDate: string, now = new Date()) {
  const daysLeft = computeDaysLeft(endDate, now);
  if (daysLeft >= 0) {
    return false;
  }
  return daysLeft >= -30;
}

export function planRemainingLabel(
  daysLeft: number,
  labels: { expired: string; daysLeft: string; oneDay: string },
) {
  if (daysLeft < 0) {
    return labels.expired;
  }
  if (daysLeft === 0) {
    return labels.oneDay;
  }
  return labels.daysLeft.replace("{days}", String(daysLeft));
}
