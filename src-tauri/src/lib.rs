//! ReadMD — Tauri backend.
//!
//! Phase 1 only wires up the application shell and the opener plugin (used later
//! to open external links in the system browser). File reading, watching and
//! the macOS file-open event are added by later phases.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
