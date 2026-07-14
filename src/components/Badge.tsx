const VARIANTS = {
  neutral: "text-text_secondary bg-elevated border-border",
  cyan: "text-accent_primary_cyan bg-accent_primary_cyan/10 border-accent_primary_cyan/30",
  violet:
    "text-accent_select_violet bg-accent_select_violet/10 border-accent_select_violet/30",
  valid: "text-status_valid bg-status_valid/10 border-status_valid/30",
  warning: "text-status_warning bg-status_warning/10 border-status_warning/30",
  error: "text-status_error bg-status_error/10 border-status_error/30",
} as const;

export type BadgeVariant = keyof typeof VARIANTS;

export function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-JetBrainsMono text-[11px] ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
