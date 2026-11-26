import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { useStudy } from '../context/StudyContext';
import { desktopBridge } from '../bridge/desktopBridge';
import {
  buildCleanTwoPartSubjects,
  renderAbstractSubjectGlyph,
} from './PipMenuWindowApp';
import BrandIcon from './BrandIcon';

const BASE_W = 142;
const BASE_H = 52;
const MIN_SCALE = 0.72;
const MAX_SCALE = 2.6;

function clampScale(s) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number.isFinite(s) ? s : 1));
}

function splitStrictMMSS(raw) {
  const s = String(raw || '25:00')
    .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
    .trim();
  const neg = s.startsWith('-');
  const clean = neg ? s.slice(1) : s;
  const parts = clean.split(':').map((p) => p.replace(/[^\d]/g, ''));

  if (parts.length >= 3) {
    const hours = parseInt(parts[0] || '0', 10) || 0;
    const mins = parseInt(parts[1] || '0', 10) || 0;
    const secs = parseInt(parts[2] || '0', 10) || 0;
    return {
      neg,
      left: String(hours * 60 + mins).padStart(2, '0'),
      right: String(secs).padStart(2, '0').slice(-2),
    };
  }
  if (parts.length === 2) {
    const mins = parseInt(parts[0] || '0', 10);
    const secs = parseInt(parts[1] || '0', 10) || 0;
    return {
      neg,
      left: Number.isFinite(mins) ? String(mins).padStart(2, '0') : '25',
      right: String(secs).padStart(2, '0').slice(-2),
    };
  }
  return { neg: false, left: '25', right: '00' };
}

function clampFrameToViewport(x, y, width, height) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const pad = 10;
  const maxW = Math.max(96, vw - pad * 2);
  const maxH = Math.max(38, vh - pad * 2);
  const w = Math.round(Math.min(width, maxW));
  const h = Math.round(Math.min(height, maxH));
  return {
    x: Math.round(Math.max(pad, Math.min(vw - w - pad, x))),
    y: Math.round(Math.max(pad, Math.min(vh - h - pad, y))),
    width: w,
    height: h,
  };
}

