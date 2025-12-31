// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::set_feishu_credentials,
            commands::get_feishu_access_token,
            commands::get_bitable_tables,
            commands::get_answers_data,
            commands::list_answers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
