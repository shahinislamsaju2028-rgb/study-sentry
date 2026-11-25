import {
  CHECKPOINT_KEY,
  checkpointTimer,
  recoverStoppedTimer,
  finalizeTimerOnAppExit,
  buildRemainderTodoFromRecovery,
} from '../utils/windowsTimerRecovery';
import { makeSteps } from '../utils/sprintSteps';
import React, { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AURA_RANKS, createCleanSlateState, createDemoSeedState, formatClockMMSS, toDateKey, uid } from '../utils/seedData';
import { activeSecondsOnDay, currentStreak, sessionSecondsOnDay, timerElapsedMs, timerIntervals, timerOvertimeSec, totalOnDay } from '../utils/stats';
import { studyAudio } from '../utils/audioEngine';
import {
  computeTodayPhasesSnapshot,
  getPhaseModeFromState,
  getStudyPhases,
  inferPhaseIdFromTimeStr,
  normalizePhaseMode,
  STUDY_PHASES,
} from '../utils/studyPhases';
import { bnNum, bnSubject } from '../utils/bangla';
import { PREMADE_SUBJECTS } from '../utils/premadeSubjects';
import { typeForActivity } from '../utils/focusDetails';
import { activityName, formatActivityLabel } from '../utils/subjectActivities';
import { resolveThemeId } from '../utils/themes';
import {
  GOAL_SUBJECTS,
  DEEP_GOAL_SECONDS,
  GOAL_BREAK_SECONDS,
  PAUSE_WAITS,
  DEFAULT_ALLOWED_APPS,
  DEFAULT_ALLOWED_SITES,
  DEFAULT_PIP,
  deepGoalElapsed,
  deepGoalLocked,
  isFocusSessionLocked,
  goalKind,
  goalLimit,
} from '../utils/deepGoal';
import { desktopBridge } from '../bridge/desktopBridge';

const StudyContext = createContext(null);
const LOCAL_KEY = 'study-sentry-react-v1';
const api = () => (desktopBridge.isDesktop ? desktopBridge : typeof window !== 'undefined' ? window.electronAPI : null);

export function mapSessionToTrackerActivity(session) {
  const meta = session?.focusMeta || {};
  if (meta.source === 'daily-tracker' && meta.trackerActivity) {
    return activityName(meta.trackerActivity);
  }
  if (meta.source === 'sprint-class') return 'Class';
  const act = String(session?.activityType || meta.activityType || '').toLowerCase();
  if (act === 'recorded' || act === 'class') return 'Class';
  if (act === 'sheet') return 'Lecture Sheet Review';
  if (act === 'revision') return 'Revision';
  if (act === 'bank' || act === 'practice') return 'Practice';
  return null;
}

function previewBuiltins(input) {
  if (!window.__STUDYSENTRY_STANDALONE_PREVIEW__ || !input || input._previewBuiltinsV3 || !Array.isArray(input.subjects)) return input;
  const defaults = createCleanSlateState().subjects;
  const existing = input.subjects.slice();
  const builtins = [];
  for (const item of defaults) {
    const aliases = item.id === 'subj_math' ? ['Mathematics', 'Higher Math'] : item.id === 'subj_ict' ? ['ICT & Coding', 'ICT'] : [item.name];
    const i = existing.findIndex((s) => s.id === item.id && aliases.some((n) => n.toLowerCase() === String(s.name || '').toLowerCase()));
    if (i >= 0) {
      const [old] = existing.splice(i, 1);
      builtins.push({ ...old, name: item.name });
      continue;
    }
    const sameName = existing.findIndex((s) => String(s.name || '').toLowerCase() === item.name.toLowerCase());
    if (sameName >= 0) {
      builtins.push(existing.splice(sameName, 1)[0]);
      continue;
    }
    const id = existing.some((s) => s.id === item.id) ? `preview_${item.id}` : item.id;
    builtins.push({ ...item, id });
  }
  return { ...input, subjects: [...builtins, ...existing], _previewBuiltinsV3: true };
}

function normalized(input, { imported = false } = {}) {
  const base = createCleanSlateState(input?.profile?.name || 'Student');
  const raw = previewBuiltins(input && typeof input === 'object' ? input : {});
  const collections = ['subjects', 'sessions', 'todos', 'exams', 'syllabus', 'flashcards', 'studyNotes', 'routine'];
  const result = {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile || {}) },
    timerPrefs: { ...base.timerPrefs, ...(raw.timerPrefs || {}) },
    commitment: { ...base.commitment, ...(raw.commitment || {}) },
  };
  collections.forEach((key) => {
    result[key] = Array.isArray(raw[key]) ? raw[key] : base[key];
  });
  if (window.__STUDYSENTRY_STANDALONE_PREVIEW__) {
    const subjects = result.subjects.slice();
    for (const name of PREMADE_SUBJECTS) {
      if (subjects.some((s) => String(s.name || '').toLowerCase() === name.toLowerCase())) continue;
      const item = base.subjects.find((s) => s.name === name);
      if (!item) continue;
      let id = item.id;
      let n = 1;
      while (subjects.some((s) => s.id === id)) id = `preview_${item.id}_${n++}`;
      subjects.push({ ...item, id });
    }
    result.subjects = subjects;
  }
  result.schemaVersion = 1;
  result.isDemo = !!raw.isDemo;
  result.activeTimer = imported ? null : raw.activeTimer && typeof raw.activeTimer === 'object' ? raw.activeTimer : null;
  result.deepGoals = Array.isArray(raw.deepGoals) ? raw.deepGoals : [];
  result.junkNotes = Array.isArray(raw.junkNotes) ? raw.junkNotes : [];
  const rawPip = raw.pipSettings && typeof raw.pipSettings === 'object' ? raw.pipSettings : {};
  const validClockStyle = ['flip', 'classic', 'inline'].includes(rawPip.clockStyle)
    ? rawPip.clockStyle
    : 'flip';
  const hasSavedV3Style = ['flip', 'classic', 'inline'].includes(rawPip.clockStyle);
  result.pipSettings = {
    ...DEFAULT_PIP,
    ...rawPip,
    open: true, // Always open & Always-On-Top whenever Study Sentry launches!
    clockStyle: validClockStyle,
    layout: rawPip.layout === 'extended' ? 'extended' : 'compact',
    width: hasSavedV3Style ? Math.max(160, Number(rawPip.width) || 224) : 224,
    height: hasSavedV3Style ? Math.max(60, Number(rawPip.height) || 126) : 126,
    corner: rawPip.corner || (rawPip.left == null ? 'top-right' : null),
  };
  const guard = raw.strictGuard && typeof raw.strictGuard === 'object' ? raw.strictGuard : {};
  result.strictGuard = {
    // Focus Guard is always armed — it simply enforces while the timer runs.
    enabled: true,
    allowedApps: Array.isArray(guard.allowedApps) ? guard.allowedApps : [...DEFAULT_ALLOWED_APPS],
    allowedSites: Array.isArray(guard.allowedSites) ? guard.allowedSites : [...DEFAULT_ALLOWED_SITES],
  };
  if (result.activeTimer?.status === 'half_wait') {
    result.activeTimer = { ...result.activeTimer, status: 'paused', lastResumedAt: null };
  }
  if (!result.subjects.some((s) => s.id === result.timerPrefs.selectedSubjectId)) {
    result.timerPrefs.selectedSubjectId = result.subjects[0]?.id || '';
  }
  return result;
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvForSessions(sessions) {
  const cell = (x) => {
    const s = String(x ?? '');
    return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
  };
  return [
    ['Date', 'Subject', 'Mode', 'Started At', 'Ended At', 'Duration (Minutes)', 'Duration (Seconds)', 'Notes'].join(','),
    ...[...sessions]
      .reverse()
      .map((s) =>
        [
          cell(s.dateKey),
          cell(s.subjectName),
          cell(s.mode),
          cell(s.startedAt),
          cell(s.endedAt),
          ((Number(s.durationSec) || 0) / 60).toFixed(2),
          Number(s.durationSec) || 0,
          cell(s.notes),
        ].join(',')
      ),
  ].join('\r\n');
}

