import { dump as yamlDump, load as yamlLoad } from "js-yaml";
import { parse as tomlParse, stringify as tomlStringify } from "smol-toml";
import { defaultProxyConfig } from "./defaultConfig";
import type { ProxyConfig } from "../types/vgp";

export type RawFormat = "yaml" | "json" | "toml";

export const RAW_FORMAT_EXT: Record<RawFormat, string> = {
  yaml: "yaml",
  json: "json",
  toml: "toml",
};

export function formatFromPath(path: string | null): RawFormat {
  if (!path) return "yaml";
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "json") return "json";
  if (ext === "toml") return "toml";
  return "yaml";
}

function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null) continue;
      out[k] = stripNulls(v);
    }
    return out;
  }
  return value;
}

export function dumpConfig(config: ProxyConfig, format: RawFormat): string {
  switch (format) {
    case "yaml":
      return yamlDump(config, { noRefs: true, lineWidth: -1 });
    case "json":
      return JSON.stringify(config, null, 2);
    case "toml":
      return tomlStringify(stripNulls(config) as Record<string, unknown>);
  }
}

function normalize(
  partial: Partial<ProxyConfig> & Record<string, unknown>,
): ProxyConfig {
  const d = defaultProxyConfig();
  const p = partial as Record<string, Record<string, unknown> | undefined>;
  return {
    server: { ...d.server, ...p.server },
    security: {
      authentication: {
        ...d.security.authentication,
        ...(p.security?.authentication as Record<string, unknown> | undefined),
      },
    },
    timeouts: { ...d.timeouts, ...p.timeouts },
    limits: { ...d.limits, ...p.limits },
    tls: (partial.tls as ProxyConfig["tls"]) ?? null,
    network: { ...d.network, ...p.network },
    dns: (partial.dns as ProxyConfig["dns"]) ?? null,
    logging: { ...d.logging, ...p.logging },
    metrics: { ...d.metrics, ...p.metrics },
    socks5: (partial.socks5 as ProxyConfig["socks5"]) ?? null,
    http: (partial.http as ProxyConfig["http"]) ?? null,
    shadowsocks: (partial.shadowsocks as ProxyConfig["shadowsocks"]) ?? null,
    transparent: (partial.transparent as ProxyConfig["transparent"]) ?? null,
    reverse: (partial.reverse as ProxyConfig["reverse"]) ?? null,
  };
}

export function loadConfig(text: string, format: RawFormat): ProxyConfig {
  switch (format) {
    case "yaml":
      return normalize((yamlLoad(text) as Partial<ProxyConfig>) ?? {});
    case "json":
      return normalize(JSON.parse(text));
    case "toml":
      return normalize(tomlParse(text) as Partial<ProxyConfig>);
  }
}
