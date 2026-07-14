pub mod commands;
pub mod config;
pub mod proxy;
pub mod validation;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::validate_config,
            commands::list_configs,
            commands::save_config,
            commands::get_config,
            commands::test_connection,
            commands::test_config_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}