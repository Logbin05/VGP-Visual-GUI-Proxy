import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { save } from "@tauri-apps/plugin-dialog";
import CodeMirror from "@uiw/react-codemirror";
import type { ViewUpdate } from "@codemirror/view";
import {
  FiChevronDown,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiServer,
  FiLock,
  FiClock,
  FiSliders,
  FiShield,
  FiWifi,
  FiGlobe,
  FiFileText,
  FiBarChart2,
  FiCopy,
  FiActivity,
  FiCode,
  FiSave,
} from "react-icons/fi";
import { TopBar } from "../components/TopBar";
import { Toggle } from "../components/Toggle";
import { StatusDot } from "../components/StatusDot";
import { ContextMenu, type ContextMenuEntry } from "../components/ContextMenu";
import { defaultProxyConfig } from "../lib/defaultConfig";
import { getConfig, saveConfig, validateConfig } from "../lib/tauri";
import {
  dumpConfig,
  formatFromPath,
  loadConfig,
  RAW_FORMAT_EXT,
  type RawFormat,
} from "../lib/configSerialize";
import { languageFor } from "../lib/rawLanguages";
import { vgpEditorTheme } from "../lib/vgpEditorTheme";
import { copyToClipboard } from "../lib/clipboard";
import { useContextMenu } from "../lib/useContextMenu";
import { useAppStore } from "../store/useAppStore";
import type {
  AuthMethod,
  ConfigEntry,
  DnsStrategy,
  LoadBalancing,
  LogFormat,
  LogLevel,
  LogOutput,
  ProxyConfig,
  ProxyType,
  TlsVersion,
  ValidationIssue,
} from "../types/vgp";

const inputCls =
  "w-full rounded-lg border border-border bg-app_base px-3 py-2.5 font-JetBrainsMono text-[13px] text-text_primary outline-none focus:border-accent_primary_cyan focus:ring-2 focus:ring-accent_primary_cyan/15";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] text-text_secondary">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-[11px] leading-snug text-text_muted">{hint}</p>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

function OptionalTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      className={inputCls}
    />
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className={inputCls}
    />
  );
}

function OptionalNumberInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      placeholder="—"
      onChange={(e) =>
        onChange(e.target.value === "" ? null : Number(e.target.value))
      }
      className={inputCls}
    />
  );
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${inputCls} appearance-none pr-9`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <FiChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text_muted"
      />
    </div>
  );
}

function BoolRow({
  label,
  sub,
  on,
  onToggle,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-panel px-4 py-3.5">
      <div>
        <div className="text-[13px] text-text_primary">{label}</div>
        {sub && <div className="mt-0.5 text-[12px] text-text_muted">{sub}</div>}
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  description,
  registerRef,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description?: string;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div id={id} ref={(el) => registerRef(id, el)} className="mb-9 scroll-mt-6">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon size={14} />
        <span className="font-JetBrainsMono text-[11px] uppercase tracking-wider text-accent_primary_cyan">
          {title}
        </span>
      </div>
      {description && (
        <p className="mb-4 max-w-140 text-[12.5px] leading-relaxed text-text_muted">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

function OptionalSection({
  id,
  icon,
  title,
  description,
  registerRef,
  enabled,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description?: string;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <div id={id} ref={(el) => registerRef(id, el)} className="mb-9 scroll-mt-6">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} />
          <span className="font-JetBrainsMono text-[11px] uppercase tracking-wider text-accent_primary_cyan">
            {title}
          </span>
        </div>
        <Toggle on={enabled} onToggle={onToggle} />
      </div>
      {description && (
        <p className="mb-4 max-w-140 text-[12.5px] leading-relaxed text-text_muted">
          {description}
        </p>
      )}
      {enabled && children}
    </div>
  );
}

const NAV_SECTIONS = [
  { id: "server", icon: FiServer },
  { id: "auth", icon: FiLock },
  { id: "timeouts", icon: FiClock },
  { id: "limits", icon: FiSliders },
  { id: "tls", icon: FiShield },
  { id: "network", icon: FiWifi },
  { id: "dns", icon: FiGlobe },
  { id: "logging", icon: FiFileText },
  { id: "metrics", icon: FiBarChart2 },
] as const;

const PROXY_TYPES: readonly ProxyType[] = [
  "direct",
  "http",
  "https",
  "socks5",
  "shadowsocks",
  "transparent",
  "reverse",
];
const AUTH_METHODS: readonly AuthMethod[] = [
  "noauth",
  "userpass",
  "basic",
  "digest",
  "clientcert",
];
const TLS_VERSIONS: readonly TlsVersion[] = ["tls1.2", "tls1.3"];
const DNS_STRATEGIES: readonly DnsStrategy[] = [
  "ipv4_only",
  "ipv6_only",
  "prefer_ipv4",
  "prefer_ipv6",
];
const LOG_LEVELS: readonly LogLevel[] = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
];
const LOG_FORMATS: readonly LogFormat[] = ["text", "json"];
const LOG_OUTPUTS: readonly LogOutput[] = ["stdout", "stderr", "file"];
const LOAD_BALANCING: readonly LoadBalancing[] = [
  "round_robin",
  "least_conn",
  "ip_hash",
];
const RAW_FORMATS: readonly RawFormat[] = ["yaml", "json", "toml"];

function protocolDefaults(
  protocol: ProxyType,
): Pick<
  ProxyConfig,
  "socks5" | "http" | "shadowsocks" | "transparent" | "reverse"
> {
  const empty = {
    socks5: null,
    http: null,
    shadowsocks: null,
    transparent: null,
    reverse: null,
  };
  switch (protocol) {
    case "socks5":
      return {
        ...empty,
        socks5: { udp_associate: false, bind_enabled: false },
      };
    case "http":
      return {
        ...empty,
        http: {
          connect_enabled: true,
          forward_headers: null,
          strip_headers: null,
        },
      };
    case "shadowsocks":
      return {
        ...empty,
        shadowsocks: {
          method: "aes-256-gcm",
          password: "",
          plugin: null,
          plugin_opts: null,
        },
      };
    case "transparent":
      return { ...empty, transparent: { redirect_port: 12345, mark: null } };
    case "reverse":
      return {
        ...empty,
        reverse: {
          upstreams: [],
          load_balancing: "round_robin",
          health_check: null,
        },
      };
    default:
      return empty;
  }
}

export function EditorPage() {
  const { t } = useTranslation();
  const pendingOpen = useAppStore((s) => s.pendingOpen);
  const consumePendingOpen = useAppStore((s) => s.consumePendingOpen);
  const navigate = useAppStore((s) => s.navigate);
  const entries = useAppStore((s) => s.entries);
  const statuses = useAppStore((s) => s.statuses);

  const fileMenu = useContextMenu<ConfigEntry>();
  const editorMenu = useContextMenu<void>();

  const [config, setConfig] = useState<ProxyConfig>(defaultProxyConfig);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);

  const [mode, setMode] = useState<"form" | "raw">("form");
  const [rawFormat, setRawFormat] = useState<RawFormat>("yaml");
  const [rawText, setRawText] = useState(() =>
    dumpConfig(defaultProxyConfig(), "yaml"),
  );
  const [rawError, setRawError] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  const openConfig = (path: string) => {
    setOpening(true);
    setOpenError(null);
    setIssues(null);
    getConfig(path)
      .then((loaded) => {
        const fmt = formatFromPath(path);
        setConfig(loaded);
        setFilePath(path);
        setRawFormat(fmt);
        if (mode === "raw") setRawText(dumpConfig(loaded, fmt));
      })
      .catch((err) => setOpenError(String(err)))
      .finally(() => setOpening(false));
  };

  useEffect(() => {
    if (pendingOpen) {
      openConfig(pendingOpen);
      consumePendingOpen();
    }
  }, [pendingOpen]);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeSection, setActiveSection] = useState<string>("server");
  const registerSectionRef = (id: string, el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  };
  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    if (mode !== "form") return;
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        );
        setActiveSection(topMost.target.id);
      },
      { root, rootMargin: "-8% 0px -75% 0px", threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach(
      (el) => el && observer.observe(el),
    );
    return () => observer.disconnect();
  }, [mode]);

  const switchToRaw = () => {
    setRawText(dumpConfig(config, rawFormat));
    setRawError(null);
    setMode("raw");
  };

  const switchToForm = () => {
    try {
      const parsed = loadConfig(rawText, rawFormat);
      setConfig(parsed);
      setRawError(null);
      setMode("form");
    } catch (err) {
      setRawError(String(err));
    }
  };

  const patchServer = (p: Partial<ProxyConfig["server"]>) =>
    setConfig((c) => ({ ...c, server: { ...c.server, ...p } }));
  const patchAuth = (p: Partial<ProxyConfig["security"]["authentication"]>) =>
    setConfig((c) => ({
      ...c,
      security: { authentication: { ...c.security.authentication, ...p } },
    }));
  const patchTimeouts = (p: Partial<ProxyConfig["timeouts"]>) =>
    setConfig((c) => ({ ...c, timeouts: { ...c.timeouts, ...p } }));
  const patchLimits = (p: Partial<ProxyConfig["limits"]>) =>
    setConfig((c) => ({ ...c, limits: { ...c.limits, ...p } }));
  const patchNetwork = (p: Partial<ProxyConfig["network"]>) =>
    setConfig((c) => ({ ...c, network: { ...c.network, ...p } }));
  const patchLogging = (p: Partial<ProxyConfig["logging"]>) =>
    setConfig((c) => ({ ...c, logging: { ...c.logging, ...p } }));
  const patchMetrics = (p: Partial<ProxyConfig["metrics"]>) =>
    setConfig((c) => ({ ...c, metrics: { ...c.metrics, ...p } }));

  const setProtocol = (protocol: ProxyType) =>
    setConfig((c) => ({
      ...c,
      server: { ...c.server, protocol },
      ...protocolDefaults(protocol),
    }));

  const resolveConfigToSave = (): ProxyConfig | null => {
    if (mode !== "raw") return config;
    try {
      const parsed = loadConfig(rawText, rawFormat);
      setRawError(null);
      setConfig(parsed);
      return parsed;
    } catch (err) {
      setRawError(String(err));
      return null;
    }
  };

  const persist = async (configToSave: ProxyConfig, path: string) => {
    setSaving(true);
    setSaveError(null);
    setIssues(null);
    try {
      await saveConfig(configToSave, path);
      setFilePath(path);
      setRawFormat(formatFromPath(path));
      try {
        const result = await validateConfig(path);
        setIssues(result);
      } catch {}
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!filePath) return;
    const configToSave = resolveConfigToSave();
    if (!configToSave) return;
    await persist(configToSave, filePath);
  };

  const handleSaveAs = async () => {
    const configToSave = resolveConfigToSave();
    if (!configToSave) return;

    const orderedFormats = [
      rawFormat,
      ...RAW_FORMATS.filter((f) => f !== rawFormat),
    ];
    const path = await save({
      filters: orderedFormats.map((f) => ({
        name: f.toUpperCase(),
        extensions: [RAW_FORMAT_EXT[f]],
      })),
    });
    if (!path) return;

    await persist(configToSave, path);
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("editor.windowTitle")}>
        <div className="inline-flex rounded-lg border border-border bg-app_base p-0.5">
          <button
            type="button"
            onClick={() => mode !== "form" && switchToForm()}
            className={`rounded-md px-4 py-1.5 font-SpaceGrotesk text-[12.5px] font-semibold ${
              mode === "form"
                ? "bg-elevated text-text_primary"
                : "text-text_muted"
            }`}
          >
            {t("editor.viewToggle.form")}
          </button>
          <button
            type="button"
            onClick={() => mode !== "raw" && switchToRaw()}
            className={`rounded-md px-4 py-1.5 font-SpaceGrotesk text-[12.5px] font-semibold ${
              mode === "raw"
                ? "bg-elevated text-text_primary"
                : "text-text_muted"
            }`}
          >
            {t("editor.viewToggle.raw")}
          </button>
        </div>
        {opening && (
          <span className="ml-3 font-JetBrainsMono text-[12px] text-text_muted">
            {t("common.status.opening")}
          </span>
        )}
        {openError && (
          <span className="ml-3 inline-flex items-center gap-1.5 font-JetBrainsMono text-[12px] text-status_error">
            <FiAlertCircle size={13} />
            {openError}
          </span>
        )}
        {filePath && !opening && !openError && (
          <span className="ml-3 inline-flex items-center gap-1.5 font-JetBrainsMono text-[12px] text-status_valid">
            <StatusDot variant="valid" />
            {filePath}
          </span>
        )}
      </TopBar>

      <div className="flex flex-1 min-h-0">
        <div className="w-56 shrink-0 overflow-auto border-r border-border bg-panel p-3">
          <div className="mb-3 px-2 pt-1 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
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
            entries.map((entry) => {
              const entryIssues = statuses[entry.path];
              const dot = entry.parse_error
                ? "error"
                : entryIssues === undefined
                  ? "neutral"
                  : entryIssues === null
                    ? "neutral"
                    : entryIssues.some((i) => i.severity === "Error")
                      ? "error"
                      : entryIssues.some((i) => i.severity === "Warning")
                        ? "warning"
                        : "valid";
              const active = entry.path === filePath;
              return (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => navigate("editor", entry.path)}
                  onContextMenu={(e) => fileMenu.open(e, entry)}
                  title={entry.parse_error ?? undefined}
                  className={`mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left ${
                    active
                      ? "border border-accent_primary_cyan/30 bg-accent_primary_cyan/10"
                      : "border border-transparent hover:bg-surface"
                  }`}
                >
                  <span
                    className={`truncate font-JetBrainsMono text-[12px] ${active ? "text-text_primary" : "text-text_secondary"}`}
                  >
                    {entry.file_name}
                  </span>
                  <StatusDot variant={dot} />
                </button>
              );
            })
          )}
        </div>

        {mode === "raw" ? (
          <div className="flex flex-1 min-w-0 min-h-0 flex-col">
            <div className="flex shrink-0 items-center gap-3 border-b border-border bg-panel px-4 py-2.5">
              <span className="rounded-md border border-border bg-app_base px-3 py-1 font-JetBrainsMono text-[11.5px] font-semibold uppercase text-text_secondary">
                {rawFormat}
              </span>
              <div className="flex-1" />
              {filePath && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent_primary_cyan px-4 py-1.5 font-SpaceGrotesk text-[12.5px] font-semibold text-app_base shadow-[0_0_14px_-4px_var(--color-accent_primary_cyan)] hover:brightness-110 disabled:opacity-60"
                >
                  {saving
                    ? t("common.status.saving")
                    : t("common.buttons.save")}
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveAs}
                disabled={saving}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 font-SpaceGrotesk text-[12.5px] font-semibold hover:bg-surface disabled:opacity-60 ${
                  filePath
                    ? "border border-elevated bg-elevated text-text_secondary"
                    : "bg-accent_primary_cyan text-app_base shadow-[0_0_14px_-4px_var(--color-accent_primary_cyan)] hover:brightness-110"
                }`}
              >
                {saving
                  ? t("common.status.saving")
                  : t("common.buttons.saveAs")}
              </button>
              {saveError && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-status_error">
                  <FiAlertCircle size={13} />
                  {saveError}
                </span>
              )}
            </div>

            <div
              className="min-h-0 flex-1"
              onContextMenu={(e) => editorMenu.open(e, undefined)}
            >
              <CodeMirror
                value={rawText}
                onChange={setRawText}
                onUpdate={(vu: ViewUpdate) => {
                  const pos = vu.state.selection.main.head;
                  const line = vu.state.doc.lineAt(pos);
                  setCursor({ line: line.number, col: pos - line.from + 1 });
                }}
                extensions={[languageFor(rawFormat)]}
                theme={vgpEditorTheme}
                height="100%"
                className="h-full text-[13px] [&_.cm-editor]:h-full [&_.cm-scroller]:font-JetBrainsMono"
              />
            </div>

            {(rawError || issues) && (
              <div className="max-h-40 shrink-0 overflow-auto border-t border-border bg-panel px-4 py-2.5">
                {rawError ? (
                  <div className="flex items-start gap-2 py-0.5 text-[12.5px] text-status_error">
                    <FiAlertCircle size={13} className="mt-0.5 shrink-0" />
                    {rawError}
                  </div>
                ) : issues && issues.length === 0 ? (
                  <div className="flex items-center gap-2 py-0.5 text-[12.5px] text-status_valid">
                    <FiCheckCircle size={13} />
                    {t("common.status.valid")}
                  </div>
                ) : (
                  issues?.map((issue, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 py-0.5 text-[12.5px] ${
                        issue.severity === "Error"
                          ? "text-status_error"
                          : issue.severity === "Warning"
                            ? "text-status_warning"
                            : "text-status_testing"
                      }`}
                    >
                      {issue.severity === "Error" ? (
                        <FiAlertCircle size={13} className="mt-0.5 shrink-0" />
                      ) : issue.severity === "Warning" ? (
                        <FiAlertTriangle
                          size={13}
                          className="mt-0.5 shrink-0"
                        />
                      ) : (
                        <FiInfo size={13} className="mt-0.5 shrink-0" />
                      )}
                      {issue.message}
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex shrink-0 items-center gap-4 bg-accent_primary_cyan px-4 py-1 font-JetBrainsMono text-[11px] font-medium text-app_base">
              <span>{rawFormat.toUpperCase()}</span>
              <span>
                Ln {cursor.line}, Col {cursor.col}
              </span>
              <div className="flex-1" />
              {issues && (
                <span>
                  {issues.filter((i) => i.severity === "Error").length} errors ·{" "}
                  {issues.filter((i) => i.severity === "Warning").length}{" "}
                  warnings
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 min-w-0 min-h-0">
            <div className="w-52 shrink-0 overflow-auto border-r border-border bg-panel p-3">
              <div className="mb-3 px-2 pt-1 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
                {t("editor.nav.title")}
              </div>
              {NAV_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] ${
                    activeSection === s.id
                      ? "bg-accent_primary_cyan/10 text-text_primary"
                      : "text-text_secondary hover:bg-surface"
                  }`}
                >
                  <s.icon
                    size={14}
                    className={
                      activeSection === s.id
                        ? "text-accent_primary_cyan"
                        : "text-text_muted"
                    }
                  />
                  {t(`editor.nav.${s.id}`)}
                </button>
              ))}
            </div>

            <div
              ref={scrollRef}
              className="flex-1 min-w-0 overflow-auto"
              onContextMenu={(e) => editorMenu.open(e, undefined)}
            >
              <div className="max-w-180 p-6.5">
                <Section
                  id="server"
                  icon={FiServer}
                  title={t("editor.nav.server")}
                  description={t("editor.sections.server.description")}
                  registerRef={registerSectionRef}
                >
                  <div className="mb-6 grid grid-cols-2 gap-4">
                    <Field label={t("editor.sections.server.protocol")}>
                      <Select
                        value={config.server.protocol}
                        options={PROXY_TYPES}
                        onChange={setProtocol}
                      />
                    </Field>
                    <Field label="Host">
                      <TextInput
                        value={config.server.host}
                        onChange={(v) => patchServer({ host: v })}
                      />
                    </Field>
                    <Field label="Port">
                      <NumberInput
                        value={config.server.port}
                        onChange={(v) => patchServer({ port: v })}
                      />
                    </Field>
                    <Field
                      label={t("editor.sections.server.bindInterface")}
                      hint={t("editor.sections.server.bindInterfaceHint")}
                    >
                      <OptionalTextInput
                        value={config.server.bind_interface}
                        onChange={(v) => patchServer({ bind_interface: v })}
                        placeholder="eth0"
                      />
                    </Field>
                  </div>

                  {config.socks5 && (
                    <div className="grid grid-cols-2 gap-3">
                      <BoolRow
                        label="UDP associate"
                        sub={t("editor.sections.server.udpAssociateSub")}
                        on={config.socks5.udp_associate}
                        onToggle={() =>
                          setConfig((c) => ({
                            ...c,
                            socks5: c.socks5 && {
                              ...c.socks5,
                              udp_associate: !c.socks5.udp_associate,
                            },
                          }))
                        }
                      />
                      <BoolRow
                        label="BIND enabled"
                        sub={t("editor.sections.server.bindEnabledSub")}
                        on={config.socks5.bind_enabled}
                        onToggle={() =>
                          setConfig((c) => ({
                            ...c,
                            socks5: c.socks5 && {
                              ...c.socks5,
                              bind_enabled: !c.socks5.bind_enabled,
                            },
                          }))
                        }
                      />
                    </div>
                  )}

                  {config.http && (
                    <div className="flex flex-col gap-4">
                      <BoolRow
                        label="CONNECT enabled"
                        sub={t("editor.sections.server.connectEnabledSub")}
                        on={config.http.connect_enabled}
                        onToggle={() =>
                          setConfig((c) => ({
                            ...c,
                            http: c.http && {
                              ...c.http,
                              connect_enabled: !c.http.connect_enabled,
                            },
                          }))
                        }
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Field
                          label={t("editor.sections.server.forwardHeaders")}
                        >
                          <TextInput
                            value={
                              config.http.forward_headers?.join(", ") ?? ""
                            }
                            onChange={(v) =>
                              setConfig((c) => ({
                                ...c,
                                http: c.http && {
                                  ...c.http,
                                  forward_headers: v.trim()
                                    ? v.split(",").map((s) => s.trim())
                                    : null,
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field label={t("editor.sections.server.stripHeaders")}>
                          <TextInput
                            value={config.http.strip_headers?.join(", ") ?? ""}
                            onChange={(v) =>
                              setConfig((c) => ({
                                ...c,
                                http: c.http && {
                                  ...c.http,
                                  strip_headers: v.trim()
                                    ? v.split(",").map((s) => s.trim())
                                    : null,
                                },
                              }))
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {config.shadowsocks && (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Method">
                        <TextInput
                          value={config.shadowsocks.method}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              shadowsocks: c.shadowsocks && {
                                ...c.shadowsocks,
                                method: v,
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Password">
                        <TextInput
                          value={config.shadowsocks.password}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              shadowsocks: c.shadowsocks && {
                                ...c.shadowsocks,
                                password: v,
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Plugin">
                        <OptionalTextInput
                          value={config.shadowsocks.plugin}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              shadowsocks: c.shadowsocks && {
                                ...c.shadowsocks,
                                plugin: v,
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Plugin opts">
                        <OptionalTextInput
                          value={config.shadowsocks.plugin_opts}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              shadowsocks: c.shadowsocks && {
                                ...c.shadowsocks,
                                plugin_opts: v,
                              },
                            }))
                          }
                        />
                      </Field>
                    </div>
                  )}

                  {config.transparent && (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Redirect port">
                        <NumberInput
                          value={config.transparent.redirect_port}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              transparent: c.transparent && {
                                ...c.transparent,
                                redirect_port: v,
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field label="fwmark">
                        <OptionalNumberInput
                          value={config.transparent.mark}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              transparent: c.transparent && {
                                ...c.transparent,
                                mark: v,
                              },
                            }))
                          }
                        />
                      </Field>
                    </div>
                  )}

                  {config.reverse && (
                    <div className="flex flex-col gap-4">
                      <Field label={t("editor.sections.server.upstreams")}>
                        <TextInput
                          value={config.reverse.upstreams.join(", ")}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              reverse: c.reverse && {
                                ...c.reverse,
                                upstreams: v
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Load balancing">
                        <Select
                          value={config.reverse.load_balancing}
                          options={LOAD_BALANCING}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              reverse: c.reverse && {
                                ...c.reverse,
                                load_balancing: v,
                              },
                            }))
                          }
                        />
                      </Field>
                    </div>
                  )}
                </Section>

                <Section
                  id="auth"
                  icon={FiLock}
                  title={t("editor.nav.auth")}
                  description={t("editor.sections.auth.description")}
                  registerRef={registerSectionRef}
                >
                  <div className="mb-4">
                    <BoolRow
                      label="Authentication enabled"
                      on={config.security.authentication.enabled}
                      onToggle={() =>
                        patchAuth({
                          enabled: !config.security.authentication.enabled,
                        })
                      }
                    />
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <Field label="Method">
                      <Select
                        value={config.security.authentication.method}
                        options={AUTH_METHODS}
                        onChange={(v) => patchAuth({ method: v })}
                      />
                    </Field>
                    <Field
                      label="Users file"
                      hint={t("editor.sections.auth.usersFileHint")}
                    >
                      <OptionalTextInput
                        value={config.security.authentication.users_file}
                        onChange={(v) => patchAuth({ users_file: v })}
                        placeholder="creds/htpasswd"
                      />
                    </Field>
                  </div>
                  <Field
                    label={`Users (${config.security.authentication.users.length})`}
                  >
                    <div className="flex flex-col gap-2">
                      {config.security.authentication.users.map((u, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            value={u.username}
                            placeholder="username"
                            onChange={(e) =>
                              patchAuth({
                                users: config.security.authentication.users.map(
                                  (x, j) =>
                                    j === i
                                      ? { ...x, username: e.target.value }
                                      : x,
                                ),
                              })
                            }
                            className={inputCls}
                          />
                          <input
                            value={u.password}
                            placeholder="password"
                            onChange={(e) =>
                              patchAuth({
                                users: config.security.authentication.users.map(
                                  (x, j) =>
                                    j === i
                                      ? { ...x, password: e.target.value }
                                      : x,
                                ),
                              })
                            }
                            className={inputCls}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              patchAuth({
                                users:
                                  config.security.authentication.users.filter(
                                    (_, j) => j !== i,
                                  ),
                              })
                            }
                            className="shrink-0 rounded-lg border border-border px-3 text-text_muted hover:border-status_error/50 hover:text-status_error"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          patchAuth({
                            users: [
                              ...config.security.authentication.users,
                              { username: "", password: "" },
                            ],
                          })
                        }
                        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-[12px] text-text_muted hover:border-accent_primary_cyan/50 hover:text-text_secondary"
                      >
                        <FiPlus size={13} /> {t("common.buttons.addUser")}
                      </button>
                    </div>
                  </Field>
                </Section>

                <Section
                  id="timeouts"
                  icon={FiClock}
                  title={t("editor.nav.timeouts")}
                  description={t("editor.sections.timeouts.description")}
                  registerRef={registerSectionRef}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Connect (sec)">
                      <NumberInput
                        value={config.timeouts.connect_sec}
                        onChange={(v) => patchTimeouts({ connect_sec: v })}
                      />
                    </Field>
                    <Field label="Read (sec)">
                      <NumberInput
                        value={config.timeouts.read_sec}
                        onChange={(v) => patchTimeouts({ read_sec: v })}
                      />
                    </Field>
                    <Field label="Write (sec)">
                      <NumberInput
                        value={config.timeouts.write_sec}
                        onChange={(v) => patchTimeouts({ write_sec: v })}
                      />
                    </Field>
                    <Field
                      label="Idle (sec)"
                      hint={t("editor.sections.timeouts.idleHint")}
                    >
                      <NumberInput
                        value={config.timeouts.idle_sec}
                        onChange={(v) => patchTimeouts({ idle_sec: v })}
                      />
                    </Field>
                    <Field label="Handshake (sec)">
                      <OptionalNumberInput
                        value={config.timeouts.handshake_sec}
                        onChange={(v) => patchTimeouts({ handshake_sec: v })}
                      />
                    </Field>
                  </div>
                </Section>

                <Section
                  id="limits"
                  icon={FiSliders}
                  title={t("editor.nav.limits")}
                  description={t("editor.sections.limits.description")}
                  registerRef={registerSectionRef}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Max connections"
                      hint={t("editor.sections.limits.maxConnectionsHint")}
                    >
                      <NumberInput
                        value={config.limits.max_connections}
                        onChange={(v) => patchLimits({ max_connections: v })}
                      />
                    </Field>
                    <Field label="Max connections / IP">
                      <OptionalNumberInput
                        value={config.limits.max_connections_per_ip}
                        onChange={(v) =>
                          patchLimits({ max_connections_per_ip: v })
                        }
                      />
                    </Field>
                    <Field
                      label="Rate limit (req/s)"
                      hint={t("editor.sections.limits.rateLimitHint")}
                    >
                      <OptionalNumberInput
                        value={config.limits.rate_limit_rps}
                        onChange={(v) => patchLimits({ rate_limit_rps: v })}
                      />
                    </Field>
                    <Field label="Bandwidth limit (Mb/s)">
                      <OptionalNumberInput
                        value={config.limits.bandwidth_limit_mbps}
                        onChange={(v) =>
                          patchLimits({ bandwidth_limit_mbps: v })
                        }
                      />
                    </Field>
                    <Field label="Max request size (bytes)">
                      <OptionalNumberInput
                        value={config.limits.max_request_size}
                        onChange={(v) => patchLimits({ max_request_size: v })}
                      />
                    </Field>
                  </div>
                </Section>

                <OptionalSection
                  id="tls"
                  icon={FiShield}
                  title={t("editor.nav.tls")}
                  description={t("editor.sections.tls.description")}
                  registerRef={registerSectionRef}
                  enabled={config.tls !== null}
                  onToggle={() =>
                    setConfig((c) => ({
                      ...c,
                      tls:
                        c.tls === null
                          ? {
                              enabled: true,
                              cert_path: null,
                              key_path: null,
                              min_version: null,
                              ciphers: null,
                              verify_peer: true,
                              sni: null,
                            }
                          : null,
                    }))
                  }
                >
                  {config.tls && (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Cert path">
                        <OptionalTextInput
                          value={config.tls.cert_path}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              tls: c.tls && { ...c.tls, cert_path: v },
                            }))
                          }
                          placeholder="/etc/vgp/cert.pem"
                        />
                      </Field>
                      <Field label="Key path">
                        <OptionalTextInput
                          value={config.tls.key_path}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              tls: c.tls && { ...c.tls, key_path: v },
                            }))
                          }
                          placeholder="/etc/vgp/key.pem"
                        />
                      </Field>
                      <Field label="Min version">
                        <Select
                          value={config.tls.min_version ?? "tls1.2"}
                          options={TLS_VERSIONS}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              tls: c.tls && { ...c.tls, min_version: v },
                            }))
                          }
                        />
                      </Field>
                      <Field label="SNI">
                        <OptionalTextInput
                          value={config.tls.sni}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              tls: c.tls && { ...c.tls, sni: v },
                            }))
                          }
                        />
                      </Field>
                      <div className="col-span-2">
                        <BoolRow
                          label="Verify peer"
                          sub={t("editor.sections.tls.verifyPeerSub")}
                          on={config.tls.verify_peer}
                          onToggle={() =>
                            setConfig((c) => ({
                              ...c,
                              tls: c.tls && {
                                ...c.tls,
                                verify_peer: !c.tls.verify_peer,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </OptionalSection>

                <Section
                  id="network"
                  icon={FiWifi}
                  title={t("editor.nav.network")}
                  description={t("editor.sections.network.description")}
                  registerRef={registerSectionRef}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <BoolRow
                      label="TCP nodelay"
                      sub={t("editor.sections.network.tcpNodelaySub")}
                      on={config.network.tcp_nodelay}
                      onToggle={() =>
                        patchNetwork({
                          tcp_nodelay: !config.network.tcp_nodelay,
                        })
                      }
                    />
                    <BoolRow
                      label="Keep-alive"
                      sub={t("editor.sections.network.keepAliveSub")}
                      on={config.network.keep_alive}
                      onToggle={() =>
                        patchNetwork({ keep_alive: !config.network.keep_alive })
                      }
                    />
                    <BoolRow
                      label="Reuse port"
                      sub={t("editor.sections.network.reusePortSub")}
                      on={config.network.reuse_port}
                      onToggle={() =>
                        patchNetwork({ reuse_port: !config.network.reuse_port })
                      }
                    />
                    <Field label="Keep-alive interval (sec)">
                      <OptionalNumberInput
                        value={config.network.keep_alive_interval_sec}
                        onChange={(v) =>
                          patchNetwork({ keep_alive_interval_sec: v })
                        }
                      />
                    </Field>
                  </div>
                </Section>

                <OptionalSection
                  id="dns"
                  icon={FiGlobe}
                  title={t("editor.nav.dns")}
                  description={t("editor.sections.dns.description")}
                  registerRef={registerSectionRef}
                  enabled={config.dns !== null}
                  onToggle={() =>
                    setConfig((c) => ({
                      ...c,
                      dns:
                        c.dns === null
                          ? {
                              upstream: "1.1.1.1",
                              strategy: null,
                              cache_ttl_sec: null,
                              doh_url: null,
                            }
                          : null,
                    }))
                  }
                >
                  {config.dns && (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Upstream">
                        <TextInput
                          value={config.dns.upstream}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              dns: c.dns && { ...c.dns, upstream: v },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Strategy">
                        <Select
                          value={config.dns.strategy ?? "prefer_ipv4"}
                          options={DNS_STRATEGIES}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              dns: c.dns && { ...c.dns, strategy: v },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Cache TTL (sec)">
                        <OptionalNumberInput
                          value={config.dns.cache_ttl_sec}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              dns: c.dns && { ...c.dns, cache_ttl_sec: v },
                            }))
                          }
                        />
                      </Field>
                      <Field label="DoH URL">
                        <OptionalTextInput
                          value={config.dns.doh_url}
                          onChange={(v) =>
                            setConfig((c) => ({
                              ...c,
                              dns: c.dns && { ...c.dns, doh_url: v },
                            }))
                          }
                        />
                      </Field>
                    </div>
                  )}
                </OptionalSection>

                <Section
                  id="logging"
                  icon={FiFileText}
                  title={t("editor.nav.logging")}
                  description={t("editor.sections.logging.description")}
                  registerRef={registerSectionRef}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Level">
                      <Select
                        value={config.logging.level}
                        options={LOG_LEVELS}
                        onChange={(v) => patchLogging({ level: v })}
                      />
                    </Field>
                    <Field label="Format">
                      <Select
                        value={config.logging.format}
                        options={LOG_FORMATS}
                        onChange={(v) => patchLogging({ format: v })}
                      />
                    </Field>
                    <Field label="Output">
                      <Select
                        value={config.logging.output}
                        options={LOG_OUTPUTS}
                        onChange={(v) => patchLogging({ output: v })}
                      />
                    </Field>
                    {config.logging.output === "file" && (
                      <Field label="File path">
                        <OptionalTextInput
                          value={config.logging.file_path}
                          onChange={(v) => patchLogging({ file_path: v })}
                          placeholder="/var/log/vgp/access.log"
                        />
                      </Field>
                    )}
                  </div>
                </Section>

                <Section
                  id="metrics"
                  icon={FiBarChart2}
                  title={t("editor.nav.metrics")}
                  description={t("editor.sections.metrics.description")}
                  registerRef={registerSectionRef}
                >
                  <div className="mb-4">
                    <BoolRow
                      label="Metrics enabled"
                      on={config.metrics.enabled}
                      onToggle={() =>
                        patchMetrics({ enabled: !config.metrics.enabled })
                      }
                    />
                  </div>
                  {config.metrics.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Host">
                        <TextInput
                          value={config.metrics.host}
                          onChange={(v) => patchMetrics({ host: v })}
                        />
                      </Field>
                      <Field
                        label="Port"
                        hint={
                          config.metrics.port === config.server.port
                            ? t("editor.sections.metrics.portConflictHint")
                            : undefined
                        }
                      >
                        <NumberInput
                          value={config.metrics.port}
                          onChange={(v) => patchMetrics({ port: v })}
                        />
                      </Field>
                      <Field label="Path">
                        <OptionalTextInput
                          value={config.metrics.path}
                          onChange={(v) => patchMetrics({ path: v })}
                          placeholder="/metrics"
                        />
                      </Field>
                    </div>
                  )}
                </Section>

                <div className="flex items-center gap-3 border-t border-border pt-6">
                  {filePath && (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent_primary_cyan px-4.5 py-2.5 font-SpaceGrotesk text-[13px] font-semibold text-app_base shadow-[0_0_16px_-4px_var(--color-accent_primary_cyan)] hover:brightness-110 disabled:opacity-60"
                    >
                      {saving
                        ? t("common.status.saving")
                        : t("common.buttons.save")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveAs}
                    disabled={saving}
                    className={`inline-flex items-center gap-2 rounded-lg px-4.5 py-2.5 font-SpaceGrotesk text-[13px] font-semibold disabled:opacity-60 ${
                      filePath
                        ? "border border-elevated bg-elevated text-text_secondary hover:bg-surface"
                        : "bg-accent_primary_cyan text-app_base shadow-[0_0_16px_-4px_var(--color-accent_primary_cyan)] hover:brightness-110"
                    }`}
                  >
                    {saving
                      ? t("common.status.saving")
                      : t("common.buttons.saveAs")}
                  </button>
                  {saveError && (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-status_error">
                      <FiAlertCircle size={14} />
                      {saveError}
                    </span>
                  )}
                </div>

                {issues !== null && (
                  <div className="mt-5">
                    <div className="mb-3 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
                      {t("editor.saveResultTitle")}
                    </div>
                    {issues.length === 0 ? (
                      <div className="flex items-center gap-2.5 rounded-lg border border-status_valid/30 bg-status_valid/8 px-3.5 py-3 text-[13px] text-status_valid">
                        <FiCheckCircle size={16} />
                        {t("common.status.valid")}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {issues.map((issue, i) => (
                          <div
                            key={i}
                            className={`rounded-lg border px-3.5 py-2.5 text-[13px] ${
                              issue.severity === "Error"
                                ? "border-status_error/25 bg-status_error/6 text-status_error"
                                : issue.severity === "Warning"
                                  ? "border-status_warning/22 bg-status_warning/5 text-status_warning"
                                  : "border-status_testing/20 bg-status_testing/4 text-status_testing"
                            }`}
                          >
                            {issue.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {fileMenu.menu && (
        <ContextMenu
          x={fileMenu.menu.x}
          y={fileMenu.menu.y}
          onClose={fileMenu.close}
          items={buildFileMenuItems(fileMenu.menu.data)}
        />
      )}
      {editorMenu.menu && (
        <ContextMenu
          x={editorMenu.menu.x}
          y={editorMenu.menu.y}
          onClose={editorMenu.close}
          items={buildEditorMenuItems()}
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
        label: t("common.buttons.checkCompatibility"),
        icon: FiShield,
        onClick: () => navigate("validation", entry.path),
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

  function buildEditorMenuItems(): ContextMenuEntry[] {
    return [
      {
        label: t("common.buttons.save"),
        icon: FiSave,
        disabled: !filePath || saving,
        onClick: () => void handleSave(),
      },
      {
        label: t("common.buttons.saveAs"),
        icon: FiSave,
        disabled: saving,
        onClick: () => void handleSaveAs(),
      },
      { separator: true },
      mode === "raw"
        ? {
            label: t("editor.viewToggle.form"),
            icon: FiCode,
            onClick: () => switchToForm(),
          }
        : {
            label: t("editor.viewToggle.raw"),
            icon: FiCode,
            onClick: () => switchToRaw(),
          },
      { separator: true },
      {
        label: t("common.buttons.checkCompatibility"),
        icon: FiShield,
        disabled: !filePath,
        onClick: () => filePath && navigate("validation", filePath),
      },
      {
        label: t("common.buttons.testConnectionAction"),
        icon: FiActivity,
        disabled: !filePath,
        onClick: () => filePath && navigate("test", filePath),
      },
      { separator: true },
      {
        label: t("common.buttons.copyPath"),
        icon: FiCopy,
        disabled: !filePath,
        onClick: () => filePath && copyToClipboard(filePath),
      },
    ];
  }
}