export function FloatingTimer(props = {}) {
  const { onOpenFocusView } = props;
  const {
    state,
    todayKey,
    displayTime,
    isAlarm,
    pauseRequest,
    selectedSubject,
    startSession,
    requestPause,
    resumeSession,
    resetSession,
    completeAlarmAndSave,
    updatePrefs,
    updatePip,
    progressPct,
    navigate,
    setDashboardMinimized,
    toast,
  } = useStudy();

  const openMainFromPip = useCallback(() => {
    setDashboardMinimized?.(false);
    if (onOpenFocusView) onOpenFocusView();
    else navigate?.('focus');
  }, [onOpenFocusView, navigate, setDashboardMinimized]);

  const isNativeDesktop = Boolean(desktopBridge.isDesktop);
  const pip = state?.pipSettings || {};
  const timer = state?.activeTimer;
  const visible = Boolean(!isNativeDesktop && pip.open);

  const [scale, setScale] = useState(() => clampScale(Number(pip.scale) || 1.08));
  const [pos, setPos] = useState(() => ({
    x: typeof pip.x === 'number' ? pip.x : 24,
    y: typeof pip.y === 'number' ? pip.y : 72,
  }));
  const [contextMenu, setContextMenu] = useState(null);
  const [subjectSubOpen, setSubjectSubOpen] = useState(false);

  const pipRef = useRef(null);
  const menuRef = useRef(null);
  const gestureRef = useRef(null);

  const pillW = Math.round(BASE_W * scale);
  const pillH = Math.round(BASE_H * scale);

  useEffect(() => {
    if (!visible) {
      setContextMenu(null);
      setSubjectSubOpen(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const onOutside = (ev) => {
      if (menuRef.current && menuRef.current.contains(ev.target)) return;
      setContextMenu(null);
      setSubjectSubOpen(false);
    };
    const onEsc = (ev) => {
      if (ev.key === 'Escape') {
        if (subjectSubOpen) setSubjectSubOpen(false);
        else setContextMenu(null);
      }
    };
    window.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('keydown', onEsc, true);
    return () => {
      window.removeEventListener('pointerdown', onOutside, true);
      window.removeEventListener('keydown', onEsc, true);
    };
  }, [contextMenu, subjectSubOpen]);

  const activeSubjectObj = useMemo(() => {
    if (timer?.subjectName && timer.phase !== 'break') {
      return (
        state?.subjects?.find((s) => s.id === timer.subjectId || s.name === timer.subjectName) || {
          id: timer.subjectId || 'active',
          name: timer.subjectName,
          color: '#ffd369',
        }
      );
    }
    if (pip?.subject) {
      return (
        state?.subjects?.find((s) => s.name === pip.subject) || {
          id: 'pip-subj',
          name: pip.subject,
          color: '#48c8ff',
        }
      );
    }
    return selectedSubject || state?.subjects?.[0] || { id: 'default', name: 'Physics', color: '#48c8ff' };
  }, [timer, pip?.subject, selectedSubject, state?.subjects]);

  const idleMinutes = Math.max(1, Number(state?.timerPrefs?.focusMin) || Number(pip.idleMinutes) || 25);
  const rawTime = timer ? displayTime : `${String(idleMinutes).padStart(2, '0')}:00`;
  const { neg, left, right } = splitStrictMMSS(rawTime);

  const isRunning = timer?.status === 'running' && !pauseRequest;
  const isPaused = Boolean(timer && (timer.status === 'paused' || timer.status === 'half_wait' || !!pauseRequest));
  const isActive = isRunning || isPaused || isAlarm;

  const handleTogglePlay = useCallback(() => {
    if (isAlarm) {
      completeAlarmAndSave('');
      return;
    }
    if (!timer) {
      startSession();
      return;
    }
    if (timer.status === 'running') {
      requestPause();
    } else {
      resumeSession();
    }
  }, [isAlarm, timer, completeAlarmAndSave, startSession, requestPause, resumeSession]);

  const handleMiddleClickMaximize = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu(null);
      setSubjectSubOpen(false);
      openMainFromPip();
    },
    [openMainFromPip]
  );

  const handlePointerDown = (e) => {
    if (e.button === 1) {
      handleMiddleClickMaximize(e);
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    setContextMenu(null);
    setSubjectSubOpen(false);
    const node = pipRef.current;
    if (!node) return;
    try {
      node.setPointerCapture(e.pointerId);
    } catch (_) {}
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      latestX: pos.x,
      latestY: pos.y,
    };
  };

  const handlePointerMove = (e) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const clamped = clampFrameToViewport(
      g.origX + (e.clientX - g.startX),
      g.origY + (e.clientY - g.startY),
      pillW,
      pillH
    );
    g.latestX = clamped.x;
    g.latestY = clamped.y;
    setPos({ x: clamped.x, y: clamped.y });
  };

  const handlePointerUp = (e) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gestureRef.current = null;
    updatePip({ x: g.latestX, y: g.latestY });
  };

  // Exact cursor-positioned Right-Click Context Menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    const menuW = 236;
    const menuH = 278;
    const x = Math.max(8, Math.min(vw - menuW - 8, e.clientX));
    const y = Math.max(8, Math.min(vh - menuH - 8, e.clientY));
    const flyoutLeft = x + 432 > vw - 10;
    setSubjectSubOpen(false);
    setContextMenu({ x, y, flyoutLeft });
  };

  const handleWheelZoom = (e) => {
    e.preventDefault();
    const next = clampScale(scale * (e.deltaY < 0 ? 1.07 : 0.935));
    setScale(next);
    updatePip({ scale: Number(next.toFixed(2)) });
  };

  if (!visible) return null;

  const pct = isAlarm ? 100 : isActive ? Math.max(2, Math.min(100, Number(progressPct || 0))) : 0;
  const cornerRadius = Math.max(12, Math.min(22, Math.round(pillH * 0.34)));
  const strokeW = 2;
  const rx = Math.max(8, cornerRadius - strokeW / 2);
  const rectW = Math.max(20, pillW - strokeW);
  const rectH = Math.max(16, pillH - strokeW);
  const perimeter = 2 * (rectW + rectH - 4 * rx) + 2 * Math.PI * rx;
  const dashOffset = perimeter * (1 - pct / 100);
  const digitFontPx = left.length >= 3 ? 25.5 : 29.5;
  const subjectTitle = (activeSubjectObj?.name || 'Focus').trim();
  const watermarkPx = Math.max(13, Math.min(22, Math.round(124 / Math.max(4.5, subjectTitle.length * 0.6))));
  const subjects = state?.subjects || [];

  return (
    <>
      <div
        ref={pipRef}
        className={[
          'v9-web-pip-floating',
          isRunning ? 'is-running' : '',
          isPaused ? 'is-paused' : '',
          isAlarm ? 'is-alarm' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: `${pillW}px`,
          height: `${pillH}px`,
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          zIndex: 9990,
          touchAction: 'none',
          cursor: 'grab',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onAuxClick={(e) => {
          if (e.button === 1) handleMiddleClickMaximize(e);
        }}
        onDoubleClick={() => openMainFromPip()}
        onContextMenu={handleContextMenu}
        onWheel={handleWheelZoom}
        title="Right-click: Menu · Middle-click (Scroll button): Open Main View · Drag: Move"
      >
        <div
          className="v8-pip-glass-pill v9-pip-compact-pill"
          style={{
            width: `${pillW}px`,
            height: `${pillH}px`,
            borderRadius: `${cornerRadius}px`,
          }}
        >
          <svg
            className="v8-pip-ring-svg"
            width={pillW}
            height={pillH}
            viewBox={`0 0 ${pillW} ${pillH}`}
            aria-hidden="true"
          >
            <rect
              className="v8-pip-ring-track"
              x={strokeW / 2}
              y={strokeW / 2}
              width={rectW}
              height={rectH}
              rx={rx}
              ry={rx}
              strokeWidth={1.2}
            />
            {pct > 0 && (
              <rect
                className="v8-pip-ring-progress"
                x={strokeW / 2}
                y={strokeW / 2}
                width={rectW}
                height={rectH}
                rx={rx}
                ry={rx}
                strokeWidth={strokeW}
                strokeDasharray={perimeter}
                strokeDashoffset={dashOffset}
              />
            )}
          </svg>

          <div
            className="v8-pip-stage v9-pip-pure-stage"
            style={{
              width: `${BASE_W}px`,
              height: `${BASE_H}px`,
              transform: `scale(${scale.toFixed(4)})`,
            }}
          >
            <div className="v8-pip-watermark" style={{ fontSize: `${watermarkPx}px` }} aria-hidden="true">
              {subjectTitle}
            </div>

            <div className="v9-pip-pure-clock">
              {neg && <span className="v8-pip-neg">−</span>}
              <span className="v8-pip-digits" style={{ fontSize: `${digitFontPx}px` }}>
                {left}
              </span>
              <span
                className={`v8-pip-colon ${isRunning ? 'is-live' : ''}`}
                style={{ fontSize: `${Math.round(digitFontPx * 0.86)}px` }}
              >
                :
              </span>
              <span className="v8-pip-digits" style={{ fontSize: `${digitFontPx}px` }}>
                {right}
              </span>
            </div>
          </div>
        </div>
      </div>

      {contextMenu &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="v10-pm-viewport v10-web-pm-portal"
            style={{
              position: 'fixed',
              left: `${Math.min(
                (typeof window !== 'undefined' ? window.innerWidth : 1280) - 268,
                Math.max(8, contextMenu.x)
              )}px`,
              top: `${Math.min(
                (typeof window !== 'undefined' ? window.innerHeight : 800) - 270,
                Math.max(8, contextMenu.y)
              )}px`,
              zIndex: 10050,
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (subjectSubOpen) setSubjectSubOpen(false);
            }}
          >
            {subjectSubOpen ? (
              <div className="v10-glass-card v10-subject-only-card" role="menu" aria-label="Subjects">
                <div className="v10-subj-two-col-grid">
                  {buildCleanTwoPartSubjects(subjects).map((sub) => {
                    const subLower = sub.name.toLowerCase();
                    const active =
                      subLower === String(subjectTitle || '').trim().toLowerCase() ||
                      (subLower === 'math' && String(subjectTitle || '').trim().toLowerCase() === 'higher math');
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        className={`v10-subj-glass-tile ${active ? 'is-active' : ''}`}
                        style={{ '--subj-accent': sub.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const realSub = (state?.subjects || []).find(
                            (s) =>
                              s.id === sub.id ||
                              String(s.name || '').trim().toLowerCase() === subLower
                          );
                          updatePip({ subject: sub.name });
                          if (realSub) {
                            updatePrefs({ selectedSubjectId: realSub.id });
                          }
                          setSubjectSubOpen(false);
                          setContextMenu(null);
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
              <div className="v10-glass-card v10-main-menu-card" role="menu" aria-label="PiP Quick Controls">
                <div className="v10-status-capsule">
                  <div className="v10-status-subj">
                    <BrandIcon size={17} variant="clock-only-transparent" />
                    <span className="v10-status-name">{subjectTitle}</span>
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

                <div className="v10-hero-actions">
                  <button
                    type="button"
                    role="menuitem"
                    className={`v10-hero-btn ${
                      isAlarm ? 'tone-alarm' : isRunning ? 'tone-pause' : 'tone-play'
                    }`}
                    onClick={() => {
                      handleTogglePlay();
                      setContextMenu(null);
                    }}
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
                    disabled={isRunning}
                    onClick={() => {
                      resetSession();
                      setContextMenu(null);
                    }}
                  >
                    <RotateCcw size={13.5} />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="v10-option-stack">
                  <button
                    type="button"
                    role="menuitem"
                    className="v10-option-row"
                    onClick={() => setSubjectSubOpen(true)}
                  >
                    <span className="v10-opt-ico accent-gold">
                      <Layers size={14} />
                    </span>
                    <span className="v10-opt-label">Subject</span>
                    <span className="v10-opt-trail">
                      <i style={{ background: activeSubjectObj?.color || '#48c8ff' }} />
                      <ChevronRight size={13.5} />
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    className="v10-option-row"
                    onClick={() => {
                      setContextMenu(null);
                      openMainFromPip();
                    }}
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

                <div className="v10-footer-grid">
                  <button
                    type="button"
                    role="menuitem"
                    className="v10-foot-tile"
                    onClick={() => {
                      setContextMenu(null);
                      updatePip({ open: false });
                      toast('PiP উইজেট বন্ধ হয়েছে।');
                    }}
                  >
                    <EyeOff size={13} />
                    <span>Hide</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    className="v10-foot-tile is-danger"
                    onClick={() => {
                      setContextMenu(null);
                      updatePip({ open: false });
                    }}
                  >
                    <Power size={13} />
                    <span>Exit</span>
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export default FloatingTimer;
