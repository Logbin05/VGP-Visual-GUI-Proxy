export function Toggle({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative inline-block h-5.5 w-10 shrink-0 rounded-full p-0 align-middle transition-colors duration-200 ${
        on ? "bg-accent_primary_cyan" : "bg-elevated"
      }`}
    >
      <span
        className={`absolute left-0.75 top-0.75 h-4 w-4 rounded-full bg-text_primary shadow transition-transform duration-200 ${
          on ? "translate-x-4.5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
