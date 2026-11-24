use chrono::Utc;
use chrono_tz::Asia::Dhaka;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DhakaTickPayload {
    pub now_ms: i64,
    pub dhaka_date: String,
    pub dhaka_day: String,
    pub dhaka_time_hm: String,
}

/// Emitted when the OS suspends the machine (sleep / hibernation).
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SuspendPayload {
    /// How long the machine was actually asleep, in milliseconds.
    pub slept_ms: i64,
    /// Wall-clock time of the moment the app woke up again.
    pub now_ms: i64,
}

/// A tick gap larger than this means the machine was asleep (or the process
/// was frozen) rather than merely busy.
const SUSPEND_GAP: Duration = Duration::from_secs(4);

/// Spawns a lightweight, OS-level background thread that never suffers from
/// Chromium/WebView2 background tab throttling when minimized to the Windows 11 tray.
///
/// The same thread doubles as the sleep detector: when Windows suspends the
/// machine the thread freezes, so the gap between two ticks is the exact time
/// the computer was asleep. That gap is emitted so the UI can pause the focus
/// timer the instant the user wakes the machine up.
pub fn spawn_dhaka_heartbeat(app: AppHandle, quitting: Arc<AtomicBool>) {
    thread::Builder::new()
        .name("study-sentry-dhaka-clock".into())
        .spawn(move || {
            let mut last_wall = Utc::now();
            while !quitting.load(Ordering::Relaxed) {
                let utc_now = Utc::now();
                let dhaka_now = utc_now.with_timezone(&Dhaka);
                let payload = DhakaTickPayload {
                    now_ms: utc_now.timestamp_millis(),
                    dhaka_date: dhaka_now.format("%Y-%m-%d").to_string(),
                    dhaka_day: dhaka_now.format("%A").to_string(),
                    dhaka_time_hm: dhaka_now.format("%H:%M").to_string(),
                };

                let _ = app.emit("timer://tick", payload);

                // Did the machine sleep between the previous tick and now?
                let wall_gap = utc_now.signed_duration_since(last_wall);
                let gap_ms = wall_gap.num_milliseconds();
                if gap_ms >= SUSPEND_GAP.as_millis() as i64 {
                    let _ = app.emit(
                        "timer://suspended",
                        SuspendPayload {
                            slept_ms: gap_ms,
                            now_ms: utc_now.timestamp_millis(),
                        },
                    );
                }
                last_wall = utc_now;

                thread::sleep(Duration::from_secs(1));
            }
        })
        .ok();
}
