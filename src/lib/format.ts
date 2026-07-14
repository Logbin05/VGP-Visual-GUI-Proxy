import type { TFunction } from "i18next";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCompactTime(epochMs: number, t: TFunction): string {
  const diffMin = Math.max(0, (Date.now() - epochMs) / 60000);
  if (diffMin < 60) {
    return t("common.timeCompact.minutes", {
      count: Math.max(1, Math.round(diffMin)),
    });
  }
  const diffHour = diffMin / 60;
  if (diffHour < 24) {
    return t("common.timeCompact.hours", { count: Math.round(diffHour) });
  }
  const diffDay = diffHour / 24;
  if (diffDay < 7) {
    return t("common.timeCompact.days", { count: Math.round(diffDay) });
  }
  return t("common.timeCompact.weeks", { count: Math.round(diffDay / 7) });
}
