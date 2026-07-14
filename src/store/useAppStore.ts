import { create } from "zustand";
import type { ConfigEntry, ValidationIssue } from "../types/vgp";
import { pushRecentFile } from "../lib/recent";

export type Page = "start" | "configs" | "editor" | "validation" | "test" | "settings";

interface AppState {
  page: Page;
  activeFile: string | null;
  navigate: (page: Page, file?: string) => void;

  pendingOpen: string | null;
  consumePendingOpen: () => void;

  entries: ConfigEntry[];
  statuses: Record<string, ValidationIssue[] | null>;
  setEntries: (entries: ConfigEntry[]) => void;
  setStatus: (path: string, issues: ValidationIssue[] | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  page: "start",
  activeFile: null,
  navigate: (page, file) => {
    if ((page === "validation" || page === "editor") && file) pushRecentFile(file);
    set((s) => ({
      page,
      activeFile: file ?? s.activeFile,
      pendingOpen: page === "editor" && file ? file : s.pendingOpen,
    }));
  },

  pendingOpen: null,
  consumePendingOpen: () => set({ pendingOpen: null }),

  entries: [],
  statuses: {},
  setEntries: (entries) => set({ entries }),
  setStatus: (path, issues) =>
    set((s) => ({ statuses: { ...s.statuses, [path]: issues } })),
}));
