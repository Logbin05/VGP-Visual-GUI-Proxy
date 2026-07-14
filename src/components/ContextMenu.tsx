import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuAction {
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}
export type ContextMenuEntry = ContextMenuAction | { separator: true };

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y, ready: false });

  useEffect(() => {
    const handlePointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const id = setTimeout(() => {
      document.addEventListener("mousedown", handlePointer);
      document.addEventListener("contextmenu", handlePointer);
    }, 0);
    document.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("contextmenu", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const clampedX = Math.min(
      x,
      Math.max(8, window.innerWidth - rect.width - 8),
    );
    const clampedY = Math.min(
      y,
      Math.max(8, window.innerHeight - rect.height - 8),
    );
    setPos({ x: clampedX, y: clampedY, ready: true });
  }, [x, y]);

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        visibility: pos.ready ? "visible" : "hidden",
      }}
      className="z-50 min-w-52 rounded-lg border border-border bg-panel py-1.5 shadow-2xl"
    >
      {items.map((item, i) =>
        "separator" in item ? (
          <div key={i} className="my-1 border-t border-border" />
        ) : (
          <button
            key={i}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left font-JetBrainsMono text-[12.5px] disabled:cursor-not-allowed disabled:opacity-40 ${
              item.danger
                ? "text-status_error hover:bg-status_error/10"
                : "text-text_primary hover:bg-surface"
            }`}
          >
            {item.icon && <item.icon size={14} />}
            {item.label}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}
