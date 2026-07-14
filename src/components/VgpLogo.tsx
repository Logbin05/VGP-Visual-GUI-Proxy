export function VgpLogo({ size = 20 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-md border border-accent_primary_cyan bg-linear-to-br from-surface to-app_base"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
        className="text-accent_primary_cyan"
      >
        <path d="M4 7 L12 3 L20 7 L20 17 L12 21 L4 17 Z" />
        <path d="M4 7 L12 11 L20 7" />
        <path d="M12 11 L12 21" />
      </svg>
    </div>
  );
}
