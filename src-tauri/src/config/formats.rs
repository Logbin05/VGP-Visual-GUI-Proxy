use crate::config::model::UserCredential;

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

    #[error("unknown file format")]
    UnknownFormat,

    #[error("INI parsing error: {0}")]
    IniParse(#[from] ini::Error),

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

fn get_user(props: &ini::Properties, key: &str) -> Vec<UserCredential> {
  props.get(key).map(|s| {
    s.split(",")
    .filter_map(|pair| {
      let mut parts = pair.trim().splitn(2, ":");
      let username = parts.next()?.to_string();
      let password = parts.next()?.to_string();
      if username.is_empty() {
        None
      } else {
        Some(UserCredential { username, password})
      }
    })
    .collect()
  }).unwrap_or_default()
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
