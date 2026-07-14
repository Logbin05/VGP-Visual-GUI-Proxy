import { useState } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  FiCheck,
  FiExternalLink,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { SiGithub, SiTelegram } from "react-icons/si";
import { TopBar } from "../components/TopBar";
import { Toggle } from "../components/Toggle";
import { VgpLogo } from "../components/VgpLogo";
import { checkForUpdate, getLastCheckedAt } from "../lib/updater";
import {
  getAccent,
  getDensity,
  getTheme,
  setAccent as persistAccent,
  setDensity as persistDensity,
  setTheme as persistTheme,
  type Accent,
  type Density,
  type Theme,
} from "../lib/preferences";

const LINKS = [
  { label: "GitHub", url: "https://github.com/Logbin05", icon: SiGithub },
  { label: "Telegram", url: "https://t.me/kernel1panic", icon: SiTelegram },
];

const ACCENTS: { id: Accent; color: string }[] = [
  { id: "cyan", color: "var(--color-accent_primary_cyan)" },
  { id: "violet", color: "var(--color-accent_select_violet)" },
  { id: "green", color: "var(--color-status_valid)" },
  { id: "amber", color: "var(--color-status_warning)" },
  { id: "pink", color: "#FF6AD5" },
];

const NAV_ITEMS = [
  "appearance",
  "language",
  "workspace",
  "editor",
  "git",
  "advanced",
  "about",
] as const;

