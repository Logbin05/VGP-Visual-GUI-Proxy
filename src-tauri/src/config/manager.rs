use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::path::PathBuf;

use super::formats::{self, ConfigError};
use crate::config::model::ProxyType;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FileType {
    Yaml,
    Toml,
    Json,
    Ini,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ConfigEntry {
    pub file_name: String,
    pub file_extension: FileType,
    pub path: PathBuf,
    pub proxy_type: Option<ProxyType>,
    pub size_bytes: u64,
    pub created_at: String,
    pub updated_at: String,
    pub parse_error: Option<String>,
}

pub fn scan_directory(dir: &Path) -> Result<Vec<ConfigEntry>, ConfigError> {
    let mut entries = Vec::new();

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        let file_extension = match path.extension().and_then(|e| e.to_str()) {
            Some("yaml") | Some("yml") => FileType::Yaml,
            Some("json") => FileType::Json,
            Some("toml") => FileType::Toml,
            Some("ini") => FileType::Ini,
            _ => continue,
        };

        let size_bytes = entry.metadata()?.len();
        let (proxy_type, parse_error) = match formats::load(&path) {
            Ok(config) => (Some(config.server.protocol), None),
            Err(e) => (None, Some(e.to_string())),
        };

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        let metadata = entry.metadata()?;
        let created_at = format!("{:?}", metadata.created()?);
        let updated_at = format!("{:?}", metadata.modified()?);

        entries.push(ConfigEntry {
            file_name,
            file_extension,
            path,
            proxy_type,
            size_bytes,
            created_at,
            updated_at,
            parse_error,
        });
    }

    Ok(entries)
}
