import { useState } from "react";

export interface MenuState<T> {
  x: number;
  y: number;
  data: T;
}

export function useContextMenu<T = undefined>() {
  const [menu, setMenu] = useState<MenuState<T> | null>(null);

  const open = (e: React.MouseEvent, data: T) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, data });
  };
  const close = () => setMenu(null);

  return { menu, open, close };
}