function ThemeSwatch({
  active,
  onClick,
  label,
  preview,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  preview: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`overflow-hidden rounded-xl border-2 text-left transition-colors ${
        active ? "border-accent_primary_cyan" : "border-transparent"
      }`}
    >
      {preview}
      <div className="flex items-center justify-between bg-panel px-3 py-2.5">
        <span className="text-[13px] text-text_primary">{label}</span>
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
            active ? "border-accent_primary_cyan" : "border-elevated"
          }`}
        >
          {active && (
            <span className="h-1.5 w-1.5 rounded-full bg-accent_primary_cyan" />
          )}
        </span>
      </div>
    </button>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [section, setSection] =
    useState<(typeof NAV_ITEMS)[number]>("appearance");
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [accent, setAccentState] = useState<Accent>(getAccent);
  const [density, setDensityState] = useState<Density>(getDensity);
  const [panels, setPanels] = useState({
    rail: true,
    inspector: true,
    minimap: false,
    statusBar: true,
  });

  const [checkState, setCheckState] = useState<
    "idle" | "checking" | "upToDate" | "available" | "error"
  >("idle");
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const runManualCheck = async () => {
    setCheckState("checking");
    setCheckMessage(null);
    try {
      const update = await checkForUpdate();
      if (update) {
        setCheckState("available");
        setCheckMessage(
          t("settings.about.updateAvailable", { version: update.version }),
        );
      } else {
        setCheckState("upToDate");
        setCheckMessage(t("settings.about.upToDate"));
      }
    } catch (err) {
      setCheckState("error");
      setCheckMessage(String(err));
    }
  };

  const chooseTheme = (t: Theme) => {
    persistTheme(t);
    setThemeState(t);
  };
  const chooseAccent = (a: Accent) => {
    persistAccent(a);
    setAccentState(a);
  };
  const chooseDensity = (d: Density) => {
    persistDensity(d);
    setDensityState(d);
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("settings.windowTitle")} />

      <div className="flex flex-1 min-h-0">
        <div className="w-57 shrink-0 border-r border-border bg-panel p-3">
          <div className="mb-3.5 px-2 pt-1 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
            {t("settings.nav.title")}
          </div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSection(item)}
              className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] ${
                section === item
                  ? "border border-accent_primary_cyan/28 bg-accent_primary_cyan/10 text-text_primary"
                  : "border border-transparent text-text_secondary hover:bg-surface"
              }`}
            >
              {t(`settings.nav.${item}`)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-8">
          {section === "about" ? (
            <>
              <div className="mb-8 flex items-center gap-4">
                <VgpLogo size={52} />
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="font-SpaceGrotesk text-size_lg font-semibold text-text_primary">
                      VGP
                    </h1>
                    <span className="rounded-md border border-border bg-panel px-2.5 py-1 font-JetBrainsMono text-[12px] text-text_secondary">
                      alpha-release
                    </span>
                  </div>
                  <div className="mt-0.5 font-JetBrainsMono text-[12.5px] text-text_muted">
                    Visual GUI Proxy
                  </div>
                </div>
              </div>

              <div className="mb-3.5 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
                {t("settings.about.linksTitle")}
              </div>
              <div className="mb-8 flex flex-col gap-2 max-w-100">
                {LINKS.map((link) => (
                  <button
                    key={link.url}
                    type="button"
                    onClick={() => openUrl(link.url)}
                    className="flex items-center gap-3 rounded-lg border border-border bg-panel px-3.5 py-2.5 text-left hover:border-elevated hover:bg-surface"
                  >
                    <link.icon size={16} className="text-text_secondary" />
                    <span className="flex-1 text-[13.5px] text-text_primary">
                      {link.label}
                    </span>
                    <FiExternalLink size={13} className="text-text_muted" />
                  </button>
                ))}
              </div>

              <div className="mb-3.5 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
                {t("settings.about.updatesTitle")}
              </div>
              <div className="flex max-w-100 items-center gap-3">
                <button
                  type="button"
                  onClick={runManualCheck}
                  disabled={checkState === "checking"}
                  className="inline-flex items-center gap-2 rounded-lg border border-elevated bg-elevated px-3.5 py-2 font-SpaceGrotesk text-[12.5px] font-semibold text-text_primary hover:bg-surface disabled:opacity-60"
                >
                  <FiRefreshCw
                    size={13}
                    className={
                      checkState === "checking"
                        ? "animate-spin text-accent_primary_cyan"
                        : "text-accent_primary_cyan"
                    }
                  />
                  {t("common.buttons.checkUpdates")}
                </button>
                {checkMessage && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-[12.5px] ${
                      checkState === "error"
                        ? "text-status_error"
                        : checkState === "available"
                          ? "text-accent_primary_cyan"
                          : "text-status_valid"
                    }`}
                  >
                    {checkState === "error" ? (
                      <FiAlertCircle size={13} />
                    ) : (
                      <FiCheckCircle size={13} />
                    )}
                    {checkMessage}
                  </span>
                )}
              </div>
              <p className="mt-2 max-w-100 text-[11.5px] leading-relaxed text-text_muted">
                {t("settings.about.autoCheckNote")}
                {getLastCheckedAt() &&
                  t("settings.about.lastChecked", {
                    date: new Date(getLastCheckedAt()!).toLocaleString(
                      i18n.language,
                    ),
                  })}
              </p>
            </>
          ) : section !== "appearance" ? (
            <div className="text-[13px] text-text_muted">
              {t("settings.sectionNotImplemented", {
                section: t(`settings.nav.${section}`),
              })}
            </div>
          ) : (
            <>
              <h1 className="mb-1 font-SpaceGrotesk text-[24px] font-semibold text-text_primary">
                {t("settings.appearance.title")}
              </h1>
              <p className="mb-7 max-w-160 text-[14px] text-text_secondary">
                {t("settings.appearance.subtitle")}
              </p>

              <div className="mb-3.5 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
                {t("settings.appearance.theme")}
              </div>
              <div className="mb-8 grid max-w-160 grid-cols-3 gap-3.5">
                <ThemeSwatch
                  active={theme === "dark"}
                  onClick={() => chooseTheme("dark")}
                  label={t("settings.appearance.themes.dark")}
                  preview={
                    <div className="flex h-22 gap-1.5 bg-app_base p-2.5">
                      <div className="w-3.5 rounded bg-panel" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <div className="h-2.5 rounded bg-elevated" />
                        <div className="h-2.5 w-3/4 rounded bg-accent_primary_cyan" />
                        <div className="h-2.5 rounded bg-elevated" />
                      </div>
                    </div>
                  }
                />
                <ThemeSwatch
                  active={theme === "light"}
                  onClick={() => chooseTheme("light")}
                  label={t("settings.appearance.themes.light")}
                  preview={
                    <div className="flex h-22 gap-1.5 bg-[#E9EDF3] p-2.5">
                      <div className="w-3.5 rounded bg-[#F4F7FB]" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <div className="h-2.5 rounded bg-[#D5DCE7]" />
                        <div className="h-2.5 w-3/4 rounded bg-[#0891B2]" />
                        <div className="h-2.5 rounded bg-[#D5DCE7]" />
                      </div>
                    </div>
                  }
                />
                <ThemeSwatch
                  active={theme === "system"}
                  onClick={() => chooseTheme("system")}
                  label={t("settings.appearance.themes.system")}
                  preview={
                    <div className="flex h-22">
                      <div className="flex-1 bg-app_base p-2.5">
                        <div className="mb-1.5 h-2.5 rounded bg-elevated" />
                        <div className="h-2.5 w-4/5 rounded bg-accent_primary_cyan" />
                      </div>
                      <div className="flex-1 bg-[#E9EDF3] p-2.5">
                        <div className="mb-1.5 h-2.5 rounded bg-[#D5DCE7]" />
                        <div className="h-2.5 w-4/5 rounded bg-[#0891B2]" />
                      </div>
                    </div>
                  }
                />
              </div>

              <div className="mb-3.5 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
                {t("settings.appearance.accentColor")}
              </div>
              <div className="mb-8 flex gap-3.5">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => chooseAccent(a.id)}
                    className="h-11 w-11 rounded-xl ring-offset-2 ring-offset-app_base transition-shadow"
                    style={{
                      background: a.color,
                      boxShadow:
                        accent === a.id
                          ? `0 0 0 2px var(--color-app_base), 0 0 0 4px var(--color-text_primary)`
                          : "none",
                    }}
                  />
                ))}
              </div>

              <div className="mb-3.5 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
                {t("settings.appearance.density")}
              </div>
              <div className="mb-8 inline-flex rounded-lg border border-border bg-app_base p-0.5">
                {(["compact", "comfortable", "spacious"] as Density[]).map(
                  (d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => chooseDensity(d)}
                      className={`rounded-md px-4.5 py-2 font-SpaceGrotesk text-[13px] font-semibold ${
                        density === d
                          ? "bg-elevated text-text_primary"
                          : "text-text_muted"
                      }`}
                    >
                      {t(`settings.appearance.densities.${d}`)}
                    </button>
                  ),
                )}
              </div>

              <div className="grid max-w-180 grid-cols-2 gap-8.5">
                <div>
                  <div className="mb-3.5 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
                    {t("settings.languageSection.title")}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(["ru", "en"] as const).map((lng) => (
                      <button
                        key={lng}
                        type="button"
                        onClick={() => i18n.changeLanguage(lng)}
                        className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left ${
                          i18n.language === lng
                            ? "border-accent_primary_cyan/30 bg-accent_primary_cyan/8"
                            : "border-border bg-panel"
                        }`}
                      >
                        <span className="text-[13.5px] text-text_primary">
                          {lng === "ru" ? "Русский" : "English"}
                        </span>
                        {i18n.language === lng && (
                          <FiCheck
                            size={16}
                            className="text-accent_primary_cyan"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3.5 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
                    {t("settings.workspacePanels.title")}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {(
                      [
                        ["rail", t("settings.workspacePanels.leftRail")],
                        ["inspector", t("settings.workspacePanels.inspector")],
                        ["minimap", t("settings.workspacePanels.minimap")],
                        ["statusBar", t("settings.workspacePanels.statusBar")],
                      ] as const
                    ).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-border bg-panel px-3.5 py-2.5"
                      >
                        <span className="text-[13.5px] text-text_primary">
                          {label}
                        </span>
                        <Toggle
                          on={panels[key]}
                          onToggle={() =>
                            setPanels((p) => ({ ...p, [key]: !p[key] }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
