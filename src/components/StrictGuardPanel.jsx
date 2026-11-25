import React from 'react';
import {
  AlertTriangle,
  AppWindow,
  Camera,
  Check,
  Clock3,
  FileText,
  Globe,
  Lock,
  PauseCircle,
  PlayCircle,
  PlaySquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';

const ALLOWED_SOFTWARE = [
  { id: 'sentry', name: 'Study Sentry', meta: 'Core Workspace', Icon: ShieldCheck, tone: '#fbbf24' },
  {
    id: 'chromium',
    name: 'Chromium Browsers',
    meta: 'Chrome · Edge · Brave · Opera · Vivaldi',
    Icon: Globe,
    tone: '#fb923c',
  },
  { id: 'sumatra', name: 'SumatraPDF', meta: 'PDF & Books', Icon: FileText, tone: '#38bdf8' },
  { id: 'potplayer', name: 'PotPlayer', meta: 'Offline Classes', Icon: PlaySquare, tone: '#a78bfa' },
  /* BlueStacks 5 runs the Android app of many coaching platforms; HD-Player.exe
     is its player process. Allowed by default so a recorded lesson never dies
     because the guard saw an unfamiliar window. */
  {
    id: 'bluestacks',
    name: 'BlueStacks 5',
    meta: 'Android Classes & Apps',
    Icon: Smartphone,
    tone: '#34d399',
  },
];

/* 7.txt ① — these are allowed, but the focus clock rests while one of them is
   the active tab. "Allowed" and "counted" are two different promises and the
   panel has to show both. */
const AI_DOMAINS = [
  { label: 'Google Gemini', host: 'gemini.google.com' },
  { label: 'NotebookLM', host: 'notebooklm.google.com' },
];

const SYSTEM_EXEMPTIONS = [
  { label: 'Snipping Tool & Greenshot', Icon: Camera },
  { label: 'Brightness & Volume', Icon: Sun },
  { label: 'Alt + Tab / Ctrl + Tab', Icon: AppWindow },
];

export default function StrictGuardPanel() {
  const { state, timer, updateStrictGuard, guardNotice, toast } = useStudy();
  const guard = state.strictGuard || { enabled: true, allowArenaAgent: false };

  const isTimerRunning = Boolean(timer && timer.phase !== 'break' && timer.status === 'running');
  const isGuardPaused = Boolean(
    timer && timer.phase !== 'break' && timer.status === 'paused' && timer.pausedByGuard
  );
  const isEnforcing = Boolean(guard.enabled !== false && (isTimerRunning || isGuardPaused));
  const allowArena = Boolean(guard.allowArenaAgent);

  const toggleArenaAgent = () => {
    const next = !allowArena;
    updateStrictGuard({ allowArenaAgent: next });
    toast(next ? 'arena.ai/agent চালু হয়েছে' : 'arena.ai/agent বন্ধ হয়েছে');
  };

  return (
    <section className="v30-guard-shell" aria-label="Focus Guard">
      {/* Minimal Header */}
      <header className="v30-guard-head">
        <div className="v30-guard-brand">
          <span className="v30-guard-emblem">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h3>Focus Guard</h3>
            <div className="v30-guard-rule-pills">
              <span title="অননুমোদিত সাইট ৩ সেকেন্ডে বন্ধ">
                <Clock3 size={11} /> 3s Auto-Close
              </span>
              <span title="শুধু ব্লকড অ্যাপ/সাইটে">
                <Lock size={11} /> 7m Lock
              </span>
              <span title="Study Sentry / SumatraPDF / PotPlayer">
                <PlayCircle size={11} /> এখানে টাইমার চলে
              </span>
              <span title="Gemini / NotebookLM / arena.ai — খোলা থাকবে, ঘড়ি থামবে">
                <PauseCircle size={11} /> AI সাইটে টাইমার পজ
              </span>
            </div>
          </div>
        </div>

        <div className="v30-guard-controls">
          <span className={`v30-guard-live-chip ${isEnforcing ? 'is-live' : ''}`}>
            <i />
            {isGuardPaused ? 'Paused' : isEnforcing ? 'Enforcing' : 'Standby'}
          </span>

          {/* The guard has no on/off switch — it is always armed and simply
              enforces itself while a focus timer is running. */}
          <span className="v30-guard-always">
            <Lock size={12} />
            সবসময় সক্রিয়
          </span>
        </div>
      </header>

      {guardNotice?.active && (
        <div className="dg-guard-status live-danger" role="alert">
          <AlertTriangle size={15} />
          <span>
            <strong>
              {guardNotice.type === 'domain'
                ? guardNotice.windowTitle || guardNotice.appName
                : guardNotice.appName}
            </strong>{' '}
            · {guardNotice.secondsLeft || 3}s
          </span>
        </div>
      )}

      {/* 1. Allowed Software Grid */}
      <div className="v30-guard-block">
        <div className="v30-guard-label-row">
          <span>অনুমোদিত সফটওয়্যার · টাইমার চলবে</span>
          <small>এখানে সময় গোনা হবে</small>
        </div>
        <div className="v30-guard-app-grid">
          {ALLOWED_SOFTWARE.map(({ id, name, meta, Icon, tone }) => (
            <div className="v30-guard-app-card" key={id} style={{ '--g-tone': tone }}>
              <span className="v30-guard-app-icon">
                <Icon size={18} />
              </span>
              <div className="v30-guard-app-copy">
                <strong>{name}</strong>
                <small>{meta}</small>
              </div>
              <span className="v30-guard-check" aria-hidden="true">
                <Check size={13} strokeWidth={2.8} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Allowed AI sites — open is fine, the clock simply rests there */}
      <div className="v30-guard-block">
        <div className="v30-guard-label-row">
          <span>AI স্টাডি সাইট · খোলা যাবে</span>
          <small>এখানে গেলে টাইমার নিজে থেকেই পজ · ফিরলে নিজে থেকেই চালু</small>
        </div>
        <div className="v30-guard-domain-grid">
          {AI_DOMAINS.map((d) => (
            <div className="v30-guard-domain-card is-ai" key={d.host}>
              <Globe size={15} />
              <div>
                <strong>{d.label}</strong>
                <code>{d.host}</code>
              </div>
              <span className="v30-guard-ai-chip">
                <PauseCircle size={11} /> পজ
              </span>
            </div>
          ))}

          <div
            className={`v30-guard-domain-card is-optional is-ai ${allowArena ? 'is-enabled' : ''}`}
          >
            <Sparkles size={15} />
            <div>
              <strong>Arena AI Agent</strong>
              <code>arena.ai/agent</code>
            </div>
            <span className={`v30-guard-ai-chip ${allowArena ? '' : 'is-idle'}`}>
              <PauseCircle size={11} /> পজ
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={allowArena}
              aria-label="Allow arena.ai/agent"
              className={`v30-switch is-sm ${allowArena ? 'is-on' : ''}`}
              onClick={toggleArenaAgent}
            >
              <i />
            </button>
          </div>
        </div>
      </div>

      {/* 3. System Pass-Through Chips */}
      <div className="v30-guard-block">
        <div className="v30-guard-label-row">
          <span>System Pass-Through</span>
        </div>
        <div className="v30-guard-util-row">
          {SYSTEM_EXEMPTIONS.map(({ label, Icon }) => (
            <span className="v30-guard-util-chip" key={label}>
              <Icon size={13} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
