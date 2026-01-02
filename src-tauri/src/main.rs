// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

// use tauri::menu::{Menu, MenuItem, Submenu};
// use tauri::{Manager, Emitter};

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
            commands::create_answer_to_feishu,
            commands::get_bitable_record,
            commands::open_external_url,
        ])
        .setup(|_app| {
            // TODO: 菜单功能暂时禁用，等 Tauri v2 菜单 API 稳定后再启用
            // 创建中文菜单
            // let menu = create_chinese_menu(app.handle())?;
            // app.set_menu(menu)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// TODO: 菜单功能暂时禁用
// fn create_chinese_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
//     // 菜单代码...
// }
