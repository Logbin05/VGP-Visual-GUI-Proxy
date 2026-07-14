use super::model::ProxyConfig;
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

    #[error("unknown file format")]
    UnknownFormat,
}

pub fn load(path: &Path) -> Result<ProxyConfig, ConfigError> {
    let content = fs::read_to_string(path)?;

    match path.extension().and_then(|e| e.to_str()) {
        Some("yaml") | Some("yml") => Ok(serde_yaml::from_str(&content)?),
        Some("json") => Ok(serde_json::from_str(&content)?),
        Some("toml") => Ok(toml::from_str(&content)?),
        _ => Err(ConfigError::UnknownFormat),
    }
}

pub fn save(proxy_config: &ProxyConfig, path: &Path) -> Result<(), ConfigError> {
    let text = match path.extension().and_then(|e| e.to_str()) {
        Some("yaml") | Some("yml") => serde_yaml::to_string(proxy_config)?,
        Some("json") => serde_json::to_string(proxy_config)?,
        Some("toml") => toml::to_string(proxy_config)?,
        _ => return Err(ConfigError::UnknownFormat),
    };

    fs::write(path, text)?;
    Ok(())
}
