const COLORS = {
  valid: "bg-status_valid",
  warning: "bg-status_warning",
  error: "bg-status_error",
  testing: "bg-status_testing",
  neutral: "bg-text_muted",
} as const;

export function StatusDot({
  variant,
  glow = false,
}: {
  variant: keyof typeof COLORS;
  glow?: boolean;
}) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${COLORS[variant]} ${
        glow ? "shadow-[0_0_8px_currentColor]" : ""
      }`}
    />
  );
}
