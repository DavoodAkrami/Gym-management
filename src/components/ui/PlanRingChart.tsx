import { daysBetween } from "@/lib/members/portal-utils";

type PlanRingChartProps = {
  startDate: string;
  endDate: string;
  daysLeft: number;
  size?: number;
  label: string;
  sublabel?: string;
};

export function PlanRingChart({
  startDate,
  endDate,
  daysLeft,
  size = 140,
  label,
  sublabel,
}: PlanRingChartProps) {
  const total = daysBetween(startDate, endDate);
  const remaining = Math.max(0, Math.min(total, daysLeft));
  const percentLeft = total > 0 ? Math.round((remaining / total) * 100) : 0;
  const isExpired = daysLeft < 0;

  const stroke = 10;
  const radius = (size - stroke) / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const fillRatio = isExpired ? 0 : percentLeft / 100;
  const dashOffset = circumference * (1 - fillRatio);

  const ringClass = isExpired
    ? "plan-ring-stroke-expired"
    : percentLeft <= 15
      ? "plan-ring-stroke-warning"
      : "plan-ring-stroke-active";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="plan-ring-track"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={ringClass}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-foreground">
            {isExpired ? "0%" : `${percentLeft}%`}
          </span>
        </div>
      </div>
      <p className="text-center text-sm font-black text-foreground">{label}</p>
      {sublabel ? (
        <p className="max-w-xs text-center text-xs font-semibold text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  );
}
