type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
};

export function PhoneInput({ value, onChange, required, disabled }: PhoneInputProps) {
  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-glass-border bg-glass focus-within:border-accent focus-within:bg-surface focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_15%,transparent)]" dir="ltr">
      <span className="flex items-center border-r border-glass-border px-3 py-[13px] text-sm font-bold text-muted-foreground">
        +98
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="9123456789"
        required={required}
        disabled={disabled}
        className="block w-full bg-transparent px-3 py-[13px] text-sm font-semibold text-foreground placeholder:text-placeholder focus:outline-none disabled:opacity-50"
      />
    </div>
  );
}
