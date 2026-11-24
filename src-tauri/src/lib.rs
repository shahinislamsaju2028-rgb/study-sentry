pub mod audio_guard;
pub mod db;
pub mod guard;
pub mod timer;

use audio_guard::AudioWarningGuard;
use db::{DbEngine, DbLoadResponse, DbSaveResponse};
use guard::{GuardEngine, RunningAppInfo};
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::window::{ProgressBarState, ProgressBarStatus};
use tauri::{
    AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, PhysicalSize, State, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

#[derive(Default)]
struct MiniWindowState {
    is_mini: bool,
    was_maximized: bool,
    was_pinned: bool,
    saved_pos: Option<PhysicalPosition<i32>>,
    saved_size: Option<PhysicalSize<u32>>,
}

pub struct RuntimeState {
    mini: Mutex<MiniWindowState>,
    pip_cache: Mutex<Option<Value>>,
    pip_menu_anchor: Mutex<Option<PhysicalPosition<i32>>>,
    pip_enabled: AtomicBool,
    quitting: Arc<AtomicBool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SimpleOk {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFileResponse {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub canceled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickExeResponse {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub canceled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exe_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exe_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

fn pip_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("pip")
}

fn pip_menu_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("pip-menu")
}

fn request_graceful_quit(app: &AppHandle, runtime: &RuntimeState, db: &DbEngine) {
    if runtime.quitting.load(Ordering::SeqCst) {
        db.checkpoint_wal();
        app.exit(0);
        return;
    }

    let _ = app.emit("tray://request-quit", ());

    let app_clone = app.clone();
    let quitting_flag = runtime.quitting.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(3000));
        if !quitting_flag.swap(true, Ordering::SeqCst) {
            if let Some(db_state) = app_clone.try_state::<DbEngine>() {
                db_state.checkpoint_wal();
            }
            app_clone.exit(0);
        }
    });
}

/* ============================================================================
   TAURI IPC COMMANDS — SQLITE, BACKUPS & NOTIFICATIONS
   ============================================================================ */

fn resolve_app_data_dir(app: &AppHandle) -> std::path::PathBuf {
    if let Ok(dir) = app.path().app_data_dir() {
        return dir;
    }
    if let Ok(roaming) = std::env::var("APPDATA") {
        return std::path::PathBuf::from(roaming).join("com.studysentry.desktop.personal");
    }
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        return std::path::PathBuf::from(local).join("com.studysentry.desktop.personal");
    }
    std::path::PathBuf::from("StudySentry_Data")
}

#[tauri::command]
fn db_load_state(app: AppHandle, db: State<'_, DbEngine>) -> DbLoadResponse {
    db.load_state(resolve_app_data_dir(&app))
}

#[tauri::command]
fn db_save_state(app: AppHandle, db: State<'_, DbEngine>, state: Value) -> DbSaveResponse {
    db.save_state(resolve_app_data_dir(&app), &state)
}

// Backups are independent JSON snapshots, not SQLite/WAL file copies.
#[tauri::command]
fn write_local_backup(app: AppHandle, state: Value, kind: String) -> Result<String, String> {
    if kind != "daily" && kind != "pre-restore" { return Err("Invalid backup type".into()); }
    if !state.is_object() || !state["subjects"].is_array() || !state["sessions"].is_array() {
        return Err("Invalid state".into());
    }
    let dir = resolve_app_data_dir(&app).join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let now = chrono::Local::now();
    let name = if kind == "daily" { format!("daily-{}.json", now.format("%Y-%m-%d")) }
               else { format!("pre-restore-{}.json", now.format("%Y-%m-%d-%H%M%S-%3f")) };
    let path = dir.join(name);
    if !path.exists() {
        let content = serde_json::to_vec_pretty(&state).map_err(|e| e.to_string())?;
        let tmp = path.with_extension("tmp");
        fs::write(&tmp, content).map_err(|e| e.to_string())?;
        fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    }
    if let Ok(entries) = fs::read_dir(&dir) {
        let mut files: Vec<_> = entries.filter_map(Result::ok).map(|e| e.path())
            .filter(|p| p.file_name().and_then(|n| n.to_str()).map(|n| n.starts_with(&format!("{}-",kind)) && n.ends_with(".json")).unwrap_or(false)).collect();
        files.sort();
        let excess = files.len().saturating_sub(if kind == "daily" { 7 } else { 5 });
        for old in files.into_iter().take(excess) { let _ = fs::remove_file(old); }
    }
    Ok(path.to_string_lossy().to_string())
}

