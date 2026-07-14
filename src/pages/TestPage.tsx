import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  FiPlay,
  FiLoader,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiChevronDown,
  FiCode,
  FiShield,
  FiCopy,
  FiTrash2,
} from "react-icons/fi";
import { TopBar } from "../components/TopBar";
import { Toggle } from "../components/Toggle";
import { ContextMenu, type ContextMenuEntry } from "../components/ContextMenu";
import { testConnection, testConfigFile, withTimeout } from "../lib/tauri";
import { copyToClipboard } from "../lib/clipboard";
import { useContextMenu } from "../lib/useContextMenu";
import { useAppStore } from "../store/useAppStore";
import type { TestResult } from "../types/vgp";

type Phase = "idle" | "running" | "done";
type Source = "config" | "manual";

interface RunRecord {
  time: string;
  label: string;
  result: TestResult;
  path?: string;
}

const RUN_TIMEOUT_MS = 15000;

function classifyError(
  t: TFunction,
  message: string,
): { label: string; detail: string } {
  if (/with code \d+/i.test(message)) {
    return {
      label: t("testRunner.errors.proxyReachableTargetFailed"),
      detail: message,
    };
  }
  if (/^connect failed:/i.test(message)) {
    return { label: t("testRunner.errors.proxyUnreachable"), detail: message };
  }
  return { label: t("testRunner.errors.generic"), detail: message };
}

