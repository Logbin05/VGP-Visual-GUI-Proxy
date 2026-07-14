import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiRefreshCw,
  FiCheckCircle,
  FiCode,
  FiActivity,
  FiCopy,
} from "react-icons/fi";
import { TopBar } from "../components/TopBar";
import { Badge } from "../components/Badge";
import { StatusDot } from "../components/StatusDot";
import { ContextMenu, type ContextMenuEntry } from "../components/ContextMenu";
import { validateConfig } from "../lib/tauri";
import { copyToClipboard } from "../lib/clipboard";
import { useContextMenu } from "../lib/useContextMenu";
import { useAppStore } from "../store/useAppStore";
import type { ConfigEntry, Severity, ValidationIssue } from "../types/vgp";

const SEVERITY_META: Record<
  Severity,
  { icon: typeof FiAlertCircle; color: string; bg: string; border: string }
> = {
  Error: {
    icon: FiAlertCircle,
    color: "text-status_error",
    bg: "bg-status_error/6",
    border: "border-status_error/25",
  },
  Warning: {
    icon: FiAlertTriangle,
    color: "text-status_warning",
    bg: "bg-status_warning/5",
    border: "border-status_warning/22",
  },
  Info: {
    icon: FiInfo,
    color: "text-status_testing",
    bg: "bg-status_testing/4",
    border: "border-status_testing/20",
  },
};