// Local OAuth callback. The browser receives no app credentials; PKCE verifies the code.
#[tauri::command]
fn start_sentry_oauth_callback(app: AppHandle) -> Result<String, String> {
    use std::io::{Read, Write};
    use std::net::TcpListener;
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    std::thread::spawn(move || {
        let started = std::time::Instant::now();
        while started.elapsed() < Duration::from_secs(180) {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
                    let mut data = [0u8; 4096];
                    let n = stream.read(&mut data).unwrap_or(0);
                    let req = String::from_utf8_lossy(&data[..n]);
                    let path = req.lines().next().and_then(|line| line.split_whitespace().nth(1)).unwrap_or("");
                    if path.starts_with("/auth/callback?") && (path.contains("code=") || path.contains("error=")) {
                        let body = "Study Sentry: You may close this tab and return to the app.";
                        let reply = format!("HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", body.len(), body);
                        let _ = stream.write_all(reply.as_bytes());
                        let _ = app.emit("sentry://oauth-callback", path.to_string());
                        return;
                    }
                    let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => std::thread::sleep(Duration::from_millis(100)),
                Err(_) => break,
            }
        }
    });
    Ok(format!("http://127.0.0.1:{}/auth/callback", port))
}

#[tauri::command]
fn open_data_folder(app: AppHandle, db: State<'_, DbEngine>) -> SimpleOk {
    let path = db.db_path(resolve_app_data_dir(&app));
    let ok = if path.exists() {
        app.opener().reveal_item_in_dir(&path).is_ok()
    } else if let Some(parent) = path.parent() {
        app.opener()
            .open_path(parent.to_string_lossy().to_string(), None::<&str>)
            .is_ok()
    } else {
        false
    };
    SimpleOk { ok, error: None }
}

#[tauri::command]
async fn export_csv_dialog(app: AppHandle, csv_content: String) -> ExportFileResponse {
    let picked = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Export Study Sessions CSV")
            .set_file_name("StudySentry_Sessions.csv")
            .add_filter("CSV Spreadsheet", &["csv"])
            .blocking_save_file()
    })
    .await;

    let file_path = match picked {
        Ok(Some(fp)) => match fp.into_path() {
            Ok(p) => p,
            Err(e) => {
                return ExportFileResponse {
                    ok: false,
                    canceled: None,
                    file_path: None,
                    error: Some(format!("Invalid file path: {}", e)),
                };
            }
        },
        Ok(None) => {
            return ExportFileResponse {
                ok: false,
                canceled: Some(true),
                file_path: None,
                error: None,
            };
        }
        Err(e) => {
            return ExportFileResponse {
                ok: false,
                canceled: None,
                file_path: None,
                error: Some(format!("Save dialog error: {}", e)),
            };
        }
    };

    let payload = format!("\u{FEFF}{}", csv_content);
    match fs::write(&file_path, payload.as_bytes()) {
        Ok(()) => ExportFileResponse {
            ok: true,
            canceled: None,
            file_path: Some(file_path.to_string_lossy().to_string()),
            error: None,
        },
        Err(e) => ExportFileResponse {
            ok: false,
            canceled: None,
            file_path: None,
            error: Some(format!("Failed writing CSV: {}", e)),
        },
    }
}

#[tauri::command]
async fn export_json_dialog(
    app: AppHandle,
    json_content: String,
    default_name: Option<String>,
) -> ExportFileResponse {
    let fname = default_name
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "StudySentry_Backup.json".to_string());

    let picked = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Save Study Sentry Backup (JSON)")
            .set_file_name(&fname)
            .add_filter("JSON Backup", &["json"])
            .blocking_save_file()
    })
    .await;

    let file_path = match picked {
        Ok(Some(fp)) => match fp.into_path() {
            Ok(p) => p,
            Err(e) => {
                return ExportFileResponse {
                    ok: false,
                    canceled: None,
                    file_path: None,
                    error: Some(format!("Invalid file path: {}", e)),
                };
            }
        },
        Ok(None) => {
            return ExportFileResponse {
                ok: false,
                canceled: Some(true),
                file_path: None,
                error: None,
            };
        }
        Err(e) => {
            return ExportFileResponse {
                ok: false,
                canceled: None,
                file_path: None,
                error: Some(format!("Save dialog error: {}", e)),
            };
        }
    };

    match fs::write(&file_path, json_content.as_bytes()) {
        Ok(()) => ExportFileResponse {
            ok: true,
            canceled: None,
            file_path: Some(file_path.to_string_lossy().to_string()),
            error: None,
        },
        Err(e) => ExportFileResponse {
            ok: false,
            canceled: None,
            file_path: None,
            error: Some(format!("Failed writing backup: {}", e)),
        },
    }
}

