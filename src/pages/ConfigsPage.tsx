import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { FiSearch, FiAlertCircle, FiFolder, FiFile, FiPlus, FiShield, FiActivity } from "react-icons/fi";
import { TopBar } from "../components/TopBar";
import { Badge, type BadgeVariant } from "../components/Badge";
import { StatusDot } from "../components/StatusDot";
import { listConfigs, validateConfig } from "../lib/tauri";
import { formatBytes } from "../lib/format";
import { getLastDir, setLastDir } from "../lib/configsDir";
import { useAppStore } from "../store/useAppStore";
import type { ConfigEntry, FileType, ProxyType, ValidationIssue } from "../types/vgp";

const TYPE_BADGE: Record<ProxyType | "unknown", BadgeVariant> = {
  unknown: "neutral",
  socks5: "violet",
  http: "cyan",
  https: "cyan",
  direct: "neutral",
  shadowsocks: "violet",
  transparent: "neutral",
  reverse: "warning",
};

const FORMAT_BADGE: Record<FileType, BadgeVariant> = {
  Yaml: "violet",
  Json: "cyan",
  Toml: "warning",
  Ini: "neutral",
};

type Status = "valid" | "warning" | "error" | "unknown";

function statusOf(
  entry: ConfigEntry,
  issues: ValidationIssue[] | null | undefined,
): Status {
  if (entry.parse_error) return "error";
  if (issues === null || issues === undefined) return "unknown";
  if (issues.some((i) => i.severity === "Error")) return "error";
  if (issues.some((i) => i.severity === "Warning")) return "warning";
  return "valid";
}

