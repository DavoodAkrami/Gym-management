"use client";

import { useMemo, useCallback } from "react";
import jalaali from "jalaali-js";

type JalaliDatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  label: string;
  required?: boolean;
};

const MONTHS_FA = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

function toJalali(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return jalaali.toJalaali(y, m, d);
}

function toIso(jy: number, jm: number, jd: number) {
  const g = jalaali.toGregorian(jy, jm, jd);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
}

export function JalaliDatePicker({ value, onChange, label, required }: JalaliDatePickerProps) {
  const jalali = useMemo(() => {
    try {
      return toJalali(value);
    } catch {
      const now = new Date();
      return jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }
  }, [value]);

  const years = useMemo(() => {
    const cy = jalaali.toJalaali(new Date().getFullYear(), 1, 1).jy;
    return Array.from({ length: 21 }, (_, i) => cy - 10 + i);
  }, []);

  const daysInMonth = jalaali.jalaaliMonthLength(jalali.jy, jalali.jm);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const handleYearChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const jy = Number(e.target.value);
      const jd = Math.min(jalali.jd, jalaali.jalaaliMonthLength(jy, jalali.jm));
      onChange(toIso(jy, jalali.jm, jd));
    },
    [jalali.jm, jalali.jd, onChange],
  );

  const handleMonthChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const jm = Number(e.target.value);
      const jd = Math.min(jalali.jd, jalaali.jalaaliMonthLength(jalali.jy, jm));
      onChange(toIso(jalali.jy, jm, jd));
    },
    [jalali.jy, jalali.jd, onChange],
  );

  const handleDayChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(toIso(jalali.jy, jalali.jm, Number(e.target.value)));
    },
    [jalali.jy, jalali.jm, onChange],
  );

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <select
          value={jalali.jy}
          onChange={handleYearChange}
          required={required}
          className="w-24 px-3"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={jalali.jm}
          onChange={handleMonthChange}
          required={required}
          className="flex-1 px-3"
        >
          {MONTHS_FA.map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={jalali.jd}
          onChange={handleDayChange}
          required={required}
          className="w-20 px-3"
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
