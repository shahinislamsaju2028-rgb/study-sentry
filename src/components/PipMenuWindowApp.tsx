import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  EyeOff,
  Power,
  Check,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { desktopBridge } from '../bridge/desktopBridge';
import BrandIcon from './BrandIcon';
import type { PipStatePayload } from '../types/study';

const CANONICAL_SUBJECT_ORDER = [
  { key: 'physics', label: 'Physics', aliases: ['physics', 'পদার্থ', 'পদার্থবিজ্ঞান'], color: '#48c8ff' },
  { key: 'chemistry', label: 'Chemistry', aliases: ['chemistry', 'রসায়ন', 'রসায়ন'], color: '#b19aff' },
  { key: 'math', label: 'Math', aliases: ['math', 'higher math', 'mathematics', 'গণিত', 'উচ্চতর গণিত'], color: '#ffbd48' },
  { key: 'biology', label: 'Biology', aliases: ['biology', 'জীববিজ্ঞান', 'জীব'], color: '#48d3ab' },
  { key: 'english', label: 'English', aliases: ['english', 'ইংরেজি'], color: '#f07bc3' },
  { key: 'bangla', label: 'Bangla', aliases: ['bangla', 'bengali', 'বাংলা'], color: '#fa818f' },
  { key: 'ict', label: 'ICT', aliases: ['ict', 'ict & eng', 'ict & coding', 'আইসিটি'], color: '#36cfe9' },
  { key: 'class', label: 'Class', aliases: ['class', 'ক্লাস'], color: '#cad0e5' },
];

export function buildCleanTwoPartSubjects(
  rawSubjects?: Array<{ id: string; name: string; color?: string }>
): Array<{ id: string; name: string; color: string }> {
  const incoming = Array.isArray(rawSubjects) ? rawSubjects : [];
  const usedIds = new Set<string>();
  const result: Array<{ id: string; name: string; color: string }> = [];

  for (const spec of CANONICAL_SUBJECT_ORDER) {
    const match = incoming.find((s) => {
      const n = String(s?.name || '').trim().toLowerCase();
      return spec.aliases.includes(n);
    });
    if (match) {
      usedIds.add(match.id);
      result.push({
        id: match.id,
        name: spec.label,
        color: spec.color || match.color || '#fbbf24',
      });
    } else {
      result.push({
        id: `canon_${spec.key}`,
        name: spec.label,
        color: spec.color,
      });
    }
  }

  for (const extra of incoming) {
    if (!extra?.id || usedIds.has(extra.id)) continue;
    const lower = String(extra.name || '').trim().toLowerCase();
    if (!lower) continue;
    if (CANONICAL_SUBJECT_ORDER.some((c) => c.aliases.includes(lower))) continue;
    result.push({
      id: extra.id,
      name: extra.name,
      color: extra.color || '#fbbf24',
    });
  }

  return result;
}

const DEFAULT_MENU_STATE: PipStatePayload = {
  theme: 'aurora',
  timerStatus: 'idle',
  mode: 'pomodoro',
  phase: 'focus',
  displayTime: '25:00',
  isAlarm: false,
  subjectName: 'Physics',
  subjectColor: '#48c8ff',
  progressPct: 0,
  taskSummary: '',
  phaseLabel: '',
  idleMinutes: 0,
  layout: 'compact',
  clockStyle: 'flip',
  completedGoalDots: 0,
  classGoalDots: 0,
  pauseRequestActive: false,
  locked: false,
  subjects: CANONICAL_SUBJECT_ORDER.map((c) => ({
    id: `canon_${c.key}`,
    name: c.label,
    color: c.color,
  })),
};

