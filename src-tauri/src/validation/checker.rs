use crate::config::model::{AuthMethod::NoAuth, ProxyConfig};
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum Severity {
    Error,
    Warning,
    Info,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidationIssue {
    pub severity: Severity,
    pub message: String,
}

pub fn check_compatibility(config: &ProxyConfig) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();

    if config.limits.rate_limit_rps == Some(0) {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            message: "Rate limit is set to 0 — request rate limiting is effectively disabled"
                .to_string(),
        });
    }

    let is_external = config.server.host != "127.0.0.1" && config.server.host != "localhost";
    if !config.security.authentication.enabled && is_external {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            message: "Authentication is disabled while the server listens on an external interface"
                .to_string(),
        });
    }

    if config.security.authentication.enabled && config.security.authentication.method == NoAuth {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            message: "authentication.enabled is true, but method is set to NoAuth — this combination has no effect"
                .to_string(),
        });
    }

    if config.timeouts.connect_sec == 0 {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            message: "timeouts.connect_sec is 0 — connection attempts may hang indefinitely"
                .to_string(),
        });
    }
    if config.timeouts.idle_sec == 0 {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            message: "timeouts.idle_sec is 0 — idle connections will never be closed".to_string(),
        });
    }

    if config.limits.max_connections == 0 {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            message: "limits.max_connections is 0 — the proxy will not accept any clients"
                .to_string(),
        });
    }

    if let Some(tls) = &config.tls {
        if tls.enabled {
            if tls.cert_path.is_none() {
                issues.push(ValidationIssue {
                    severity: Severity::Error,
                    message: "tls.enabled is true, but tls.cert_path is missing".to_string(),
                });
            }
            if tls.key_path.is_none() {
                issues.push(ValidationIssue {
                    severity: Severity::Error,
                    message: "tls.enabled is true, but tls.key_path is missing".to_string(),
                });
            }
        }
    }

    if config.metrics.enabled && config.metrics.port == config.server.port {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            message: format!(
                "Port {} is used by both the proxy server and the metrics endpoint",
                config.server.port
            ),
        });
    }

    issues
}