#[tauri::command]
fn notify_routine(app: AppHandle, body: String, title: Option<String>) -> bool {
    let clean: String = body.chars().take(500).collect();
    if clean.trim().is_empty() {
        return false;
    }
    let clean_title: String = title
        .unwrap_or_else(|| "Study Sentry · রিমাইন্ডার".to_string())
        .chars()
        .take(120)
        .collect();
    app.notification()
        .builder()
        .title(clean_title)
        .body(clean)
        .show()
        .is_ok()
}

/* ============================================================================
   NATIVE WINDOWS SOFTWARE GUARD COMMANDS (3s AUTO-CLOSE + TIMER LOCK)
   ============================================================================ */

#[tauri::command]
fn guard_sync_config(
    guard: State<'_, GuardEngine>,
    timer_active: bool,
    enabled: bool,
    allowed_apps: Option<Vec<String>>,
    allow_arena_agent: Option<bool>,
    guard_paused: Option<bool>,
) -> SimpleOk {
    match guard.sync_config(
        timer_active,
        enabled,
        allowed_apps.unwrap_or_default(),
        allow_arena_agent.unwrap_or(false),
        guard_paused.unwrap_or(false),
    ) {
        Ok(()) => SimpleOk { ok: true, error: None },
        Err(err) => SimpleOk {
            ok: false,
            error: Some(err),
        },
    }
}

#[tauri::command]
async fn guard_pick_exe(_app: AppHandle, _guard: State<'_, GuardEngine>) -> Result<PickExeResponse, String> {
    // Arbitrary user software additions are permanently disabled to prevent distractions.
    Ok(PickExeResponse {
        ok: false,
        canceled: Some(true),
        exe_name: None,
        exe_path: None,
        error: Some(
            "ফোকাস গার্ডে শুধুমাত্র নির্ধারিত স্টাডি সফটওয়্যার (Brave, SumatraPDF, PotPlayer) অনুমোদিত।".to_string(),
        ),
    })
}

#[tauri::command]
fn guard_list_running_apps(guard: State<'_, GuardEngine>) -> Vec<RunningAppInfo> {
    if guard.is_timer_active() {
        return Vec::new();
    }
    guard::list_running_user_apps()
}

/* ============================================================================
   ALWAYS-ON-TOP INDEPENDENT PICTURE-IN-PICTURE (PiP) FLOATING OS WINDOW
   ============================================================================ */