export function renderAbstractSubjectGlyph(name: string, color = '#fbbf24') {
  const n = (name || '').toLowerCase();
  if (n.includes('phys') || n.includes('পদার্থ')) {
    return (
      <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
        <ellipse cx="9" cy="9" rx="7" ry="2.9" transform="rotate(-30 9 9)" stroke={color} strokeWidth="1.5" />
        <ellipse cx="9" cy="9" rx="7" ry="2.9" transform="rotate(30 9 9)" stroke={color} strokeWidth="1.5" />
        <circle cx="9" cy="9" r="1.7" fill={color} />
      </svg>
    );
  }
  if (n.includes('chem') || n.includes('রসায়ন') || n.includes('রসায়ন')) {
    return (
      <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
        <path
          d="M7 3h4M8 3v3.8L4.3 13.5a1.2 1.2 0 001.05 1.8h7.3a1.2 1.2 0 001.05-1.8L10 6.8V3"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (n.includes('math') || n.includes('গণিত')) {
    return (
      <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
        <path
          d="M13.5 4H5.2l4.3 5-4.3 5h8.3"
          stroke={color}
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (n.includes('bio') || n.includes('জীব')) {
    return (
      <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
        <path
          d="M5.2 3c3.8 0 7.6 4 7.6 12M12.8 3c-3.8 0-7.6 4-7.6 12M6.2 6.2h5.6M6.2 11.8h5.6"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (n.includes('eng') || n.includes('ইংরেজি')) {
    return (
      <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
        <path d="M4.5 14L9 4l4.5 10M6.2 10.6h5.6" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (n.includes('bangla') || n.includes('বাংলা')) {
    return (
      <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
        <path d="M4 5h10M9 5v9M9 8.2c-2.6 0-4 1.4-4 3.1 0 1.5 1.5 2.7 4 2.7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (n.includes('ict') || n.includes('আইসিটি')) {
    return (
      <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="12" height="8" rx="1.8" stroke={color} strokeWidth="1.5" />
        <path d="M6.5 14.5h5M9 12v2.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="11" height="9" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M7.2 7.5l3.6 1.5-3.6 1.5V7.5z" fill={color} />
    </svg>
  );
}

const MAIN_CARD_W = 242;
const SUBJECT_CARD_W = 256;

export const PipMenuWindowApp: React.FC = () => {
  const [state, setState] = useState<PipStatePayload>(DEFAULT_MENU_STATE);
  const [subjectOnlyView, setSubjectOnlyView] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('pip-transparent-root');
    document.body.classList.add('pip-menu-os-body');
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    let mounted = true;
    desktopBridge.pipGetCachedState().then((cached) => {
      if (mounted && cached) {
        setState((prev) => ({ ...prev, ...cached }));
      }
    });

    const unsubState = desktopBridge.onPipState((payload) => {
      if (mounted && payload) {
        setState((prev) => ({ ...prev, ...payload }));
      }
    });

    const unsubReset = desktopBridge.onPipMenuReset(() => {
      if (mounted) {
        setSubjectOnlyView(false);
      }
    });

    const onBlur = () => {
      setSubjectOnlyView(false);
      void desktopBridge.pipCloseMenu();
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (subjectOnlyView) {
          setSubjectOnlyView(false);
        } else {
          void desktopBridge.pipCloseMenu();
        }
      }
    };

    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      mounted = false;
      unsubState();
      unsubReset();
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.classList.remove('pip-transparent-root');
      document.body.classList.remove('pip-menu-os-body');
    };
  }, [subjectOnlyView]);

  const subjects = useMemo(
    () => buildCleanTwoPartSubjects(state.subjects),
    [state.subjects]
  );

  // Dynamically fit OS menu window tightly to the active single Glass Card
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const cardH = cardRef.current ? Math.ceil(cardRef.current.offsetHeight) : 232;
      const targetW = subjectOnlyView ? SUBJECT_CARD_W : MAIN_CARD_W;
      const targetH = Math.max(150, Math.min(440, cardH + 6));
      void desktopBridge.pipResizeMenu(targetW, targetH);
    });
    return () => cancelAnimationFrame(raf);
  }, [subjectOnlyView, subjects.length, state.timerStatus, state.isAlarm]);

  const dispatchAndClose = useCallback((action: Record<string, unknown>) => {
    setSubjectOnlyView(false);
    void desktopBridge.pipSendAction(action);
    void desktopBridge.pipCloseMenu();
  }, []);

  const handleQuitSoftware = useCallback(() => {
    setSubjectOnlyView(false);
    void desktopBridge.pipCloseMenu();
    void desktopBridge.pipQuitApp();
  }, []);

  const isRunning = state.timerStatus === 'running';
  const isPaused = state.timerStatus === 'paused';
  const isAlarm = Boolean(state.isAlarm || state.timerStatus === 'alarm');
  const activeSubjectColor = state.subjectColor || '#48c8ff';
  const normalizedActiveSubject = String(state.subjectName || 'Physics').trim().toLowerCase();

  return (
    <div
      className="v10-pm-viewport"
      onContextMenu={(e) => {
        e.preventDefault();
        if (subjectOnlyView) {
          setSubjectOnlyView(false);
        }
      }}
    >
      {subjectOnlyView ? (
        /* PURE SUBJECT-ONLY GLASS CARD: Shows ONLY the 2-part subject grid — nothing else! */
        <div
          ref={cardRef}
          className="v10-glass-card v10-subject-only-card"
          role="menu"
          aria-label="Subjects"
        >
          <div className="v10-subj-two-col-grid">
            {subjects.map((sub) => {
              const subLower = sub.name.toLowerCase();
              const active =
                subLower === normalizedActiveSubject ||
                (subLower === 'math' && normalizedActiveSubject === 'higher math');
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  className={`v10-subj-glass-tile ${active ? 'is-active' : ''}`}
                  style={{ '--subj-accent': sub.color } as React.CSSProperties}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatchAndClose({
                      type: 'select-subject',
                      subjectId: sub.id.startsWith('canon_') ? '' : sub.id,
                      subjectName: sub.name,
                    });
                  }}
                >
                  <span className="v10-subj-glyph">
                    {renderAbstractSubjectGlyph(sub.name, sub.color)}
                  </span>
                  <span className="v10-subj-title">{sub.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ABSTRACT FROSTED GLASS CONTEXT MENU CARD */
        <div
          ref={cardRef}
          className="v10-glass-card v10-main-menu-card"
          role="menu"
          aria-label="PiP Quick Controls"
        >
          {/* Abstract Ambient Status Pill */}
          <div className="v10-status-capsule">
            <div className="v10-status-subj">
              <BrandIcon size={17} variant="clock-only-transparent" />
              <span className="v10-status-name">{state.subjectName || 'Focus'}</span>
            </div>
            <span
              className={`v10-status-state ${
                isAlarm ? 'is-alarm' : isRunning ? 'is-live' : isPaused ? 'is-paused' : ''
              }`}
            >
              <i />
              {isAlarm ? 'Done' : isRunning ? 'Live' : isPaused ? 'Hold' : 'Ready'}
            </span>
          </div>

          {/* Primary Play/Pause + Reset Abstract Tiles */}
          <div className="v10-hero-actions">
            <button
              type="button"
              role="menuitem"
              className={`v10-hero-btn ${
                isAlarm ? 'tone-alarm' : isRunning ? 'tone-pause' : 'tone-play'
              }`}
              onClick={() => dispatchAndClose({ type: 'toggle-timer' })}
            >
              {isAlarm ? (
                <>
                  <Check size={14} strokeWidth={2.6} />
                  <span>Complete</span>
                </>
              ) : isRunning ? (
                <>
                  <Pause size={14} strokeWidth={2.5} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={14} strokeWidth={2.5} />
                  <span>{isPaused ? 'Resume' : 'Start'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              role="menuitem"
              className="v10-reset-tile"
              disabled={isRunning || Boolean(state.locked)}
              title={
                state.locked
                  ? '7 মিনিট ফোকাস পূর্ণ — সেশন লক করা আছে'
                  : isRunning
                  ? 'Pause first to reset'
                  : 'Reset'
              }
              onClick={() => dispatchAndClose({ type: 'reset-timer' })}
            >
              <RotateCcw size={13.5} />
              <span>{state.locked ? 'Locked' : 'Reset'}</span>
            </button>
          </div>

          {/* Abstract Glass Option List */}
          <div className="v10-option-stack">
            <button
              type="button"
              role="menuitem"
              className="v10-option-row"
              onClick={() => setSubjectOnlyView(true)}
            >
              <span className="v10-opt-ico accent-gold">
                <Layers size={14} />
              </span>
              <span className="v10-opt-label">Subject</span>
              <span className="v10-opt-trail">
                <i style={{ background: activeSubjectColor }} />
                <ChevronRight size={13.5} />
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="v10-option-row"
              onClick={() => dispatchAndClose({ type: 'maximize-dashboard' })}
            >
              <span className="v10-opt-ico accent-sky">
                <Maximize2 size={13.5} />
              </span>
              <span className="v10-opt-label">Open App</span>
              <span className="v10-opt-trail">
                <ChevronRight size={13.5} />
              </span>
            </button>
          </div>

          <div className="v10-glass-sep" />

          {/* Clean 2-Tile Abstract Footer */}
          <div className="v10-footer-grid">
            <button
              type="button"
              role="menuitem"
              className="v10-foot-tile"
              onClick={() => dispatchAndClose({ type: 'close-pip' })}
            >
              <EyeOff size={13} />
              <span>Hide</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="v10-foot-tile is-danger"
              onClick={handleQuitSoftware}
            >
              <Power size={13} />
              <span>Exit</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipMenuWindowApp;
