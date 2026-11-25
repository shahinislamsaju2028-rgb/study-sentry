import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useReducedMotion } from 'motion/react';
import { BellRing, ShieldAlert } from 'lucide-react';
import { StudyProvider, useStudy } from './context/StudyContext';
import { SpatialMotionProvider, useSpatialMotion } from './components/SpatialMotionEngine';
import { desktopBridge } from './bridge/desktopBridge';
import BottomNavigation from './components/BottomNavigation';
import TopBar from './components/TopBar';
import CommandPalette from './components/CommandPalette';
import PipWindowApp from './components/PipWindowApp';
import PipMenuWindowApp from './components/PipMenuWindowApp';
import { GlobalModals, ZenChamber } from './components/Modals';
import CommandHubView from './views/CommandHubView';
import FocusSessionView from './views/FocusSessionView';
import TasksView from './views/TasksView';
import InsightsView from './views/InsightsView';
import StudentSuiteView from './views/StudentSuiteView';
import SettingsView from './views/SettingsView';
import MiniWidgetView from './views/MiniWidgetView';
import MotivationView from './views/MotivationView';
import SprintView from './views/SprintView';
import DailyTracker from './components/DailyTracker';
import StudyCircleView from './views/StudyCircleView';
import StudyCircleSync from './components/StudyCircleSync';
import FloatingTimer from './components/FloatingTimer';
import PauseOverlays from './components/PauseOverlays';
import SessionRecoveryToast from './components/SessionRecoveryToast';
import PhaseModeModal from './components/PhaseModeModal';
import RoutineReminders from './components/RoutineReminders';
import { resolveThemeId } from './utils/themes';
import { resolveUiMode } from './utils/uiModes';
import { bnSubject } from './utils/bangla';
import BrandIcon from './components/BrandIcon';
import type { StudyState } from './types/study';

const views: Record<string, React.ComponentType> = {
  home: CommandHubView,
  study: FocusSessionView,
  focus: FocusSessionView,
  todo: TasksView,
  insights: InsightsView,
  suite: StudentSuiteView,
  settings: SettingsView,
  motivation: MotivationView,
  tracker: DailyTracker,
  sprint: SprintView,
  circle: StudyCircleView,
};

