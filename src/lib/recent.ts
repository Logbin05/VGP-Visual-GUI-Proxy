const KEY = "vgp.recentFiles";
const MAX_ENTRIES = 5;

export interface RecentFile {
  path: string;
  openedAt: number;
}

export function getRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentFile[]) : [];
  } catch {
    return [];
  }
}

export function pushRecentFile(path: string): RecentFile[] {
  const existing = getRecentFiles().filter((f) => f.path !== path);
  const next = [{ path, openedAt: Date.now() }, ...existing].slice(
    0,
    MAX_ENTRIES,
  );
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}