export function ConfigsPage() {
  const { t } = useTranslation();
  const navigate = useAppStore((s) => s.navigate);
  const entries = useAppStore((s) => s.entries);
  const setEntries = useAppStore((s) => s.setEntries);
  const statuses = useAppStore((s) => s.statuses);
  const setStatus = useAppStore((s) => s.setStatus);

  const [dir, setDir] = useState<string | null>(getLastDir);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const load = (targetDir: string) => {
    setLoading(true);
    setLoadError(null);
    listConfigs(targetDir)
      .then((list) => {
        setEntries(list);
        list.forEach((entry) => {
          if (entry.parse_error) return;
          validateConfig(entry.path)
            .then((issues) => setStatus(entry.path, issues))
            .catch(() => setStatus(entry.path, null));
        });
      })
      .catch((err) => {
        setEntries([]);
        setLoadError(String(err));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (dir) load(dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickDirectory = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      setDir(selected);
      setLastDir(selected);
      load(selected);
    }
  };

  const pickFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Config", extensions: ["yaml", "yml", "json", "toml", "ini"] }],
    });
    if (typeof selected === "string") {
      navigate("editor", selected);
    }
  };

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (search && !e.file_name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter === "all") return true;
      return statusOf(e, statuses[e.path]) === statusFilter;
    });
  }, [entries, search, statusFilter, statuses]);

  const counts = useMemo(() => {
    const c = { valid: 0, warning: 0, error: 0, unknown: 0 };
    entries.forEach((e) => {
      c[statusOf(e, statuses[e.path])]++;
    });
    return c;
  }, [entries, statuses]);

  const formatCounts = useMemo(() => {
    const c: Partial<Record<FileType, number>> = {};
    entries.forEach((e) => {
      c[e.file_extension] = (c[e.file_extension] ?? 0) + 1;
    });
    return c;
  }, [entries]);

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("configurations.windowTitle")} />

      <div className="flex shrink-0 items-center gap-3 border-b border-border px-5.5 py-4.5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-app_base px-3 py-2">
          <FiSearch size={15} className="text-text_muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.buttons.search")}
            className="w-56 bg-transparent text-[13px] text-text_primary placeholder:text-text_muted focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 font-JetBrainsMono text-[12px] ${
              statusFilter === "all"
                ? "bg-accent_primary_cyan text-app_base"
                : "border border-border bg-panel text-text_secondary hover:border-elevated"
            }`}
          >
            {t("configurations.filters.all")} · {entries.length}
          </button>
          {(["valid", "warning", "error"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-JetBrainsMono text-[12px] text-text_secondary ${
                statusFilter === s
                  ? "border-elevated bg-surface"
                  : "border-border bg-panel hover:border-elevated"
              }`}
            >
              <StatusDot variant={s} />
              {counts[s]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={pickDirectory}
          className="flex items-center gap-2 rounded-lg border border-border bg-app_base px-3 py-2 font-JetBrainsMono text-[12px] text-text_secondary hover:border-accent_primary_cyan/60"
        >
          <FiFolder size={14} className="text-text_muted" />
          {dir ?? t("common.buttons.pickDirectory")}
        </button>

        <div className="flex-1" />

        {loading && (
          <span className="font-JetBrainsMono text-[12px] text-text_muted">
            {t("common.status.loading")}
          </span>
        )}

        <button
          type="button"
          onClick={pickFile}
          className="inline-flex items-center gap-1.5 rounded-lg border border-elevated bg-elevated px-3.5 py-2 font-SpaceGrotesk text-[12.5px] font-semibold text-text_secondary hover:bg-surface"
        >
          <FiFile size={13} />
          {t("welcome.actions.openFile.title")}
        </button>
        <button
          type="button"
          onClick={() => navigate("editor")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent_primary_cyan px-4 py-2 font-SpaceGrotesk text-[13px] font-semibold text-app_base shadow-[0_0_16px_-4px_var(--color-accent_primary_cyan)] transition-[filter] hover:brightness-110"
        >
          <FiPlus size={15} strokeWidth={2.3} />
          {t("common.buttons.newConfig")}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 overflow-auto">
          {loadError && (
            <div className="mx-5.5 mt-4 flex items-start gap-2.5 rounded-lg border border-status_error/30 bg-status_error/5 px-3.5 py-3 text-[13px] text-text_secondary">
              <FiAlertCircle size={16} className="mt-0.5 shrink-0 text-status_error" />
              <span>{loadError}</span>
            </div>
          )}
          {!loading && !loadError && entries.length === 0 && (
            <div className="px-5.5 py-8 text-[13px] text-text_muted">
              {dir
                ? t("configurations.emptyDirSelected")
                : t("configurations.emptyNoDir")}
            </div>
          )}

          {entries.length > 0 && (
            <>
              <div className="sticky top-0 grid grid-cols-[2.4fr_1fr_0.8fr_1.1fr_0.7fr_2.5rem_2.5rem] gap-2.5 border-b border-border bg-panel px-5.5 py-2.5 font-JetBrainsMono text-[10.5px] uppercase tracking-wider text-text_muted">
                <span>{t("configurations.table.file")}</span>
                <span>{t("configurations.table.type")}</span>
                <span>{t("configurations.table.format")}</span>
                <span>{t("configurations.table.status")}</span>
                <span>{t("configurations.table.size")}</span>
                <span />
                <span />
              </div>
              {filtered.map((entry) => {
                const status = statusOf(entry, statuses[entry.path]);
                return (
                  <div
                    key={entry.path}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("editor", entry.path)}
                    onKeyDown={(e) => e.key === "Enter" && navigate("editor", entry.path)}
                    title={entry.parse_error ?? undefined}
                    className="grid w-full cursor-pointer grid-cols-[2.4fr_1fr_0.8fr_1.1fr_0.7fr_2.5rem_2.5rem] items-center gap-2.5 border-b border-surface px-5.5 py-3 text-left transition-colors hover:bg-surface/60"
                  >
                    <span className="truncate font-JetBrainsMono text-[13px] text-text_primary">
                      {entry.file_name}
                    </span>
                    <span>
                      <Badge variant={TYPE_BADGE[entry.proxy_type ?? "unknown"]}>
                        {entry.proxy_type ? entry.proxy_type.toUpperCase() : "—"}
                      </Badge>
                    </span>
                    <span>
                      <Badge variant={FORMAT_BADGE[entry.file_extension]}>
                        {entry.file_extension}
                      </Badge>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-JetBrainsMono text-[12px]">
                      {entry.parse_error ? (
                        <>
                          <StatusDot variant="error" />
                          <span className="text-status_error">{t("common.status.parseError")}</span>
                        </>
                      ) : status === "unknown" ? (
                        <span className="text-text_muted">—</span>
                      ) : (
                        <>
                          <StatusDot variant={status} />
                          <span
                            className={
                              status === "valid"
                                ? "text-status_valid"
                                : status === "warning"
                                  ? "text-status_warning"
                                  : "text-status_error"
                            }
                          >
                            {t(`common.status.${status === "warning" ? "warn" : status}`)}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="font-JetBrainsMono text-[12px] text-text_muted">
                      {formatBytes(entry.size_bytes)}
                    </span>
                    <button
                      type="button"
                      title={t("common.buttons.checkCompatibility")}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("validation", entry.path);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-text_muted hover:bg-elevated hover:text-accent_primary_cyan"
                    >
                      <FiShield size={14} />
                    </button>
                    <button
                      type="button"
                      title={t("common.buttons.testConnectionAction")}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("test", entry.path);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-text_muted hover:bg-elevated hover:text-accent_select_violet"
                    >
                      <FiActivity size={14} />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {entries.length > 0 && (
          <div className="w-70 shrink-0 overflow-auto border-l border-border bg-panel p-5">
            <div className="mb-3.5 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
              {t("configurations.sidebar.overview")}
            </div>
            <div className="mb-2.5 flex h-2 overflow-hidden rounded-full">
              <div
                className="bg-status_valid"
                style={{ flex: counts.valid || 0.0001 }}
              />
              <div
                className="bg-status_warning"
                style={{ flex: counts.warning || 0.0001 }}
              />
              <div
                className="bg-status_error"
                style={{ flex: counts.error || 0.0001 }}
              />
            </div>
            <div className="mb-6 flex justify-between font-JetBrainsMono text-[11.5px] text-text_secondary">
              <span>
                <span className="text-status_valid">{counts.valid}</span>{" "}
                {t("common.status.valid")}
              </span>
              <span>
                <span className="text-status_warning">{counts.warning}</span>{" "}
                {t("common.status.warn")}
              </span>
              <span>
                <span className="text-status_error">{counts.error}</span>{" "}
                {t("common.status.error")}
              </span>
            </div>

            <div className="mb-3.5 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
              {t("configurations.sidebar.formats")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(formatCounts).map(([fmt, count]) => (
                <span
                  key={fmt}
                  className="rounded-md border border-border bg-app_base px-2.5 py-1 font-JetBrainsMono text-[11px] text-text_secondary"
                >
                  {fmt} · {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