fn open_main_dashboard_unmaximized(app: &AppHandle) {
    if let Some(win) = main_window(app) {
        if win.is_maximized().unwrap_or(false) {
            let _ = win.unmaximize();
        }
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[tauri::command]
async fn pip_set_open(
    app: AppHandle,
    runtime: State<'_, RuntimeState>,
    enable: bool,
    _layout: Option<String>,
) -> Result<bool, String> {
    let was_enabled = runtime.pip_enabled.swap(enable, Ordering::SeqCst);
    let was_visible = pip_window(&app)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false);

    let (target_w, target_h) = (142.0, 52.0);

    if !enable {
        if let Some(mwin) = pip_menu_window(&app) {
            let _ = mwin.hide();
        }
        if let Some(pwin) = pip_window(&app) {
            let _ = pwin.hide();
        }
        // Whenever PiP is hidden, automatically open the main dashboard WITHOUT maximizing it.
        if was_enabled || was_visible {
            open_main_dashboard_unmaximized(&app);
        }
        return Ok(false);
    }

    if let Some(pwin) = pip_window(&app) {
        let already_visible = pwin.is_visible().unwrap_or(false);
        let _ = pwin.set_shadow(false);
        let _ = pwin.set_always_on_top(true);
        if !already_visible {
            let _ = pwin.set_size(LogicalSize::new(target_w, target_h));
        }
        let _ = pwin.unminimize();
        let _ = pwin.show();
        return Ok(true);
    }

    let built = WebviewWindowBuilder::new(
        &app,
        "pip",
        WebviewUrl::App("index.html?window=pip&v=229".into()),
    )
    .title("Study Sentry PiP")
    .inner_size(target_w, target_h)
    .min_inner_size(96.0, 38.0)
    .max_inner_size(560.0, 260.0)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .focused(false)
    .resizable(true)
    .visible(false)
    .build();

    match built {
        Ok(pwin) => {
            let _ = pwin.set_shadow(false);
            if let Ok(Some(monitor)) = pwin.current_monitor().or_else(|_| {
                main_window(&app)
                    .map(|m| m.current_monitor())
                    .unwrap_or(Ok(None))
            }) {
                let scale = monitor.scale_factor();
                let work = monitor.work_area();
                let w_phys = (target_w * scale).round() as i32;
                let margin_x = (22.0 * scale).round() as i32;
                let margin_y = (62.0 * scale).round() as i32;
                let x = work.position.x + (work.size.width as i32 - w_phys - margin_x).max(0);
                let y = work.position.y + margin_y;
                let _ = pwin.set_position(PhysicalPosition::new(x, y));
            }
            let _ = pwin.set_always_on_top(true);
            let _ = pwin.show();
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}

const PIP_MENU_BASE_WIDTH: f64 = 236.0;

fn position_pip_menu_at_anchor(
    app: &AppHandle,
    pwin: &WebviewWindow,
    mwin: &WebviewWindow,
    anchor: PhysicalPosition<i32>,
    w_log: f64,
    h_log: f64,
) -> String {
    let scale = pwin.scale_factor().unwrap_or(1.0);
    let mw = (w_log * scale).round() as i32;
    let mh = (h_log * scale).round() as i32;
    let base_mw = (PIP_MENU_BASE_WIDTH * scale).round() as i32;
    let edge_pad = (8.0 * scale).round() as i32;

    let mut main_x = anchor.x;
    let mut y = anchor.y;
    let mut flyout_side = "right".to_string();

    let monitor_opt = app
        .monitor_from_point(anchor.x as f64 / scale, anchor.y as f64 / scale)
        .ok()
        .flatten()
        .or_else(|| pwin.current_monitor().ok().flatten());

    let mut win_x = main_x;

    if let Some(monitor) = monitor_opt {
        let work = monitor.work_area();
        let min_x = work.position.x + edge_pad;
        let work_right = work.position.x + work.size.width as i32 - edge_pad;
        let min_y = work.position.y + edge_pad;
        let work_bottom = work.position.y + work.size.height as i32 - edge_pad;

        let max_main_x = (work_right - base_mw).max(min_x);
        if main_x + base_mw > work_right {
            main_x = (anchor.x - base_mw).max(min_x);
        }
        main_x = main_x.clamp(min_x, max_main_x);

        let max_y = (work_bottom - mh).max(min_y);
        if y + mh > work_bottom {
            let above_y = anchor.y - mh;
            y = if above_y >= min_y { above_y } else { max_y };
        }
        y = y.clamp(min_y, max_y);

        if mw > base_mw + 8 {
            if main_x + mw <= work_right {
                flyout_side = "right".to_string();
                win_x = main_x;
            } else {
                flyout_side = "left".to_string();
                win_x = (main_x - (mw - base_mw)).max(min_x);
            }
        } else {
            win_x = main_x;
        }
    }

    let _ = mwin.set_size(LogicalSize::new(w_log, h_log));
    let _ = mwin.set_position(PhysicalPosition::new(win_x, y));
    let _ = app.emit(
        "pip://menu-layout",
        serde_json::json!({ "flyoutSide": flyout_side }),
    );
    flyout_side
}

fn resolve_cursor_anchor(
    app: &AppHandle,
    pwin: &WebviewWindow,
    cursor_x: Option<i32>,
    cursor_y: Option<i32>,
) -> PhysicalPosition<i32> {
    if let Ok(pt) = app.cursor_position() {
        return PhysicalPosition::new(pt.x.round() as i32, pt.y.round() as i32);
    }
    if let (Some(cx), Some(cy)) = (cursor_x, cursor_y) {
        return PhysicalPosition::new(cx, cy);
    }
    let pip_pos = pwin.outer_position().unwrap_or(PhysicalPosition::new(200, 100));
    let pip_size = pwin.outer_size().unwrap_or(PhysicalSize::new(142, 52));
    PhysicalPosition::new(
        pip_pos.x + (pip_size.width as i32 / 2),
        pip_pos.y + (pip_size.height as i32),
    )
}

#[tauri::command]
async fn pip_open_menu(
    app: AppHandle,
    runtime: State<'_, RuntimeState>,
    width: Option<f64>,
    height: Option<f64>,
    cursor_x: Option<i32>,
    cursor_y: Option<i32>,
) -> Result<bool, String> {
    let Some(pwin) = pip_window(&app) else {
        return Ok(false);
    };
    let w_log = width.unwrap_or(PIP_MENU_BASE_WIDTH);
    let h_log = height.unwrap_or(292.0);
    let anchor = resolve_cursor_anchor(&app, &pwin, cursor_x, cursor_y);

    if let Ok(mut slot) = runtime.pip_menu_anchor.lock() {
        *slot = Some(anchor);
    }

    if let Some(mwin) = pip_menu_window(&app) {
        let _ = app.emit("pip://menu-reset", ());
        position_pip_menu_at_anchor(&app, &pwin, &mwin, anchor, w_log, h_log);
        let _ = mwin.set_always_on_top(true);
        let _ = mwin.show();
        let _ = mwin.set_focus();
        return Ok(true);
    }

    let built = WebviewWindowBuilder::new(
        &app,
        "pip-menu",
        WebviewUrl::App("index.html?window=pip-menu&v=229".into()),
    )
    .title("Study Sentry PiP Menu")
    .inner_size(w_log, h_log)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .visible(false)
    .build();

    if let Ok(mwin) = built {
        position_pip_menu_at_anchor(&app, &pwin, &mwin, anchor, w_log, h_log);
        let _ = mwin.set_always_on_top(true);
        let _ = mwin.show();
        let _ = mwin.set_focus();
        return Ok(true);
    }

    Ok(false)
}

#[tauri::command]
async fn pip_resize_menu(
    app: AppHandle,
    runtime: State<'_, RuntimeState>,
    width: f64,
    height: f64,
) -> Result<String, String> {
    if let (Some(pwin), Some(mwin)) = (pip_window(&app), pip_menu_window(&app)) {
        let anchor = runtime
            .pip_menu_anchor
            .lock()
            .ok()
            .and_then(|s| *s)
            .unwrap_or_else(|| resolve_cursor_anchor(&app, &pwin, None, None));
        let side = position_pip_menu_at_anchor(&app, &pwin, &mwin, anchor, width, height);
        return Ok(side);
    }
    Ok("right".to_string())
}

#[tauri::command]
async fn pip_close_menu(app: AppHandle) -> Result<bool, String> {
    if let Some(mwin) = pip_menu_window(&app) {
        let _ = mwin.hide();
    }
    Ok(true)
}

#[tauri::command]
fn pip_quit_app(app: AppHandle, runtime: State<'_, RuntimeState>, db: State<'_, DbEngine>) {
    // Gracefully flush active focus timer (saves completed minutes & stops timer on exit)
    request_graceful_quit(&app, &runtime, &db);
}

#[tauri::command]
fn pip_broadcast_state(app: AppHandle, runtime: State<'_, RuntimeState>, payload: Value) {
    if let Ok(mut cache) = runtime.pip_cache.lock() {
        *cache = Some(payload.clone());
    }
    let _ = app.emit("pip://state", payload);
}

#[tauri::command]
fn pip_get_cached_state(runtime: State<'_, RuntimeState>) -> Option<Value> {
    runtime.pip_cache.lock().ok().and_then(|c| c.clone())
}

#[tauri::command]
fn pip_send_action(app: AppHandle, runtime: State<'_, RuntimeState>, action: Value) {
    let action_type = action.get("type").and_then(|v| v.as_str()).unwrap_or("");
    if action_type == "close-pip" {
        runtime.pip_enabled.store(false, Ordering::SeqCst);
        if let Some(mwin) = pip_menu_window(&app) {
            let _ = mwin.hide();
        }
        if let Some(pwin) = pip_window(&app) {
            let _ = pwin.hide();
        }
        open_main_dashboard_unmaximized(&app);
    } else if action_type == "open-dashboard" || action_type == "maximize-dashboard" {
        if let Some(mwin) = pip_menu_window(&app) {
            let _ = mwin.hide();
        }
        open_main_dashboard_unmaximized(&app);
    }
    let _ = app.emit("pip://action", action);
}

/* ============================================================================
   MAIN WINDOW & TASKBAR CONTROLS
   ============================================================================ */

#[tauri::command]
fn window_minimize(app: AppHandle, runtime: State<'_, RuntimeState>) {
    if let Some(win) = main_window(&app) {
        let _ = win.minimize();
    }
    if runtime.pip_enabled.load(Ordering::SeqCst) {
        if let Some(pwin) = pip_window(&app) {
            let _ = pwin.unminimize();
            let _ = pwin.show();
            let _ = pwin.set_always_on_top(true);
        }
    }
}

#[tauri::command]
fn window_toggle_maximize(app: AppHandle) {
    if let Some(win) = main_window(&app) {
        if win.is_maximized().unwrap_or(false) {
            let _ = win.unmaximize();
        } else {
            let _ = win.maximize();
        }
    }
}

#[tauri::command]
fn window_close(app: AppHandle, runtime: State<'_, RuntimeState>) {
    if let Some(win) = main_window(&app) {
        if !runtime.quitting.load(Ordering::SeqCst) {
            let _ = win.hide();
            // Keep app alive in background (PiP if enabled, plus system tray Study Sentry)
            if runtime.pip_enabled.load(Ordering::SeqCst) {
                if let Some(pwin) = pip_window(&app) {
                    let _ = pwin.unminimize();
                    let _ = pwin.show();
                    let _ = pwin.set_always_on_top(true);
                }
            }
        } else {
            let _ = win.close();
        }
    }
}

#[tauri::command]
fn window_restore_main(app: AppHandle) {
    if let Some(mwin) = pip_menu_window(&app) {
        let _ = mwin.hide();
    }
    if let Some(win) = main_window(&app) {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[tauri::command]
fn window_set_fullscreen(app: AppHandle, enable: bool) -> bool {
    if let Some(win) = main_window(&app) {
        let _ = win.set_fullscreen(enable);
        return win.is_fullscreen().unwrap_or(false);
    }
    false
}

#[tauri::command]
fn window_set_always_on_top(app: AppHandle, enable: bool) -> bool {
    if let Some(win) = main_window(&app) {
        let _ = win.set_always_on_top(enable);
        return win.is_always_on_top().unwrap_or(false);
    }
    false
}

#[tauri::command]
fn window_set_mini_mode(
    app: AppHandle,
    runtime: State<'_, RuntimeState>,
    enable: bool,
) -> bool {
    let Some(win) = main_window(&app) else {
        return false;
    };
    let Ok(mut guard) = runtime.mini.lock() else {
        return false;
    };

    if enable && !guard.is_mini {
        guard.was_maximized = win.is_maximized().unwrap_or(false);
        if guard.was_maximized {
            let _ = win.unmaximize();
        }
        guard.saved_pos = win.outer_position().ok();
        guard.saved_size = win.outer_size().ok();
        guard.was_pinned = win.is_always_on_top().unwrap_or(false);
        guard.is_mini = true;

        let _ = win.set_always_on_top(true);
        let _ = win.set_size(LogicalSize::new(410.0, 390.0));

        if let Ok(Some(monitor)) = win.current_monitor() {
            let scale = monitor.scale_factor();
            let work = monitor.work_area();
            let w_phys = (410.0 * scale).round() as i32;
            let h_phys = (390.0 * scale).round() as i32;
            let margin = (16.0 * scale).round() as i32;
            let x = work.position.x + (work.size.width as i32 - w_phys - margin).max(0);
            let y = work.position.y + (work.size.height as i32 - h_phys - margin).max(0);
            let _ = win.set_position(PhysicalPosition::new(x, y));
        }
    } else if !enable && guard.is_mini {
        guard.is_mini = false;
        let _ = win.set_always_on_top(guard.was_pinned);
        if let Some(size) = guard.saved_size {
            let _ = win.set_size(size);
        }
        if let Some(pos) = guard.saved_pos {
            let _ = win.set_position(pos);
        }
        if guard.was_maximized {
            let _ = win.maximize();
        }
    }

    guard.is_mini
}

#[tauri::command]
fn window_set_taskbar_progress(app: AppHandle, progress: f64) {
    if let Some(win) = main_window(&app) {
        if progress < 0.0 || !progress.is_finite() {
            let _ = win.set_progress_bar(ProgressBarState {
                status: Some(ProgressBarStatus::None),
                progress: None,
            });
        } else {
            let pct = (progress.clamp(0.0, 1.0) * 100.0).round() as u64;
            let _ = win.set_progress_bar(ProgressBarState {
                status: Some(ProgressBarStatus::Normal),
                progress: Some(pct),
            });
        }
    }
}

#[tauri::command]
fn audio_set_warning_lock(active: bool, audio_guard: State<'_, AudioWarningGuard>) -> SimpleOk {
    audio_guard.set_enforced(active);
    SimpleOk { ok: true, error: None }
}

#[tauri::command]
fn app_quit_ready(app: AppHandle, runtime: State<'_, RuntimeState>, db: State<'_, DbEngine>) {
    runtime.quitting.store(true, Ordering::SeqCst);
    db.checkpoint_wal();
    app.exit(0);
}

fn setup_system_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItem::with_id(app, "open", "Open Study Sentry", true, None::<&str>)?;
    let toggle_timer_item = MenuItem::with_id(
        app,
        "toggle_timer",
        "Toggle Play / Pause / Stop Alarm",
        true,
        None::<&str>,
    )?;
    let toggle_pip_item = MenuItem::with_id(
        app,
        "toggle_pip",
        "Show Always-On-Top Floating PiP",
        true,
        None::<&str>,
    )?;
    let toggle_mini_item = MenuItem::with_id(
        app,
        "toggle_mini",
        "Toggle Mini Corner Widget",
        true,
        None::<&str>,
    )?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Study Sentry", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &open_item,
            &toggle_timer_item,
            &toggle_pip_item,
            &toggle_mini_item,
            &sep,
            &quit_item,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id("study-sentry-tray")
        .tooltip("Study Sentry — Personal Student's Focus Suite")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => {
                open_main_dashboard_unmaximized(app);
            }
            "toggle_timer" => {
                let _ = app.emit("tray://toggle-timer", ());
            }
            "toggle_pip" => {
                let _ = app.emit("tray://toggle-pip", ());
            }
            "toggle_mini" => {
                let _ = app.emit("tray://toggle-mini", ());
            }
            "quit" => {
                if let (Some(runtime), Some(db)) =
                    (app.try_state::<RuntimeState>(), app.try_state::<DbEngine>())
                {
                    request_graceful_quit(app, &runtime, &db);
                } else {
                    app.exit(0);
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = main_window(app) {
                    let _ = win.unminimize();
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}

fn prepare_clean_windows_environment() {
    const BUILD_CACHE_STAMP: &str = "2.29.0-study-center-edition";

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // If launched as "Study Sentry.exe", silently terminate any lingering legacy v2.0.0 "study-sentry.exe"
        let is_legacy_name = std::env::current_exe()
            .ok()
            .and_then(|p| p.file_name().map(|f| f.to_string_lossy().to_ascii_lowercase()))
            .map(|n| n == "study-sentry.exe")
            .unwrap_or(false);

        if !is_legacy_name {
            let _ = std::process::Command::new("taskkill")
                .args(["/F", "/IM", "study-sentry.exe", "/T"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
        }
    }

    // One-time WebView2 HTTP/JS/GPU byte-cache purge on version upgrade BEFORE WebView2 opens
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let base = std::path::PathBuf::from(local_app_data).join("com.studysentry.desktop.personal");
        let marker = base.join(".webview_build_id");
        let cur_stamp = fs::read_to_string(&marker).unwrap_or_default();
        if cur_stamp.trim() != BUILD_CACHE_STAMP {
            let eb_def = base.join("EBWebView").join("Default");
            let _ = fs::remove_dir_all(eb_def.join("Cache"));
            let _ = fs::remove_dir_all(eb_def.join("Code Cache"));
            let _ = fs::remove_dir_all(eb_def.join("GPUCache"));
            let _ = fs::remove_dir_all(eb_def.join("Service Worker").join("CacheStorage"));
            let _ = fs::create_dir_all(&base);
            let _ = fs::write(&marker, BUILD_CACHE_STAMP);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
// ── Self-contained WebView2 loader (Windows GNU toolchain only) ──────────
// webview2-com-sys uses `link(name = "WebView2Loader.dll")` for every
// non-MSVC target, producing an import of WebView2Loader.dll. Linking the
// static archive in the final binary (before the dynamic stub is resolved)
// keeps the app a single self-contained .exe.
#[cfg(all(target_os = "windows", not(target_env = "msvc")))]
#[link(name = "WebView2LoaderStatic", kind = "static", modifiers = "+whole-archive")]
extern "C" {}

pub fn run() {
    prepare_clean_windows_environment();

    let quitting = Arc::new(AtomicBool::new(false));
    let quitting_for_setup = quitting.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(win) = main_window(app) {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(RuntimeState {
            mini: Mutex::new(MiniWindowState::default()),
            pip_cache: Mutex::new(None),
            pip_menu_anchor: Mutex::new(None),
            pip_enabled: AtomicBool::new(true),
            quitting,
        })
        .manage(DbEngine::new_lazy())
        .manage(GuardEngine::default())
        .manage(AudioWarningGuard::default())
        .setup(move |app| {
            let app_data_dir = resolve_app_data_dir(app.handle());
            if let Some(db_engine) = app.try_state::<DbEngine>() {
                let _ = db_engine.ensure_open(app_data_dir);
            }

            let _ = setup_system_tray(app.handle());
            timer::spawn_dhaka_heartbeat(app.handle().clone(), quitting_for_setup.clone());

            if let Some(guard_engine) = app.try_state::<GuardEngine>() {
                guard_engine.spawn_monitor(app.handle().clone(), quitting_for_setup.clone());
            }

            if let Some(audio_guard) = app.try_state::<AudioWarningGuard>() {
                audio_guard.spawn_enforcer(quitting_for_setup.clone());
            }

            // Position & show the Single Permanent Ultra-Compact Master PiP window Always-On-Top at launch
            if let Some(pwin) = pip_window(app.handle()) {
                if let Ok(Some(monitor)) = pwin.current_monitor().or_else(|_| {
                    main_window(app.handle())
                        .map(|m| m.current_monitor())
                        .unwrap_or(Ok(None))
                }) {
                    let scale = monitor.scale_factor();
                    let work = monitor.work_area();
                    let w_phys = (142.0 * scale).round() as i32;
                    let margin_x = (22.0 * scale).round() as i32;
                    let margin_y = (62.0 * scale).round() as i32;
                    let x = work.position.x + (work.size.width as i32 - w_phys - margin_x).max(0);
                    let y = work.position.y + margin_y;
                    let _ = pwin.set_position(PhysicalPosition::new(x, y));
                }
                let _ = pwin.set_always_on_top(true);
                let _ = pwin.show();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                match event {
                    WindowEvent::Focused(false) => {
                        let _ = window.app_handle().emit("pause://external-focus-lost", ());
                    }
                    WindowEvent::CloseRequested { api, .. } => {
                        let app = window.app_handle();
                        let is_quitting = app
                            .try_state::<RuntimeState>()
                            .map(|r| r.quitting.load(Ordering::SeqCst))
                            .unwrap_or(false);

                        if !is_quitting {
                            // Hide Main Dashboard while keeping Single Master PiP & Background Engine LIVE!
                            api.prevent_close();
                            let _ = window.hide();
                            let pip_on = app
                                .try_state::<RuntimeState>()
                                .map(|r| r.pip_enabled.load(Ordering::SeqCst))
                                .unwrap_or(true);
                            if pip_on {
                                if let Some(pwin) = pip_window(app) {
                                    let _ = pwin.unminimize();
                                    let _ = pwin.show();
                                    let _ = pwin.set_always_on_top(true);
                                }
                            }
                        }
                    }
                    _ => {}
                }
            } else if window.label() == "pip" {
                match event {
                    WindowEvent::Moved(_) => {
                        let app = window.app_handle();
                        if let Some(mwin) = pip_menu_window(app) {
                            let _ = mwin.hide();
                        }
                    }
                    WindowEvent::CloseRequested { api, .. } => {
                        let app = window.app_handle();
                        let is_quitting = app
                            .try_state::<RuntimeState>()
                            .map(|r| r.quitting.load(Ordering::SeqCst))
                            .unwrap_or(false);
                        if !is_quitting {
                            api.prevent_close();
                            if let Some(rt) = app.try_state::<RuntimeState>() {
                                rt.pip_enabled.store(false, Ordering::SeqCst);
                            }
                            let _ = window.hide();
                            if let Some(mwin) = pip_menu_window(app) {
                                let _ = mwin.hide();
                            }
                            open_main_dashboard_unmaximized(app);
                            let _ = app.emit("pip://action", serde_json::json!({ "type": "close-pip" }));
                        }
                    }
                    _ => {}
                }
            } else if window.label() == "pip-menu" {
                match event {
                    WindowEvent::Focused(false) => {
                        let _ = window.hide();
                    }
                    WindowEvent::CloseRequested { api, .. } => {
                        let app = window.app_handle();
                        let is_quitting = app
                            .try_state::<RuntimeState>()
                            .map(|r| r.quitting.load(Ordering::SeqCst))
                            .unwrap_or(false);
                        if !is_quitting {
                            api.prevent_close();
                            let _ = window.hide();
                        }
                    }
                    _ => {}
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            db_load_state,
            db_save_state,
            write_local_backup,
            start_sentry_oauth_callback,
            open_data_folder,
            export_csv_dialog,
            export_json_dialog,
            notify_routine,
            guard_sync_config,
            guard_pick_exe,
            guard_list_running_apps,
            pip_set_open,
            pip_open_menu,
            pip_resize_menu,
            pip_close_menu,
            pip_quit_app,
            pip_broadcast_state,
            pip_get_cached_state,
            pip_send_action,
            window_minimize,
            window_toggle_maximize,
            window_close,
            window_restore_main,
            window_set_fullscreen,
            window_set_always_on_top,
            window_set_mini_mode,
            window_set_taskbar_progress,
            audio_set_warning_lock,
            app_quit_ready
        ])
        .run(tauri::generate_context!())
        .expect("error while running Study Sentry Tauri application");
}
