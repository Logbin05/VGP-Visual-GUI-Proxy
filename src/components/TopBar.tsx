import type { ReactNode } from "react";
import { VgpLogo } from "./VgpLogo";

export function TopBar({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-border bg-panel px-4">
      <VgpLogo />
      <span className="font-JetBrainsMono text-[12.5px] text-text_secondary">
        {title}
      </span>
      <div className="flex-1" />
      {children}
    </div>
  );
}
