// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::set_feishu_credentials,
            commands::get_feishu_access_token,
            commands::test_feishu_connection,
            commands::get_bitable_tables,
            commands::get_answers_data,
            commands::list_answers,
            commands::optimize_answer_with_ai,
            commands::review_answer_with_ai,
            commands::check_answer_risk,
            commands::set_ai_config,
            commands::get_ai_config,
            commands::test_ai_connection,
            commands::update_answer_to_feishu,
            commands::get_bitable_record,
            commands::open_external_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
