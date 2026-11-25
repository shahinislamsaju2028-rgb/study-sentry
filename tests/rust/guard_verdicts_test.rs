// Standalone harness: extracts the pure functions from guard.rs and asserts the
// allowed-but-pausing rules. Run with `rustc --test` on any platform.
include!("/tmp/guard_extract.rs");

#[test]
fn ai_sites_are_allowed_but_pausing() {
    for u in [
        "https://gemini.google.com/app",
        "https://notebooklm.google.com/notebook/abc",
        "https://accounts.google.com/signin",
    ] {
        assert_eq!(evaluate_brave_url(u, false), BraveUrlVerdict::AllowedPausing, "{u}");
    }
}

#[test]
fn arena_agent_pauses_only_when_enabled() {
    assert_eq!(evaluate_brave_url("https://arena.ai/agent", true), BraveUrlVerdict::AllowedPausing);
    assert_eq!(evaluate_brave_url("https://www.arena.ai/agent/x", true), BraveUrlVerdict::AllowedPausing);
    // toggle off -> blocked, not silently allowed
    assert!(matches!(evaluate_brave_url("https://arena.ai/agent", false), BraveUrlVerdict::Blocked(_)));
    // arena non-agent path stays blocked either way
    assert!(matches!(evaluate_brave_url("https://arena.ai/pricing", true), BraveUrlVerdict::Blocked(_)));
}

#[test]
fn other_sites_are_still_blocked() {
    for u in ["https://youtube.com", "https://facebook.com/watch", "https://example.org/a"] {
        assert!(matches!(evaluate_brave_url(u, true), BraveUrlVerdict::Blocked(_)), "{u}");
    }
}

#[test]
fn blank_and_internal_pages() {
    assert_eq!(evaluate_brave_url("", true), BraveUrlVerdict::TransientNewTab);
    assert_eq!(evaluate_brave_url("about:blank", true), BraveUrlVerdict::TransientNewTab);
    assert!(matches!(evaluate_brave_url("brave://settings", true), BraveUrlVerdict::Blocked(_)));
}

#[test]
fn study_apps_stay_counted() {
    for exe in ["sumatrapdf.exe", "potplayer.exe", "potplayer64.exe", "study sentry.exe"] {
        assert!(is_strictly_allowed_study_exe(exe), "{exe}");
    }
    for exe in ["discord.exe", "steam.exe", "winword.exe"] {
        assert!(!is_strictly_allowed_study_exe(exe), "{exe}");
    }
    // browsers are "allowed" but their address bar decides the verdict
    for exe in ["chrome.exe", "brave.exe", "msedge.exe"] {
        assert!(is_chromium_browser_exe(exe), "{exe} should route through the URL check");
    }
}
