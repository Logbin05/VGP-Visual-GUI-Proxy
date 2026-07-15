use crate::config::model::{
    AuthConfig, AuthMethod, DnsConfig, DnsStrategy, HealthCheckConfig, HttpOptions, LimitsConfig,
    LoadBalancing, LogFormat, LogLevel, LogOutput, LoggingConfig, MetricsConfig, NetworkConfig,
    ProxyType, ReverseOptions, SecurityConfig, ServerConfig, ShadowsocksOptions, Socks5Options,
    TimeoutsConfig, TlsConfig, TlsVersion, TransparentOptions, UserCredential,
};

use super::model::ProxyConfig;
use ini::Ini;
use std::fs;
use std::path::Path;

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("couldn't read the file: {0}")]
    Io(#[from] std::io::Error),

    #[error("YAML parsing error:{0}")]
    Yaml(#[from] serde_yaml::Error),

    #[error("JSON parsing error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("TOML parsing error: {0}")]
    TomlDe(#[from] toml::de::Error),

    #[error("TOML serialization error: {0}")]
    TomlSer(#[from] toml::ser::Error),

    #[error("INI parsing error: {0}")]
    IniParse(#[from] ini::ParseError),

    #[error("INI: missing required section [{0}]")]
    IniMissingSection(String),

    #[error("INI: missing required field {0}")]
    IniMissingField(String),

    #[error("INI: invalid value — {0}")]
    IniInvalidValue(String),

    #[error("unknown file format")]
    UnknownFormat,
}

fn get_str(props: &ini::Properties, key: &str) -> Option<String> {
    props.get(key).map(|s| s.to_string())
}

fn get_required_str(
    props: &ini::Properties,
    key: &str,
    section: &str,
) -> Result<String, ConfigError> {
    get_str(props, key).ok_or_else(|| ConfigError::IniMissingField(format!("{}.{}", section, key)))
}

fn get_parsed<T: std::str::FromStr>(props: &ini::Properties, key: &str) -> Option<T> {
    props.get(key).and_then(|s| s.parse::<T>().ok())
}

fn get_required_parsed<T: std::str::FromStr>(
    props: &ini::Properties,
    key: &str,
    section: &str,
) -> Result<T, ConfigError> {
    get_parsed(props, key)
        .ok_or_else(|| ConfigError::IniMissingField(format!("{}.{}", section, key)))
}

fn get_list(props: &ini::Properties, key: &str) -> Option<Vec<String>> {
    props.get(key).map(|s| {
        s.split(',')
            .map(|part| part.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    })
}

fn get_users(props: &ini::Properties, key: &str) -> Vec<UserCredential> {
    props
        .get(key)
        .map(|s| {
            s.split(",")
                .filter_map(|pair| {
                    let mut parts = pair.trim().splitn(2, ":");
                    let username = parts.next()?.to_string();
                    let password = parts.next()?.to_string();
                    if username.is_empty() {
                        None
                    } else {
                        Some(UserCredential { username, password })
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

pub fn load_ini(content: &str) -> Result<ProxyConfig, ConfigError> {
    let ini = Ini::load_from_str(content)?;

    let server_props = ini
        .section(Some("server"))
        .ok_or_else(|| ConfigError::IniMissingSection("server".to_string()))?;
    let server = ServerConfig {
        host: get_required_str(server_props, "host", "server")?,
        port: get_required_parsed(server_props, "port", "server")?,
        protocol: match get_required_str(server_props, "protocol", "server")?.as_str() {
            "direct" => ProxyType::Direct,
            "http" => ProxyType::Http,
            "https" => ProxyType::Https,
            "socks5" => ProxyType::Socks5,
            "shadowsocks" => ProxyType::Shadowsocks,
            "transparent" => ProxyType::Transparent,
            "reverse" => ProxyType::Reverse,
            other => {
                return Err(ConfigError::IniInvalidValue(format!(
                    "unknown protocol: {}",
                    other
                )))
            }
        },
        bind_interface: get_str(server_props, "bind_interface"),
    };

    let auth_props = ini
        .section(Some("security.authentication"))
        .ok_or_else(|| ConfigError::IniMissingSection("security.authentication".to_string()))?;

    let security = SecurityConfig {
        authentication: AuthConfig {
            enabled: get_required_parsed(auth_props, "enabled", "security.authentication")?,
            method: match get_str(auth_props, "method").as_deref() {
                Some("userpass") => AuthMethod::UserPass,
                Some("basic") => AuthMethod::Basic,
                Some("digest") => AuthMethod::Digest,
                Some("clientcert") => AuthMethod::ClientCert,
                _ => AuthMethod::NoAuth,
            },
            users: get_users(auth_props, "users"),
            users_file: get_str(auth_props, "users_file"),
            token: get_str(auth_props, "token"),
        },
    };

    let timeouts_props = ini
        .section(Some("timeouts"))
        .ok_or_else(|| ConfigError::IniMissingSection("timeouts".to_string()))?;
    let timeouts = TimeoutsConfig {
        connect_sec: get_required_parsed(timeouts_props, "connect_sec", "timeouts")?,
        read_sec: get_required_parsed(timeouts_props, "read_sec", "timeouts")?,
        write_sec: get_required_parsed(timeouts_props, "write_sec", "timeouts")?,
        idle_sec: get_required_parsed(timeouts_props, "idle_sec", "timeouts")?,
        handshake_sec: get_parsed(timeouts_props, "handshake_sec"),
    };

    let limits_props = ini
        .section(Some("limits"))
        .ok_or_else(|| ConfigError::IniMissingSection("limits".to_string()))?;
    let limits = LimitsConfig {
        max_connections: get_required_parsed(limits_props, "max_connections", "limits")?,
        max_connections_per_ip: get_parsed(limits_props, "max_connections_per_ip"),
        rate_limit_rps: get_parsed(limits_props, "rate_limit_rps"),
        bandwidth_limit_mbps: get_parsed(limits_props, "bandwidth_limit_mbps"),
        max_request_size: get_parsed(limits_props, "max_request_size"),
    };

    let tls = ini.section(Some("tls")).map(|props| TlsConfig {
        enabled: get_parsed(props, "enabled").unwrap_or(false),
        cert_path: get_str(props, "cert_path"),
        key_path: get_str(props, "key_path"),
        min_version: match get_str(props, "min_version").as_deref() {
            Some("tls1.2") => Some(TlsVersion::Tls1_2),
            Some("tls1.3") => Some(TlsVersion::Tls1_3),
            _ => None,
        },
        ciphers: get_list(props, "ciphers"),
        verify_peer: get_parsed(props, "verify_peer").unwrap_or(false),
        sni: get_str(props, "sni"),
    });

    let network_props = ini
        .section(Some("network"))
        .ok_or_else(|| ConfigError::IniMissingSection("network".to_string()))?;
    let network = NetworkConfig {
        tcp_nodelay: get_required_parsed(network_props, "tcp_nodelay", "network")?,
        keep_alive: get_required_parsed(network_props, "keep_alive", "network")?,
        keep_alive_interval_sec: get_parsed(network_props, "keep_alive_interval_sec"),
        reuse_port: get_required_parsed(network_props, "reuse_port", "network")?,
        send_buffer_size: get_parsed(network_props, "send_buffer_size"),
        recv_buffer_size: get_parsed(network_props, "recv_buffer_size"),
    };

    let dns = ini.section(Some("dns")).map(|props| DnsConfig {
        upstream: get_str(props, "upstream").unwrap_or_default(),
        strategy: match get_str(props, "strategy").as_deref() {
            Some("ipv4_only") => Some(DnsStrategy::Ipv4Only),
            Some("ipv6_only") => Some(DnsStrategy::Ipv6Only),
            Some("prefer_ipv4") => Some(DnsStrategy::PreferIpv4),
            Some("prefer_ipv6") => Some(DnsStrategy::PreferIpv6),
            _ => None,
        },
        cache_ttl_sec: get_parsed(props, "cache_ttl_sec"),
        doh_url: get_str(props, "doh_url"),
    });

    let logging_props = ini
        .section(Some("logging"))
        .ok_or_else(|| ConfigError::IniMissingSection("logging".to_string()))?;
    let logging = LoggingConfig {
        level: match get_str(logging_props, "level").as_deref() {
            Some("trace") => LogLevel::Trace,
            Some("debug") => LogLevel::Debug,
            Some("warn") => LogLevel::Warn,
            Some("error") => LogLevel::Error,
            _ => LogLevel::Info,
        },
        format: match get_str(logging_props, "format").as_deref() {
            Some("json") => LogFormat::Json,
            _ => LogFormat::Text,
        },
        output: match get_str(logging_props, "output").as_deref() {
            Some("stderr") => LogOutput::Stderr,
            Some("file") => LogOutput::File,
            _ => LogOutput::Stdout,
        },
        file_path: get_str(logging_props, "file_path"),
        access_log: get_parsed(logging_props, "access_log"),
    };

    let metrics_props = ini
        .section(Some("metrics"))
        .ok_or_else(|| ConfigError::IniMissingSection("metrics".to_string()))?;
    let metrics = MetricsConfig {
        enabled: get_required_parsed(metrics_props, "enabled", "metrics")?,
        host: get_required_str(metrics_props, "host", "metrics")?,
        port: get_required_parsed(metrics_props, "port", "metrics")?,
        path: get_str(metrics_props, "path"),
    };

    let socks5 = ini.section(Some("socks5")).map(|props| Socks5Options {
        udp_associate: get_parsed(props, "udp_associate").unwrap_or(false),
        bind_enabled: get_parsed(props, "bind_enabled").unwrap_or(false),
    });

    let http = ini.section(Some("http")).map(|props| HttpOptions {
        connect_enabled: get_parsed(props, "connect_enabled").unwrap_or(false),
        forward_headers: get_list(props, "forward_headers"),
        strip_headers: get_list(props, "strip_headers"),
    });

    let shadowsocks = ini
        .section(Some("shadowsocks"))
        .map(|props| ShadowsocksOptions {
            method: get_str(props, "method").unwrap_or_default(),
            password: get_str(props, "password").unwrap_or_default(),
            plugin: get_str(props, "plugin"),
            plugin_opts: get_str(props, "plugin_opts"),
        });

    let transparent = ini
        .section(Some("transparent"))
        .map(|props| TransparentOptions {
            redirect_port: get_parsed(props, "redirect_port").unwrap_or(0),
            mark: get_parsed(props, "mark"),
        });

    let reverse = ini.section(Some("reverse")).map(|props| {
        let health_check =
            ini.section(Some("reverse.health_check"))
                .map(|hc_props| HealthCheckConfig {
                    enabled: get_parsed(hc_props, "enabled").unwrap_or(false),
                    interval_sec: get_parsed(hc_props, "interval_sec").unwrap_or(30),
                    path: get_str(hc_props, "path").unwrap_or_default(),
                });
        ReverseOptions {
            upstreams: get_list(props, "upstreams").unwrap_or_default(),
            load_balancing: match get_str(props, "load_balancing").as_deref() {
                Some("least_conn") => LoadBalancing::LeastConn,
                Some("ip_hash") => LoadBalancing::IpHash,
                _ => LoadBalancing::RoundRobin,
            },
            health_check,
        }
    });

    Ok(ProxyConfig {
        server,
        security,
        timeouts,
        limits,
        tls,
        network,
        dns,
        logging,
        metrics,
        socks5,
        http,
        shadowsocks,
        transparent,
        reverse,
    })
}

pub fn save_ini(config: &ProxyConfig) -> String {
    let mut ini = Ini::new();

    ini.with_section(Some("server"))
        .set("host", &config.server.host)
        .set("port", config.server.port.to_string())
        .set(
            "protocol",
            format!("{:?}", config.server.protocol).to_lowercase(),
        );
    if let Some(bind) = &config.server.bind_interface {
        ini.with_section(Some("server")).set("bind_interface", bind);
    }

    let auth = &config.security.authentication;
    ini.with_section(Some("security.authentication"))
        .set("enabled", auth.enabled.to_string())
        .set("method", format!("{:?}", auth.method).to_lowercase());
    if !auth.users.is_empty() {
        let users_str = auth
            .users
            .iter()
            .map(|u| format!("{}:{}", u.username, u.password))
            .collect::<Vec<_>>()
            .join(",");
        ini.with_section(Some("security.authentication"))
            .set("users", users_str);
    }
    if let Some(f) = &auth.users_file {
        ini.with_section(Some("security.authentication"))
            .set("users_file", f);
    }
    if let Some(t) = &auth.token {
        ini.with_section(Some("security.authentication"))
            .set("token", t);
    }

    ini.with_section(Some("timeouts"))
        .set("connect_sec", config.timeouts.connect_sec.to_string())
        .set("read_sec", config.timeouts.read_sec.to_string())
        .set("write_sec", config.timeouts.write_sec.to_string())
        .set("idle_sec", config.timeouts.idle_sec.to_string());
    if let Some(h) = config.timeouts.handshake_sec {
        ini.with_section(Some("timeouts"))
            .set("handshake_sec", h.to_string());
    }

    ini.with_section(Some("limits"))
        .set("max_connections", config.limits.max_connections.to_string());
    if let Some(v) = config.limits.max_connections_per_ip {
        ini.with_section(Some("limits"))
            .set("max_connections_per_ip", v.to_string());
    }
    if let Some(v) = config.limits.rate_limit_rps {
        ini.with_section(Some("limits"))
            .set("rate_limit_rps", v.to_string());
    }
    if let Some(v) = config.limits.bandwidth_limit_mbps {
        ini.with_section(Some("limits"))
            .set("bandwidth_limit_mbps", v.to_string());
    }
    if let Some(v) = config.limits.max_request_size {
        ini.with_section(Some("limits"))
            .set("max_request_size", v.to_string());
    }

    if let Some(tls) = &config.tls {
        ini.with_section(Some("tls"))
            .set("enabled", tls.enabled.to_string())
            .set("verify_peer", tls.verify_peer.to_string());
        if let Some(v) = &tls.cert_path {
            ini.with_section(Some("tls")).set("cert_path", v);
        }
        if let Some(v) = &tls.key_path {
            ini.with_section(Some("tls")).set("key_path", v);
        }
        if let Some(v) = &tls.min_version {
            let s = match v {
                TlsVersion::Tls1_2 => "tls1.2",
                TlsVersion::Tls1_3 => "tls1.3",
            };
            ini.with_section(Some("tls")).set("min_version", s);
        }
        if let Some(v) = &tls.ciphers {
            ini.with_section(Some("tls")).set("ciphers", v.join(","));
        }
        if let Some(v) = &tls.sni {
            ini.with_section(Some("tls")).set("sni", v);
        }
    }

    ini.with_section(Some("network"))
        .set("tcp_nodelay", config.network.tcp_nodelay.to_string())
        .set("keep_alive", config.network.keep_alive.to_string())
        .set("reuse_port", config.network.reuse_port.to_string());
    if let Some(v) = config.network.keep_alive_interval_sec {
        ini.with_section(Some("network"))
            .set("keep_alive_interval_sec", v.to_string());
    }
    if let Some(v) = config.network.send_buffer_size {
        ini.with_section(Some("network"))
            .set("send_buffer_size", v.to_string());
    }
    if let Some(v) = config.network.recv_buffer_size {
        ini.with_section(Some("network"))
            .set("recv_buffer_size", v.to_string());
    }

    if let Some(dns) = &config.dns {
        ini.with_section(Some("dns")).set("upstream", &dns.upstream);
        if let Some(v) = &dns.strategy {
            let s = match v {
                DnsStrategy::Ipv4Only => "ipv4_only",
                DnsStrategy::Ipv6Only => "ipv6_only",
                DnsStrategy::PreferIpv4 => "prefer_ipv4",
                DnsStrategy::PreferIpv6 => "prefer_ipv6",
            };
            ini.with_section(Some("dns")).set("strategy", s);
        }
        if let Some(v) = dns.cache_ttl_sec {
            ini.with_section(Some("dns"))
                .set("cache_ttl_sec", v.to_string());
        }
        if let Some(v) = &dns.doh_url {
            ini.with_section(Some("dns")).set("doh_url", v);
        }
    }

    ini.with_section(Some("logging"))
        .set(
            "level",
            format!("{:?}", config.logging.level).to_lowercase(),
        )
        .set(
            "format",
            format!("{:?}", config.logging.format).to_lowercase(),
        )
        .set(
            "output",
            format!("{:?}", config.logging.output).to_lowercase(),
        );
    if let Some(v) = &config.logging.file_path {
        ini.with_section(Some("logging")).set("file_path", v);
    }
    if let Some(v) = config.logging.access_log {
        ini.with_section(Some("logging"))
            .set("access_log", v.to_string());
    }

    ini.with_section(Some("metrics"))
        .set("enabled", config.metrics.enabled.to_string())
        .set("host", &config.metrics.host)
        .set("port", config.metrics.port.to_string());
    if let Some(v) = &config.metrics.path {
        ini.with_section(Some("metrics")).set("path", v);
    }

    if let Some(s5) = &config.socks5 {
        ini.with_section(Some("socks5"))
            .set("udp_associate", s5.udp_associate.to_string())
            .set("bind_enabled", s5.bind_enabled.to_string());
    }

    if let Some(http) = &config.http {
        ini.with_section(Some("http"))
            .set("connect_enabled", http.connect_enabled.to_string());
        if let Some(v) = &http.forward_headers {
            ini.with_section(Some("http"))
                .set("forward_headers", v.join(","));
        }
        if let Some(v) = &http.strip_headers {
            ini.with_section(Some("http"))
                .set("strip_headers", v.join(","));
        }
    }

    if let Some(ss) = &config.shadowsocks {
        ini.with_section(Some("shadowsocks"))
            .set("method", &ss.method)
            .set("password", &ss.password);
        if let Some(v) = &ss.plugin {
            ini.with_section(Some("shadowsocks")).set("plugin", v);
        }
        if let Some(v) = &ss.plugin_opts {
            ini.with_section(Some("shadowsocks")).set("plugin_opts", v);
        }
    }

    if let Some(t) = &config.transparent {
        ini.with_section(Some("transparent"))
            .set("redirect_port", t.redirect_port.to_string());
        if let Some(v) = t.mark {
            ini.with_section(Some("transparent"))
                .set("mark", v.to_string());
        }
    }

    if let Some(rev) = &config.reverse {
        ini.with_section(Some("reverse"))
            .set("upstreams", rev.upstreams.join(","));
        let lb = match rev.load_balancing {
            LoadBalancing::RoundRobin => "round_robin",
            LoadBalancing::LeastConn => "least_conn",
            LoadBalancing::IpHash => "ip_hash",
        };
        ini.with_section(Some("reverse")).set("load_balancing", lb);

        if let Some(hc) = &rev.health_check {
            ini.with_section(Some("reverse.health_check"))
                .set("enabled", hc.enabled.to_string())
                .set("interval_sec", hc.interval_sec.to_string())
                .set("path", &hc.path);
        }
    }

    let mut buf = Vec::new();
    ini.write_to(&mut buf)
        .expect("writing ini to memory buffer cannot fail");
    String::from_utf8(buf).expect("ini output must be valid utf8")
}

pub fn load(path: &Path) -> Result<ProxyConfig, ConfigError> {
    let content = fs::read_to_string(path)?;

    match path.extension().and_then(|e| e.to_str()) {
        Some("yaml") | Some("yml") => Ok(serde_yaml::from_str(&content)?),
        Some("json") => Ok(serde_json::from_str(&content)?),
        Some("toml") => Ok(toml::from_str(&content)?),
        Some("ini") => load_ini(&content),
        _ => Err(ConfigError::UnknownFormat),
    }
}

pub fn save(proxy_config: &ProxyConfig, path: &Path) -> Result<(), ConfigError> {
    let text = match path.extension().and_then(|e| e.to_str()) {
        Some("yaml") | Some("yml") => serde_yaml::to_string(proxy_config)?,
        Some("json") => serde_json::to_string(proxy_config)?,
        Some("toml") => toml::to_string(proxy_config)?,
        Some("ini") => save_ini(proxy_config),
        _ => return Err(ConfigError::UnknownFormat),
    };

    fs::write(path, text)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::model::*;

    fn sample_config() -> ProxyConfig {
        ProxyConfig {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 1080,
                protocol: ProxyType::Socks5,
                bind_interface: Some("eth0".to_string()),
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
                handshake_sec: Some(5),
            },
            limits: LimitsConfig {
                max_connections: 2048,
                max_connections_per_ip: Some(128),
                rate_limit_rps: Some(500),
                bandwidth_limit_mbps: Some(100),
                max_request_size: Some(1048576),
            },
            tls: Some(TlsConfig {
                enabled: true,
                cert_path: Some("/etc/vgp/cert.pem".to_string()),
                key_path: Some("/etc/vgp/key.pem".to_string()),
                min_version: Some(TlsVersion::Tls1_2),
                ciphers: None,
                verify_peer: false,
                sni: None,
            }),
            network: NetworkConfig {
                tcp_nodelay: true,
                keep_alive: true,
                keep_alive_interval_sec: Some(60),
                reuse_port: false,
                send_buffer_size: None,
                recv_buffer_size: None,
            },
            dns: Some(DnsConfig {
                upstream: "1.1.1.1".to_string(),
                strategy: Some(DnsStrategy::PreferIpv4),
                cache_ttl_sec: Some(300),
                doh_url: None,
            }),
            logging: LoggingConfig {
                level: LogLevel::Info,
                format: LogFormat::Text,
                output: LogOutput::Stdout,
                file_path: None,
                access_log: Some(true),
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

    #[test]
    fn roundtrip_all_formats() {
        let config = sample_config();

        for ext in ["yaml", "json", "toml", "ini"] {
            let path = std::env::temp_dir().join(format!("vgp_test.{}", ext));
            save(&config, &path).unwrap();
            let loaded = load(&path).unwrap();
            assert_eq!(config, loaded, "формат {} не прошёл roundtrip", ext);
            std::fs::remove_file(&path).unwrap();
        }
    }
}
