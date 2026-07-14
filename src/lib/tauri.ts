import { invoke } from "@tauri-apps/api/core";
import i18n from "../lang/i18n";
import type {
  ConfigEntry,
  ProxyConfig,
  TestResult,
  ValidationIssue,
} from "../types/vgp";

export function listConfigs(dir: string): Promise<ConfigEntry[]> {
  return invoke<ConfigEntry[]>("list_configs", { dir });
}

export function validateConfig(path: string): Promise<ValidationIssue[]> {
  return invoke<ValidationIssue[]>("validate_config", { path });
}

export function saveConfig(config: ProxyConfig, path: string): Promise<void> {
  return invoke<void>("save_config", { config, path });
}

export function getConfig(path: string): Promise<ProxyConfig> {
  return invoke<ProxyConfig>("get_config", { path });
}

export function testConnection(
  proxyAddr: string,
  targetHost = "example.com",
  targetPort = 80,
  username: string | null = null,
  password: string | null = null,
): Promise<TestResult> {
  return invoke<TestResult>("test_connection", {
    proxyAddr,
    targetHost,
    targetPort,
    username,
    password,
  });
}

export function testConfigFile(
  path: string,
  targetHost: string,
  targetPort: number,
): Promise<TestResult> {
  return invoke<TestResult>("test_config_file", {
    path,
    targetHost,
    targetPort,
  });
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(i18n.t("common.errors.timeout", { seconds: ms / 1000 })),
        ),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export function parseRustSystemTime(raw: string): Date | null {
  const match = raw.match(/tv_sec:\s*(-?\d+)/);
  if (!match) return null;
  return new Date(Number(match[1]) * 1000);
}
