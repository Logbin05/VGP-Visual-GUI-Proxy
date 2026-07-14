use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProxyConfig {
    pub server: ServerConfig,
    pub security: SecurityConfig,
    pub timeouts: TimeoutsConfig,
    pub limits: LimitsConfig,
    #[serde(default)]
    pub tls: Option<TlsConfig>,
    pub network: NetworkConfig,
    #[serde(default)]
    pub dns: Option<DnsConfig>,
    pub logging: LoggingConfig,
    pub metrics: MetricsConfig,
    #[serde(default)]
    pub socks5: Option<Socks5Options>,
    #[serde(default)]
    pub http: Option<HttpOptions>,
    #[serde(default)]
    pub shadowsocks: Option<ShadowsocksOptions>,
    #[serde(default)]
    pub transparent: Option<TransparentOptions>,
    #[serde(default)]
    pub reverse: Option<ReverseOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub protocol: ProxyType,
    #[serde(default)]
    pub bind_interface: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProxyType {
    Direct,
    Http,
    Https,
    Socks5,
    Shadowsocks,
    Transparent,
    Reverse,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SecurityConfig {
    pub authentication: AuthConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AuthConfig {
    pub enabled: bool,
    #[serde(default)]
    pub method: AuthMethod,
    #[serde(default)]
    pub users: Vec<UserCredential>,
    #[serde(default)]
    pub users_file: Option<String>,
    #[serde(default)]
    pub token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AuthMethod {
    NoAuth,
    UserPass,
    Basic,
    Digest,
    ClientCert,
}

impl Default for AuthMethod {
    fn default() -> Self {
        AuthMethod::NoAuth
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UserCredential {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TimeoutsConfig {
    pub connect_sec: u32,
    pub read_sec: u32,
    pub write_sec: u32,
    pub idle_sec: u32,
    #[serde(default)]
    pub handshake_sec: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LimitsConfig {
    pub max_connections: u32,
    #[serde(default)]
    pub max_connections_per_ip: Option<u32>,
    #[serde(default)]
    pub rate_limit_rps: Option<u32>,
    #[serde(default)]
    pub bandwidth_limit_mbps: Option<u32>,
    #[serde(default)]
    pub max_request_size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TlsConfig {
    pub enabled: bool,
    #[serde(default)]
    pub cert_path: Option<String>,
    #[serde(default)]
    pub key_path: Option<String>,
    #[serde(default)]
    pub min_version: Option<TlsVersion>,
    #[serde(default)]
    pub ciphers: Option<Vec<String>>,
    #[serde(default)]
    pub verify_peer: bool,
    #[serde(default)]
    pub sni: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TlsVersion {
    #[serde(rename = "tls1.2")]
    Tls1_2,
    #[serde(rename = "tls1.3")]
    Tls1_3,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NetworkConfig {
    pub tcp_nodelay: bool,
    pub keep_alive: bool,
    #[serde(default)]
    pub keep_alive_interval_sec: Option<u32>,
    pub reuse_port: bool,
    #[serde(default)]
    pub send_buffer_size: Option<u32>,
    #[serde(default)]
    pub recv_buffer_size: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DnsConfig {
    pub upstream: String,
    #[serde(default)]
    pub strategy: Option<DnsStrategy>,
    #[serde(default)]
    pub cache_ttl_sec: Option<u32>,
    #[serde(default)]
    pub doh_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DnsStrategy {
    Ipv4Only,
    Ipv6Only,
    PreferIpv4,
    PreferIpv6,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LoggingConfig {
    pub level: LogLevel,
    pub format: LogFormat,
    pub output: LogOutput,
    #[serde(default)]
    pub file_path: Option<String>,
    #[serde(default)]
    pub access_log: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogFormat {
    Text,
    Json,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogOutput {
    Stdout,
    Stderr,
    File,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MetricsConfig {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
    #[serde(default)]
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Socks5Options {
    #[serde(default)]
    pub udp_associate: bool,
    #[serde(default)]
    pub bind_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HttpOptions {
    #[serde(default)]
    pub connect_enabled: bool,
    #[serde(default)]
    pub forward_headers: Option<Vec<String>>,
    #[serde(default)]
    pub strip_headers: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ShadowsocksOptions {
    pub method: String,
    pub password: String,
    #[serde(default)]
    pub plugin: Option<String>,
    #[serde(default)]
    pub plugin_opts: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TransparentOptions {
    pub redirect_port: u16,
    #[serde(default)]
    pub mark: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ReverseOptions {
    pub upstreams: Vec<String>,
    pub load_balancing: LoadBalancing,
    #[serde(default)]
    pub health_check: Option<HealthCheckConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum LoadBalancing {
    RoundRobin,
    LeastConn,
    IpHash,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HealthCheckConfig {
    pub enabled: bool,
    pub interval_sec: u32,
    pub path: String,
}


pub fn sample_config() -> ProxyConfig {
    ProxyConfig {
        server: ServerConfig {
            host: "0.0.0.0".to_string(),
            port: 1080,
            protocol: ProxyType::Socks5,
            bind_interface: None,
        },
        security: SecurityConfig {
            authentication: AuthConfig {
                enabled: true,
                method: AuthMethod::UserPass,
                users: vec![UserCredential {
                    username: "admin".to_string(),
                    password: "secret".to_string(),
                }],
                users_file: None,
                token: None,
            },
        },
        timeouts: TimeoutsConfig {
            connect_sec: 10,
            read_sec: 30,
            write_sec: 30,
            idle_sec: 300,
            handshake_sec: None,
        },
        limits: LimitsConfig {
            max_connections: 2048,
            max_connections_per_ip: Some(128),
            rate_limit_rps: Some(500),
            bandwidth_limit_mbps: None,
            max_request_size: None,
        },
        tls: None,
        network: NetworkConfig {
            tcp_nodelay: true,
            keep_alive: true,
            keep_alive_interval_sec: None,
            reuse_port: true,
            send_buffer_size: None,
            recv_buffer_size: None,
        },
        dns: None,
        logging: LoggingConfig {
            level: LogLevel::Info,
            format: LogFormat::Text,
            output: LogOutput::Stdout,
            file_path: None,
            access_log: None,
        },
        metrics: MetricsConfig {
            enabled: true,
            host: "127.0.0.1".to_string(),
            port: 9090,
            path: None,
        },
        socks5: Some(Socks5Options {
            udp_associate: true,
            bind_enabled: false,
        }),
        http: None,
        shadowsocks: None,
        transparent: None,
        reverse: None,
    }
}