export function StudyProvider({ children }) {
  const [state, setState] = useState(null);
  const stateRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [storagePath, setStoragePath] = useState('');
  const [saveStatus, setSaveStatus] = useState('loading');
  const [storageError, setStorageError] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const backupDayRef = useRef('');
  const loadFailedRef = useRef(false);
  const [view, setView] = useState('home');
  const [suiteTab, setSuiteTab] = useState('routine');
  const [insightsTab, setInsightsTab] = useState('calendar');
  const [motivationTab, setMotivationTab] = useState('overview');
  const [settingsSection, setSettingsSection] = useState('general');
  const [collapsed, setCollapsed] = useState(false);
  const [mini, setMini] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [zen, setZenState] = useState(false);
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [pauseRequest, setPauseRequest] = useState(null);
  const [halfRequest, setHalfRequest] = useState(null);
  const [guardNotice, setGuardNotice] = useState(null);
  const [timelineSyncPrompt, setTimelineSyncPrompt] = useState(null);
  const saveChain = useRef(Promise.resolve());
  const saveTimer = useRef(null);
  const completionGuard = useRef(null);
  const lastPipSigRef = useRef('');
  const autoSyncBaselineRef = useRef(null);
  const autoSyncDebounceRef = useRef(null);

  const toast = useCallback((message) => {
    const id = uid('toast');
    setToasts((prev) => [...prev.slice(-2), { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const commit = useCallback((updater) => {
    const prev = stateRef.current;
    if (!prev) return null;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (!next) return prev;
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const updatePip = useCallback(
    (patch) => commit((prev) => ({ ...prev, pipSettings: { ...DEFAULT_PIP, ...(prev.pipSettings || {}), ...patch } })),
    [commit]
  );

  const updateStrictGuard = useCallback(
    (patch) => {
      const active = stateRef.current?.activeTimer;
      const isEnforcing = Boolean(active && active.phase !== 'break' && active.status === 'running');
      if (
        isEnforcing &&
        (Object.prototype.hasOwnProperty.call(patch || {}, 'allowedApps') ||
          Object.prototype.hasOwnProperty.call(patch || {}, 'allowedSites') ||
          patch?.enabled === false)
      ) {
        toast('ফোকাস টাইমার চলাকালীন গার্ড তালিকা পরিবর্তন লক আছে। টাইমার থামালে Free Browsing চালু হবে।');
        return null;
      }
      return commit((prev) => ({
        ...prev,
        strictGuard: {
          allowedApps: [...DEFAULT_ALLOWED_APPS],
          allowedSites: [...DEFAULT_ALLOWED_SITES],
          ...(prev.strictGuard || {}),
          ...patch,
          // Never switchable — the guard follows the timer.
          enabled: true,
        },
      }));
    },
    [commit, toast]
  );

  const saveJunkNote = useCallback(
    (id, text) =>
      commit((prev) => {
        const items = Array.isArray(prev.junkNotes) ? prev.junkNotes : [];
        const old = items.find((n) => n.id === id);
        if (!String(text || '').trim()) return { ...prev, junkNotes: items.filter((n) => n.id !== id) };
        const item = {
          id,
          text: String(text).slice(0, 5000),
          createdAt: old?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { ...prev, junkNotes: old ? items.map((n) => (n.id === id ? item : n)) : [...items, item] };
      }),
    [commit]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let loadedState = null;
        if (api()?.isElectron) {
          const result = await api().loadState();
          if (!result?.ok) throw new Error(result?.error || 'Could not read the local SQLite database.');
          loadedState = result.state;
          setStoragePath(result.dbPath || 'Windows AppData · SQLite (WAL)');
          if (result.migratedFromJson && !cancelled) {
            setTimeout(() => toast('পুরনো JSON ফাইল থেকে সব তথ্য স্বয়ংক্রিয়ভাবে SQLite ডাটাবেসে যুক্ত হয়েছে!'), 600);
          }
        } else if (window.__STUDYSENTRY_STANDALONE_PREVIEW__) {
          try {
            loadedState = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
          } catch (_) {}
          setStoragePath('Browser storage (offline HTML preview)');
        } else {
          try {
            const response = await fetch('/api/state', { cache: 'no-store' });
            if (!response.ok) throw new Error('Local preview data unavailable');
            const result = await response.json();
            if (!result.ok) throw new Error(result.error || 'Preview data unavailable');
            loadedState = result.state;
            setStoragePath('Preview workspace / data / studysentry-data.json');
          } catch (_) {
            try {
              loadedState = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
            } catch (_) {}
            setStoragePath('Browser storage (preview)');
          }
        }
        const firstState =
          loadedState ||
          (api()?.isElectron ? { ...createCleanSlateState('Student'), isDemo: false } : { ...createDemoSeedState(), isDemo: true });
        let next;
        try {
          next = normalized(firstState);
        } catch (_) {
          next = normalized(
            api()?.isElectron
              ? { ...createCleanSlateState('Student'), isDemo: false }
              : { ...createDemoSeedState(), isDemo: true }
          );
        }
        if (next.activeTimer) {
          let checkpoint = null;
          try {
            checkpoint = JSON.parse(localStorage.getItem(CHECKPOINT_KEY) || 'null');
            localStorage.removeItem(CHECKPOINT_KEY);
          } catch (_) {}
          if (desktopBridge.isDesktop || checkpoint) {
            // App was completely exited: stop timer strictly at last alive moment,
            // save exact completed focus time, and queue remaining-minutes recovery toast.
            next = finalizeTimerOnAppExit(next, checkpoint, null);
          }
        }
        if (!cancelled) {
          stateRef.current = next;
          setState(next);
          setLoaded(true);
          setSaveStatus('saved');
        }
      } catch (err) {
        if (!cancelled) {
          let fallbackRaw = null;
          try {
            fallbackRaw = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
          } catch (_) {}
          const fallbackState = normalized(
            fallbackRaw ||
              (api()?.isElectron
                ? { ...createCleanSlateState('Student'), isDemo: false }
                : { ...createDemoSeedState(), isDemo: true })
          );
          stateRef.current = fallbackState;
          setState(fallbackState);
          loadFailedRef.current = true;
          setStorageError(String(err?.message || err));
          setSaveStatus('error');
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const persist = useCallback((snapshot) => {
    if (!snapshot || loadFailedRef.current) return Promise.resolve();
    const deferLocalBackup = () => {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot));
      } catch (_) {}
    };
    if (api()?.isDesktop) {
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(deferLocalBackup, { timeout: 900 });
      } else {
        setTimeout(deferLocalBackup, 16);
      }
      setSaveStatus('saving');
      saveChain.current = saveChain.current
        .catch(() => {})
        .then(async () => {
          const result = await api().saveState(snapshot);
          if (!result?.ok) throw new Error(result?.error || 'Could not save to SQLite');
          if (result.dbPath) setStoragePath(result.dbPath);
          setSaveStatus('saved');
          setStorageError('');
          const day = toDateKey();
          if (backupDayRef.current !== day) {
            try {
              const path = await desktopBridge.writeLocalBackup(snapshot, 'daily');
              backupDayRef.current = day;
              setBackupStatus(`সর্বশেষ দৈনিক কপি: ${day} · ${path}`);
            } catch (err) {
              setBackupStatus(`স্বয়ংক্রিয় ব্যাকআপ ব্যর্থ: ${String(err)}। ম্যানুয়াল ব্যাকআপ নিন।`);
            }
          }
        })
        .catch((err) => {
          setSaveStatus('error');
          setStorageError(String(err.message || err));
        });
      return saveChain.current;
    }

    let browserSaved = false;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot));
      browserSaved = true;
    } catch (_) {}
    if (window.__STUDYSENTRY_STANDALONE_PREVIEW__ && !api()?.isElectron) {
      setSaveStatus(browserSaved ? 'saved' : 'memory');
      setStoragePath(browserSaved ? 'Browser storage' : 'Memory only');
      return Promise.resolve();
    }
    setSaveStatus('saving');
    const payload = snapshot;
    saveChain.current = saveChain.current
      .catch(() => {})
      .then(async () => {
        if (api()?.isElectron) {
          const result = await api().saveState(payload);
          if (!result?.ok) throw new Error(result?.error || 'Could not save data');
          if (result.dbPath) setStoragePath(result.dbPath);
        } else {
          try {
            const response = await fetch('/api/state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state: payload }),
            });
            if (!response.ok) throw new Error('Preview save unavailable');
            const result = await response.json();
            if (!result.ok) throw new Error(result.error || 'Preview save failed');
          } catch (err) {
            if (!localStorage.getItem(LOCAL_KEY)) throw err;
          }
        }
        setSaveStatus('saved');
        setStorageError('');
      })
      .catch((err) => {
        setSaveStatus('error');
        setStorageError(String(err.message || err));
      });
    return saveChain.current;
  }, []);

  useEffect(() => {
    if (!loaded || !state || loadFailedRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(state), 350);
    return () => clearTimeout(saveTimer.current);
  }, [state, loaded, persist]);

  const saveNow = useCallback(() => {
    clearTimeout(saveTimer.current);
    return persist(stateRef.current);
  }, [persist]);

  // Zero-Data-Loss Safeguard: Immediately flush state to localStorage & SQLite on close/hide/restart
  useEffect(() => {
    if (!loaded) return undefined;
    const flushImmediate = () => {
      const snap = stateRef.current;
      if (!snap || loadFailedRef.current) return;
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(snap));
      } catch (_) {}
      if (desktopBridge.isDesktop) {
        desktopBridge.saveState(snap).catch(() => {});
      }
    };
    const onVisChange = () => {
      if (document.hidden) flushImmediate();
    };
    window.addEventListener('beforeunload', flushImmediate);
    window.addEventListener('pagehide', flushImmediate);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('beforeunload', flushImmediate);
      window.removeEventListener('pagehide', flushImmediate);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [loaded]);

  const pauseLeft = pauseRequest
    ? Math.max(0, Math.ceil(((pauseRequest.startedAt || 0) + (pauseRequest.waitSeconds || 30) * 1000 - now) / 1000))
    : 0;

  const halfWaitLeft = halfRequest
    ? Math.max(0, Math.ceil(((halfRequest.startedAt || 0) + (halfRequest.waitSeconds || 30) * 1000 - now) / 1000))
    : 0;

  useEffect(() => {
    if (!loaded) return;
    const pauseCounting = Boolean(pauseRequest && pauseLeft > 0);
    const halfCounting = Boolean(halfRequest && halfWaitLeft > 0);
    const live =
      state?.activeTimer?.status === 'running' ||
      state?.activeTimer?.status === 'alarm' ||
      state?.activeTimer?.status === 'half_wait' ||
      pauseCounting ||
      halfCounting ||
      !!guardNotice?.active ||
      (view === 'motivation' && motivationTab !== 'tracker');
    const tick = () => setNow(Date.now());
    const checkpoint = () => {
      const current = stateRef.current?.activeTimer;
      try {
        if (!current) localStorage.removeItem(CHECKPOINT_KEY);
        else if (current.status === 'running' || current.status === 'paused') {
          localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpointTimer(current)));
        }
      } catch (_) { /* SQLite save errors remain separately visible. */ }
    };
    checkpoint();
    const wake = () => {
      if (!document.hidden) tick();
    };
    tick();
    let lastRustTickAt = 0;
    const unsubRustTick =
      live && desktopBridge.isDesktop
        ? desktopBridge.onRustTimerTick((payload) => {
            if (payload?.nowMs) {
              lastRustTickAt = Date.now();
              checkpoint();
              setNow(payload.nowMs);
            }
          })
        : null;
    // Avoid competing duplicate 1s ticks when Rust heartbeat is actively driving `now`
    const id = setInterval(() => {
      checkpoint();
      if (desktopBridge.isDesktop && live && Date.now() - lastRustTickAt < 920) return;
      tick();
    }, live ? 1000 : 15000);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    return () => {
      unsubRustTick?.();
      clearInterval(id);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
    };
  }, [
    loaded,
    state?.activeTimer?.status,
    Boolean(pauseRequest && pauseLeft > 0),
    Boolean(halfRequest && halfWaitLeft > 0),
    !!guardNotice?.active,
    view,
    motivationTab,
  ]);

  // Strict Focus Guard: enforces fixed study apps (Brave, SumatraPDF, PotPlayer),
  // Brave domain allowlist (gemini.google.com, notebook.google.com + optional arena.ai/agent),
  // 3s auto-close, repeated notifications, and automatic pause/resume (outside 30s manual pause).
  useEffect(() => {
    if (!loaded || !state) return;
    const t = state.activeTimer;
    const timerRunningForGuard = Boolean(t && t.phase !== 'break' && t.status === 'running');
    const guardPaused = Boolean(
      t && t.phase !== 'break' && t.status === 'paused' && t.pausedByGuard
    );
    if (!timerRunningForGuard && !guardPaused && guardNotice?.active) {
      setGuardNotice(null);
    }
    if (!desktopBridge.isDesktop) return;
    desktopBridge.guardSyncConfig({
      timerActive: timerRunningForGuard,
      enabled: true,
      allowedApps: DEFAULT_ALLOWED_APPS,
      allowArenaAgent: Boolean(state.strictGuard?.allowArenaAgent),
      guardPaused,
    });
  }, [loaded, state?.activeTimer, state?.strictGuard, guardNotice?.active]);

  // Sandbox preview 3-second countdown simulation when testing Smart Guard
  useEffect(() => {
    if (desktopBridge.isDesktop || !guardNotice?.active) return;
    const id = setInterval(() => {
      setGuardNotice((prev) => {
        if (!prev?.active) return null;
        const nextSec = (Number(prev.secondsLeft) || 3) - 1;
        if (nextSec <= 0) {
          toast(`ফোকাস গার্ড: "${prev.appName || 'App.exe'}" বন্ধ করা হয়েছে।`);
          return null;
        }
        return { ...prev, secondsLeft: nextSec };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [guardNotice?.active, toast]);

  useEffect(() => {
    if (!desktopBridge.isDesktop) return;
    return desktopBridge.onGuardViolation((payload) => {
      if (payload.closed) {
        setGuardNotice(null);
        const label =
          payload.kind === 'domain'
            ? `ফোকাস গার্ড: অনুমোদনহীন ওয়েবসাইট "${payload.windowTitle || payload.appName}" 3 সেকেন্ডে বন্ধ করা হয়েছে।`
            : `ফোকাস গার্ড: অনুমোদনহীন "${payload.appName}" 3 সেকেন্ডে বন্ধ করা হয়েছে।`;
        toast(label);
      } else if (payload.active) {
        setGuardNotice({
          type: payload.kind === 'domain' ? 'domain' : 'app',
          active: true,
          appName: payload.appName,
          exePath: payload.exePath,
          windowTitle: payload.windowTitle,
          secondsLeft: payload.secondsLeft,
          startedAt: Date.now(),
        });
      } else {
        setGuardNotice(null);
      }
    });
  }, [toast]);

  const navigate = useCallback((next, subtab) => {
    startTransition(() => {
      if (next === 'motivation' && subtab === 'board') {
        setView('todo');
        return;
      }
      if (next === 'motivation' && subtab === 'tracker') {
        setView('tracker');
        return;
      }
      if (next === 'suite' && subtab) setSuiteTab(subtab);
      if (next === 'insights' && subtab) setInsightsTab(subtab);
      if (next === 'motivation' && subtab) setMotivationTab(subtab);
      if (next === 'settings') setSettingsSection(subtab || 'general');
      setView(next === 'study' ? 'focus' : next);
    });
  }, []);

  const openModal = useCallback((type, payload = null) => setModal({ type, payload }), []);
  const closeModal = useCallback(() => setModal(null), []);
  const [dashboardMinimized, setDashboardMinimized] = useState(false);

  const setZen = useCallback((enable) => {
    const value = !!enable;
    setZenState(value);
    if (api()?.setFullScreen) api().setFullScreen(value);
    else if (value && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    else if (!value && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }, []);

  const toggleMini = useCallback(async () => {
    setMini((prev) => {
      const next = !prev;
      if (api()?.setMiniMode) api().setMiniMode(next);
      return next;
    });
  }, []);

  const togglePin = useCallback(async () => {
    if (!api()?.isElectron || !api()?.setAlwaysOnTop) {
      toast('অন্য উইন্ডোর ওপরে পিন করে রাখার সুবিধা ডেক্সটপ অ্যাপে কার্যকর।');
      return;
    }
    const next = !pinned;
    await api().setAlwaysOnTop(next);
    setPinned(next);
  }, [pinned, toast]);

  const language = 'en';
  const t = useCallback((english, bangla) => english || bangla, []);
  const ts = useCallback((english) => english, []);
  const setLanguage = useCallback((lang) => commit((prev) => ({ ...prev, uiLanguage: lang === 'bn' ? 'bn' : 'en' })), [commit]);

  const updateProfile = useCallback((patch) => commit((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } })), [commit]);
  const updatePrefs = useCallback((patch) => commit((prev) => ({ ...prev, timerPrefs: { ...prev.timerPrefs, ...patch } })), [commit]);
  const updateCommitment = useCallback(
    (patch) =>
      commit((prev) => ({
        ...prev,
        commitment: { ...prev.commitment, ...patch },
        timerPrefs:
          !prev.activeTimer && ['Study', 'Work'].includes(patch.category)
            ? { ...prev.timerPrefs, focusCategory: patch.category }
            : prev.timerPrefs,
      })),
    [commit]
  );

  const putItem = useCallback(
    (collection, item) =>
      commit((prev) => {
        const current = Array.isArray(prev[collection]) ? prev[collection] : [];
        const exists = current.some((v) => v.id === item.id);
        return {
          ...prev,
          [collection]: exists
            ? current.map((v) => (v.id === item.id ? { ...v, ...item } : v))
            : [...current, { ...item, id: item.id || uid(collection) }],
        };
      }),
    [commit]
  );

  const patchItem = useCallback(
    (collection, id, patch) => {
      if (collection === 'todos') {
        const old = (stateRef.current?.todos || []).find((x) => x.id === id);
        if (old && !old.done && (patch.done === true || patch.boardStatus === 'done' || patch.status === 'done')) {
          toast('ফোকাস সেশন ছাড়া কাজ সম্পন্ন করা যাবে না — নির্ধারিত সময়ের Focus সেশন শুরু করুন।');
          return;
        }
      }
      commit((prev) => ({
        ...prev,
        [collection]: (prev[collection] || []).map((item) => {
          if (item.id !== id) return item;
          const next = { ...item, ...patch };
          if (
            collection === 'todos' &&
            Object.prototype.hasOwnProperty.call(patch, 'done') &&
            !Object.prototype.hasOwnProperty.call(patch, 'boardStatus')
          ) {
            next.boardStatus = patch.done ? 'done' : 'todo';
            next.status = next.boardStatus;
          }
          return next;
        }),
      }));
    },
    [commit, toast]
  );

  const deleteItem = useCallback(
    (collection, id) => commit((prev) => ({ ...prev, [collection]: (prev[collection] || []).filter((item) => item.id !== id) })),
    [commit]
  );

  // Strict Focus-Verified Daily Tracker: manual ticks/crosses are disabled!
  const setTrackerCell = useCallback(() => {
    toast('ফোকাস সেশন ছাড়া ম্যানুয়ালি টিক বা ক্রস দেওয়া যাবে না — সেলটিতে ক্লিক করে ফোকাস শুরু করুন।');
  }, [toast]);

  const setRoutine = useCallback(
    (day, field, value) =>
      commit((prev) => ({
        ...prev,
        routine: prev.routine.some((r) => r.day === day)
          ? prev.routine.map((r) => (r.day === day ? { ...r, [field]: value } : r))
          : [...prev.routine, { day, [field]: value }],
      })),
    [commit]
  );

  const setDuration = useCallback(
    (minutes, key = 'custom') => {
      if (stateRef.current?.activeTimer) {
        toast('সময় বদলানোর আগে চলমান টাইমার শেষ করুন।');
        return false;
      }
      const focusMin = Math.max(1, Math.min(720, Math.round(Number(minutes) || 50)));
      updatePrefs({ focusMin, presetKey: key, mode: 'pomodoro' });
      return true;
    },
    [updatePrefs, toast]
  );

  const setMode = useCallback(
    (mode) => {
      if (stateRef.current?.activeTimer) {
        toast('ধরন বদলানোর আগে চলমান টাইমার শেষ করুন।');
        return false;
      }
      updatePrefs({ mode });
      return true;
    },
    [toast, updatePrefs]
  );

  const selectSubject = useCallback(
    (id) => {
      const active = stateRef.current?.activeTimer;
      if (active && active.subjectId !== id) {
        toast('বিষয় বদলানোর আগে চলমান সেশন শেষ করুন।');
        return false;
      }
      updatePrefs({ selectedSubjectId: id });
      return true;
    },
    [updatePrefs, toast]
  );

  const prepareFocus = useCallback(
    (details) => {
      const data = stateRef.current;
      if (!data) return;
      if (data.activeTimer) {
        toast('নতুন কাজ বাছার আগে চলমান সেশন শেষ করুন।');
        return;
      }
      if (['sprint-class', 'sprint-task'].includes(details.source)) {
        const sp = data.sprintData?.sprints?.find((x) => x.id === details.sprintId);
        const item =
          details.source === 'sprint-class'
            ? sp?.classes?.find((x) => x.id === details.classId)
            : sp?.tasks?.find((x) => x.id === details.sprintTaskId);
        if (!item || item.done) {
          toast('কাজটি পাওয়া যায়নি বা ইতোমধ্যে সম্পন্ন হয়েছে।');
          return;
        }
        if (item.date && item.date > toDateKey()) {
          toast('এই কাজটি নির্ধারিত দিনে শুরু হবে।');
          return;
        }
      }
      if (details.source === 'todo') {
        const task = (data.todos || []).find((x) => x.id === details.taskId);
        if (!task || task.done) {
          toast('কাজটি পাওয়া যায়নি বা আগেই সম্পন্ন হয়েছে।');
          return;
        }
      }
      if (details.source === 'syllabus-stage') {
        const ch = (data.syllabus || []).find((x) => x.id === details.syllabusChapterId);
        const stage = details.syllabusStage;
        if (!ch || !['theory', 'notes', 'practice', 'revised'].includes(stage) || ch[stage]) {
          toast('সিলেবাসের ধাপটি পাওয়া যায়নি বা আগেই সম্পন্ন হয়েছে।');
          return;
        }
        details = { ...details, minutes: Math.max(1, Math.min(720, Number(ch.stageMinutes?.[stage]) || 25)) };
      }
      if (details.source === 'daily-tracker') {
        const today = toDateKey();
        if (details.trackerDate && details.trackerDate !== today) {
          toast('শুধু আজকের দিনের কাজের জন্য সরাসরি ফোকাস সেশন শুরু করা যায়।');
          return;
        }
      }
      const subject =
        data.subjects.find((x) => x.id === details.subjectId) ||
        data.subjects.find(
          (x) => String(x.name).toLowerCase() === String(details.subjectName || details.trackerSubject || details.title || '').toLowerCase()
        );
      const minutes = Math.max(1, Math.min(details.source === 'todo' ? 1440 : 720, Math.round(Number(details.minutes) || data.timerPrefs.focusMin || 50)));
      commit((prev) => ({
        ...prev,
        focusDraft: { ...details, subjectId: subject?.id || details.subjectId || '', minutes },
        timerPrefs: { ...prev.timerPrefs, mode: 'pomodoro', focusMin: minutes, ...(subject ? { selectedSubjectId: subject.id } : {}) },
      }));
      navigate('focus');
    },
    [commit, navigate, toast]
  );

  const startTrackerFocus = useCallback(
    (trackerDate, trackerSubject, trackerActivity) => {
      const today = toDateKey();
      if (trackerDate !== today) {
        toast('ফোকাস ছাড়া টিক বা ক্রস দেওয়া যাবে না — শুধু আজকের দিনের কাজের ফোকাস সেশন শুরু করা যাবে।');
        return;
      }
      const data = stateRef.current;
      const defaultMin = Math.max(15, Number(data?.timerPrefs?.focusMin) || 30);
      const canonAct = activityName(trackerActivity);
      const actLabel = formatActivityLabel(canonAct);
      prepareFocus({
        source: 'daily-tracker',
        trackerDate,
        trackerSubject,
        trackerActivity: canonAct,
        subjectName: trackerSubject,
        activityType: typeForActivity(canonAct),
        workLabel: `${trackerSubject} · ${actLabel}`,
        title: actLabel,
        requiredMinutes: 15,
        minutes: defaultMin,
      });
      toast(`"${bnSubject(trackerSubject)} · ${actLabel}" সম্পন্ন করতে আগে ফোকাস সেশন পূর্ণ করুন।`);
    },
    [prepareFocus, toast]
  );

  const finishTimerRef = useRef(null);

  const startTimer = useCallback(
    (requestedSubjectId, options = {}) => {
      const data = stateRef.current;
      if (!data) return;
      const active = data.activeTimer;
      if (active) {
        if (active.status === 'alarm') {
          finishTimerRef.current?.(true);
          return;
        }
        if (requestedSubjectId && active.subjectId !== requestedSubjectId && active.phase !== 'break') {
          toast('অন্য বিষয় শুরু করার আগে চলমান সেশন শেষ করুন।');
          return;
        }
        if (active.status === 'paused') {
          if (active.pausedByGuard && guardNotice?.active) {
            toast('আবার শুরুর আগে অনুমোদিত অ্যাপে ফিরুন।');
            return;
          }
          commit((prev) => ({ ...prev, activeTimer: { ...prev.activeTimer, status: 'running', pausedByGuard: false, lastResumedAt: Date.now() } }));
          toast('টাইমার আবার শুরু হয়েছে।');
        }
        if (!options.stay) navigate('study');
        return;
      }
      const fm = options.focusMeta;
      if (fm && ['sprint-class', 'sprint-task'].includes(fm.source)) {
        const sp = data.sprintData?.sprints?.find((x) => x.id === fm.sprintId);
        const item = fm.source === 'sprint-class' ? sp?.classes?.find((x) => x.id === fm.classId) : sp?.tasks?.find((x) => x.id === fm.sprintTaskId);
        if (!item || item.done) {
          toast('স্প্রিন্টের কাজটি পাওয়া যায়নি অথবা ইতোমধ্যে শেষ।');
          return;
        }
        if (item.date && item.date > toDateKey()) {
          toast('নির্ধারিত দিনের আগে এই কাজ শুরু করা যাবে না।');
          return;
        }
      }
      let focusMeta = fm;
      if (fm?.source === 'todo') {
        const task = (data.todos || []).find((x) => x.id === fm.taskId);
        if (!task || task.done) {
          toast('কাজটি পাওয়া যায়নি বা আগেই সম্পন্ন হয়েছে।');
          return;
        }
        focusMeta = {
          ...fm,
          requiredMinutes: Math.max(1, Math.min(1440, Number(task.plannedMin) || Number(task.durationMin) || Math.round(Number(task.estimatedHours) * 60) || 50)),
        };
      }
      if (fm?.source === 'syllabus-stage') {
        const ch = (data.syllabus || []).find((x) => x.id === fm.syllabusChapterId);
        const stage = fm.syllabusStage;
        if (!ch || !['theory', 'notes', 'practice', 'revised'].includes(stage) || ch[stage]) {
          toast('সিলেবাসের ধাপটি পাওয়া যায়নি বা আগেই সম্পন্ন হয়েছে।');
          return;
        }
        focusMeta = { ...fm, requiredMinutes: Math.max(1, Math.min(720, Number(ch.stageMinutes?.[stage]) || 25)) };
      }
      if (fm?.source === 'daily-tracker') {
        focusMeta = { ...fm, requiredMinutes: Math.max(1, Number(fm.requiredMinutes) || 15) };
      }
      const subjectId = requestedSubjectId || data.timerPrefs.selectedSubjectId || data.subjects[0]?.id;
      const fixed = GOAL_SUBJECTS.includes(options.fixedSubject) ? options.fixedSubject : null;
      const subject = fixed
        ? data.subjects.find((s) => String(s.name).toLowerCase() === fixed.toLowerCase()) || {
            id: `goal_${fixed.toLowerCase().replace(/\s+/g, '_')}`,
            name: fixed,
            color: '#f59e0b',
          }
        : data.subjects.find((s) => s.id === subjectId);
      if (!subject && options.phase !== 'break') {
        toast('পড়া শুরু করতে আগে একটি বিষয় যোগ করুন।');
        openModal('subject');
        return;
      }
      const mode = options.mode || data.timerPrefs.mode || 'pomodoro';
      const phase = options.phase || 'focus';
      const durationSec = Math.max(
        60,
        Math.round(Number(options.minutes || (phase === 'break' ? data.timerPrefs.breakMin : data.timerPrefs.focusMin) || 50) * 60)
      );
      const started = Date.now();
      const linkedTask = (data.todos || []).find((task) => task.id === options.taskId && !task.done);
      const timer = {
        id: uid('timer'),
        status: 'running',
        mode,
        phase,
        subjectId: subject?.id || '',
        subjectName: subject?.name || 'Break',
        taskId: linkedTask?.id || '',
        taskTitle: linkedTask?.title || '',
        focusMeta: focusMeta || null,
        activityType: focusMeta?.activityType || '',
        durationSec,
        pauseRequests: 0,
        workType: options.workType || data.timerPrefs.focusCategory || (data.commitment?.category === 'Work' ? 'Work' : 'Study'),
        accumulatedMs: 0,
        lastResumedAt: started,
        alarmStartedAt: null,
        startedAt: new Date(started).toISOString(),
        segments: [],
      };
      completionGuard.current = null;
      try {
        studyAudio._ensureCtx();
      } catch (_) {}
      commit((prev) => ({
        ...prev,
        activeTimer: timer,
        sprintData: focusMeta?.sprintId && ['sprint-class','sprint-task'].includes(focusMeta.source) && prev.sprintData ? {...prev.sprintData,sprints:(prev.sprintData.sprints||[]).map(sp=>{if(sp.id!==focusMeta.sprintId)return sp;const key=focusMeta.source==='sprint-class'?'classes':'tasks',id=focusMeta.classId||focusMeta.sprintTaskId;return {...sp,[key]:(sp[key]||[]).map(x=>x.id===id&&!x.done?{...x,boardStatus:'doing',focusDates:[...new Set([...(x.focusDates||[]),toDateKey(new Date(started))])]}:x)}})}:prev.sprintData,
        todos: focusMeta?.source==='todo' ? (prev.todos||[]).map(t=>t.id===focusMeta.taskId&&!t.done?{...t,boardStatus:'doing',status:'doing',focusDates:[...new Set([...(Array.isArray(t.focusDates)?t.focusDates:[]),toDateKey(new Date(started))])]}:t) : prev.todos,
        timerPrefs: { ...prev.timerPrefs, focusCategory: timer.workType, ...(subject ? { selectedSubjectId: subject.id } : {}) },
      }));
      setNow(started);
      if (!options.stay) navigate('study');
    },
    [commit, toast, navigate, openModal, guardNotice]
  );

  const startDeepGoal = useCallback(
    (subject, options = {}) => {
      const data = stateRef.current;
      if (!data) return false;
      if (data.activeTimer) {
        toast('আরেকটি গোল শুরুর আগে চলমান টাইমার শেষ করুন।');
        return false;
      }
      let saved = options.goalId ? (data.deepGoals || []).find((g) => g.id === options.goalId) : null;
      if (options.goalId && !saved) {
        toast('সংরক্ষিত গোলটি আর পাওয়া যাচ্ছে না।');
        return false;
      }
      const chosen = saved?.subject || subject;
      if (!GOAL_SUBJECTS.includes(chosen)) {
        toast('সাতটি পড়ার বিষয় বা ক্লাস বেছে নিন।');
        return false;
      }
      const kind = goalKind(chosen);
      const today = toDateKey();
      const limit = goalLimit(kind);
      if (!saved) {
        const existing = (data.deepGoals || []).filter((g) => g.dateKey === today && g.kind === kind);
        let slot = Number(options.slot) || 0;
        if (slot) {
          if (slot < 1 || slot > limit) {
            toast('এই গোলের স্থানটি নেই।');
            return false;
          }
          const occupied = existing.find((g) => Number(g.slot) === slot);
          if (occupied) {
            if (occupied.savedSec < DEEP_GOAL_SECONDS) saved = occupied;
            else {
              toast('এই গোলটি আগেই সম্পূর্ণ হয়েছে।');
              return false;
            }
          }
        } else {
          slot = Array.from({ length: limit }, (_, i) => i + 1).find((i) => !existing.some((g) => Number(g.slot) === i)) || 0;
        }
        if (!saved && !slot) {
          toast(`আজ ${kind === 'class' ? 'ক্লাস' : 'পড়ার'} ${bnNum(limit)}টি গোলের সব স্থান ব্যবহার হয়েছে।`);
          return false;
        }
        if (!saved) {
          const linked = (data.todos || []).find((task) => task.id === options.taskId && !task.done);
          saved = {
            id: uid('goal'),
            dateKey: today,
            kind,
            slot,
            subject: chosen,
            taskId: linked?.id || '',
            taskTitle: linked?.title || '',
            savedSec: 0,
            status: 'partial',
            pauseRequests: 0,
            createdAt: new Date().toISOString(),
          };
        }
      }
      const base = Math.max(0, Math.min(DEEP_GOAL_SECONDS, Number(saved.savedSec) || 0));
      if (base >= DEEP_GOAL_SECONDS) {
        toast('গোলটি আগেই সম্পূর্ণ হয়েছে।');
        return false;
      }
      const match = data.subjects.find((s) => String(s.name).toLowerCase() === String(saved.subject).toLowerCase());
      const started = Date.now();
      const timer = {
        id: uid('timer'),
        kind: 'deep_goal',
        goalId: saved.id,
        goalBaseSec: base,
        mode: 'pomodoro',
        phase: 'focus',
        status: 'running',
        subjectId: match?.id || `goal_${saved.subject.toLowerCase().replace(/\s+/g, '_')}`,
        subjectName: saved.subject,
        taskId: saved.taskId || '',
        taskTitle: saved.taskTitle || '',
        workType: 'Study',
        durationSec: DEEP_GOAL_SECONDS - base,
        accumulatedMs: 0,
        lastResumedAt: started,
        alarmStartedAt: null,
        startedAt: new Date(started).toISOString(),
        segments: [],
        pauseRequests: Math.max(0, Number(saved.pauseRequests) || 0),
      };
      completionGuard.current = null;
      try {
        studyAudio._ensureCtx();
      } catch (_) {}
      commit((prev) => {
        const exists = (prev.deepGoals || []).some((g) => g.id === saved.id);
        return {
          ...prev,
          activeTimer: timer,
          deepGoals: exists
            ? prev.deepGoals.map((g) => (g.id === saved.id ? { ...g, status: 'running' } : g))
            : [...(prev.deepGoals || []), { ...saved, status: 'running' }],
          pipSettings: { ...DEFAULT_PIP, ...prev.pipSettings, open: true, subject: saved.subject, taskId: saved.taskId || '' },
        };
      });
      setNow(started);
      toast(`${bnSubject(saved.subject)} গোল ${base ? 'আবার শুরু' : 'শুরু'} হয়েছে · মোট 90 মিনিট।`);
      return true;
    },
    [commit, toast]
  );

  const pauseImmediately = useCallback(
    (reason = 'manual') => {
      const current = stateRef.current?.activeTimer;
      if (!current || current.status !== 'running') return false;
      const t = Date.now();
      const elapsed = timerElapsedMs(current, t);
      const segments = timerIntervals(current, t);
      commit((prev) => ({
        ...prev,
        activeTimer: { ...prev.activeTimer, status: 'paused', pausedByGuard: reason === 'guard', accumulatedMs: elapsed, lastResumedAt: null, segments },
      }));
      setNow(t);
      return true;
    },
    [commit]
  );

  // Pause the focus timer because the machine went to sleep. The sleep time is
  // subtracted from the elapsed clock so the student never loses study minutes
  // to a suspended computer.
  const pauseForSleep = useCallback(
    (sleptMs) => {
      const current = stateRef.current?.activeTimer;
      if (!current || current.status !== 'running') return false;
      const t = Date.now();
      const sinceResume = Math.max(0, t - (Number(current.lastResumedAt) || t));
      const slept = Math.max(
        0,
        Math.min(Number(sleptMs) || 0, sinceResume, 12 * 60 * 60 * 1000)
      );
      if (slept < 1000) return false;
      const wakeAt = t - slept;
      const elapsed = Math.max(0, timerElapsedMs(current, wakeAt));
      const segments = timerIntervals(current, wakeAt);
      commit((prev) => ({
        ...prev,
        activeTimer: {
          ...prev.activeTimer,
          status: 'paused',
          pausedByGuard: false,
          accumulatedMs: elapsed,
          lastResumedAt: null,
          segments,
        },
      }));
      setNow(t);
      return true;
    },
    [commit]
  );

  const resumeTimer = useCallback(
    (fromGuard = false) => {
      const current = stateRef.current?.activeTimer;
      if (!current || current.status !== 'paused') return false;
      if (current.pausedByGuard && !fromGuard && guardNotice?.active) {
        toast('আবার শুরুর আগে অনুমোদিত অ্যাপে ফিরুন।');
        return false;
      }
      const t = Date.now();
      commit((prev) => ({ ...prev, activeTimer: { ...prev.activeTimer, status: 'running', pausedByGuard: false, lastResumedAt: t } }));
      setNow(t);
      return true;
    },
    [commit, guardNotice, toast]
  );

  // ===== System sleep detection ==========================================
  // When the computer sleeps the focus timer must pause the instant the
  // machine wakes up, instead of silently burning through the sleep time.
  useEffect(() => {
    if (!loaded) return undefined;

    const handleSuspend = (payload) => {
      const sleptMs = Math.max(0, Number(payload?.sleptMs) || 0);
      if (!pauseForSleep(sleptMs)) return;
      const mins = Math.max(1, Math.round(sleptMs / 60000));
      toast(
        `কম্পিউটার স্লিপ হওয়ায় টাইমার ${bnNum(mins)} মিনিট থামানো হয়েছিল — টাইমার পজ করা হয়েছে।`
      );
    };

    const unsubNative =
      desktopBridge.isDesktop && desktopBridge.onSystemSuspend
        ? desktopBridge.onSystemSuspend(handleSuspend)
        : null;

    // Browser / webview fallback: the heartbeat notices the gap by itself.
    let lastBeat = Date.now();
    const beat = setInterval(() => {
      const now = Date.now();
      const gap = now - lastBeat;
      lastBeat = now;
      if (gap > 10000) handleSuspend({ sleptMs: gap });
    }, 1000);

    return () => {
      unsubNative?.();
      clearInterval(beat);
    };
  }, [loaded, pauseForSleep, toast]);

  /* 7.txt ① — one handler, two callers: the Rust guard emits these payloads in
     the desktop app, and for the browser build (which has no OS window access)
     the same handler is exposed on `window` so the flow can be driven in the
     preview and in tests without faking a desktop. */
  const applyGuardFocusState = useCallback(
    (payload) => {
      const cur = stateRef.current?.activeTimer;
      if (!cur || cur.phase === 'break') return;
      if (payload?.shouldPause) {
        if (cur.status === 'running') {
          pauseImmediately('guard');
          /* AI sites are allowed; the clock simply rests there. A blocked app is
             a warning and gets a chime — this is not a warning. */
          if (payload.reason === 'ai') {
            toast('AI সাইটে আছেন — টাইমার নিজে থেকেই পজ আছে। পড়ায় ফিরলেই আবার চলবে।');
          } else {
            studyAudio.playNotificationAlert?.();
            const where = payload.target ? ` (${payload.target})` : '';
            toast(
              `ফোকাস টাইমার অটো-পজ হয়েছে${where} — অনুমোদিত সফটওয়্যারে ফিরলে আবার চালু হবে।`
            );
          }
        }
      } else if (cur.status === 'paused' && cur.pausedByGuard) {
        resumeTimer(true);
        toast('অনুমোদিত স্টাডি সফটওয়্যারে ফিরেছেন · টাইমার স্বয়ংক্রিয়ভাবে চালু হয়েছে।');
      }
    },
    [pauseImmediately, resumeTimer, toast]
  );

  // Automatic Guard Pause & Resume (pauses on a non-allowed app/domain or an
  // allowed-but-resting AI site, without the 30s manual pause dialog, and
  // auto-resumes when the student returns to a counted app).
  useEffect(() => {
    if (!desktopBridge.isDesktop || !desktopBridge.onGuardFocusState) return;
    return desktopBridge.onGuardFocusState(applyGuardFocusState);
  }, [applyGuardFocusState]);

  /* Web build only: the active-window guard is a Windows feature, so the
     preview exposes the same entry point so the flow can be exercised.
     Harmless in the desktop app. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__studySentryGuardFocus = applyGuardFocusState;
    return () => {
      if (window.__studySentryGuardFocus === applyGuardFocusState) {
        delete window.__studySentryGuardFocus;
      }
    };
  }, [applyGuardFocusState]);

  const requestPause = useCallback(() => {
    const current = stateRef.current?.activeTimer;
    if (!current || current.status !== 'running') return false;
    if (current.phase === 'break') return pauseImmediately();
    if (pauseRequest || halfRequest) return false;
    const count = Math.max(0, Number(current.pauseRequests) || 0);
    const attempt = count + 1;
    const started = Date.now();
    const elapsed = timerElapsedMs(current, started);
    const segments = timerIntervals(current, started);
    try {
      studyAudio._ensureCtx();
    } catch (_) {}
    // Freeze timer clock cleanly during Pause Request wait; user resumes manually when ready (No Auto-Resume)
    commit((prev) => ({
      ...prev,
      activeTimer: {
        ...prev.activeTimer,
        status: 'paused',
        pausedByGuard: false,
        accumulatedMs: elapsed,
        lastResumedAt: null,
        segments,
        pauseRequests: attempt,
      },
      deepGoals: (prev.deepGoals || []).map((g) => (g.id === current.goalId ? { ...g, pauseRequests: attempt } : g)),
    }));
    setPauseRequest({
      timerId: current.id,
      attempt,
      waitSeconds: 30,
      startedAt: started,
    });
    setNow(started);
    return true;
  }, [commit, pauseImmediately, pauseRequest, halfRequest]);

  const resumeFromPauseScreen = useCallback(() => {
    studyAudio.stopAllTimerLoops();
    studyAudio.setBackgroundMuted(false);
    setPauseRequest(null);
    resumeTimer();
  }, [resumeTimer]);

  const confirmPauseAfterWait = useCallback(() => {
    studyAudio.stopAllTimerLoops();
    studyAudio.setBackgroundMuted(false);
    setPauseRequest(null);
    toast('সেশন পজ অবস্থায় আছে। প্রস্তুত হলে ফোকাসে ফিরুন।');
  }, [toast]);

  const cancelPause = useCallback(
    (quiet = false) => {
      studyAudio.stopAllTimerLoops();
      studyAudio.setBackgroundMuted(false);
      setPauseRequest(null);
      if (stateRef.current?.activeTimer?.status === 'paused') {
        resumeTimer();
      }
      if (!quiet) toast('পজ রিকোয়েস্ট বন্ধ হয়েছে · ফোকাস টাইমার চলছে।');
    },
    [resumeTimer, toast]
  );

  const simulateGuardViolation = useCallback(
    (type = 'app') => {
      const data = stateRef.current;
      const current = data?.activeTimer;
      if (!data?.strictGuard?.enabled) {
        toast('সফটওয়্যার গার্ড বন্ধ আছে।');
        return false;
      }
      if (!current || current.phase === 'break' || current.status !== 'running') {
        toast('গার্ড পরীক্ষা করতে আগে ফোকাস টাইমার চালু করুন।');
        return false;
      }
      setGuardNotice({ type: type === 'edge' ? 'edge' : 'app', appName: 'SampleApp.exe', secondsLeft: 3, startedAt: Date.now(), active: true });
      toast('পরীক্ষামূলক সতর্কতা: অনুমোদনহীন সফটওয়্যার ৩ সেকেন্ডে বন্ধ হবে।');
      return true;
    },
    [toast]
  );

  const simulateGuardReturn = useCallback(() => {
    const current = stateRef.current?.activeTimer;
    if (current?.status === 'paused' && current.pausedByGuard) resumeTimer(true);
    setGuardNotice(null);
  }, [resumeTimer]);

  const saveGoalAndStop = useCallback(
    (half = false, completed = false) => {
      const data = stateRef.current;
      const t = data?.activeTimer;
      if (!t || t.kind !== 'deep_goal' || completionGuard.current === t.id) return false;
      studyAudio.stopClockTickAlarm();
      const at = Date.now();
      const durationSec = Math.floor(timerElapsedMs(t, at) / 1000);
      const total = Math.min(DEEP_GOAL_SECONDS, (Number(t.goalBaseSec) || 0) + durationSec);
      const segments = t.segments?.length && t.status === 'alarm' ? t.segments : timerIntervals(t, at);
      const actualEnd = segments.length ? segments[segments.length - 1].end : new Date(at).toISOString();
      const earned = Math.floor(durationSec / 60) * 2;
      const session =
        durationSec > 0
          ? {
              id: uid('session'),
              subjectId: t.subjectId,
              subjectName: t.subjectName,
              taskId: t.taskId || '',
              taskTitle: t.taskTitle || '',
              mode: 'deep_goal',
              workType: 'Study',
              goalId: t.goalId,
              startedAt: t.startedAt,
              endedAt: actualEnd,
              durationSec,
              dateKey: toDateKey(new Date(t.startedAt)),
              notes: '',
              segments,
            }
          : null;
      const isDone = completed || total >= DEEP_GOAL_SECONDS;
      completionGuard.current = t.id;
      commit((prev) => ({
        ...prev,
        sessions: session ? [...prev.sessions, session] : prev.sessions,
        profile: { ...prev.profile, xp: (Number(prev.profile.xp) || 0) + earned },
        deepGoals: (prev.deepGoals || []).map((g) =>
          g.id === t.goalId
            ? { ...g, savedSec: Math.max(Number(g.savedSec) || 0, total), status: isDone ? 'done' : 'partial', pauseRequests: Number(t.pauseRequests) || 0, updatedAt: new Date(at).toISOString() }
            : g
        ),
        halfExitDate: half ? toDateKey(new Date(at)) : prev.halfExitDate,
        activeTimer: null,
      }));
      setPauseRequest(null);
      setHalfRequest(null);
      setNow(at);
      toast(
        isDone
          ? 'ফোকাস সেশন সম্পন্ন! অগ্রগতি সফলভাবে সংরক্ষিত হয়েছে।'
          : half
          ? 'অর্ধেক গোল সংরক্ষিত।'
          : 'গোলের অগ্রগতি সংরক্ষিত।'
      );
      return true;
    },
    [commit, toast]
  );

  const beginHalfGoalExit = useCallback(() => {
    toast('7 মিনিট ফোকাস পূর্ণ হলে সম্পূর্ণ সেশন শেষ না করে বের হওয়া যাবে না।');
    return false;
  }, [toast]);

  const cancelHalfGoalExit = useCallback(
    (quiet = false) => {
      const current = stateRef.current?.activeTimer;
      const r = halfRequest;
      if (current?.status === 'half_wait' && r?.timerId === current.id) {
        const at = Date.now();
        commit((prev) => ({
          ...prev,
          activeTimer: { ...prev.activeTimer, status: r.wasPaused ? 'paused' : 'running', lastResumedAt: r.wasPaused ? null : at },
        }));
        setNow(at);
      }
      setHalfRequest(null);
      if (!quiet) toast('অর্ধেক গোল রেখে প্রস্থান বাতিল হয়েছে।');
    },
    [commit, halfRequest, toast]
  );

  const confirmHalfGoalExit = useCallback(() => {
    const r = halfRequest;
    const t = stateRef.current?.activeTimer;
    const at = Date.now();
    if (!r || t?.id !== r.timerId || t.status !== 'half_wait' || at - r.startedAt < 60000) return false;
    if (stateRef.current?.halfExitDate === toDateKey(new Date(at))) {
      toast('আজ অর্ধেক গোল রেখে প্রস্থানের সুযোগ ব্যবহার করা হয়েছে।');
      return false;
    }
    return saveGoalAndStop(true, false);
  }, [halfRequest, saveGoalAndStop, toast]);

  const finishTimer = useCallback(
    (auto = false) => {
      const data = stateRef.current;
      const t = data?.activeTimer;
      if (!t || completionGuard.current === t.id) return;
      studyAudio.stopClockTickAlarm();

      // Strict 7-minute universal lock: ANY focus session >= 7 min cannot be stopped or ended early!
      if (t.phase !== 'break' && !auto && t.status !== 'alarm' && isFocusSessionLocked(t, Date.now())) {
        toast('7 মিনিট ফোকাস পূর্ণ হয়েছে — নির্ধারিত সময় সম্পূর্ণ না করে সমাপ্ত বা বের হওয়া যাবে না।');
        return;
      }

      if (t.kind === 'deep_goal') {
        if (t.status === 'half_wait') {
          toast('আগে অপেক্ষা শেষ বা বাতিল করুন।');
          return;
        }
        saveGoalAndStop(false, t.status === 'alarm' || deepGoalElapsed(t, Date.now()) >= DEEP_GOAL_SECONDS);
        return;
      }
      if (t.kind === 'deep_goal_break' && !auto && t.status !== 'alarm' && timerElapsedMs(t, Date.now()) < GOAL_BREAK_SECONDS * 1000) {
        toast('গোলের বিরতি নির্ধারিত 10 মিনিট।');
        return;
      }
      completionGuard.current = t.id;
      const timestamp = Date.now();
      const elapsedMs = timerElapsedMs(t, timestamp);
      const durationSec = Math.floor(elapsedMs / 1000);
      const segments = t.segments?.length && t.status === 'alarm' ? t.segments : timerIntervals(t, timestamp);
      const actualEnd = segments.length ? segments[segments.length - 1].end : new Date(timestamp).toISOString();
      let earned = 0;
      let result = null;
      const wasAlarm = t.status === 'alarm' || auto;

      if (t.phase !== 'break' && durationSec > 0) {
        earned = Math.floor(durationSec / 60) * 2;
        const sessionDateKey = toDateKey(new Date(t.startedAt));
        const session = {
          id: uid('session'),
          subjectId: t.subjectId,
          subjectName: t.subjectName,
          taskId: t.taskId || '',
          taskTitle: t.taskTitle || '',
          mode: t.mode,
          workType: t.workType || 'Study',
          focusMeta: t.focusMeta || null,
          activityType: t.activityType || '',
          startedAt: t.startedAt,
          endedAt: actualEnd,
          durationSec,
          dateKey: sessionDateKey,
          notes: '',
          segments,
        };
        const meta = t.focusMeta || {};
        const sprint = (data.sprintData?.sprints || []).find((x) => x.id === meta.sprintId);
        const item =
          meta.source === 'sprint-class'
            ? sprint?.classes?.find((c) => c.id === meta.classId)
            : meta.source === 'sprint-task'
            ? sprint?.tasks?.find((x) => x.id === meta.sprintTaskId)
            : null;
        const isSprintWork = !!meta.sprintId && ['sprint-class', 'sprint-task'].includes(meta.source);
        const isTodoWork = meta.source === 'todo';
        const todo = isTodoWork ? (data.todos || []).find((x) => x.id === meta.taskId) : null;
        const isSyllabusWork = meta.source === 'syllabus-stage';
        const ch = isSyllabusWork ? (data.syllabus || []).find((x) => x.id === meta.syllabusChapterId) : null;
        const validStage = ['theory', 'notes', 'practice', 'revised'].includes(meta.syllabusStage);
        const isTrackerWork = meta.source === 'daily-tracker';

        const isRecoveryWork = meta.source === 'session-recovery';

        const requiredSec =
          isSprintWork && item
            ? Math.max(1, Number(item.duration) || Number(meta.requiredMinutes) || 45) * 60
            : isSyllabusWork && ch && validStage
            ? Math.max(1, Number(meta.requiredMinutes) || 25) * 60
            : isTodoWork && todo
            ? Math.max(1, Number(meta.requiredMinutes) || 50) * 60
            : isRecoveryWork
            ? Math.max(1, Number(meta.requiredMinutes) || 1) * 60
            : isTrackerWork
            ? Math.max(1, Number(meta.requiredMinutes) || 15) * 60
            : 0;

        const longestSegmentSec = Math.floor(
          segments.reduce((max, seg) => Math.max(max, (Date.parse(seg.end) - Date.parse(seg.start)) / 1000 || 0), durationSec)
        );
        const qualifies = !!(
          (isSprintWork
            ? item && !item.done
            : isSyllabusWork
            ? ch && validStage && !ch[meta.syllabusStage]
            : isTodoWork
            ? todo && !todo.done
            : isRecoveryWork || isTrackerWork) &&
          requiredSec &&
          (isSyllabusWork ? longestSegmentSec : durationSec) >= requiredSec
        );
        session.sprintRequiredSec = isSprintWork ? requiredSec : 0;
        session.sprintQualified = isSprintWork && qualifies;
        session.syllabusQualified = isSyllabusWork && qualifies;
        session.todoQualified = isTodoWork && qualifies;
        session.trackerQualified = isTrackerWork && qualifies;

        const mappedTrackerAct = mapSessionToTrackerActivity(session);
        const autoTrackerQualifies = Boolean(mappedTrackerAct && (qualifies || durationSec >= 15 * 60));

        const next = commit((prev) => {
          let n = {
            ...prev,
            activeTimer: null,
            sessions: [...prev.sessions, session],
            profile: { ...prev.profile, xp: (Number(prev.profile.xp) || 0) + earned },
          };

          if (autoTrackerQualifies && mappedTrackerAct && session.subjectName) {
            const tr = n.dailyTracker && typeof n.dailyTracker === 'object' ? { ...n.dailyTracker } : {};
            const dayMap = tr[sessionDateKey] && typeof tr[sessionDateKey] === 'object' ? { ...tr[sessionDateKey] } : {};
            const subKey = meta.trackerSubject || session.subjectName;
            const subMap = dayMap[subKey] && typeof dayMap[subKey] === 'object' ? { ...dayMap[subKey] } : {};
            subMap[mappedTrackerAct] = 'done';
            dayMap[subKey] = subMap;
            tr[sessionDateKey] = dayMap;
            n.dailyTracker = tr;
            if (n.focusDraft?.source === 'daily-tracker' && n.focusDraft.trackerActivity === mappedTrackerAct) {
              n.focusDraft = {};
            }
          }

          if (isTodoWork && qualifies) {
            const parentId = meta.parentTaskId || todo?.parentTaskId || '';
            n.todos = (prev.todos || []).map((x) =>
              x.id === meta.taskId || (parentId && x.id === parentId)
                ? { ...x, done: true, boardStatus: 'done', status: 'done', completedSessionId: session.id }
                : x
            );
            const linkedSp = meta.sprintLink || todo?.linkedSprintItem || null;
            if (linkedSp?.sprintId && linkedSp?.itemId && prev.sprintData) {
              n.sprintData = {
                ...prev.sprintData,
                sprints: (prev.sprintData.sprints || []).map((sp) => {
                  if (sp.id !== linkedSp.sprintId) return sp;
                  if (linkedSp.kind === 'class') {
                    return {
                      ...sp,
                      classes: (sp.classes || []).map((c) =>
                        c.id === linkedSp.itemId
                          ? { ...c, done: true, completedAt: timestamp, completedSessionId: session.id }
                          : c
                      ),
                    };
                  }
                  return {
                    ...sp,
                    tasks: (sp.tasks || []).map((tk) =>
                      tk.id === linkedSp.itemId
                        ? { ...tk, done: true, completedAt: timestamp, completedSessionId: session.id }
                        : tk
                    ),
                  };
                }),
              };
            }
            if (prev.focusDraft?.source === 'todo' && prev.focusDraft.taskId === meta.taskId) n.focusDraft = {};
          }
          if (meta.source === 'session-recovery' && qualifies) {
            const parentId = meta.parentTaskId || meta.taskId || '';
            if (parentId) {
              n.todos = (prev.todos || []).map((x) =>
                x.id === parentId
                  ? { ...x, done: true, boardStatus: 'done', status: 'done', completedSessionId: session.id }
                  : x
              );
            }
            const linkedSp = meta.sprintLink || null;
            if (linkedSp?.sprintId && linkedSp?.itemId && prev.sprintData) {
              n.sprintData = {
                ...prev.sprintData,
                sprints: (prev.sprintData.sprints || []).map((sp) => {
                  if (sp.id !== linkedSp.sprintId) return sp;
                  if (linkedSp.kind === 'class') {
                    return {
                      ...sp,
                      classes: (sp.classes || []).map((c) =>
                        c.id === linkedSp.itemId
                          ? { ...c, done: true, completedAt: timestamp, completedSessionId: session.id }
                          : c
                      ),
                    };
                  }
                  return {
                    ...sp,
                    tasks: (sp.tasks || []).map((tk) =>
                      tk.id === linkedSp.itemId
                        ? { ...tk, done: true, completedAt: timestamp, completedSessionId: session.id }
                        : tk
                    ),
                  };
                }),
              };
            }
          }
          if (isSyllabusWork && qualifies) {
            n.syllabus = (prev.syllabus || []).map((cItem) =>
              cItem.id === meta.syllabusChapterId
                ? { ...cItem, [meta.syllabusStage]: true, stageSessions: { ...(cItem.stageSessions || {}), [meta.syllabusStage]: session.id } }
                : cItem
            );
            if (
              prev.focusDraft?.source === 'syllabus-stage' &&
              prev.focusDraft.syllabusChapterId === meta.syllabusChapterId &&
              prev.focusDraft.syllabusStage === meta.syllabusStage
            ) {
              n.focusDraft = {};
            }
          }
          if (
            isSprintWork &&
            qualifies &&
            prev.focusDraft?.sprintId === meta.sprintId &&
            prev.focusDraft?.classId === meta.classId &&
            prev.focusDraft?.sprintTaskId === meta.sprintTaskId
          ) {
            n.focusDraft = {};
          }
          if (isSprintWork && qualifies && prev.sprintData) {
            n.sprintData = {
              ...prev.sprintData,
              sprints: (prev.sprintData.sprints || []).map((sp) => {
                if (sp.id !== meta.sprintId) return sp;
                if (meta.source === 'sprint-class') {
                  const cl = sp.classes.find((x) => x.id === meta.classId);
                  if (!cl || cl.done) return sp;
                  const steps = Number(sp.scheduleVersion) >= 2 ? [] : makeSteps(sp, cl, toDateKey(new Date(timestamp)));
                  return {
                    ...sp,
                    classes: sp.classes.map((x) => (x.id === cl.id ? { ...x, done: true, completedAt: timestamp, completedSessionId: session.id } : x)),
                    tasks: [...(sp.tasks || []), ...steps],
                  };
                }
                return {
                  ...sp,
                  tasks: sp.tasks.map((x) =>
                    x.id === meta.sprintTaskId && !x.done ? { ...x, done: true, completedAt: timestamp, completedSessionId: session.id } : x
                  ),
                };
              }),
            };
          }
          return n;
        });

        result = {
          sessionId: session.id,
          focusMeta: t.focusMeta || null,
          subjectName: t.subjectName,
          durationSec,
          todaySec: totalOnDay(next.sessions, toDateKey()),
          xp: earned,
          auto: wasAlarm,
          isSprintWork: isSprintWork || isSyllabusWork || isTodoWork || isTrackerWork,
          requiredSec,
          qualified: qualifies,
        };
      } else {
        commit((prev) => ({ ...prev, activeTimer: null }));
      }
      setPauseRequest(null);
      setNow(timestamp);
      if (wasAlarm) studyAudio.playChime(t.phase === 'break' ? 'break' : 'complete');
      if (result) openModal('complete', result);
      else toast(t.phase === 'break' ? 'বিরতি শেষ হয়েছে। নতুন ফোকাস শুরু করতে পারেন!' : 'টাইমার সংরক্ষিত হয়েছে।');
    },
    [commit, toast, openModal, saveGoalAndStop]
  );

  finishTimerRef.current = finishTimer;

  const stopAlarm = useCallback(() => {
    studyAudio.stopClockTickAlarm();
    const t = stateRef.current?.activeTimer;
    if (t?.status === 'alarm') {
      finishTimer(true);
    }
  }, [finishTimer]);

  const toggleTimer = useCallback(() => {
    const current = stateRef.current?.activeTimer;
    if (!current) startTimer();
    else if (current.status === 'alarm') stopAlarm();
    else if (current.status === 'running') requestPause();
    else if (current.status === 'paused') resumeTimer();
  }, [startTimer, stopAlarm, requestPause, resumeTimer]);

  const saveFocusReport = useCallback(
    (sessionId, report) => {
      const data = stateRef.current;
      const session = data?.sessions?.find((s) => s.id === sessionId);
      if (!session) return;
      const meta = session.focusMeta || {};
      const completed = report.status === 'done';
      commit((prev) => {
        let next = { ...prev, sessions: prev.sessions.map((s) => (s.id === sessionId ? { ...s, focusReport: report } : s)) };
        if (meta.source === 'todo' && meta.taskId) {
          next.todos = prev.todos.map((t) =>
            t.id !== meta.taskId
              ? t
              : {
                  ...t,
                  done: !!t.done,
                  boardStatus: t.done ? 'done' : 'doing',
                  status: t.done ? 'done' : 'doing',
                  lastFocusReport: report,
                  cycle: meta.cycle || '',
                  chapter: meta.chapter || '',
                  className: meta.className || '',
                  questionTarget: meta.questionTarget || '',
                  ...(report.videoPosition ? { videoPosition: report.videoPosition } : {}),
                }
          );
        }
        if (meta.sprintId && prev.sprintData) {
          next.sprintData = {
            ...prev.sprintData,
            sprints: (prev.sprintData.sprints || []).map((sp) => {
              if (sp.id !== meta.sprintId) return sp;
              if (meta.source === 'sprint-class') {
                return {
                  ...sp,
                  classes: sp.classes.map((c) =>
                    c.id !== meta.classId ? c : { ...c, lastFocusReport: report, ...(report.videoPosition ? { videoPosition: report.videoPosition } : {}) }
                  ),
                };
              }
              if (meta.source === 'sprint-task') {
                return {
                  ...sp,
                  tasks: sp.tasks.map((t) => (t.id !== meta.sprintTaskId ? t : { ...t, lastFocusReport: report, questionTarget: meta.questionTarget || '' })),
                };
              }
              return sp;
            }),
          };
        }
        if (
          prev.focusDraft &&
          prev.focusDraft.source === meta.source &&
          prev.focusDraft.syllabusChapterId === meta.syllabusChapterId &&
          prev.focusDraft.syllabusStage === meta.syllabusStage &&
          prev.focusDraft.taskId === meta.taskId &&
          prev.focusDraft.classId === meta.classId &&
          prev.focusDraft.sprintTaskId === meta.sprintTaskId
        ) {
          next.focusDraft = (
            meta.source === 'syllabus-stage'
              ? session.syllabusQualified
              : meta.source === 'todo'
              ? session.todoQualified
              : meta.sprintId
              ? session.sprintQualified
              : completed
          )
            ? {}
            : { ...prev.focusDraft, ...(report.videoPosition ? { videoPosition: report.videoPosition } : {}) };
        }
        return next;
      });
      toast('সেশনের রিপোর্ট সংরক্ষিত হয়েছে।');
    },
    [commit, toast]
  );

  // Record each completed GOAL minute in the local ledger
  useEffect(() => {
    const t = state?.activeTimer;
    if (t?.kind !== 'deep_goal') return;
    const progress = Math.floor(deepGoalElapsed(t, now) / 60) * 60;
    const item = (state.deepGoals || []).find((g) => g.id === t.goalId);
    if (item && progress > (Number(item.savedSec) || 0)) {
      commit((prev) => ({
        ...prev,
        deepGoals: (prev.deepGoals || []).map((g) =>
          g.id === t.goalId ? { ...g, savedSec: Math.max(Number(g.savedSec) || 0, progress), updatedAt: new Date(now).toISOString() } : g
        ),
      }));
    }
  }, [state?.activeTimer, state?.deepGoals, now, commit]);

  // UNIVERSAL COUNTDOWN COMPLETION -> Continuous Clock-Hand Alarm + Negative Overtime (-00:01, -00:02...)
  useEffect(() => {
    const t = state?.activeTimer;
    if (t?.status !== 'running' || t.mode !== 'pomodoro' || timerElapsedMs(t, now) < t.durationSec * 1000) return;

    const segments = timerIntervals(t, now);
    const alarmStart = Date.now();

    commit((prev) => ({
      ...prev,
      activeTimer: {
        ...prev.activeTimer,
        status: 'alarm',
        accumulatedMs: t.durationSec * 1000,
        lastResumedAt: null,
        alarmStartedAt: alarmStart,
        segments,
      },
      deepGoals:
        t.kind === 'deep_goal'
          ? (prev.deepGoals || []).map((g) => (g.id === t.goalId ? { ...g, savedSec: DEEP_GOAL_SECONDS, status: 'done' } : g))
          : prev.deepGoals,
    }));

    setPauseRequest(null);
    setNow(alarmStart);

    const alertMsg =
      t.phase === 'break'
        ? 'বিরতির সময় শেষ! ঘড়ির অ্যালার্ম থামাতে Stop চাপুন।'
        : `${bnSubject(t.subjectName)} ফোকাস সময় পূর্ণ হয়েছে! অ্যালার্ম থামাতে ও সংরক্ষণ করতে Stop চাপুন।`;
    toast(alertMsg);
    desktopBridge.notifyRoutine(alertMsg, 'Study Sentry · সময় পূর্ণ হয়েছে ⏰').catch(() => {});
  }, [state?.activeTimer, now, commit, toast]);

  // User-Driven Pause Request: Clear only if activeTimer itself was ended/reset; NEVER auto-resume on countdown end!
  useEffect(() => {
    if (!pauseRequest) return;
    const t = state?.activeTimer;
    if (!t || t.id !== pauseRequest.timerId) {
      studyAudio.stopAllTimerLoops();
      studyAudio.setBackgroundMuted(false);
      setPauseRequest(null);
    }
  }, [pauseRequest, state?.activeTimer]);

  useEffect(() => {
    if (!halfRequest) return;
    const key = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelHalfGoalExit();
      }
    };
    const visibility = () => {
      if (document.hidden) cancelHalfGoalExit();
    };
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [halfRequest, cancelHalfGoalExit]);

  useEffect(() => {
    const unsubscribe = api()?.onTrayRequestQuit?.(async () => {
      studyAudio.stopClockTickAlarm();
      studyAudio.stopAllTimerLoops?.();
      try {
        localStorage.removeItem(CHECKPOINT_KEY);
      } catch (_) {}
      const cur = stateRef.current;
      if (cur?.activeTimer) {
        // Immediately stop timer on app exit, save exact completed minutes,
        // and store remaining minutes for next-launch reminder toast / Task Board.
        const finalized = finalizeTimerOnAppExit(cur, null, Date.now());
        stateRef.current = finalized;
        setState(finalized);
        await persist(finalized);
      } else {
        await saveNow();
      }
      api()?.quitReady?.();
    });
    return () => unsubscribe?.();
  }, [persist, saveNow]);

  useEffect(() => {
    const unsubTimer = api()?.onTrayToggleTimer?.(() => toggleTimer());
    const unsubPip = desktopBridge.onTrayTogglePip?.(() => {
      const isOpen = Boolean(stateRef.current?.pipSettings?.open);
      const nextOpen = !isOpen;
      updatePip({ open: nextOpen });
      if (desktopBridge.isDesktop) {
        desktopBridge.pipSetOpen(nextOpen);
      }
    });
    const unsubMini = api()?.onTrayToggleMini?.(() => toggleMini());
    return () => {
      unsubTimer?.();
      unsubPip?.();
      unsubMini?.();
    };
  }, [toggleTimer, updatePip, toggleMini]);

  const endWithPrompt = useCallback(() => {
    const t = stateRef.current?.activeTimer;
    if (!t) return;
    if (t.status === 'alarm') {
      stopAlarm();
      return;
    }
    if (isFocusSessionLocked(t, Date.now())) {
      toast('7 মিনিট ফোকাস পূর্ণ হয়েছে — নির্ধারিত সময় শেষ না হওয়া পর্যন্ত সমাপ্ত বা বের হওয়া যাবে না।');
      return;
    }
    if (t.kind === 'deep_goal_break') {
      toast('গোলের বিরতি নির্ধারিত 10 মিনিট।');
      return;
    }
    openModal('endTimer');
  }, [openModal, toast, stopAlarm]);

  const resetData = useCallback(
    (demo = false) => {
      const old = stateRef.current;
      if (isFocusSessionLocked(old?.activeTimer, Date.now())) {
        toast('7 মিনিট ফোকাস পূর্ণ — সেশন শেষ না হওয়া পর্যন্ত ডাটা রিসেট করা যাবে না।');
        return;
      }
      studyAudio.stopClockTickAlarm();
      studyAudio.stopAllAmbient();
      const replacement = normalized(
        demo
          ? { ...createDemoSeedState(), isDemo: true }
          : {
              ...createCleanSlateState(old?.isDemo && old?.profile?.name === 'Personal Student' ? 'শিক্ষার্থী' : old?.profile?.name || 'শিক্ষার্থী'),
              isDemo: false,
            }
      );
      commit(replacement);
      setModal(null);
      navigate('home');
      toast(demo ? 'নমুনা তথ্য লোড হয়েছে।' : 'নতুন খালি কর্মক্ষেত্র প্রস্তুত।');
    },
    [commit, navigate, toast]
  );

  const importJson = useCallback(
    async (file) => {
      if (deepGoalLocked(stateRef.current?.activeTimer, Date.now())) {
        toast('গোল শেষ না হওয়া পর্যন্ত ব্যাকআপ ফেরানো যাবে না।');
        return;
      }
      try {
        if (!file || file.size > 10 * 1024 * 1024) throw new Error('Choose a JSON backup smaller than 10 MB.');
        const parsed = JSON.parse(await file.text());
        if (!parsed || typeof parsed !== 'object' || !parsed.profile || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.sessions)) {
          throw new Error('This is not a Study Sentry backup.');
        }
        if (deepGoalLocked(stateRef.current?.activeTimer, Date.now())) {
          toast('গোল শেষ না হওয়া পর্যন্ত ব্যাকআপ ফেরানো যাবে না।');
          return;
        }
        if (loadFailedRef.current) throw new Error('বর্তমান ডেটা পড়া যায়নি; নিরাপদ রিস্টোরের আগে ডেটা ফোল্ডার সংরক্ষণ করুন');
        const restored = normalized(parsed, { imported: true });
        // Refuse destructive restore if the pre-restore safety copy cannot be written.
        const before = stateRef.current;
        if (!before) throw new Error('No current state to back up');
        if (desktopBridge.isDesktop) {
          await saveChain.current.catch(() => {});
          const path = await desktopBridge.writeLocalBackup(before, 'pre-restore');
          setBackupStatus(`রিস্টোর-পূর্ব কপি: ${path}`);
        } else {
          localStorage.setItem('study-sentry-pre-restore-backup', JSON.stringify(before));
          setBackupStatus('রিস্টোর-পূর্ব কপি ব্রাউজার স্টোরেজে রাখা হয়েছে।');
        }
        if (deepGoalLocked(stateRef.current?.activeTimer, Date.now())) throw new Error('Focus locked');
        studyAudio.stopClockTickAlarm();
        studyAudio.stopAllAmbient();
        loadFailedRef.current = false;
        commit(restored);
        setModal(null);
        toast('ব্যাকআপ ফিরিয়ে আনা হয়েছে।');
      } catch (err) {
        toast(`রিস্টোর হয়নি: ${String(err?.message || err)}। আগের তথ্য অপরিবর্তিত আছে।`);
      }
    },
    [commit, toast]
  );

  const exportJson = useCallback(async () => {
    const data = stateRef.current;
    if (!data) return;
    const defaultName = `StudySentry_Backup_${toDateKey()}.json`;
    const jsonStr = JSON.stringify(data, null, 2);
    if (desktopBridge.isDesktop && desktopBridge.exportJsonDialog) {
      const res = await desktopBridge.exportJsonDialog(jsonStr, defaultName);
      if (res?.ok) toast('ব্যাকআপ ফাইল সংরক্ষিত হয়েছে।');
      else if (!res?.canceled) toast('ব্যাকআপ সংরক্ষণ করা যায়নি।');
      return;
    }
    downloadFile(defaultName, jsonStr, 'application/json');
    toast('ব্যাকআপ ফাইল ডাউনলোড হয়েছে।');
  }, [toast]);

  const exportCsv = useCallback(async () => {
    const csv = csvForSessions(stateRef.current?.sessions || []);
    if (api()?.exportCsvDialog) {
      const result = await api().exportCsvDialog(csv);
      if (result?.ok) toast('সেশনের তালিকা রপ্তানি হয়েছে।');
      else if (!result?.canceled) toast('সেশনের তালিকা রপ্তানি করা যায়নি।');
    } else {
      downloadFile('StudySentry_Sessions.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8');
      toast('সেশনের তালিকা ডাউনলোড হয়েছে।');
    }
  }, [toast]);

  const derived = useMemo(() => {
    if (!state) return {};
    const timer = state.activeTimer;
    const elapsedSec = Math.floor(timerElapsedMs(timer, now) / 1000);
    const isAlarm = timer?.status === 'alarm';
    const overtimeSec = isAlarm ? timerOvertimeSec(timer, now) : 0;
    const remainingSec = timer
      ? timer.mode === 'pomodoro'
        ? Math.max(0, Math.ceil((timer.durationSec * 1000 - timerElapsedMs(timer, now)) / 1000))
        : elapsedSec
      : state.timerPrefs.mode === 'stopwatch'
      ? 0
      : state.timerPrefs.focusMin * 60;
    const displayTime = isAlarm ? `-${formatClockMMSS(overtimeSec)}` : formatClockMMSS(remainingSec);

    const day = toDateKey(new Date(now));
    const todaySec = totalOnDay(state.sessions, day) + activeSecondsOnDay(timer, day, now);
    const goalCategory = state.commitment?.category || 'Study';
    const includedInGoal = (item) => goalCategory === 'Both' || (item?.workType || 'Study') === goalCategory;
    const goalTodaySec =
      totalOnDay(state.sessions.filter(includedInGoal), day) + (includedInGoal(timer) ? activeSecondsOnDay(timer, day, now) : 0);
    const totalSec = state.sessions.reduce((sum, s) => sum + (Number(s.durationSec) || 0), 0) + (timer && timer.phase !== 'break' ? elapsedSec : 0);
    const selectedSubject =
      state.subjects.find((s) => s.id === (timer?.subjectId || state.timerPrefs.selectedSubjectId)) ||
      (timer?.subjectName && timer.phase !== 'break' ? { id: timer.subjectId, name: timer.subjectName, color: '#f59e0b' } : null) ||
      state.subjects[0] ||
      null;
    const xp = Number(state.profile.xp) || 0;
    const rank = [...AURA_RANKS].reverse().find((r) => xp >= r.minXp) || AURA_RANKS[0];
    const nextRank = AURA_RANKS.find((r) => r.tier === rank.tier + 1) || null;
    const xpPercent = nextRank ? Math.min(100, Math.max(0, ((xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100)) : 100;
    const phaseSnapshot = computeTodayPhasesSnapshot(state, now, timer && timer.phase !== 'break' ? elapsedSec : 0);

    // Real-time Outline Progress Ring percentage (0..100) for PiP & Focus UI
    let pipProgressPct = 0;
    if (timer) {
      if (isAlarm) {
        pipProgressPct = 100;
      } else if (timer.mode === 'pomodoro' && Number(timer.durationSec) > 0) {
        pipProgressPct = Math.min(100, Math.max(0, (timerElapsedMs(timer, now) / (timer.durationSec * 1000)) * 100));
      } else {
        const targetSec =
          (Number(timer.focusMeta?.requiredMinutes) || Number(state.timerPrefs?.phaseDurationMin) || 150) * 60;
        pipProgressPct = Math.min(100, Math.max(0, (elapsedSec / Math.max(60, targetSec)) * 100));
      }
    } else {
      const dailyTargetSec = Math.max(1800, (Number(state.profile?.dailyGoalMin) || 360) * 60);
      pipProgressPct = Math.min(100, Math.max(0, (todaySec / dailyTargetSec) * 100));
    }

    return {
      timer,
      isAlarm,
      overtimeSec,
      elapsedSec,
      remainingSec,
      displayTime,
      todaySec,
      goalTodaySec,
      totalSec,
      selectedSubject,
      rank,
      nextRank,
      xpPercent,
      streak: currentStreak(state.sessions, timer, now),
      todayKey: day,
      phaseSnapshot,
      pipProgressPct,
      timerProgress: timer?.mode === 'pomodoro' ? Math.min(1, timerElapsedMs(timer, now) / (timer.durationSec * 1000)) : -1,
    };
  }, [state, now]);

  // Native Independent Always-On-Top Floating PiP Window lifecycle & live theme/state sync
  useEffect(() => {
    if (!loaded || !state || !desktopBridge.isDesktop) return;
    const pipOpen = Boolean(state.pipSettings?.open);
    const rawStyle = String(state.timerPrefs?.pipClockStyle || state.pipSettings?.clockStyle || 'flip');
    const pipLayout =
      rawStyle === 'minimal' || rawStyle === 'inline'
        ? 'inline'
        : String(state.pipSettings?.layout || 'compact');
    desktopBridge.pipSetOpen(pipOpen, pipLayout);
  }, [loaded, state?.pipSettings?.open, state?.pipSettings?.layout, state?.pipSettings?.clockStyle, state?.timerPrefs?.pipClockStyle]);

  useEffect(() => {
    if (!loaded || !state || !desktopBridge.isDesktop) return;
    const pip = { ...DEFAULT_PIP, ...(state.pipSettings || {}) };
    const timer = derived.timer;
    const idleSub = state.subjects.find((s) => s.name === pip.subject) || derived.selectedSubject || state.subjects[0];
    const activeSubName = timer?.phase === 'break' ? 'Break' : timer?.subjectName || idleSub?.name || 'Physics';
    const activeSubColor =
      timer?.phase === 'break'
        ? '#38bdf8'
        : state.subjects.find((s) => s.name === activeSubName || s.id === timer?.subjectId)?.color || '#f59e0b';
    const idleTotalMin = Math.max(1, Math.round(Number(pip.idleMinutes) || 25));
    const idleTime = `${String(idleTotalMin).padStart(2, '0')}:00`;
    // Strict MM:SS for PiP (total minutes + seconds ONLY — never hours!)
    const pipDisplayTime = timer
      ? derived.isAlarm
        ? `-${String(Math.floor(derived.overtimeSec / 60)).padStart(2, '0')}:${String(derived.overtimeSec % 60).padStart(2, '0')}`
        : `${String(Math.floor(Math.max(0, derived.remainingSec) / 60)).padStart(2, '0')}:${String(Math.max(0, derived.remainingSec) % 60).padStart(2, '0')}`
      : idleTime;
    const activeTaskSummary =
      timer?.focusMeta?.workLabel ||
      timer?.taskTitle ||
      `${derived.phaseSnapshot?.currentPhase?.label || 'সকাল'} পর্যায় · ${Math.round(derived.pipProgressPct || 0)}%`;

    const todaySessions = (state.sessions || []).filter((s) => s.dateKey === derived.todayKey);
    const todayDeepGoals = (state.deepGoals || []).filter(
      (g) => g.dateKey === derived.todayKey && (g.status === 'done' || Number(g.savedSec) >= DEEP_GOAL_SECONDS)
    );
    const doneStudyGoals = todayDeepGoals.filter((g) => g.kind !== 'class').length;
    const doneClassGoals = todayDeepGoals.filter((g) => g.kind === 'class').length;
    const completedGoalDots = Math.min(
      6,
      Math.max(
        doneStudyGoals,
        todaySessions.filter((s) => String(s.subjectName || '').toLowerCase() !== 'class').length
      )
    );
    const classGoalDots = Math.min(
      3,
      Math.max(
        doneClassGoals,
        todaySessions.filter((s) => String(s.subjectName || '').toLowerCase() === 'class').length
      )
    );
    const rawStyle = String(state.timerPrefs?.pipClockStyle || pip.clockStyle || 'flip');

    const payload = {
      theme: resolveThemeId(state.timerPrefs?.theme),
      timerStatus: timer ? timer.status : 'idle',
      mode: timer ? timer.mode : state.timerPrefs?.mode || 'pomodoro',
      phase: timer ? timer.phase : 'focus',
      displayTime: pipDisplayTime,
      isAlarm: Boolean(derived.isAlarm),
      subjectName: activeSubName,
      subjectColor: activeSubColor,
      progressPct: Math.round((derived.pipProgressPct || 0) * 10) / 10,
      taskSummary: activeTaskSummary,
      phaseLabel: derived.phaseSnapshot?.currentPhase?.label || 'সকাল',
      idleMinutes: Number(pip.idleMinutes) || 25,
      layout: String(pip.layout || 'compact'),
      clockStyle: rawStyle,
      completedGoalDots,
      classGoalDots,
      pauseRequestActive: Boolean(pauseRequest),
      locked: Boolean(isFocusSessionLocked(timer, now)),
      subjects: (state.subjects || []).slice(0, 10).map((s) => ({ id: s.id, name: s.name, color: s.color })),
    };

    const sig = JSON.stringify(payload);
    if (lastPipSigRef.current !== sig) {
      lastPipSigRef.current = sig;
      desktopBridge.pipBroadcastState(payload);
    }
  }, [
    loaded,
    state?.timerPrefs?.theme,
    state?.timerPrefs?.pipClockStyle,
    state?.pipSettings,
    state?.subjects,
    state?.sessions,
    state?.deepGoals,
    derived.timer,
    derived.displayTime,
    derived.remainingSec,
    derived.overtimeSec,
    derived.isAlarm,
    derived.selectedSubject,
    derived.pipProgressPct,
    derived.phaseSnapshot,
    derived.todayKey,
    pauseRequest,
    now,
  ]);

  useEffect(() => {
    if (!desktopBridge.isDesktop) return;
    return desktopBridge.onPipAction((action) => {
      const type = String(action?.type || '');
      const curState = stateRef.current;
      if (!curState) return;
      const pip = { ...DEFAULT_PIP, ...(curState.pipSettings || {}) };

      if (type === 'toggle' || type === 'toggle-timer') {
        if (!curState.activeTimer) {
          const sub = curState.subjects.find((s) => s.name === pip.subject) || curState.subjects[0];
          startTimer(sub?.id, { mode: 'pomodoro', minutes: Number(pip.idleMinutes) || 25, stay: true });
        } else if (curState.activeTimer.status === 'alarm') {
          stopAlarm();
        } else {
          if (curState.activeTimer.status === 'running' && curState.activeTimer.phase !== 'break') {
            desktopBridge.restoreMainWindow();
          }
          toggleTimer();
        }
      } else if (type === 'stop-alarm') {
        stopAlarm();
      } else if (type === 'stop' || type === 'reset-timer') {
        if (curState.activeTimer?.status === 'alarm') {
          stopAlarm();
        } else if (curState.activeTimer && !isFocusSessionLocked(curState.activeTimer, Date.now())) {
          finishTimer(false);
          if (type === 'reset-timer') toast('টাইমার রিসেট হয়েছে।');
        } else if (curState.activeTimer) {
          toast('7 মিনিট ফোকাস পূর্ণ হয়েছে — সম্পূর্ণ সেশন শেষ না করে বন্ধ করা যাবে না।');
        } else if (type === 'reset-timer') {
          updatePip({ idleMinutes: Number(curState.timerPrefs?.focusMin) || 25 });
          toast('টাইমার ডিফল্ট সময়ে রিসেট হয়েছে।');
        }
      } else if (type === 'select-subject') {
        const subId = String(action.subjectId || '');
        const subName = String(action.subjectName || '');
        const lower = subName.trim().toLowerCase();
        const match = curState.subjects.find(
          (s) =>
            (subId && s.id === subId) ||
            (lower && String(s.name).trim().toLowerCase() === lower) ||
            (lower === 'math' && String(s.name).trim().toLowerCase() === 'higher math')
        );
        if (!curState.activeTimer) {
          if (match) {
            updatePip({ subject: subName || match.name });
            updatePrefs({ selectedSubjectId: match.id });
          } else if (subName) {
            updatePip({ subject: subName });
          }
        } else {
          toast('চলমান সেশন শেষ হওয়ার পর বিষয় পরিবর্তন করা যাবে।');
        }
      } else if (type === 'start-goal-subject') {
        const subName = String(action.subjectName || 'Physics');
        startDeepGoal(subName);
      } else if (type === 'adjust-minutes' && !curState.activeTimer) {
        const delta = Number(action.delta) || 0;
        const nextMin = Math.max(1, Math.min(720, (Number(pip.idleMinutes) || 25) + delta));
        updatePip({ idleMinutes: nextMin });
      } else if (type === 'toggle-layout') {
        const nextLayout = pip.layout === 'extended' ? 'compact' : 'extended';
        updatePip({ open: true, layout: nextLayout, clockStyle: 'flip' });
        updatePrefs({ pipClockStyle: 'flip' });
      } else if (type === 'set-layout') {
        const reqLayout = String(action.layout || 'compact');
        if (reqLayout === 'inline') {
          updatePip({ open: true, layout: 'compact', clockStyle: 'minimal' });
          updatePrefs({ pipClockStyle: 'minimal' });
        } else {
          const nextLayout = ['micro', 'compact', 'extended'].includes(reqLayout) ? reqLayout : 'compact';
          updatePip({ open: true, layout: nextLayout, clockStyle: 'flip' });
          updatePrefs({ pipClockStyle: 'flip' });
        }
      } else if (type === 'set-clock-style') {
        const style = String(action.clockStyle || 'flip');
        updatePrefs({ pipClockStyle: style });
        updatePip({ open: true, clockStyle: style, layout: style === 'minimal' ? 'compact' : pip.layout });
      } else if (type === 'set-theme') {
        const themeId = resolveThemeId(String(action.theme || 'obsidian-amber'));
        updatePrefs({ theme: themeId });
      } else if (type === 'close-pip') {
        setDashboardMinimized(false);
        updatePip({ open: false });
        desktopBridge.pipSetOpen(false);
      } else if (type === 'exit-pip' || type === 'exit-app') {
        desktopBridge.pipQuitApp();
      } else if (type === 'pip-ready') {
        setNow(Date.now());
      } else if (type === 'open-dashboard' || type === 'maximize-dashboard') {
        setDashboardMinimized(false);
        setMini(false);
        desktopBridge.restoreMainWindow();
        if (action.view) navigate(String(action.view));
      }
    });
  }, [startTimer, startDeepGoal, toggleTimer, stopAlarm, finishTimer, updatePip, updatePrefs, navigate, toast]);

  useEffect(() => {
    if (!api()?.setTaskbarProgress) return;
    api().setTaskbarProgress(derived.timer ? derived.timerProgress : -1);
  }, [derived.timer, derived.timerProgress]);

  useEffect(() => {
    studyAudio.soundEnabled = !!state?.profile?.soundEnabled;
  }, [state?.profile?.soundEnabled]);

  // Bug-Free Sound Control:
  // 1. Active Pause Request Countdown (pauseLeft > 0 ONLY) -> Auto-Mute background + Warning Sound Loop
  // 2. Paused state OR Pause Request Countdown Completed (pauseLeft <= 0) OR Exited -> 100% Silent immediately!
  // 3. Session Completion (alarm) OR Final 10s Countdown -> Play Tick-Tac Sound
  useEffect(() => {
    if (!loaded) return;
    const soundOn = state?.profile?.soundEnabled !== false;
    const t = derived.timer;
    const isPauseCountdownActive = Boolean(pauseRequest && pauseLeft > 0);
    const isHalfWaitActive = Boolean(t?.status === 'half_wait' && halfWaitLeft > 0);

    studyAudio.setBackgroundMuted(isPauseCountdownActive || isHalfWaitActive);

    let desiredMode = 'none';
    const inFinalCountdown =
      Boolean(
        t &&
          t.status === 'running' &&
          !pauseRequest &&
          t.phase !== 'break' &&
          t.mode === 'pomodoro' &&
          Number(derived.remainingSec) > 0 &&
          Number(derived.remainingSec) <= 10
      );

    const isGuardWarningActive = Boolean(guardNotice?.active);

    if (isPauseCountdownActive || isHalfWaitActive || isGuardWarningActive) {
      // Warning sound is UNMUTABLE even if soundOn === false!
      desiredMode = 'drive-warning-loop';
    } else if (soundOn && t && t.phase !== 'break') {
      if (derived.isAlarm || t.status === 'alarm' || inFinalCountdown) {
        desiredMode = 'drive-tick-tac';
      } else {
        desiredMode = 'none';
      }
    }

    studyAudio.syncTimerLoopState(desiredMode);
  }, [
    loaded,
    state?.profile?.soundEnabled,
    derived.timer?.id,
    derived.timer?.status,
    derived.timer?.phase,
    derived.timer?.mode,
    derived.remainingSec,
    derived.isAlarm,
    pauseRequest,
    pauseLeft,
    halfWaitLeft,
    guardNotice?.active,
  ]);

  // Auto-Synchronization across Routine, Sprint Planner & Daily Tracker:
  // Automatically syncs candidate tasks and triggers Push Notification + Sound Alert:
  // "আজকে টাইমলাইনে কী কী টাস্ক অ্যাড করতে চান?"
  useEffect(() => {
    if (!loaded || !state) return undefined;
    const sig = JSON.stringify({
      r: state.routine || [],
      sp: (state.sprintData?.sprints || []).map((s) => ({
        id: s.id,
        c: (s.classes || []).length,
        t: (s.tasks || []).length,
      })),
      dt: Object.keys(state.dailyTracker || {}).length,
    });

    if (autoSyncBaselineRef.current === null) {
      autoSyncBaselineRef.current = sig;
      return undefined;
    }
    if (autoSyncBaselineRef.current === sig) {
      return undefined;
    }
    autoSyncBaselineRef.current = sig;

    clearTimeout(autoSyncDebounceRef.current);
    autoSyncDebounceRef.current = setTimeout(() => {
      const cur = stateRef.current;
      if (!cur) return;
      const todayKey = toDateKey();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dhakaDate = new Date(Date.now() + 6 * 3600000);
      const todayWeekday = dayNames[dhakaDate.getUTCDay()];
      const existingTitles = new Set(
        (cur.todos || [])
          .filter((x) => !x.done && (!x.dueDate || x.dueDate === todayKey))
          .map((x) => String(x.title || '').trim().toLowerCase())
      );

      const candidates = [];
      // 1. Today's Routine items
      const todayRow = (cur.routine || []).find((r) => r.day === todayWeekday);
      if (todayRow) {
        const slots = Array.isArray(todayRow.slots) ? todayRow.slots : [];
        slots.forEach((slot, idx) => {
          const title = String(slot.subject || slot.title || slot.topic || '').trim();
          if (title && !existingTitles.has(title.toLowerCase())) {
            candidates.push({
              id: `sync_rt_${idx}`,
              title,
              subjectName: title,
              minutes: Number(slot.minutes) || 60,
              phaseId: inferPhaseIdFromTimeStr(slot.time || slot.startTime || ''),
              sourceLabel: 'রুটিন',
            });
          }
        });
        ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night'].forEach((field) => {
          const val = String(todayRow[field] || '').trim();
          if (val && !existingTitles.has(val.toLowerCase())) {
            candidates.push({
              id: `sync_rf_${field}`,
              title: val,
              subjectName: val.split(/[:·\-]/)[0]?.trim() || 'Study',
              minutes: 60,
              phaseId: inferPhaseIdFromTimeStr(field),
              sourceLabel: 'রুটিন',
            });
          }
        });
      }

      // 2. Active Sprint Planner classes & tasks
      (cur.sprintData?.sprints || []).forEach((sp) => {
        (sp.classes || []).forEach((cl) => {
          if (cl.done) return;
          if (cl.date && cl.date !== todayKey) return;
          const title = `${cl.subject || sp.title || 'Sprint'} · ${cl.title || cl.chapter || 'Class'}`;
          if (!existingTitles.has(title.toLowerCase())) {
            candidates.push({
              id: `sync_spc_${cl.id}`,
              title,
              subjectName: cl.subject || 'Study',
              minutes: Number(cl.duration) || 60,
              phaseId: 'morning',
              sourceLabel: 'স্প্রিন্ট প্ল্যানার',
            });
          }
        });
        (sp.tasks || []).forEach((tk) => {
          if (tk.done) return;
          if (tk.date && tk.date !== todayKey) return;
          const title = `${tk.subject || 'Sprint'} · ${tk.title || 'Practice'}`;
          if (!existingTitles.has(title.toLowerCase())) {
            candidates.push({
              id: `sync_spt_${tk.id}`,
              title,
              subjectName: tk.subject || 'Study',
              minutes: Number(tk.duration) || 45,
              phaseId: 'noon',
              sourceLabel: 'স্প্রিন্ট প্ল্যানার',
            });
          }
        });
      });

      const uniqueCandidates = [];
      const seen = new Set();
      for (const c of candidates) {
        const k = c.title.toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          uniqueCandidates.push(c);
        }
        if (uniqueCandidates.length >= 6) break;
      }

      const promptQuestion = 'আজকে টাইমলাইনে কী কী টাস্ক অ্যাড করতে চান?';
      studyAudio.playNotificationAlert();
      desktopBridge
        .notifyRoutine(promptQuestion, 'Study Sentry · অটো-সিঙ্ক টাইমলাইন')
        .catch(() => {});

      setTimelineSyncPrompt({
        id: uid('sync_prompt'),
        question: promptQuestion,
        todayKey,
        candidates: uniqueCandidates,
      });
    }, 1100);

    return () => clearTimeout(autoSyncDebounceRef.current);
  }, [loaded, state?.routine, state?.sprintData, state?.dailyTracker]);

  const dismissTimelineSyncPrompt = useCallback(() => {
    setTimelineSyncPrompt(null);
  }, []);

  const acceptTimelineSyncTasks = useCallback(
    (selectedItems = [], customTaskTitle = '') => {
      const todayKey = toDateKey();
      const cleanCustom = String(customTaskTitle || '').trim();
      commit((prev) => {
        const curTodos = Array.isArray(prev.todos) ? prev.todos.slice() : [];
        const subjects = Array.isArray(prev.subjects) ? prev.subjects : [];
        const toAdd = [];

        (selectedItems || []).forEach((item) => {
          const matchSub =
            subjects.find(
              (s) => String(s.name || '').toLowerCase() === String(item.subjectName || '').toLowerCase()
            ) || subjects[0];
          toAdd.push({
            id: uid('todo'),
            title: item.title,
            subjectId: matchSub?.id || '',
            subjectName: matchSub?.name || item.subjectName || 'Study',
            dueDate: todayKey,
            estimatedMinutes: Math.max(15, Number(item.minutes) || 60),
            phaseId: item.phaseId || 'morning',
            priority: 'high',
            boardStatus: 'todo',
            status: 'todo',
            done: false,
            syncedFrom: item.sourceLabel || 'অটো-সিঙ্ক',
            createdAt: new Date().toISOString(),
          });
        });

        if (cleanCustom) {
          const defSub = subjects[0];
          toAdd.push({
            id: uid('todo'),
            title: cleanCustom,
            subjectId: defSub?.id || '',
            subjectName: defSub?.name || 'Study',
            dueDate: todayKey,
            estimatedMinutes: 60,
            phaseId: derived.phaseSnapshot?.currentPhase?.id || 'morning',
            priority: 'high',
            boardStatus: 'todo',
            status: 'todo',
            done: false,
            syncedFrom: 'কাস্টম সিঙ্ক',
            createdAt: new Date().toISOString(),
          });
        }

        if (!toAdd.length) return prev;
        return {
          ...prev,
          todos: [...toAdd, ...curTodos],
        };
      });
      setTimelineSyncPrompt(null);
      toast('নির্বাচিত কাজগুলো আজকের টাইমলাইনে যুক্ত হয়েছে!');
    },
    [commit, derived.phaseSnapshot?.currentPhase?.id, toast]
  );

  // Unlock WebAudio context on first pointer/keyboard gesture if restored mid-session
  useEffect(() => {
    const unlock = () => {
      if (studyAudio.ctx && studyAudio.ctx.state === 'suspended') {
        studyAudio.ctx.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const startPhaseFocus = useCallback(
    (phaseId) => {
      const curState = stateRef.current;
      if (!curState) return false;
      const phaseObj =
        (derived.phaseSnapshot?.phases || STUDY_PHASES).find((p) => p.id === phaseId) ||
        derived.phaseSnapshot?.currentPhase ||
        STUDY_PHASES[0];
      const sub = derived.selectedSubject || curState.subjects?.[0];
      const remMin = Math.max(
        15,
        Math.ceil(((phaseObj.remainingSec || (phaseObj.targetMin || 150) * 60)) / 60)
      );
      startTimer(sub?.id, {
        mode: 'pomodoro',
        minutes: remMin,
        taskTitle: `${phaseObj.label} পর্যায় (${phaseObj.orderBn})`,
        focusMeta: {
          source: 'study-phase',
          phaseId: phaseObj.id,
          workLabel: `${phaseObj.label} পর্যায় · ${bnNum(remMin)} মিনিট`,
          requiredMinutes: remMin,
        },
      });
      return true;
    },
    [derived.phaseSnapshot, derived.selectedSubject, startTimer]
  );

  const dayTotal = useCallback(
    (key, subjectId) => {
      const data = stateRef.current;
      if (!data) return 0;
      return totalOnDay(data.sessions, key, subjectId) + activeSecondsOnDay(data.activeTimer, key, now, subjectId);
    },
    [now]
  );

  const [phaseModalOpen, setPhaseModalOpen] = useState(false);

  const phaseMode = useMemo(() => getPhaseModeFromState(state), [state?.profile?.phaseMode, state?.timerPrefs?.phaseMode]);
  const activePhases = useMemo(() => getStudyPhases(phaseMode), [phaseMode]);

  const setPhaseMode = useCallback(
    (nextMode, quiet = false) => {
      const clean = normalizePhaseMode(nextMode);
      commit((prev) => ({
        ...prev,
        profile: { ...(prev.profile || {}), phaseMode: clean, phaseModeSelected: true },
        timerPrefs: { ...(prev.timerPrefs || {}), phaseMode: clean },
      }));
      setPhaseModalOpen(false);
      if (!quiet) {
        const label =
          clean === 'all5'
            ? 'সবগুলো ৫টি প্রহর (ভোর, সকাল, দুপুর, রাত, গভীর রাত)'
            : clean === 'last4'
            ? '৪টি প্রহর (সকাল, দুপুর, রাত, গভীর রাত)'
            : '৪টি প্রহর (ভোর, সকাল, দুপুর, রাত)';
        toast(`অধ্যয়ন প্রহর সংরক্ষিত হয়েছে: ${label}`);
      }
    },
    [commit, toast]
  );

  // Resume remaining minutes directly when user clicks the Session Recovery reminder toast
  const resumePendingRecovery = useCallback(() => {
    const cur = stateRef.current;
    const rec = cur?.pendingSessionRecovery;
    if (!rec) return false;
    if (cur.activeTimer) {
      toast('আগে চলমান সেশন শেষ করুন।');
      return false;
    }
    const sub =
      (cur.subjects || []).find((s) => s.id === rec.subjectId) ||
      (cur.subjects || []).find(
        (s) => String(s.name || '').toLowerCase() === String(rec.subjectName || '').toLowerCase()
      ) ||
      cur.subjects?.[0];
    const remMin = Math.max(1, Math.round(Number(rec.remainingMin) || 25));
    commit((prev) => ({ ...prev, pendingSessionRecovery: null }));
    startTimer(sub?.id, {
      mode: 'pomodoro',
      minutes: remMin,
      taskId: rec.taskId || '',
      taskTitle: rec.taskTitle || `${rec.subjectName || 'Focus'} · বাকি ${remMin} মিনিট`,
      activityType: rec.activityType || 'practice',
      focusMeta: {
        source: 'session-recovery',
        taskId: rec.taskId || '',
        parentTaskId: rec.parentTaskId || rec.taskId || '',
        sprintLink: rec.sprintLink || null,
        chapter: rec.chapter || '',
        paper: rec.paper || '',
        curriculumType: rec.curriculumType || '',
        curriculumTopic: rec.curriculumTopic || '',
        activityType: rec.activityType || 'practice',
        phaseId: rec.phaseId || derived.phaseSnapshot?.currentPhase?.id || '',
        workLabel: `বাকি ${remMin} মিনিট ফোকাস`,
        requiredMinutes: remMin,
      },
    });
    toast(`বাকি ${bnNum(remMin)} মিনিটের ফোকাস সেশন শুরু হয়েছে!`);
    return true;
  }, [commit, startTimer, derived.phaseSnapshot?.currentPhase?.id, toast]);

  // If the user doesn't click the recovery toast (or dismisses it), automatically add
  // the remaining minutes as a task on Task Board & Task Timeline so completing it marks done.
  const deferRecoveryToTaskBoard = useCallback(
    (openTasks = false) => {
      const cur = stateRef.current;
      const rec = cur?.pendingSessionRecovery;
      if (!rec) return null;
      const curPhaseSlot =
        derived.phaseSnapshot?.currentPhase?.slotId ||
        activePhases[0]?.slotId ||
        'morning';
      const remainderTodo = buildRemainderTodoFromRecovery(
        rec,
        derived.todayKey || toDateKey(),
        curPhaseSlot
      );
      commit((prev) => {
        if (!prev.pendingSessionRecovery) return prev;
        const existingTodos = Array.isArray(prev.todos) ? prev.todos : [];
        // Update linked todo's plannedMin if it already exists and is incomplete, or prepend new remainder task
        const linkedIdx = rec.taskId
          ? existingTodos.findIndex((t) => t.id === rec.taskId && !t.done)
          : -1;
        let nextTodos;
        if (linkedIdx >= 0) {
          nextTodos = existingTodos.map((t, i) =>
            i === linkedIdx
              ? {
                  ...t,
                  plannedMin: rec.remainingMin,
                  durationMin: rec.remainingMin,
                  isRemainderTask: true,
                  priorCompletedMin: rec.completedMin,
                  originalPlannedMin: rec.originalMin,
                  dateKey: derived.todayKey || t.dateKey,
                  boardStatus: 'todo',
                  status: 'todo',
                  notes: `পূর্বের ${rec.completedMin} মিনিট সম্পন্ন · বাকি ${rec.remainingMin} মিনিট`,
                }
              : t
          );
        } else if (remainderTodo) {
          nextTodos = [remainderTodo, ...existingTodos];
        } else {
          nextTodos = existingTodos;
        }
        return {
          ...prev,
          todos: nextTodos,
          pendingSessionRecovery: null,
        };
      });
      toast(
        `বাকি ${bnNum(rec.remainingMin)} মিনিট টাস্ক বোর্ড ও টাইমলাইনে যোগ করা হয়েছে — সম্পন্ন করলেই ডান হবে।`
      );
      if (openTasks) navigate('todo');
      return remainderTodo;
    },
    [activePhases, commit, derived.phaseSnapshot?.currentPhase?.slotId, derived.todayKey, navigate, toast]
  );

  // Computes Focus-Verified Daily Tracker status + studied seconds for a given day, subject, and activity
  const getTrackerCellInfo = useCallback(
    (dayKey, subjectName, activity) => {
      const data = stateRef.current;
      if (!data) return { status: 'empty', seconds: 0 };
      const canonTarget = activityName(activity);

      let focusSeconds = 0;
      for (const s of data.sessions || []) {
        if (String(s.subjectName || '').toLowerCase() !== String(subjectName || '').toLowerCase()) continue;
        const secOnDay = sessionSecondsOnDay(s, dayKey);
        if (secOnDay <= 0) continue;
        const mapped = mapSessionToTrackerActivity(s);
        if (mapped === canonTarget) {
          focusSeconds += secOnDay;
        }
      }

      const active = data.activeTimer;
      const runningMatch = Boolean(
        active &&
          active.phase !== 'break' &&
          String(active.subjectName || '').toLowerCase() === String(subjectName || '').toLowerCase() &&
          mapSessionToTrackerActivity(active) === canonTarget &&
          activeSecondsOnDay(active, dayKey, now) > 0
      );
      if (runningMatch) focusSeconds += activeSecondsOnDay(active, dayKey, now);
      const daySubTracker = data.dailyTracker?.[dayKey]?.[subjectName] || {};
      const explicitDone =
        Object.entries(daySubTracker).some(
          ([k, v]) => activityName(k) === canonTarget && v === 'done'
        ) && focusSeconds > 0;
      const qualifiedByFocus = focusSeconds >= 15 * 60 || explicitDone;

      if (runningMatch) return { status: 'partial', seconds: Math.round(focusSeconds), active: true };
      if (qualifiedByFocus) {
        return { status: 'done', seconds: Math.round(focusSeconds) };
      }
      if (dayKey < toDateKey(new Date(now))) {
        return { status: 'missed', seconds: Math.round(focusSeconds) };
      }
      return { status: focusSeconds > 0 ? 'partial' : 'empty', seconds: Math.round(focusSeconds) };
    },
    [now]
  );

  const value = {
    state,
    language,
    t,
    setLanguage,
    loaded,
    storagePath,
    backupStatus,
    saveStatus,
    storageError,
    view,
    navigate,
    suiteTab,
    setSuiteTab,
    insightsTab,
    setInsightsTab,
    motivationTab,
    setMotivationTab,
    settingsSection,
    setSettingsSection,
    collapsed,
    setCollapsed,
    mini,
    toggleMini,
    pinned,
    togglePin,
    zen,
    setZen,
    dashboardMinimized,
    setDashboardMinimized,
    modal,
    openModal,
    closeModal,
    toasts,
    toast,
    now,
    ...derived,
    dayTotal,
    getTrackerCellInfo,
    startTrackerFocus,
    startPhaseFocus,
    commit,
    updateProfile,
    updatePrefs,
    updateCommitment,
    putItem,
    patchItem,
    deleteItem,
    setRoutine,
    setTrackerCell,
    setDuration,
    setMode,
    selectSubject,
    prepareFocus,
    saveFocusReport,
    startTimer,
    startDeepGoal,
    stopAlarm,
    pauseTimer: requestPause,
    resumeTimer,
    toggleTimer,
    finishTimer,
    endWithPrompt,
    updatePip,
    updateStrictGuard,
    saveJunkNote,
    pauseRequest,
    pauseLeft,
    cancelPause,
    resumeFromPauseScreen,
    confirmPauseAfterWait,
    requestPause,
    startSession: startTimer,
    resumeSession: resumeTimer,
    resetSession: () => finishTimer(false),
    completeAlarmAndSave: stopAlarm,
    progressPct: derived.pipProgressPct,
    halfRequest,
    halfWaitLeft,
    beginHalfGoalExit,
    cancelHalfGoalExit,
    resumeHalfGoalWait: cancelHalfGoalExit,
    confirmHalfGoalExit,
    timelineSyncPrompt,
    acceptTimelineSyncTasks,
    dismissTimelineSyncPrompt,
    guardNotice,
    sessionLocked: Boolean(isFocusSessionLocked(derived.timer, now)),
    phaseMode,
    activePhases,
    setPhaseMode,
    phaseModalOpen,
    setPhaseModalOpen,
    pendingSessionRecovery: state?.pendingSessionRecovery || null,
    resumePendingRecovery,
    deferRecoveryToTaskBoard,
    simulateGuardViolation,
    simulateGuardReturn,
    resetData,
    exportJson,
    exportCsv,
    importJson,
    saveNow,
    ts,
  };
  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used inside StudyProvider');
  return ctx;
}

/**
 * A non-throwing variant for components that can also render outside the
 * provider (tests, isolated previews). Returns null when there is no provider.
 */
export function useOptionalStudy() {
  return useContext(StudyContext);
}
