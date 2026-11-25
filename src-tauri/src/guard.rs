use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningAppInfo {
    pub exe_name: String,
    pub exe_path: String,
    pub window_title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardViolationPayload {
    pub active: bool,
    pub app_name: String,
    pub exe_path: String,
    pub window_title: String,
    pub seconds_left: u8,
    pub closed: bool,
    pub kind: String, // "app" | "domain" | ""
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardFocusStatePayload {
    pub should_pause: bool,
    pub reason: String, // "" | "app" | "domain"
    pub target: String,
}

#[derive(Debug, Clone)]
struct GuardInner {
    timer_active: bool,
    focus_running_or_guard_paused: bool,
    enabled: bool,
    allow_arena_agent: bool,
}

impl Default for GuardInner {
    fn default() -> Self {
        Self {
            timer_active: false,
            focus_running_or_guard_paused: false,
            enabled: true,
            allow_arena_agent: false,
        }
    }
}

pub struct GuardEngine {
    inner: Arc<Mutex<GuardInner>>,
}

impl Default for GuardEngine {
    fn default() -> Self {
        Self {
            inner: Arc::new(Mutex::new(GuardInner::default())),
        }
    }
}

/// Strictly checks whether a Brave address-bar URL is permitted:
/// Always allowed:
/// - gemini.google.com (any path)
/// - notebook.google.com & notebooklm.google.com (any path)
/// - accounts.google.com (Google sign-in flow for Gemini / NotebookLM)
/// Optionally allowed (only when `allow_arena_agent == true` in Settings):
/// - arena.ai/agent (and www.arena.ai/agent, including subpaths/queries)
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BraveUrlVerdict {
    Allowed,
    /// Allowed — the tab is never closed — but the focus timer is paused while
    /// the student is on it (Gemini, NotebookLM, arena.ai/agent).
    AllowedPausing,
    TransientNewTab,
    Blocked(String),
}

pub fn evaluate_brave_url(raw_url: &str, allow_arena_agent: bool) -> BraveUrlVerdict {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return BraveUrlVerdict::TransientNewTab;
    }

    let lower = trimmed.to_ascii_lowercase();

    // Blank / fresh tab before user finishes entering an allowed URL
    if lower == "about:blank"
        || lower.starts_with("brave://newtab")
        || lower.starts_with("chrome://newtab")
        || lower == "new tab"
    {
        return BraveUrlVerdict::TransientNewTab;
    }

    // Block internal browser settings/games/history/downloads/extensions pages
    if lower.starts_with("brave://")
        || lower.starts_with("chrome://")
        || lower.starts_with("edge://")
        || lower.starts_with("chrome-extension://")
        || lower.starts_with("file://")
    {
        return BraveUrlVerdict::Blocked(trimmed.chars().take(60).collect());
    }

    // If user is mid-typing without dots/slashes (no domain formed yet), allow brief typing
    if !lower.contains('.') && !lower.contains("://") && !lower.starts_with("localhost") {
        return BraveUrlVerdict::TransientNewTab;
    }

    // Strip protocol scheme
    let without_scheme = lower
        .strip_prefix("https://")
        .or_else(|| lower.strip_prefix("http://"))
        .unwrap_or(&lower);

    // Split host[:port] from path/query/fragment
    let boundary = without_scheme
        .find(['/', '?', '#'])
        .unwrap_or(without_scheme.len());
    let authority = &without_scheme[..boundary];
    let rest = &without_scheme[boundary..];

    // Remove userinfo@ and :port
    let host_port = authority.rsplit('@').next().unwrap_or(authority);
    let host = host_port.split(':').next().unwrap_or(host_port).trim_end_matches('.');

    if host.is_empty() {
        return BraveUrlVerdict::TransientNewTab;
    }

    // 1. AI study tools: the tab is allowed — it is never closed — but the
    //    focus timer pauses while one of these is the active tab, per 7.txt ①.
    //    Google sign-in is part of that flow, so it pauses too.
    if host == "gemini.google.com"
        || host == "notebook.google.com"
        || host == "notebooklm.google.com"
        || host == "accounts.google.com"
    {
        return BraveUrlVerdict::AllowedPausing;
    }

    // 2. Optionally allowed: arena.ai/agent (controlled by Settings toggle)
    if allow_arena_agent && (host == "arena.ai" || host == "www.arena.ai") {
        let path = rest.split(['?', '#']).next().unwrap_or("");
        if path == "/agent" || path.starts_with("/agent/") {
            return BraveUrlVerdict::AllowedPausing;
        }
        return BraveUrlVerdict::Blocked(format!("{}{}", host, path.chars().take(24).collect::<String>()));
    }

    BraveUrlVerdict::Blocked(host.to_string())
}

/// Every Chromium-family browser is treated the same way: the address bar is
/// checked against the strict domain allow-list, whichever browser is used.
pub fn is_chromium_browser_exe(exe_base_lower: &str) -> bool {
    matches!(
        exe_base_lower,
        "brave.exe"
            | "chrome.exe"
            | "msedge.exe"
            | "chromium.exe"
            | "opera.exe"
            | "opera_gx.exe"
            | "vivaldi.exe"
            | "thorium.exe"
            | "yandex.exe"
            | "browser.exe"
            | "dragon.exe"
            | "comodo.exe"
            | "coccoc.exe"
            | "torch.exe"
            | "centbrowser.exe"
            | "chedot.exe"
            | "iridium.exe"
            | "slimjet.exe"
    )
}

/// Strictly fixed allowed study apps (arbitrary user additions intentionally disabled)
pub fn is_strictly_allowed_study_exe(exe_base_lower: &str) -> bool {
    if is_chromium_browser_exe(exe_base_lower) {
        return true;
    }
    matches!(
        exe_base_lower,
        "study sentry.exe"
            | "study-sentry.exe"
            | "study-sentry-tauri.exe"
            | "sumatrapdf.exe"
            | "sumatrapdf-prerender.exe"
            | "potplayer.exe"
            | "potplayer64.exe"
            | "potplayermini.exe"
            | "potplayermini64.exe"
    )
}

/// Windows screenshot, Greenshot, brightness/volume flyout & window-switching utilities
/// that never pause the timer and are never auto-closed.
pub fn is_allowed_utility_exe(exe_base_lower: &str) -> bool {
    matches!(
        exe_base_lower,
        "snippingtool.exe"
            | "screensketch.exe"
            | "screenclippinghost.exe"
            | "snipandsketch.exe"
            | "greenshot.exe"
            | "shellexperiencehost.exe"
            | "sihost.exe"
            | "dwm.exe"
            | "ctfmon.exe"
            | "textinputhost.exe"
            | "msedgewebview2.exe"
            | "runtimebroker.exe"
            | "dllhost.exe"
            | "taskhostw.exe"
            | "csrss.exe"
            | "winlogon.exe"
            | "wininit.exe"
            | "services.exe"
            | "lsass.exe"
            | "svchost.exe"
            | "smss.exe"
            | "fontdrvhost.exe"
            | "audiodg.exe"
            | "conhost.exe"
            | "securityhealthsystray.exe"
            | "securityhealthservice.exe"
            | "smartscreen.exe"
            | "consent.exe"
            | "credentialuibroker.exe"
            | "lockapp.exe"
    )
}

impl GuardEngine {
    pub fn sync_config(
        &self,
        timer_active: bool,
        enabled: bool,
        _allowed_apps: Vec<String>,
        allow_arena_agent: bool,
        guard_paused: bool,
    ) -> Result<(), String> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| "Guard lock poisoned".to_string())?;
        guard.timer_active = timer_active;
        guard.focus_running_or_guard_paused = timer_active || guard_paused;
        guard.enabled = enabled;
        guard.allow_arena_agent = allow_arena_agent;
        Ok(())
    }

    pub fn is_timer_active(&self) -> bool {
        self.inner
            .lock()
            .map(|g| g.focus_running_or_guard_paused)
            .unwrap_or(false)
    }

    pub fn spawn_monitor(&self, app: AppHandle, quitting: Arc<AtomicBool>) {
        let inner = self.inner.clone();
        std::thread::spawn(move || {
            let mut uia = create_uia_reader();
            let mut tracked_apps: HashMap<u32, (Instant, RunningAppInfo, u8, bool)> = HashMap::new();
            let mut tracked_domain: Option<(String, Instant, u8)> = None;
            let mut had_active_alert = false;
            let mut currently_paused_by_guard = false;
            let mut last_push_notify_at: Option<Instant> = None;

            while !quitting.load(Ordering::Relaxed) {
                std::thread::sleep(Duration::from_millis(450));

                let snapshot = match inner.lock() {
                    Ok(g) => g.clone(),
                    Err(_) => continue,
                };

                if !snapshot.focus_running_or_guard_paused || !snapshot.enabled {
                    if !tracked_apps.is_empty()
                        || tracked_domain.is_some()
                        || had_active_alert
                        || currently_paused_by_guard
                    {
                        tracked_apps.clear();
                        tracked_domain = None;
                        had_active_alert = false;
                        if currently_paused_by_guard {
                            currently_paused_by_guard = false;
                            let _ = app.emit(
                                "guard://focus-state",
                                GuardFocusStatePayload {
                                    should_pause: false,
                                    reason: String::new(),
                                    target: String::new(),
                                },
                            );
                        }
                        let _ = app.emit(
                            "guard://violation",
                            GuardViolationPayload {
                                active: false,
                                app_name: String::new(),
                                exe_path: String::new(),
                                window_title: String::new(),
                                seconds_left: 0,
                                closed: false,
                                kind: String::new(),
                            },
                        );
                    }
                    last_push_notify_at = None;
                    continue;
                }

                let now = Instant::now();
                let fg = inspect_foreground_state(&mut uia, snapshot.allow_arena_agent);

                // 1. Evaluate Brave active domain violation (close unauthorized domain tab in 3s)
                let mut domain_violation_target: Option<String> = None;
                let mut closed_domain_now: Option<String> = None;

                if let ForegroundVerdict::BlockedBraveDomain { hwnd, domain } = &fg {
                    domain_violation_target = Some(domain.clone());
                    let entry = match &mut tracked_domain {
                        Some(existing) if existing.0 == *domain => existing,
                        _ => {
                            tracked_domain = Some((domain.clone(), now, 4));
                            tracked_domain.as_mut().unwrap()
                        }
                    };
                    let elapsed = now.duration_since(entry.1);
                    if elapsed >= Duration::from_secs(3) {
                        close_brave_tab(*hwnd);
                        closed_domain_now = Some(domain.clone());
                        tracked_domain = None;
                    } else {
                        let rem_ms = 3000u64.saturating_sub(elapsed.as_millis() as u64);
                        let secs_left = ((rem_ms + 999) / 1000).clamp(1, 3) as u8;
                        if entry.2 != secs_left || !had_active_alert {
                            entry.2 = secs_left;
                            had_active_alert = true;
                            let _ = app.emit(
                                "guard://violation",
                                GuardViolationPayload {
                                    active: true,
                                    app_name: format!("ব্রাউজার · {}", domain),
                                    exe_path: "browser.exe".to_string(),
                                    window_title: domain.clone(),
                                    seconds_left: secs_left,
                                    closed: false,
                                    kind: "domain".to_string(),
                                },
                            );
                        }
                    }
                } else {
                    tracked_domain = None;
                }

                if let Some(dom) = closed_domain_now {
                    // 7.txt ① — the AI sites are not "blocked" any more; they
                    // are allowed with the timer resting. So the message says
                    // what is actually true.
                    let allowed_msg = if snapshot.allow_arena_agent {
                        "gemini.google.com, notebooklm.google.com অথবা arena.ai/agent"
                    } else {
                        "gemini.google.com অথবা notebooklm.google.com"
                    };
                    let _ = app.emit(
                        "guard://violation",
                        GuardViolationPayload {
                            active: false,
                            app_name: format!("ব্রাউজার · {}", dom),
                            exe_path: "browser.exe".to_string(),
                            window_title: dom.clone(),
                            seconds_left: 0,
                            closed: true,
                            kind: "domain".to_string(),
                        },
                    );
                    let _ = app
                        .notification()
                        .builder()
                        .title("Study Sentry · অনুমোদনহীন ওয়েবসাইট বন্ধ")
                        .body(format!(
                            "{} বন্ধ করা হয়েছে। পড়তে হলে {} খুলুন — ওখানে টাইমার নিজে থেকেই পজ থাকবে।",
                            dom, allowed_msg
                        ))
                        .show();
                    last_push_notify_at = Some(now);
                }

                // 2. Enumerate & auto-close unauthorized desktop apps / Windows Settings within 3s
                let unapproved_apps = enumerate_unapproved_windows();
                tracked_apps.retain(|key, _| unapproved_apps.contains_key(key));

                let mut closed_app: Option<RunningAppInfo> = None;
                for (key, (info, window_only)) in &unapproved_apps {
                    let entry = tracked_apps
                        .entry(*key)
                        .or_insert_with(|| (now, info.clone(), 4, *window_only));
                    let elapsed = now.duration_since(entry.0);
                    if elapsed >= Duration::from_secs(3) {
                        if entry.3 {
                            close_windows_only_for_key(*key);
                        } else {
                            close_process_within_deadline(*key);
                        }
                        closed_app = Some(info.clone());
                    }
                }

                if let Some(info) = closed_app {
                    tracked_apps
                        .retain(|_, (started, _, _, _)| now.duration_since(*started) < Duration::from_secs(3));
                    had_active_alert = !tracked_apps.is_empty() || tracked_domain.is_some();
                    let _ = app.emit(
                        "guard://violation",
                        GuardViolationPayload {
                            active: false,
                            app_name: info.exe_name.clone(),
                            exe_path: info.exe_path.clone(),
                            window_title: info.window_title.clone(),
                            seconds_left: 0,
                            closed: true,
                            kind: "app".to_string(),
                        },
                    );
                    let _ = app
                        .notification()
                        .builder()
                        .title("Study Sentry · ফোকাস গার্ড")
                        .body(format!(
                            "{} বন্ধ করা হয়েছে। অনুগ্রহ করে Study Sentry, ব্রাউজার, SumatraPDF বা PotPlayer-এ ফিরে যান।",
                            info.exe_name
                        ))
                        .show();
                    last_push_notify_at = Some(now);
                } else if tracked_domain.is_none() {
                    if let Some((_k, (started, info, last_sec, _))) = tracked_apps
                        .iter_mut()
                        .min_by_key(|(_, (started, _, _, _))| *started)
                    {
                        let rem_ms = 3000u64.saturating_sub(now.duration_since(*started).as_millis() as u64);
                        let secs_left = ((rem_ms + 999) / 1000).clamp(1, 3) as u8;
                        if *last_sec != secs_left || !had_active_alert {
                            *last_sec = secs_left;
                            had_active_alert = true;
                            let _ = app.emit(
                                "guard://violation",
                                GuardViolationPayload {
                                    active: true,
                                    app_name: info.exe_name.clone(),
                                    exe_path: info.exe_path.clone(),
                                    window_title: info.window_title.clone(),
                                    seconds_left: secs_left,
                                    closed: false,
                                    kind: "app".to_string(),
                                },
                            );
                        }
                    } else if had_active_alert {
                        had_active_alert = false;
                        let _ = app.emit(
                            "guard://violation",
                            GuardViolationPayload {
                                active: false,
                                app_name: String::new(),
                                exe_path: String::new(),
                                window_title: String::new(),
                                seconds_left: 0,
                                closed: false,
                                kind: String::new(),
                            },
                        );
                    }
                }

                // 3. Automatic Pause / Resume + Repeated Push Notifications (NO 30s penalty!)
                //    - AllowedApp -> auto-resume if currently paused by guard
                //    - NeutralUtility (Snipping Tool, Greenshot, Brightness flyout, Alt-Tab, Brave newtab) -> keep current state (never pause!)
                //    - BlockedApp / BlockedBraveDomain -> auto-pause immediately + repeatedly push notify
                match fg {
                    ForegroundVerdict::AllowedStudyApp => {
                        last_push_notify_at = None;
                        if currently_paused_by_guard {
                            currently_paused_by_guard = false;
                            let _ = app.emit(
                                "guard://focus-state",
                                GuardFocusStatePayload {
                                    should_pause: false,
                                    reason: String::new(),
                                    target: String::new(),
                                },
                            );
                        }
                    }
                    ForegroundVerdict::AllowedButPausing => {
                        // 7.txt ① — Gemini / NotebookLM / arena.ai/agent are
                        // allowed, but the timer rests while the student is on
                        // them. Nothing is closed; no violation is raised.
                        last_push_notify_at = None;
                        if !currently_paused_by_guard {
                            currently_paused_by_guard = true;
                            let _ = app.emit(
                                "guard://focus-state",
                                GuardFocusStatePayload {
                                    should_pause: true,
                                    reason: "ai".to_string(),
                                    target: String::new(),
                                },
                            );
                        }
                    }
                    ForegroundVerdict::NeutralUtility => {
                        // Screenshot (Snipping Tool / Greenshot), Windows brightness flyout,
                        // taskbar, or tab switching inside allowed apps: DO NOT pause timer!
                    }
                    ForegroundVerdict::BlockedApp { app_name } => {
                        if !currently_paused_by_guard {
                            currently_paused_by_guard = true;
                            let _ = app.emit(
                                "guard://focus-state",
                                GuardFocusStatePayload {
                                    should_pause: true,
                                    reason: "app".to_string(),
                                    target: app_name.clone(),
                                },
                            );
                        }
                        let should_notify = last_push_notify_at
                            .map(|t| now.duration_since(t) >= Duration::from_secs(6))
                            .unwrap_or(true);
                        if should_notify {
                            last_push_notify_at = Some(now);
                            let _ = app
                                .notification()
                                .builder()
                                .title("Study Sentry · ফোকাস টাইমার অটো-পজ হয়েছে")
                                .body(format!(
                                    "আপনি {} ওপেন করেছেন। টাইমার চালু রাখতে অনুমোদিত সফটওয়্যারে (Study Sentry, ব্রাউজার, SumatraPDF, PotPlayer) ফিরে যান!",
                                    app_name
                                ))
                                .show();
                        }
                    }
                    ForegroundVerdict::BlockedBraveDomain { domain, .. } => {
                        let target = domain_violation_target.unwrap_or(domain);
                        if !currently_paused_by_guard {
                            currently_paused_by_guard = true;
                            let _ = app.emit(
                                "guard://focus-state",
                                GuardFocusStatePayload {
                                    should_pause: true,
                                    reason: "domain".to_string(),
                                    target: target.clone(),
                                },
                            );
                        }
                        let should_notify = last_push_notify_at
                            .map(|t| now.duration_since(t) >= Duration::from_secs(6))
                            .unwrap_or(true);
                        if should_notify {
                            last_push_notify_at = Some(now);
                            let _ = app
                                .notification()
                                .builder()
                                .title("Study Sentry · অনুমোদনহীন ডোমেইন শনাক্ত")
                                .body(format!(
                                    "ব্রাউজার-এ {} অনুমোদিত নয় (3 সেকেন্ডে বন্ধ হবে)। অনুগ্রহ করে অনুমোদিত স্টাডি ট্যাবে ফিরে যান।",
                                    target
                                ))
                                .show();
                        }
                    }
                }
            }
        });
    }
}

