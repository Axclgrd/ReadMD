//! ReadMD — Tauri backend.
//!
//! Exposes a single, extension-checked file-reading command plus the plumbing
//! that delivers the file ReadMD was launched/opened with to the frontend
//! (CLI argument on Windows, `RunEvent::Opened` on macOS).

use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

#[cfg(target_os = "macos")]
use tauri::{Emitter, Manager};

/// Holds the file ReadMD was launched with until the frontend is ready to
/// consume it. Afterwards, files opened while running are pushed via an event.
struct LaunchState {
    initial_file: Mutex<Option<String>>,
    frontend_ready: AtomicBool,
}

/// A Markdown document handed to the frontend.
#[derive(serde::Serialize)]
struct MarkdownFile {
    path: String,
    name: String,
    content: String,
}

/// True if `path` has a Markdown extension (case-insensitive).
fn is_markdown(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(str::to_ascii_lowercase)
            .as_deref(),
        Some("md") | Some("markdown")
    )
}

/// Reads a Markdown file from disk. The extension check keeps this from being
/// abused to read arbitrary files — it is the only filesystem access we expose,
/// instead of granting the frontend a broad `fs` scope.
#[tauri::command]
fn read_markdown(path: String) -> Result<MarkdownFile, String> {
    let p = Path::new(&path);
    if !is_markdown(p) {
        return Err(format!("Not a Markdown file: {path}"));
    }
    let content =
        std::fs::read_to_string(p).map_err(|e| format!("Cannot read \"{path}\": {e}"))?;
    let name = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or_default()
        .to_string();
    Ok(MarkdownFile {
        path: path.clone(),
        name,
        content,
    })
}

/// Returns (once) the file ReadMD was launched with, and marks the frontend as
/// ready so any later "Opened" event is delivered through the `open-file` event.
#[tauri::command]
fn get_launch_file(state: tauri::State<'_, LaunchState>) -> Option<String> {
    state.frontend_ready.store(true, Ordering::SeqCst);
    state.initial_file.lock().unwrap().take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // A Markdown path may arrive as a CLI argument (Windows double-click or
    // `readmd file.md`). macOS delivers it via RunEvent::Opened instead.
    let initial_file = std::env::args()
        .skip(1)
        .find(|arg| is_markdown(Path::new(arg)));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(LaunchState {
            initial_file: Mutex::new(initial_file),
            frontend_ready: AtomicBool::new(false),
        })
        .invoke_handler(tauri::generate_handler![read_markdown, get_launch_file])
        .build(tauri::generate_context!())
        .expect("error while building ReadMD")
        .run(|_app, _event| {
            // macOS: a .md was opened via Finder / "Open with" (this also fires
            // at launch). If the frontend is ready, push it; otherwise stash it
            // for the frontend to pick up via get_launch_file().
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = _event {
                let first = urls
                    .iter()
                    .filter_map(|u| u.to_file_path().ok())
                    .find(|p| is_markdown(p))
                    .map(|p| p.to_string_lossy().into_owned());

                if let Some(path) = first {
                    let state = _app.state::<LaunchState>();
                    if state.frontend_ready.load(Ordering::SeqCst) {
                        let _ = _app.emit("open-file", path);
                    } else {
                        *state.initial_file.lock().unwrap() = Some(path);
                    }
                }
            }
        });
}
