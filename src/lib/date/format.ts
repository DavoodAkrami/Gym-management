import jalaali from "jalaali-js";

const MONTHS_FA = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toJalaali(date: Date) {
  return jalaali.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function formatDate(dateStr: string | Date, locale: string): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const j = toJalaali(d);

  if (locale === "fa") {
    return `${j.jd} ${MONTHS_FA[j.jm - 1]} ${j.jy}`;
  }
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`;
}

export function formatChartLabel(date: Date, locale: string, isMonth: boolean): string {
  const j = toJalaali(date);

  if (isMonth) {
    if (locale === "fa") {
      return `${MONTHS_FA[j.jm - 1]} ${j.jy}`;
    }
    return `${MONTHS_EN[j.jm - 1]} ${String(j.jy).slice(-2)}`;
  }

  if (locale === "fa") {
    return `${j.jd} ${MONTHS_FA[j.jm - 1]}`;
  }
  return `${MONTHS_EN[j.jm - 1]} ${j.jd}`;
}