pub(crate) fn extract_basename(raw: &str) -> String {
    let norm = raw.trim().replace('/', "\\").to_ascii_lowercase();
    norm.rsplit('\\').next().unwrap_or(&norm).to_string()
}

pub fn list_running_user_apps() -> Vec<RunningAppInfo> {
    // Arbitrary app additions are disabled by policy; return empty list.
    Vec::new()
}

#[derive(Debug, Clone)]
enum ForegroundVerdict {
    AllowedStudyApp,
    /// Allowed and never closed, but the timer must pause while it is in front.
    AllowedButPausing,
    NeutralUtility,
    BlockedApp { app_name: String },
    BlockedBraveDomain { hwnd: isize, domain: String },
}

/* ============================================================================
   WINDOWS 10/11 NATIVE SOFTWARE + BRAVE ADDRESS-BAR URL GUARD
   ============================================================================ */

#[cfg(target_os = "windows")]
mod win_impl {
    use super::{
        evaluate_brave_url, extract_basename, is_allowed_utility_exe,
        is_chromium_browser_exe, is_strictly_allowed_study_exe, BraveUrlVerdict,
        ForegroundVerdict, RunningAppInfo,
    };
    use std::collections::HashMap;
    use std::ffi::c_void;
    use std::time::Duration;
    use windows::Win32::Foundation::HWND as WinHwnd;
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::System::Variant::VARIANT;
    use windows::Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, TreeScope_Descendants, UIA_ControlTypePropertyId,
        UIA_EditControlTypeId, UIA_ToolBarControlTypeId, UIA_ValueValuePropertyId,
    };

    type HWND = *mut c_void;
    type HANDLE = *mut c_void;
    type BOOL = i32;
    type DWORD = u32;
    type UINT = u32;
    type WORD = u16;
    type WPARAM = usize;
    type LPARAM = isize;
    type WndEnumProc = unsafe extern "system" fn(HWND, LPARAM) -> BOOL;

    const GWL_EXSTYLE: i32 = -20;
    const WS_EX_TOOLWINDOW: i32 = 0x0000_0080;
    const GW_OWNER: UINT = 4;
    const WM_CLOSE: UINT = 0x0010;
    const PROCESS_QUERY_LIMITED_INFORMATION: DWORD = 0x1000;
    const PROCESS_TERMINATE: DWORD = 0x0001;

    const INPUT_KEYBOARD: DWORD = 1;
    const KEYEVENTF_KEYUP: DWORD = 0x0002;
    const VK_CONTROL: WORD = 0x11;
    const VK_W: WORD = 0x57;

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct KEYBDINPUT {
        w_vk: WORD,
        w_scan: WORD,
        dw_flags: DWORD,
        time: DWORD,
        dw_extra_info: usize,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    union InputUnion {
        ki: KEYBDINPUT,
        _pad: [u8; 32], // Covers MOUSEINPUT size on 64-bit Windows
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct INPUT {
        r#type: DWORD,
        u: InputUnion,
    }

    #[link(name = "user32")]
    extern "system" {
        fn EnumWindows(lpEnumFunc: WndEnumProc, lParam: LPARAM) -> BOOL;
        fn GetForegroundWindow() -> HWND;
        fn IsWindowVisible(hWnd: HWND) -> BOOL;
        fn GetWindowTextLengthW(hWnd: HWND) -> i32;
        fn GetWindowTextW(hWnd: HWND, lpString: *mut u16, nMaxCount: i32) -> i32;
        fn GetClassNameW(hWnd: HWND, lpClassName: *mut u16, nMaxCount: i32) -> i32;
        fn GetWindowLongW(hWnd: HWND, nIndex: i32) -> i32;
        fn GetWindow(hWnd: HWND, uCmd: UINT) -> HWND;
        fn GetWindowThreadProcessId(hWnd: HWND, lpdwProcessId: *mut DWORD) -> DWORD;
        fn PostMessageW(hWnd: HWND, Msg: UINT, wParam: WPARAM, lParam: LPARAM) -> BOOL;
        fn SendInput(cInputs: UINT, pInputs: *const INPUT, cbSize: i32) -> UINT;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
        fn QueryFullProcessImageNameW(
            hProcess: HANDLE,
            dwFlags: DWORD,
            lpExeName: *mut u16,
            lpdwSize: *mut DWORD,
        ) -> BOOL;
        fn TerminateProcess(hProcess: HANDLE, uExitCode: UINT) -> BOOL;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }

    pub struct UiaReader {
        automation: Option<IUIAutomation>,
    }

    pub fn create_uia_reader() -> UiaReader {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
            let automation: Option<IUIAutomation> =
                CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok();
            UiaReader { automation }
        }
    }

    /// Reads the active Brave browser window's toolbar Omnibox (Address Bar) URL via UI Automation.
    /// Restricts lookup to the browser toolbar so webpage form inputs can never spoof the URL.
    fn read_brave_omnibox_url(uia: &mut UiaReader, hwnd: HWND) -> Option<String> {
        let auto = uia.automation.as_ref()?;
        unsafe {
            let root = auto.ElementFromHandle(WinHwnd(hwnd)).ok()?;
            let toolbar_cond = auto
                .CreatePropertyCondition(
                    UIA_ControlTypePropertyId,
                    &VARIANT::from(UIA_ToolBarControlTypeId.0),
                )
                .ok()?;
            let edit_cond = auto
                .CreatePropertyCondition(
                    UIA_ControlTypePropertyId,
                    &VARIANT::from(UIA_EditControlTypeId.0),
                )
                .ok()?;

            // Search inside Brave's toolbar first (fast & spoof-proof)
            if let Ok(toolbars) = root.FindAll(TreeScope_Descendants, &toolbar_cond) {
                let count = toolbars.Length().unwrap_or(0).min(6);
                for i in 0..count {
                    if let Ok(tb) = toolbars.GetElement(i) {
                        if let Ok(edit) = tb.FindFirst(TreeScope_Descendants, &edit_cond) {
                            if let Ok(val) = edit.GetCurrentPropertyValue(UIA_ValueValuePropertyId) {
                                let text = val.to_string();
                                if !text.trim().is_empty() {
                                    return Some(text);
                                }
                            }
                        }
                    }
                }
            }

            // Fallback: first Edit element on the top-level Brave chrome window
            if let Ok(edit) = root.FindFirst(TreeScope_Descendants, &edit_cond) {
                if let Ok(val) = edit.GetCurrentPropertyValue(UIA_ValueValuePropertyId) {
                    let text = val.to_string();
                    return Some(text);
                }
            }
            None
        }
    }

    /// Sends Ctrl+W to close the offending Brave tab when Brave is in the foreground.
    pub fn close_brave_tab(target_hwnd: isize) {
        unsafe {
            let fg = GetForegroundWindow();
            if fg.is_null() || (fg as isize) != target_hwnd {
                return;
            }
            let inputs = [
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    u: InputUnion {
                        ki: KEYBDINPUT {
                            w_vk: VK_CONTROL,
                            w_scan: 0,
                            dw_flags: 0,
                            time: 0,
                            dw_extra_info: 0,
                        },
                    },
                },
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    u: InputUnion {
                        ki: KEYBDINPUT {
                            w_vk: VK_W,
                            w_scan: 0,
                            dw_flags: 0,
                            time: 0,
                            dw_extra_info: 0,
                        },
                    },
                },
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    u: InputUnion {
                        ki: KEYBDINPUT {
                            w_vk: VK_W,
                            w_scan: 0,
                            dw_flags: KEYEVENTF_KEYUP,
                            time: 0,
                            dw_extra_info: 0,
                        },
                    },
                },
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    u: InputUnion {
                        ki: KEYBDINPUT {
                            w_vk: VK_CONTROL,
                            w_scan: 0,
                            dw_flags: KEYEVENTF_KEYUP,
                            time: 0,
                            dw_extra_info: 0,
                        },
                    },
                },
            ];
            let _ = SendInput(
                inputs.len() as UINT,
                inputs.as_ptr(),
                std::mem::size_of::<INPUT>() as i32,
            );
        }
    }

    fn read_window_title(hwnd: HWND) -> String {
        unsafe {
            let len = GetWindowTextLengthW(hwnd);
            if len <= 0 {
                return String::new();
            }
            let mut buf = vec![0u16; (len as usize) + 2];
            let copied = GetWindowTextW(hwnd, buf.as_mut_ptr(), len + 1);
            if copied <= 0 {
                return String::new();
            }
            String::from_utf16_lossy(&buf[..copied as usize])
                .trim()
                .to_string()
        }
    }

    fn read_window_class(hwnd: HWND) -> String {
        unsafe {
            let mut buf = [0u16; 256];
            let copied = GetClassNameW(hwnd, buf.as_mut_ptr(), 255);
            if copied <= 0 {
                return String::new();
            }
            String::from_utf16_lossy(&buf[..copied as usize])
                .trim()
                .to_string()
        }
    }

    fn query_process_image(pid: u32) -> Option<String> {
        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if handle.is_null() {
                return None;
            }
            let mut buf = vec![0u16; 1024];
            let mut size = buf.len() as DWORD;
            let ok = QueryFullProcessImageNameW(handle, 0, buf.as_mut_ptr(), &mut size);
            let _ = CloseHandle(handle);
            if ok == 0 || size == 0 {
                return None;
            }
            Some(String::from_utf16_lossy(&buf[..size as usize]))
        }
    }

    fn is_screenshot_title(title_lower: &str) -> bool {
        title_lower.contains("snipping tool")
            || title_lower.contains("snip & sketch")
            || title_lower.contains("screen snip")
            || title_lower.contains("greenshot")
    }

    fn is_brightness_or_shell_switcher_class(class_name: &str) -> bool {
        matches!(
            class_name,
            "Shell_TrayWnd"
                | "Shell_SecondaryTrayWnd"
                | "NotifyIconOverflowWindow"
                | "TopLevelWindowForOverflowXamlIsland"
                | "MultitaskingViewFrame"
                | "XamlExplorerHostIslandWindow"
                | "TaskListThumbnailWnd"
                | "TaskSwitcherWnd"
                | "TaskSwitcherOverlayWnd"
                | "ForegroundStaging"
                | "ControlCenterWindow"
                | "Windows.UI.Core.CoreWindow"
                | "Progman"
                | "WorkerW"
        )
    }

    /// Fallback title check when UIA cannot momentarily read Brave's Omnibox.
    fn fallback_brave_title_check(title: &str, allow_arena_agent: bool) -> BraveUrlVerdict {
        let lower = title.trim().to_ascii_lowercase();
        // Strip whatever the browser appended to the tab title.
        let mut core = lower.as_str();
        for suffix in [
            " - brave",
            " — brave",
            " - google chrome",
            " — google chrome",
            " - microsoft edge",
            " — microsoft edge",
            " - chromium",
            " — chromium",
            " - opera",
            " — opera",
            " - vivaldi",
            " — vivaldi",
        ] {
            if let Some(stripped) = core.strip_suffix(suffix) {
                core = stripped;
                break;
            }
        }
        let core = core.trim();
        if core.is_empty()
            || core == "new tab"
            || core == "brave"
            || core == "chrome"
            || core == "edge"
            || core == "chromium"
            || core == "untitled"
        {
            return BraveUrlVerdict::TransientNewTab;
        }
        if core.contains("gemini")
            || core.contains("notebooklm")
            || core.contains("notebook.google")
            || core.contains("sign in - google accounts")
        {
            return BraveUrlVerdict::AllowedPausing;
        }
        if allow_arena_agent && (core.contains("arena") || core.contains("agent")) {
            return BraveUrlVerdict::AllowedPausing;
        }
        BraveUrlVerdict::Blocked(core.chars().take(48).collect())
    }

    pub fn inspect_foreground_state(
        uia: &mut UiaReader,
        allow_arena_agent: bool,
    ) -> ForegroundVerdict {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() {
                return ForegroundVerdict::NeutralUtility;
            }
            let mut pid: DWORD = 0;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid == 0 {
                return ForegroundVerdict::NeutralUtility;
            }
            if pid == std::process::id() {
                return ForegroundVerdict::AllowedStudyApp;
            }

            let class_name = read_window_class(hwnd);
            let title = read_window_title(hwnd);
            let title_lower = title.to_ascii_lowercase();

            let Some(exe_path) = query_process_image(pid) else {
                return ForegroundVerdict::NeutralUtility;
            };
            let base_lower = extract_basename(&exe_path);

            // Any Chromium-family browser: validate the address-bar domain!
            if is_chromium_browser_exe(&base_lower) {
                let verdict = if let Some(url) = read_brave_omnibox_url(uia, hwnd) {
                    evaluate_brave_url(&url, allow_arena_agent)
                } else {
                    fallback_brave_title_check(&title, allow_arena_agent)
                };
                return match verdict {
                    BraveUrlVerdict::Allowed => ForegroundVerdict::AllowedStudyApp,
                    BraveUrlVerdict::AllowedPausing => ForegroundVerdict::AllowedButPausing,
                    BraveUrlVerdict::TransientNewTab => ForegroundVerdict::NeutralUtility,
                    BraveUrlVerdict::Blocked(domain) => ForegroundVerdict::BlockedBraveDomain {
                        hwnd: hwnd as isize,
                        domain,
                    },
                };
            }

            // Always-allowed study software: Study Sentry, SumatraPDF, PotPlayer
            if is_strictly_allowed_study_exe(&base_lower) {
                return ForegroundVerdict::AllowedStudyApp;
            }

            // Explorer: allow taskbar, system tray, Alt+Tab, brightness/volume flyout; block File Explorer folder browsing
            if base_lower == "explorer.exe" {
                if class_name == "CabinetWClass" || class_name == "ExploreWClass" {
                    return ForegroundVerdict::BlockedApp {
                        app_name: "File Explorer".to_string(),
                    };
                }
                return ForegroundVerdict::NeutralUtility;
            }

            // Windows Settings (systemsettings.exe): explicitly blocked & auto-closed!
            if base_lower == "systemsettings.exe" {
                return ForegroundVerdict::BlockedApp {
                    app_name: "Windows Settings".to_string(),
                };
            }

            // UWP ApplicationFrameHost: allow Snipping Tool / Screen Sketch; block Settings & other UWP apps
            if base_lower == "applicationframehost.exe" {
                if is_screenshot_title(&title_lower) {
                    return ForegroundVerdict::NeutralUtility;
                }
                if title.is_empty() {
                    return ForegroundVerdict::NeutralUtility;
                }
                return ForegroundVerdict::BlockedApp { app_name: title };
            }

            // Screenshot tools (Snipping Tool, ScreenClippingHost, Greenshot), Brightness/Quick-Settings flyout, Tab switchers
            if is_allowed_utility_exe(&base_lower) || is_brightness_or_shell_switcher_class(&class_name) {
                return ForegroundVerdict::NeutralUtility;
            }

            let nice_name = exe_path
                .rsplit(['\\', '/'])
                .next()
                .unwrap_or(&exe_path)
                .to_string();
            ForegroundVerdict::BlockedApp { app_name: nice_name }
        }
    }

    fn is_core_os_never_kill(exe_path: &str, exe_base: &str) -> bool {
        // Note: systemsettings.exe is intentionally NOT here so Windows Settings gets closed!
        if exe_base == "systemsettings.exe"
            || exe_base == "calculatorapp.exe"
            || exe_base == "win32calc.exe"
            || exe_base == "mspaint.exe"
            || exe_base == "notepad.exe"
            || exe_base == "wordpad.exe"
            || exe_base == "microsoft.photos.exe"
            || exe_base == "video.ui.exe"
            || exe_base == "zunevideo.exe"
            || exe_base == "zunemusic.exe"
            || exe_base == "xboxpcapp.exe"
            || exe_base == "gamebar.exe"
        {
            return false;
        }
        if is_allowed_utility_exe(exe_base)
            || exe_base == "explorer.exe"
            || exe_base == "startmenuexperiencehost.exe"
            || exe_base == "searchhost.exe"
            || exe_base == "searchapp.exe"
            || exe_base == "widgets.exe"
            || exe_base == "taskmgr.exe"
            || exe_base == "openwith.exe"
        {
            return true;
        }
        let lower_path = exe_path.to_ascii_lowercase().replace('/', "\\");
        lower_path.contains("\\windows\\system32\\")
            || lower_path.contains("\\windows\\syswow64\\")
            || lower_path.contains("\\windows\\systemapps\\")
            || lower_path.contains("\\microsoft\\edgewebview\\application\\")
    }

    struct EnumCtx {
        self_pid: u32,
        // key -> (RunningAppInfo, close_window_only)
        found: HashMap<u32, (RunningAppInfo, bool)>,
    }

    unsafe extern "system" fn enum_windows_cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let ctx = &mut *(lparam as *mut EnumCtx);

        if IsWindowVisible(hwnd) == 0 {
            return 1;
        }
        if !GetWindow(hwnd, GW_OWNER).is_null() {
            return 1;
        }
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
        if (ex_style & WS_EX_TOOLWINDOW) != 0 {
            return 1;
        }

        let title = read_window_title(hwnd);
        if title.is_empty()
            || title == "Program Manager"
            || title == "Windows Input Experience"
            || title == "Settings" && false
        {
            return 1;
        }

        let mut pid: DWORD = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 || pid == ctx.self_pid || ctx.found.contains_key(&pid) {
            return 1;
        }

        let class_name = read_window_class(hwnd);
        if is_brightness_or_shell_switcher_class(&class_name) {
            return 1;
        }

        let Some(exe_path) = query_process_image(pid) else {
            return 1;
        };
        let base_lower = extract_basename(&exe_path);

        // Allowed study apps + screenshot/brightness utilities
        if is_strictly_allowed_study_exe(&base_lower) {
            return 1;
        }

        // Explorer: close open File Explorer folder windows gently without terminating shell
        if base_lower == "explorer.exe" {
            if class_name == "CabinetWClass" || class_name == "ExploreWClass" {
                ctx.found.insert(
                    pid,
                    (
                        RunningAppInfo {
                            exe_name: "File Explorer".to_string(),
                            exe_path,
                            window_title: title,
                        },
                        true,
                    ),
                );
            }
            return 1;
        }

        // UWP frame host: keep Snipping Tool, close Settings & other distracting UWP windows
        if base_lower == "applicationframehost.exe" {
            let tl = title.to_ascii_lowercase();
            if !is_screenshot_title(&tl) {
                ctx.found.insert(
                    pid,
                    (
                        RunningAppInfo {
                            exe_name: title.clone(),
                            exe_path,
                            window_title: title,
                        },
                        true,
                    ),
                );
            }
            return 1;
        }

        if is_core_os_never_kill(&exe_path, &base_lower) {
            return 1;
        }

        let exe_name = if base_lower == "systemsettings.exe" {
            "Windows Settings".to_string()
        } else {
            exe_path
                .rsplit(['\\', '/'])
                .next()
                .unwrap_or(&exe_path)
                .to_string()
        };

        ctx.found.insert(
            pid,
            (
                RunningAppInfo {
                    exe_name,
                    exe_path,
                    window_title: title,
                },
                false,
            ),
        );
        1
    }

    pub fn enumerate_unapproved_windows() -> HashMap<u32, (RunningAppInfo, bool)> {
        let mut ctx = EnumCtx {
            self_pid: std::process::id(),
            found: HashMap::new(),
        };
        unsafe {
            let _ = EnumWindows(enum_windows_cb, (&mut ctx as *mut EnumCtx) as LPARAM);
        }
        ctx.found
    }

    unsafe extern "system" fn close_safe_windows_cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let target_pid = lparam as DWORD;
        let mut pid: DWORD = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == target_pid && IsWindowVisible(hwnd) != 0 {
            let class_name = read_window_class(hwnd);
            let title_lower = read_window_title(hwnd).to_ascii_lowercase();
            if is_brightness_or_shell_switcher_class(&class_name) || is_screenshot_title(&title_lower) {
                return 1;
            }
            if class_name == "CabinetWClass"
                || class_name == "ExploreWClass"
                || class_name == "ApplicationFrameWindow"
            {
                let _ = PostMessageW(hwnd, WM_CLOSE, 0, 0);
            }
        }
        1
    }

    pub fn close_windows_only_for_key(pid: u32) {
        if pid == 0 || pid == std::process::id() {
            return;
        }
        unsafe {
            let _ = EnumWindows(close_safe_windows_cb, pid as LPARAM);
        }
    }

    unsafe extern "system" fn close_pid_windows_cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let target_pid = lparam as DWORD;
        let mut pid: DWORD = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == target_pid && IsWindowVisible(hwnd) != 0 {
            let _ = PostMessageW(hwnd, WM_CLOSE, 0, 0);
        }
        1
    }

    pub fn close_process_within_deadline(pid: u32) {
        if pid == 0 || pid == std::process::id() {
            return;
        }
        unsafe {
            let _ = EnumWindows(close_pid_windows_cb, pid as LPARAM);
        }
        std::thread::sleep(Duration::from_millis(260));
        unsafe {
            let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
            if !handle.is_null() {
                let _ = TerminateProcess(handle, 1);
                let _ = CloseHandle(handle);
            }
        }
    }
}

#[cfg(target_os = "windows")]
use win_impl::{
    close_brave_tab, close_process_within_deadline, close_windows_only_for_key, create_uia_reader,
    enumerate_unapproved_windows, inspect_foreground_state,
};

#[cfg(not(target_os = "windows"))]
fn create_uia_reader() {}

#[cfg(not(target_os = "windows"))]
fn inspect_foreground_state(_uia: &mut (), _allow_arena_agent: bool) -> ForegroundVerdict {
    ForegroundVerdict::AllowedStudyApp
}

#[cfg(not(target_os = "windows"))]
fn close_brave_tab(_hwnd: isize) {}

#[cfg(not(target_os = "windows"))]
fn enumerate_unapproved_windows() -> HashMap<u32, (RunningAppInfo, bool)> {
    HashMap::new()
}

#[cfg(not(target_os = "windows"))]
fn close_windows_only_for_key(_pid: u32) {}

#[cfg(not(target_os = "windows"))]
fn close_process_within_deadline(_pid: u32) {}
