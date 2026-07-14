import {
  FiList,
  FiCode,
  FiShield,
  FiActivity,
  FiSettings,
} from "react-icons/fi";
import { useAppStore, type Page } from "../store/useAppStore";

const ITEMS: { page: Page; icon: React.ComponentType<{ size?: number }> }[] = [
  { page: "configs", icon: FiList },
  { page: "editor", icon: FiCode },
  { page: "validation", icon: FiShield },
  { page: "test", icon: FiActivity },
];

function RailButton({
  active,
  onClick,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-accent_primary_cyan/10 text-accent_primary_cyan"
          : "text-text_muted hover:bg-surface hover:text-text_secondary"
      }`}
    >
      {active && (
        <span className="absolute -left-2 top-2.25 bottom-2.25 w-0.75 rounded-sm bg-accent_primary_cyan shadow-[0_0_10px_var(--color-accent_primary_cyan)]" />
      )}
      <Icon size={20} />
    </button>
  );
}

export function RailNav() {
  const page = useAppStore((s) => s.page);
  const navigate = useAppStore((s) => s.navigate);

  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-panel py-3.5">
      {ITEMS.map((item) => (
        <RailButton
          key={item.page}
          active={page === item.page}
          onClick={() => navigate(item.page)}
          icon={item.icon}
        />
      ))}
      <div className="flex-1" />
      <RailButton
        active={page === "settings"}
        onClick={() => navigate("settings")}
        icon={FiSettings}
      />
    </div>
  );
}
