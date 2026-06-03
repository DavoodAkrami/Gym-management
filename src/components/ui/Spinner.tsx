type SpinnerProps = {
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

export function Spinner({ label, size = "md", className = "" }: SpinnerProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`ui-spinner ${size === "sm" ? "ui-spinner-sm" : ""}`}
        role="status"
        aria-hidden="true"
      />
      {label ? <span className="text-sm font-bold text-foreground">{label}</span> : null}
    </span>
  );
}