function Shell() {
  const {
    state,
    language,
    loaded,
    view,
    navigate,
    mini,
    toasts,
    isAlarm,
    displayTime,
    timer,
    stopAlarm,
    guardNotice,
    dashboardMinimized,
    setDashboardMinimized,
  } = useStudy() as {
    state: StudyState | null;
    language: string;
    loaded: boolean;
    view: string;
    navigate: (next: string, subtab?: string) => void;
    mini: boolean;
    toasts: Array<{ id: string; message: string }>;
    isAlarm?: boolean;
    displayTime?: string;
    timer?: { subjectName?: string; phase?: string } | null;
    stopAlarm?: () => void;
    guardNotice?: { active?: boolean; appName?: string; secondsLeft?: number } | null;
    dashboardMinimized?: boolean;
    setDashboardMinimized?: (val: boolean) => void;
  };

  // Short, quiet interaction cues; independent of alarm and warning playback.
  useEffect(() => {
    if (!state || state.profile.uiSoundEnabled === false) return;
    let audio: AudioContext | null = null;
    let last = 0;
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest('button, a[href], input[type=checkbox], input[type=radio], [role=button], [role=tab]');
      if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.closest('.v12-pause-request-card')) return;
      const now = performance.now();
      if (now - last < 80) return;
      last = now;
      try {
        audio ||= new AudioContext();
        if (audio.state === 'suspended') void audio.resume();
        const nav = !!control.closest('.nav-dock, .suite-tabs, .v11-ins-tabs');
        const time = audio.currentTime;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(nav ? 620 : 510, time);
        oscillator.frequency.exponentialRampToValueAtTime(nav ? 880 : 690, time + 0.045);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.035 * Math.min(100, Math.max(0, Number(state.profile.uiSoundVolume ?? 50))) / 100), time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + (nav ? 0.13 : 0.075));
        oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.start(time); oscillator.stop(time + (nav ? 0.14 : 0.08));
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      } catch { /* UI feedback must never interrupt the action. */ }
    };
    document.addEventListener('click', click);
    return () => { document.removeEventListener('click', click); if (audio) void audio.close(); };
  }, [state?.profile?.uiSoundEnabled, state?.profile?.uiSoundVolume, !!state]);

  const [cmdOpen, setCmdOpen] = useState(false);
  const {mode:motionMode}=useSpatialMotion();
  const reduceMotion=useReducedMotion();
  const calmMotion=motionMode==='calm'||!!reduceMotion;
  const effectiveTheme = resolveThemeId(state?.timerPrefs?.theme);
  const effectiveUiMode = resolveUiMode(
    typeof state?.timerPrefs?.uiMode === 'string' ? state.timerPrefs.uiMode : null
  );

  useEffect(() => {
    document.body.dataset.ambient = effectiveTheme;
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = effectiveTheme;
    document.body.dataset.uiMode = effectiveUiMode;
    document.documentElement.dataset.uiMode = effectiveUiMode;
  }, [view, language, effectiveTheme, effectiveUiMode]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
        return;
      }

      if (desktopBridge.isDesktop) {
        if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) {
          e.preventDefault();
          return;
        }
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const idx = Number(e.key) - 1;
        const ids = ['home', 'focus', 'todo', 'insights', 'suite', 'settings'];
        if (idx >= 0 && idx < ids.length) {
          e.preventDefault();
          navigate(ids[idx]);
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!desktopBridge.isDesktop) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"], .v4-pip-shell, .v5-pip-context-menu, .v9-web-pip-floating, .v9-pm-shell, .pip-preview-floating, .dt-cell')) {
        return;
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [navigate]);

  if (!loaded) {
    return (
      <div className="loading-screen">
        <div className="loading-mark loading-brand-mark">
          <BrandIcon size={76} variant="obsidian" alt="Study Sentry" />
        </div>
        <strong>Study Sentry</strong>
        <span>প্রস্তুত হচ্ছে…</span>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="loading-screen error-screen">
        <div className="loading-mark">!</div>
        <strong>সংরক্ষিত তথ্য খোলা যায়নি।</strong>
        <p>ব্যাকআপ যাচাই করে পুনরায় চেষ্টা করুন।</p>
      </div>
    );
  }

  const View = views[view] || CommandHubView;

  return (
    <div className={`app-root-frame ${mini && !desktopBridge.isDesktop ? 'browser-mini' : ''}`}>
      {isAlarm && !mini && (
        <div className="global-alarm-banner" role="alert">
          <div className="global-alarm-copy">
            <BellRing size={17} />
            <span>
              <strong>
                {timer?.phase === 'break' ? 'বিরতির সময় পূর্ণ!' : `${bnSubject(timer?.subjectName || 'Focus')} সেশন পূর্ণ!`}
              </strong>{' '}
              ওভারটাইম: <b className="alarm-neg-clock">{displayTime}</b>
            </span>
          </div>
          <button type="button" className="global-alarm-stop" onClick={() => stopAlarm?.()}>
            অ্যালার্ম থামান
          </button>
        </div>
      )}

      {guardNotice?.active && !mini && (
        <div className="global-guard-banner" role="alert">
          <ShieldAlert size={17} />
          <span>
            ফোকাস গার্ড: <strong>{guardNotice.appName || 'App.exe'}</strong> —{' '}
            <b>{guardNotice.secondsLeft || 3} সেকেন্ডে</b> বন্ধ হচ্ছে
          </span>
        </div>
      )}

      {dashboardMinimized ? (
        <div className="v4-minimized-desktop-stage">
          <div className="v4-minimized-dock-card">
            <div>
              <strong>Study Sentry ড্যাশবোর্ড মিনিমাইজ করা আছে</strong>
              <span>আপনার Always-On-Top PiP উইজেট সচল ও দৃশ্যমান রয়েছে।</span>
            </div>
            <button
              type="button"
              className="action-btn primary"
              onClick={() => setDashboardMinimized?.(false)}
            >
              ড্যাশবোর্ড পুনরুদ্ধার করুন
            </button>
          </div>
        </div>
      ) : mini ? (
        <MiniWidgetView />
      ) : (
        <div className="app-shell bottom-shell">
          <div className="ambient-glow" />
          <main className="main-area">
            <TopBar />
            <div className="view-container v12-spatial-viewport">
              {/* Route change used to run through <AnimatePresence mode="popLayout">.
                  popLayout has to MEASURE the outgoing subtree and absolutely
                  position it before the incoming view can paint — motion's
                  measureScroll() was showing up in every click profile, and the
                  rotateX/scale meant a 3D transform was rebuilt for a 240ms
                  fade. A CSS keyframe on the incoming view does the same job on
                  the compositor: opacity + a 6px lift, no measurement, no
                  second DOM tree, no 3D layer. The key is what restarts it. */}
              <div
                key={view}
                className={`v12-view-stage v37-route-motion${
                  calmMotion ? ' is-calm-route' : ''
                }`}
              >
                <View />
              </div>
            </div>
            <StudyCircleSync />
            <BottomNavigation />
          </main>
        </div>
      )}

      <RoutineReminders />
      <SessionRecoveryToast />
      <PhaseModeModal />
      <GlobalModals />
      <ZenChamber />
      <FloatingTimer />
      <PauseOverlays />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {createPortal(
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div className="toast clean-toast-enter" key={t.id}>
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function App() {
  let nativeLabel = '';
  if (desktopBridge.isDesktop) {
    try {
      nativeLabel = getCurrentWindow().label || '';
    } catch {
      nativeLabel = '';
    }
  }

  const queryWin =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('window') || ''
      : '';

  if (nativeLabel === 'pip-menu' || queryWin === 'pip-menu') {
    return <PipMenuWindowApp />;
  }

  if (nativeLabel === 'pip' || queryWin === 'pip') {
    return <PipWindowApp />;
  }

  return (
    <SpatialMotionProvider>
      <StudyProvider>
        <Shell />
      </StudyProvider>
    </SpatialMotionProvider>
  );
}
