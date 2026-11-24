// Prevents an extra console window on Windows in release builds — DO NOT REMOVE!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Study Sentry — Windows entry point (GNU toolchain).
//!
//! `webview2-com-sys` links WebView2 dynamically when the target env is not
//! MSVC, producing an import of `WebView2Loader.dll`. That dependency is
//! removed by the static shim in `webview2loader_shim.c` (wired up through
//! `src/lib.rs` + `.cargo/config.toml`), so the shipped exe is self-contained.

fn main() {
    study_sentry_lib::run()
}
