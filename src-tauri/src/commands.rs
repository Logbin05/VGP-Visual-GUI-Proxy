use crate::config::model::ProxyConfig;

use crate::config::formats;
use crate::config::manager;
use crate::config::model::TimeoutsConfig;
use crate::proxy::metrics::TestResult;
use crate::proxy::socks5;
use crate::validation::checker;

#[tauri::command]
pub fn validate_config(path: String) -> Result<Vec<checker::ValidationIssue>, String> {
    let config = formats::load(&std::path::PathBuf::from(path)).map_err(|e| e.to_string())?;

    Ok(checker::check_compatibility(&config))
}

#[tauri::command]
pub fn list_configs(dir: String) -> Result<Vec<manager::ConfigEntry>, String> {
    manager::scan_directory(&std::path::PathBuf::from(dir)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_config(config: ProxyConfig, path: String) -> Result<(), String> {
    formats::save(&config, &std::path::PathBuf::from(path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_config(path: String) -> Result<ProxyConfig, String> {
    formats::load(&std::path::PathBuf::from(path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_connection(
    proxy_addr: String,
    target_host: String,
    target_port: u16,
    username: Option<String>,
    password: Option<String>,
) -> TestResult {
    socks5::test_connect(
        &proxy_addr,
        &target_host,
        target_port,
        username.as_deref(),
        password.as_deref(),
        &TimeoutsConfig::default(),
    )
    .await
}

#[tauri::command]
pub async fn test_config_file(
    path: String,
    target_host: String,
    target_port: u16,
) -> Result<TestResult, String> {
    let config = formats::load(&std::path::PathBuf::from(path)).map_err(|e| e.to_string())?;
    let addr = format!("{}:{}", config.server.host, config.server.port);

    let result = socks5::test_connect(
        &addr,
        &target_host,
        target_port,
        None,
        None,
        &TimeoutsConfig::default(),
    )
    .await;

    Ok(result)
}