export function ValidationPage() {
  const { t } = useTranslation();
  const navigate = useAppStore((s) => s.navigate);
  const entries = useAppStore((s) => s.entries);
  const activeFile = useAppStore((s) => s.activeFile);
  const setStatus = useAppStore((s) => s.setStatus);

  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileMenu = useContextMenu<ConfigEntry>();
  const issueMenu = useContextMenu<ValidationIssue>();
  const generalMenu = useContextMenu<void>();

  const currentEntry = entries.find((e) => e.path === activeFile);
  const displayName =
    currentEntry?.file_name ?? activeFile?.split(/[\\/]/).pop() ?? null;

  const runCheck = (path: string) => {
    setLoading(true);
    setError(null);
    validateConfig(path)
      .then((result) => {
        setIssues(result);
        setStatus(path, result);
      })
      .catch((err) => {
        setIssues(null);
        setError(String(err));
        setStatus(path, null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (activeFile) runCheck(activeFile);
  }, [activeFile]);

  const errorCount = issues?.filter((i) => i.severity === "Error").length ?? 0;
  const warnCount = issues?.filter((i) => i.severity === "Warning").length ?? 0;
  const infoCount = issues?.filter((i) => i.severity === "Info").length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("validation.windowTitle")}>
        {errorCount > 0 && (
          <span className="inline-flex items-center gap-1.5 font-JetBrainsMono text-[12px] text-status_error">
            <StatusDot variant="error" />
            {t("validation.errorsBlockTest", { count: errorCount })}
          </span>
        )}
      </TopBar>

      <div className="flex flex-1 min-h-0">
        <div className="w-55 shrink-0 overflow-auto border-r border-border bg-panel p-3">
          <div className="mb-3 px-1 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
            {t("editor.filesPanel")}
          </div>
          {entries.length === 0 ? (
            <button
              type="button"
              onClick={() => navigate("configs")}
              className="w-full rounded-lg border border-dashed border-border px-3 py-3 text-left text-[12px] text-text_muted hover:border-elevated"
            >
              {t("common.emptyStates.fileListEmpty")}
            </button>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                onClick={() => navigate("validation", entry.path)}
                onContextMenu={(e) => fileMenu.open(e, entry)}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left ${
                  entry.path === activeFile
                    ? "border border-accent_primary_cyan/30 bg-accent_primary_cyan/10"
                    : "border border-transparent hover:bg-surface"
                }`}
              >
                <span
                  className={`truncate font-JetBrainsMono text-[12px] ${entry.path === activeFile ? "text-text_primary" : "text-text_secondary"}`}
                >
                  {entry.file_name}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex flex-1 min-w-0 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-5.5 py-4">
            <span className="font-SpaceGrotesk text-[15px] font-semibold text-text_primary">
              {displayName ?? t("editor.filesPanel")}
            </span>
            {currentEntry?.proxy_type && (
              <Badge variant="cyan">
                {currentEntry.proxy_type.toUpperCase()}
              </Badge>
            )}
            <div className="flex-1" />
            {activeFile && (
              <button
                type="button"
                disabled={loading}
                onClick={() => runCheck(activeFile)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-elevated bg-elevated px-3.5 py-1.5 font-SpaceGrotesk text-[12.5px] font-semibold text-text_primary hover:bg-surface disabled:opacity-50"
              >
                <FiRefreshCw
                  size={13}
                  className={`text-accent_primary_cyan ${loading ? "animate-spin" : ""}`}
                />
                {t("common.buttons.recheck")}
              </button>
            )}
          </div>

          <div
            className="flex-1 overflow-auto p-5"
            onContextMenu={(e) => generalMenu.open(e, undefined)}
          >
            {!activeFile && (
              <div className="text-[13px] text-text_muted">
                {t("validation.emptyNoFile")}
              </div>
            )}

            {activeFile && !loading && error && (
              <div
                className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] ${SEVERITY_META.Error.bg} ${SEVERITY_META.Error.border} text-text_secondary`}
              >
                <FiAlertCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-status_error"
                />
                <span>{error}</span>
              </div>
            )}

            {activeFile && !loading && !error && issues && (
              <>
                <div className="mb-5 flex gap-2">
                  <span className="flex-1 rounded-lg border border-status_error/30 bg-status_error/10 py-1.5 text-center font-JetBrainsMono text-[12px] text-status_error">
                    {t("validation.tabs.errors", { count: errorCount })}
                  </span>
                  <span className="flex-1 rounded-lg border border-status_warning/28 bg-status_warning/8 py-1.5 text-center font-JetBrainsMono text-[12px] text-status_warning">
                    {t("validation.tabs.warn", { count: warnCount })}
                  </span>
                  <span className="flex-1 rounded-lg border border-status_testing/26 bg-status_testing/8 py-1.5 text-center font-JetBrainsMono text-[12px] text-status_testing">
                    {t("validation.tabs.info", { count: infoCount })}
                  </span>
                </div>

                <div className="mb-3.5 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
                  {t("validation.diagnosticsTitle")}
                </div>

                {issues.length === 0 ? (
                  <div className="flex items-center gap-2.5 rounded-lg border border-status_valid/30 bg-status_valid/8 px-3.5 py-3 text-[13px] text-status_valid">
                    <FiCheckCircle size={16} />
                    {t("common.status.valid")}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {issues.map((issue, i) => {
                      const meta = SEVERITY_META[issue.severity];
                      const Icon = meta.icon;
                      return (
                        <div
                          key={i}
                          onContextMenu={(e) => issueMenu.open(e, issue)}
                          className={`flex gap-2.5 rounded-lg border px-3.5 py-3 ${meta.bg} ${meta.border}`}
                        >
                          <Icon
                            size={17}
                            className={`mt-0.5 shrink-0 ${meta.color}`}
                          />
                          <div className="whitespace-pre-line text-[13px] leading-relaxed text-text_primary">
                            {issue.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {fileMenu.menu && (
        <ContextMenu
          x={fileMenu.menu.x}
          y={fileMenu.menu.y}
          onClose={fileMenu.close}
          items={buildFileMenuItems(fileMenu.menu.data)}
        />
      )}
      {issueMenu.menu && (
        <ContextMenu
          x={issueMenu.menu.x}
          y={issueMenu.menu.y}
          onClose={issueMenu.close}
          items={buildIssueMenuItems(issueMenu.menu.data)}
        />
      )}
      {generalMenu.menu && (
        <ContextMenu
          x={generalMenu.menu.x}
          y={generalMenu.menu.y}
          onClose={generalMenu.close}
          items={buildGeneralMenuItems()}
        />
      )}
    </div>
  );

  function buildFileMenuItems(entry: ConfigEntry): ContextMenuEntry[] {
    return [
      {
        label: t("common.buttons.openInEditor"),
        icon: FiCode,
        onClick: () => navigate("editor", entry.path),
      },
      {
        label: t("common.buttons.testConnectionAction"),
        icon: FiActivity,
        onClick: () => navigate("test", entry.path),
      },
      { separator: true },
      {
        label: t("common.buttons.copyPath"),
        icon: FiCopy,
        onClick: () => copyToClipboard(entry.path),
      },
    ];
  }

  function buildIssueMenuItems(issue: ValidationIssue): ContextMenuEntry[] {
    return [
      {
        label: t("common.buttons.copyMessage"),
        icon: FiCopy,
        onClick: () => copyToClipboard(issue.message),
      },
    ];
  }

  function buildGeneralMenuItems(): ContextMenuEntry[] {
    return [
      {
        label: t("common.buttons.recheck"),
        icon: FiRefreshCw,
        disabled: !activeFile || loading,
        onClick: () => activeFile && runCheck(activeFile),
      },
      { separator: true },
      {
        label: t("common.buttons.openInEditor"),
        icon: FiCode,
        disabled: !activeFile,
        onClick: () => activeFile && navigate("editor", activeFile),
      },
      {
        label: t("common.buttons.testConnectionAction"),
        icon: FiActivity,
        disabled: !activeFile,
        onClick: () => activeFile && navigate("test", activeFile),
      },
    ];
  }
}
