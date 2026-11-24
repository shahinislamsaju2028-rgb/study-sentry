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
  PlaySquare,
  ShieldCheck,
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
];

const ALLOWED_DOMAINS = [
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
              <span>
                <Clock3 size={11} /> 3s Auto-Close
              </span>
              <span>
                <Lock size={11} /> 7m Lock
              </span>
              <span>
                <PauseCircle size={11} /> Auto Pause / Resume
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
          <span>Allowed Software</span>
          <small>Locked Preset</small>
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

      {/* 2. Brave Whitelisted Domains + Optional Arena AI Toggle */}
      <div className="v30-guard-block">
        <div className="v30-guard-label-row">
          <span>অনুমোদিত ওয়েবসাইট</span>
          <small>সব ক্রোমিয়াম ব্রাউজারে কাজ করে</small>
        </div>
        <div className="v30-guard-domain-grid">
          {ALLOWED_DOMAINS.map((d) => (
            <div className="v30-guard-domain-card" key={d.host}>
              <Globe size={15} />
              <div>
                <strong>{d.label}</strong>
                <code>{d.host}</code>
              </div>
              <span className="v30-guard-check" aria-hidden="true">
                <Check size={12} strokeWidth={2.8} />
              </span>
            </div>
          ))}

          <div className={`v30-guard-domain-card is-optional ${allowArena ? 'is-enabled' : ''}`}>
            <Sparkles size={15} />
            <div>
              <strong>Arena AI Agent</strong>
              <code>arena.ai/agent</code>
            </div>
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
