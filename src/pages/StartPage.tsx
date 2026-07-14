import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { FiFolder, FiPlus, FiShield, FiCode, FiActivity } from "react-icons/fi";
import { VgpLogo } from "../components/VgpLogo";
import { Toggle } from "../components/Toggle";
import { StatusDot } from "../components/StatusDot";
import { useAppStore, type Page } from "../store/useAppStore";
import { getRecentFiles, type RecentFile } from "../lib/recent";
import { formatCompactTime } from "../lib/format";

function ActionRow({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  iconColor: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3.5 rounded-xl border border-border bg-panel px-4 py-3.5 text-left transition-colors hover:border-accent_primary_cyan/60 hover:bg-surface"
    >
      <span
        className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `color-mix(in oklch, ${iconColor} 12%, transparent)`,
        }}
      >
        <Icon size={18} />
      </span>
      <span>
        <span className="block text-[14px] font-medium text-text_primary">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] text-text_muted">
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function QuickStartCard({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  iconColor: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border bg-panel p-4.5 text-left transition-colors hover:border-elevated"
    >
      <span
        className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg"
        style={{
          background: `color-mix(in oklch, ${iconColor} 12%, transparent)`,
        }}
      >
        <Icon size={17} />
      </span>
      <span className="block text-[13.5px] font-medium text-text_primary">
        {title}
      </span>
      <span className="mt-1.5 block text-[12px] leading-relaxed text-text_muted">
        {subtitle}
      </span>
    </button>
  );
}

export function StartPage() {
  const { t } = useTranslation();
  const navigate = useAppStore((s) => s.navigate);
  const [showOnStartup, setShowOnStartup] = useState(true);
  const [recent, setRecent] = useState<RecentFile[]>([]);

  useEffect(() => {
    setRecent(getRecentFiles());
  }, []);

  const goTo = (page: Page) => () => navigate(page);

  const openFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "Config", extensions: ["yaml", "yml", "json", "toml", "ini"] },
      ],
    });
    if (typeof selected === "string") navigate("editor", selected);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-215 px-10 pb-10 pt-14">
        <div className="mb-11 flex items-center gap-4.5">
          <VgpLogo size={60} />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-SpaceGrotesk text-size_xl font-bold tracking-tight text-text_primary">
                {t("welcome.appName")}
              </h1>
              <span className="rounded-md border border-border bg-panel px-2.5 py-1 font-JetBrainsMono text-[12px] text-text_secondary">
                alpha-release
              </span>
            </div>
            <div className="mt-1 font-JetBrainsMono text-[13px] tracking-wide text-text_muted">
              {t("welcome.tagline")}
            </div>
          </div>
        </div>

        <div className="mb-11 grid grid-cols-2 gap-10">
          <div>
            <div className="mb-4 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
              {t("welcome.sections.getStarted")}
            </div>
            <div className="flex flex-col gap-2.5">
              <ActionRow
                icon={FiPlus}
                iconColor="var(--color-accent_primary_cyan)"
                title={t("welcome.actions.newConfig.title")}
                subtitle={t("welcome.actions.newConfig.subtitle")}
                onClick={goTo("editor")}
              />
              <ActionRow
                icon={FiFolder}
                iconColor="var(--color-text_secondary)"
                title={t("welcome.actions.openFile.title")}
                subtitle={t("welcome.actions.openFile.subtitle")}
                onClick={openFile}
              />
            </div>
          </div>

          <div>
            <div className="mb-4 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
              {t("welcome.sections.recent")}
            </div>
            {recent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-3.5 text-[12.5px] text-text_muted">
                {t("welcome.recentEmpty")}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {recent.map((r) => {
                  const name = r.path.split(/[\\/]/).pop() ?? r.path;
                  const dir = r.path.slice(0, r.path.length - name.length);
                  return (
                    <button
                      key={r.path}
                      type="button"
                      onClick={() => navigate("editor", r.path)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface"
                    >
                      <StatusDot variant="neutral" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-JetBrainsMono text-[13px] text-text_primary">
                          {name}
                        </span>
                        <span className="block truncate font-JetBrainsMono text-[11px] text-text_muted">
                          {dir}
                        </span>
                      </span>
                      <span className="text-[11.5px] text-text_muted">
                        {formatCompactTime(r.openedAt, t)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 font-JetBrainsMono text-[11px] uppercase tracking-wider text-text_muted">
          {t("welcome.sections.quickStart")}
        </div>
        <div className="mb-10 grid grid-cols-3 gap-3.5">
          <QuickStartCard
            icon={FiCode}
            iconColor="var(--color-accent_primary_cyan)"
            title={t("welcome.quickStart.formRaw.title")}
            subtitle={t("welcome.quickStart.formRaw.subtitle")}
            onClick={goTo("editor")}
          />
          <QuickStartCard
            icon={FiShield}
            iconColor="var(--color-status_valid)"
            title={t("welcome.quickStart.compatCheck.title")}
            subtitle={t("welcome.quickStart.compatCheck.subtitle")}
            onClick={goTo("validation")}
          />
          <QuickStartCard
            icon={FiActivity}
            iconColor="var(--color-accent_select_violet)"
            title={t("welcome.quickStart.testConfigs.title")}
            subtitle={t("welcome.quickStart.testConfigs.subtitle")}
            onClick={goTo("test")}
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-5.5">
          <div className="flex items-center gap-2.5">
            <Toggle
              on={showOnStartup}
              onToggle={() => setShowOnStartup((v) => !v)}
            />
            <span className="text-[13px] text-text_secondary">
              {t("welcome.showOnStartup")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