export function TestPage() {
  const { t, i18n } = useTranslation();
  const entries = useAppStore((s) => s.entries);
  const navigate = useAppStore((s) => s.navigate);
  const activeFile = useAppStore((s) => s.activeFile);

  const [source, setSource] = useState<Source>(
    entries.length > 0 ? "config" : "manual",
  );
  const [selectedPath, setSelectedPath] = useState(
    () =>
      (activeFile && entries.some((e) => e.path === activeFile)
        ? activeFile
        : entries[0]?.path) ?? "",
  );
  const [addr, setAddr] = useState("127.0.0.1:1080");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [targetHost, setTargetHost] = useState("example.com");
  const [targetPort, setTargetPort] = useState(80);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<RunRecord[]>([]);

  const historyMenu = useContextMenu<RunRecord>();
  const generalMenu = useContextMenu<void>();

  const canRun =
    (source === "config" ? Boolean(selectedPath) : Boolean(addr)) &&
    Boolean(targetHost) &&
    targetPort > 0;

  const run = async () => {
    setPhase("running");
    setResult(null);
    setError(null);
    const stamp = new Date().toLocaleTimeString(i18n.language, {
      hour12: false,
    });
    const label =
      source === "config"
        ? (entries.find((e) => e.path === selectedPath)?.file_name ??
          selectedPath)
        : addr;

    try {
      const res = await withTimeout(
        source === "config"
          ? testConfigFile(selectedPath, targetHost, targetPort)
          : testConnection(
              addr,
              targetHost,
              targetPort,
              needsAuth ? username : null,
              needsAuth ? password : null,
            ),
        RUN_TIMEOUT_MS,
      );
      setResult(res);
      setHistory((h) =>
        [
          {
            time: stamp,
            label,
            result: res,
            path: source === "config" ? selectedPath : undefined,
          },
          ...h,
        ].slice(0, 8),
      );
    } catch (err) {
      setError(String(err));
    } finally {
      setPhase("done");
    }
  };

  const isRunning = phase === "running";
  const isDone = phase === "done";
  const failed = isDone && (error !== null || result?.success === false);
  const passed = isDone && result?.success === true;

  const statusStyle = passed
    ? {
        border: "border-status_valid/30",
        bg: "bg-status_valid/8",
        color: "text-status_valid",
      }
    : failed
      ? {
          border: "border-status_error/30",
          bg: "bg-status_error/8",
          color: "text-status_error",
        }
      : isRunning
        ? {
            border: "border-status_testing/30",
            bg: "bg-status_testing/8",
            color: "text-status_testing",
          }
        : {
            border: "border-border",
            bg: "bg-panel",
            color: "text-text_secondary",
          };

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("testRunner.windowTitle")} />

      <div className="flex shrink-0 flex-col gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-border bg-app_base p-0.5">
            <button
              type="button"
              onClick={() => setSource("config")}
              className={`rounded-md px-4 py-1.5 font-SpaceGrotesk text-[12.5px] font-semibold ${
                source === "config"
                  ? "bg-elevated text-text_primary"
                  : "text-text_muted"
              }`}
            >
              {t("testRunner.sourceConfig")}
            </button>
            <button
              type="button"
              onClick={() => setSource("manual")}
              className={`rounded-md px-4 py-1.5 font-SpaceGrotesk text-[12.5px] font-semibold ${
                source === "manual"
                  ? "bg-elevated text-text_primary"
                  : "text-text_muted"
              }`}
            >
              {t("testRunner.sourceManual")}
            </button>
          </div>

          {source === "config" ? (
            entries.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate("configs")}
                className="rounded-lg border border-dashed border-border px-3.5 py-2.5 text-[12.5px] text-text_muted hover:border-elevated"
              >
                {t("common.emptyStates.fileListEmpty")}
              </button>
            ) : (
              <div className="relative">
                <select
                  value={selectedPath}
                  onChange={(e) => setSelectedPath(e.target.value)}
                  className="w-70 appearance-none rounded-lg border border-border bg-app_base px-3.5 py-2.5 pr-9 font-JetBrainsMono text-[13px] text-text_primary outline-none focus:border-accent_primary_cyan/60"
                >
                  {entries.map((e) => (
                    <option key={e.path} value={e.path}>
                      {e.file_name}
                    </option>
                  ))}
                </select>
                <FiChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text_muted"
                />
              </div>
            )
          ) : (
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="host:port"
              className="w-65 rounded-lg border border-border bg-app_base px-3.5 py-2.5 font-JetBrainsMono text-[13px] text-text_primary outline-none focus:border-accent_primary_cyan/60"
            />
          )}

          <span className="text-[12px] text-text_muted">
            {t("testRunner.targetLabel")}
          </span>
          <input
            value={targetHost}
            onChange={(e) => setTargetHost(e.target.value)}
            placeholder={t("testRunner.targetHostPlaceholder")}
            className="w-45 rounded-lg border border-border bg-app_base px-3 py-2.5 font-JetBrainsMono text-[13px] text-text_primary outline-none focus:border-accent_primary_cyan/60"
          />
          <input
            type="number"
            value={targetPort}
            onChange={(e) => setTargetPort(Number(e.target.value) || 0)}
            placeholder={t("testRunner.targetPortPlaceholder")}
            className="w-20 rounded-lg border border-border bg-app_base px-3 py-2.5 font-JetBrainsMono text-[13px] text-text_primary outline-none focus:border-accent_primary_cyan/60"
          />

          <div className="flex-1" />

          <button
            type="button"
            onClick={run}
            disabled={isRunning || !canRun}
            className="inline-flex items-center gap-2 rounded-lg bg-accent_primary_cyan px-4.5 py-2.5 font-SpaceGrotesk text-[13px] font-semibold text-app_base shadow-[0_0_16px_-4px_var(--color-accent_primary_cyan)] transition-[filter] hover:brightness-110 disabled:opacity-70"
          >
            {isRunning ? (
              <FiLoader size={16} className="animate-spin" />
            ) : (
              <FiPlay size={13} />
            )}
            {isRunning
              ? t("testRunner.runInProgress")
              : t("common.buttons.run")}
          </button>
        </div>

        {source === "manual" && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Toggle on={needsAuth} onToggle={() => setNeedsAuth((v) => !v)} />
              <span className="text-[12.5px] text-text_secondary">
                {t("testRunner.requiresAuth")}
              </span>
            </div>
            {needsAuth && (
              <>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-40 rounded-lg border border-border bg-app_base px-3 py-2 font-JetBrainsMono text-[12.5px] text-text_primary outline-none focus:border-accent_primary_cyan/60"
                />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  type="password"
                  className="w-40 rounded-lg border border-border bg-app_base px-3 py-2 font-JetBrainsMono text-[12.5px] text-text_primary outline-none focus:border-accent_primary_cyan/60"
                />
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex flex-1 min-w-0 flex-col p-6">
          <div className="mb-3 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
            {t("testRunner.testLogTitle")}
          </div>
          <div
            className="flex-1 overflow-auto rounded-xl border border-border bg-app_base px-5 py-4.5 font-JetBrainsMono text-[13px] leading-loose"
            onContextMenu={(e) => generalMenu.open(e, undefined)}
          >
            {phase === "idle" && (
              <div className="text-text_muted">
                {t("testRunner.waitingForStart")}
              </div>
            )}
            {isRunning && (
              <div className="text-status_testing">
                {t("testRunner.runningLog")}
              </div>
            )}
            {isDone && (
              <div
                className={failed ? "text-status_error" : "text-status_valid"}
              >
                {failed
                  ? (() => {
                      const c = classifyError(
                        t,
                        error ?? result?.error ?? "unknown error",
                      );
                      return `${c.label}: ${c.detail}`;
                    })()
                  : `SOCKS5 handshake + CONNECT to ${targetHost}:${targetPort} OK (connect ${result?.connect_ms} ms, handshake ${result?.handshake_ms} ms)`}
              </div>
            )}

            {history.length > 0 && (
              <>
                <div className="mt-5 mb-2 text-[11px] uppercase tracking-wider text-text_muted">
                  {t("testRunner.sessionRuns")}
                </div>
                {history.map((h, i) => (
                  <div
                    key={i}
                    onContextMenu={(e) => historyMenu.open(e, h)}
                    className="flex items-center gap-2.5 text-[12.5px] text-text_secondary"
                  >
                    <span className="text-text_muted">[{h.time}]</span>
                    <span
                      className={
                        h.result.success
                          ? "text-status_valid"
                          : "text-status_error"
                      }
                    >
                      {h.result.success ? "OK" : "FAIL"}
                    </span>
                    <span className="truncate">{h.label}</span>
                    {h.result.success && (
                      <span className="text-text_muted">
                        {h.result.connect_ms}/{h.result.handshake_ms}/
                        {h.result.total_ms} ms
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="w-85 shrink-0 overflow-auto border-l border-border bg-panel p-5.5">
          <div
            className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3.5 ${statusStyle.border} ${statusStyle.bg}`}
          >
            {passed ? (
              <FiCheckCircle size={20} className="text-status_valid" />
            ) : failed ? (
              <FiXCircle size={20} className="text-status_error" />
            ) : isRunning ? (
              <FiLoader
                size={20}
                className="animate-spin text-status_testing"
              />
            ) : (
              <FiClock size={20} className="text-text_muted" />
            )}
            <div>
              <div
                className={`font-SpaceGrotesk text-[15px] font-semibold ${statusStyle.color}`}
              >
                {passed
                  ? t("common.status.passed")
                  : failed
                    ? classifyError(t, error ?? result?.error ?? "").label
                    : isRunning
                      ? "RUNNING"
                      : "READY"}
              </div>
              <div className="mt-0.5 text-[12px] text-text_muted">
                {passed
                  ? `connect ${result?.connect_ms}ms · handshake ${result?.handshake_ms}ms`
                  : failed
                    ? classifyError(t, error ?? result?.error ?? "").detail
                    : isRunning
                      ? t("testRunner.establishingConnection")
                      : t("testRunner.awaitingStart")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-app_base p-3.5">
              <div className="font-JetBrainsMono text-[10.5px] uppercase tracking-wider text-text_muted">
                {t("testRunner.metrics.latency")}
              </div>
              <div
                className={`mt-1.5 font-JetBrainsMono text-size_lg ${isDone ? "text-text_primary" : "text-text_muted/50"}`}
              >
                {isDone && result ? `${result.connect_ms} ms` : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-app_base p-3.5">
              <div className="font-JetBrainsMono text-[10.5px] uppercase tracking-wider text-text_muted">
                {t("testRunner.metrics.handshake")}
              </div>
              <div
                className={`mt-1.5 font-JetBrainsMono text-size_lg ${isDone ? "text-text_primary" : "text-text_muted/50"}`}
              >
                {isDone && result ? `${result.handshake_ms} ms` : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-app_base p-3.5">
              <div className="font-JetBrainsMono text-[10.5px] uppercase tracking-wider text-text_muted">
                {t("testRunner.metrics.total")}
              </div>
              <div
                className={`mt-1.5 font-JetBrainsMono text-size_lg ${isDone ? "text-text_primary" : "text-text_muted/50"}`}
              >
                {isDone && result ? `${result.total_ms} ms` : "—"}
              </div>
            </div>
            <div
              className="rounded-lg border border-border bg-app_base p-3.5"
              title={t("testRunner.throughputTooltip")}
            >
              <div className="font-JetBrainsMono text-[10.5px] uppercase tracking-wider text-text_muted">
                {t("testRunner.metrics.throughput")}
              </div>
              <div className="mt-1.5 font-JetBrainsMono text-size_lg text-text_muted/50">
                —
              </div>
            </div>
          </div>
        </div>
      </div>

      {historyMenu.menu && (
        <ContextMenu
          x={historyMenu.menu.x}
          y={historyMenu.menu.y}
          onClose={historyMenu.close}
          items={buildHistoryMenuItems(historyMenu.menu.data)}
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

  function buildHistoryMenuItems(record: RunRecord): ContextMenuEntry[] {
    const items: ContextMenuEntry[] = [];
    if (record.path) {
      const path = record.path;
      items.push(
        {
          label: t("common.buttons.openInEditor"),
          icon: FiCode,
          onClick: () => navigate("editor", path),
        },
        {
          label: t("common.buttons.checkCompatibility"),
          icon: FiShield,
          onClick: () => navigate("validation", path),
        },
        { separator: true },
      );
    }
    items.push({
      label: t("common.buttons.copyResult"),
      icon: FiCopy,
      onClick: () =>
        copyToClipboard(
          `${record.label}: ${record.result.success ? "OK" : "FAIL"} (connect ${record.result.connect_ms}ms, handshake ${record.result.handshake_ms}ms, total ${record.result.total_ms}ms)${
            record.result.error ? ` — ${record.result.error}` : ""
          }`,
        ),
    });
    return items;
  }

  function buildGeneralMenuItems(): ContextMenuEntry[] {
    return [
      {
        label: t("common.buttons.run"),
        icon: FiPlay,
        disabled: isRunning || !canRun,
        onClick: () => void run(),
      },
      { separator: true },
      {
        label: t("common.buttons.clearHistory"),
        icon: FiTrash2,
        disabled: history.length === 0,
        danger: true,
        onClick: () => setHistory([]),
      },
    ];
  }
}
