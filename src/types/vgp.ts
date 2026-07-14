export type ProxyType =
  | "direct"
  | "http"
  | "https"
  | "socks5"
  | "shadowsocks"
  | "transparent"
  | "reverse";

export type AuthMethod = "noauth" | "userpass" | "basic" | "digest" | "clientcert";

export interface UserCredential {
  username: string;
  password: string;
}

export interface AuthConfig {
  enabled: boolean;
  method: AuthMethod;
  users: UserCredential[];
  users_file: string | null;
  token: string | null;
}

export interface SecurityConfig {
  authentication: AuthConfig;
}

export interface ServerConfig {
  host: string;
  port: number;
  protocol: ProxyType;
  bind_interface: string | null;
}

export interface TimeoutsConfig {
  connect_sec: number;
  read_sec: number;
  write_sec: number;
  idle_sec: number;
  handshake_sec: number | null;
}

export interface LimitsConfig {
  max_connections: number;
  max_connections_per_ip: number | null;
  rate_limit_rps: number | null;
  bandwidth_limit_mbps: number | null;
  max_request_size: number | null;
}

export type TlsVersion = "tls1.2" | "tls1.3";

export interface TlsConfig {
  enabled: boolean;
  cert_path: string | null;
  key_path: string | null;
  min_version: TlsVersion | null;
  ciphers: string[] | null;
  verify_peer: boolean;
  sni: string | null;
}

export interface NetworkConfig {
  tcp_nodelay: boolean;
  keep_alive: boolean;
  keep_alive_interval_sec: number | null;
  reuse_port: boolean;
  send_buffer_size: number | null;
  recv_buffer_size: number | null;
}

export type DnsStrategy = "ipv4_only" | "ipv6_only" | "prefer_ipv4" | "prefer_ipv6";

export interface DnsConfig {
  upstream: string;
  strategy: DnsStrategy | null;
  cache_ttl_sec: number | null;
  doh_url: string | null;
}

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";
export type LogFormat = "text" | "json";
export type LogOutput = "stdout" | "stderr" | "file";

export interface LoggingConfig {
  level: LogLevel;
  format: LogFormat;
  output: LogOutput;
  file_path: string | null;
  access_log: boolean | null;
}

export interface MetricsConfig {
  enabled: boolean;
  host: string;
  port: number;
  path: string | null;
}

export interface Socks5Options {
  udp_associate: boolean;
  bind_enabled: boolean;
}

export interface HttpOptions {
  connect_enabled: boolean;
  forward_headers: string[] | null;
  strip_headers: string[] | null;
}

export interface ShadowsocksOptions {
  method: string;
  password: string;
  plugin: string | null;
  plugin_opts: string | null;
}

export interface TransparentOptions {
  redirect_port: number;
  mark: number | null;
}

export type LoadBalancing = "round_robin" | "least_conn" | "ip_hash";

export interface HealthCheckConfig {
  enabled: boolean;
  interval_sec: number;
  path: string;
}

export interface ReverseOptions {
  upstreams: string[];
  load_balancing: LoadBalancing;
  health_check: HealthCheckConfig | null;
}

export interface ProxyConfig {
  server: ServerConfig;
  security: SecurityConfig;
  timeouts: TimeoutsConfig;
  limits: LimitsConfig;
  tls: TlsConfig | null;
  network: NetworkConfig;
  dns: DnsConfig | null;
  logging: LoggingConfig;
  metrics: MetricsConfig;
  socks5: Socks5Options | null;
  http: HttpOptions | null;
  shadowsocks: ShadowsocksOptions | null;
  transparent: TransparentOptions | null;
  reverse: ReverseOptions | null;
}

export type FileType = "Yaml" | "Toml" | "Json" | "Ini";

export interface ConfigEntry {
  file_name: string;
  file_extension: FileType;
  path: string;
  proxy_type: ProxyType | null;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  parse_error: string | null;
}

export type Severity = "Error" | "Warning" | "Info";

export interface ValidationIssue {
  severity: Severity;
  message: string;
}

export interface TestResult {
  success: boolean;
  connect_ms: number;
  handshake_ms: number;
  total_ms: number;
  error: string | null;
}
