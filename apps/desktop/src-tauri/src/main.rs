#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

use tauri::Manager;

use crate::db::Db;

#[tauri::command]
async fn greet(name: &str) -> Result<String, String> {
    Ok(format!("Hello, {}! Welcome to ScaleTicket Desktop.", name))
}

fn main() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            tracing::info!("ScaleTicket Desktop starting...");

            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            let db_path = app_dir.join("scale-ticket.sqlite");
            let db = Db::open(&db_path).expect("failed to open SQLite cache");
            app.manage(db);

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::tickets::get_cached_tickets,
            commands::tickets::sync_tickets,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ScaleTicket desktop application");
}
