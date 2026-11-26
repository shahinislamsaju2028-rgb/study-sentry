import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { desktopBridge } from '../bridge/desktopBridge';
import type { PipStatePayload } from '../types/study';

const DEFAULT_PIP_STATE: PipStatePayload = {
  theme: 'aurora',
  timerStatus: 'idle',
  mode: 'pomodoro',
  phase: 'focus',
  displayTime: '25:00',
  isAlarm: false,
  subjectName: 'Physics',
  subjectColor: '#fbbf24',
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
  subjects: [
    { id: 'subj-phys', name: 'Physics', color: '#f59e0b' },
    { id: 'subj-math', name: 'Math', color: '#38bdf8' },
    { id: 'subj-chem', name: 'Chemistry', color: '#fbbf24' },
    { id: 'subj-bio', name: 'Biology', color: '#60a5fa' },
    { id: 'subj-ict', name: 'ICT & Eng', color: '#818cf8' },
  ],
};

/**
 * Strictly formats any clock string into total minutes + seconds ONLY (MM:SS or MMM:SS).
 * Never emits an hours segment (e.g., "01:30:00" -> left: "90", right: "00").
 */
function splitStrictMMSS(raw: string): { neg: boolean; left: string; right: string } {
  const s = String(raw || '25:00').trim();
  const neg = s.startsWith('-');
  const clean = neg ? s.slice(1) : s;
  const parts = clean.split(':').map((p) => p.replace(/[^\d]/g, ''));

  if (parts.length >= 3) {
    const hours = parseInt(parts[0] || '0', 10) || 0;
    const mins = parseInt(parts[1] || '0', 10) || 0;
    const secs = parseInt(parts[2] || '0', 10) || 0;
    const totalMins = hours * 60 + mins;
    return {
      neg,
      left: String(totalMins).padStart(2, '0'),
      right: String(secs).padStart(2, '0').slice(-2),
    };
  }

  if (parts.length === 2) {
    const mins = parseInt(parts[0] || '0', 10);
    const secs = parseInt(parts[1] || '0', 10) || 0;
    const safeMinStr = Number.isFinite(mins) ? String(mins).padStart(2, '0') : '25';
    return {
      neg,
      left: safeMinStr,
      right: String(secs).padStart(2, '0').slice(-2),
    };
  }

  return { neg: false, left: '25', right: '00' };
}

type ResizeDir =
  | 'East'
  | 'North'
  | 'NorthEast'
  | 'NorthWest'
  | 'South'
  | 'SouthEast'
  | 'SouthWest'
  | 'West';

const BASE_W = 142;
const BASE_H = 52;
const MIN_W = 96;
const MIN_H = 38;
const MAX_W = 480;
const MAX_H = 200;

export const PipWindowApp: React.FC = () => {
  const [state, setState] = useState<PipStatePayload>(DEFAULT_PIP_STATE);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth || BASE_W : BASE_W,
    h: typeof window !== 'undefined' ? window.innerHeight || BASE_H : BASE_H,
  });

  const middleHandledRef = useRef<number>(0);

  useEffect(() => {
    document.documentElement.classList.add('pip-transparent-root');
    document.body.classList.add('pip-os-body');
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    let mounted = true;
    desktopBridge.pipGetCachedState().then((cached) => {
      if (mounted && cached) {
        setState((prev) => ({ ...prev, ...cached }));
      }
    });

    const unsub = desktopBridge.onPipState((payload) => {
      if (mounted && payload) {
        setState((prev) => ({ ...prev, ...payload }));
      }
    });

    const onResize = () => {
      setViewport({
        w: window.innerWidth || BASE_W,
        h: window.innerHeight || BASE_H,
      });
    };
    window.addEventListener('resize', onResize);

    return () => {
      mounted = false;
      unsub();
      window.removeEventListener('resize', onResize);
      document.documentElement.classList.remove('pip-transparent-root');
      document.body.classList.remove('pip-os-body');
    };
  }, []);

  const triggerMiddleClickMaximize = useCallback(() => {
    const now = Date.now();
    if (now - middleHandledRef.current < 260) return;
    middleHandledRef.current = now;
    void desktopBridge.pipCloseMenu();
    void desktopBridge.pipSendAction({ type: 'maximize-dashboard' });
  }, []);

  // Right-click anywhere on PiP opens the Context Menu at the EXACT mouse cursor coordinate
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.clientX;
    const clientY = e.clientY;
    const screenXFallback = Math.round(e.screenX * (window.devicePixelRatio || 1));
    const screenYFallback = Math.round(e.screenY * (window.devicePixelRatio || 1));

    if (desktopBridge.isTauri) {
      const win = getCurrentWindow();
      Promise.all([win.outerPosition(), win.scaleFactor()])
        .then(([pos, scale]) => {
          const cx = Math.round(pos.x + clientX * scale);
          const cy = Math.round(pos.y + clientY * scale);
          void desktopBridge.pipOpenMenu(242, 240, cx, cy);
        })
        .catch(() => {
          void desktopBridge.pipOpenMenu(242, 240, screenXFallback, screenYFallback);
        });
    } else {
      void desktopBridge.pipOpenMenu(242, 240, screenXFallback, screenYFallback);
    }
  }, []);

  // Left-drag moves PiP; Middle-click (Scroll button) maximizes/opens Main Software immediately
  const handleSurfaceMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        triggerMiddleClickMaximize();
        return;
      }
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('.v7-pip-rz')) {
        return;
      }
      void desktopBridge.pipCloseMenu();
      if (desktopBridge.isTauri) {
        getCurrentWindow().startDragging().catch(() => {});
      }
    },
    [triggerMiddleClickMaximize]
  );

  const handleAuxClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        triggerMiddleClickMaximize();
      }
    },
    [triggerMiddleClickMaximize]
  );

  // Double-click anywhere on PiP restores main software
  const handleSurfaceDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    void desktopBridge.pipCloseMenu();
    void desktopBridge.pipSendAction({ type: 'open-dashboard' });
  }, []);

  // Mouse wheel smoothly scales PiP size uniformly
  const handleWheelZoom = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!desktopBridge.isTauri) return;
    const step = e.deltaY < 0 ? 1.07 : 0.935;
    const curW = window.innerWidth || BASE_W;
    const aspect = BASE_H / BASE_W;
    const nextW = Math.max(MIN_W, Math.min(MAX_W, Math.round(curW * step)));
    const nextH = Math.max(MIN_H, Math.min(MAX_H, Math.round(nextW * aspect)));
    void desktopBridge.pipCloseMenu();
    getCurrentWindow()
      .setSize(new LogicalSize(nextW, nextH))
      .catch(() => {});
  }, []);

  // 8-way native edge & corner resizing
  const beginEdgeResize = useCallback(
    (dir: ResizeDir) => (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !desktopBridge.isTauri) return;
      e.preventDefault();
      e.stopPropagation();
      void desktopBridge.pipCloseMenu();
      getCurrentWindow()
        .startResizeDragging(dir)
        .catch(() => {});
    },
    []
  );

  const isRunning = state.timerStatus === 'running';
  const isPaused = state.timerStatus === 'paused';
  const isAlarm = Boolean(state.isAlarm || state.timerStatus === 'alarm');
  const isActive = isRunning || isPaused || isAlarm;

  const { neg, left, right } = splitStrictMMSS(state.displayTime);
  const subjectTitle = (state.subjectName || 'Focus').trim();

  // Scale inner stage uniformly to fill window with ZERO button space
  const scale = Math.max(
    0.66,
    Math.min(viewport.w / BASE_W, viewport.h / BASE_H, 3.2)
  );

  const rawProgress = Number(state.progressPct || 0);
  const pct = isAlarm
    ? 100
    : isActive
      ? Math.max(2, Math.min(100, rawProgress))
      : 0;

  const pillW = Math.max(88, viewport.w - 2);
  const pillH = Math.max(34, viewport.h - 2);
  const cornerRadius = Math.max(11, Math.min(20, Math.round(pillH * 0.34)));
  const strokeW = 2;
  const rx = Math.max(8, cornerRadius - strokeW / 2);
  const rectW = Math.max(20, pillW - strokeW);
  const rectH = Math.max(16, pillH - strokeW);
  const perimeter =
    2 * (rectW + rectH - 4 * rx) + 2 * Math.PI * rx;
  const dashOffset = perimeter * (1 - pct / 100);

  // Dynamically size font when minutes has 3 digits (e.g., 120:00 or 150:00)
  const digitFontPx = left.length >= 3 ? 25.5 : 29.5;
  const watermarkPx = Math.max(
    13,
    Math.min(22, Math.round(124 / Math.max(4.5, subjectTitle.length * 0.6)))
  );

  return (
    <div
      className={[
        'v8-pip-viewport v9-pip-buttonless',
        isRunning ? 'is-running' : '',
        isPaused ? 'is-paused' : '',
        isAlarm ? 'is-alarm' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseDown={handleSurfaceMouseDown}
      onAuxClick={handleAuxClick}
      onDoubleClick={handleSurfaceDoubleClick}
      onContextMenu={handleContextMenu}
      onWheel={handleWheelZoom}
      title="Right-click: Menu · Middle-click (Scroll button): Maximize App · Drag: Move"
    >
      {/* 8-Way Native Resize Borders & Corners */}
      <div className="v7-pip-rz rz-n" onMouseDown={beginEdgeResize('North')} />
      <div className="v7-pip-rz rz-s" onMouseDown={beginEdgeResize('South')} />
      <div className="v7-pip-rz rz-e" onMouseDown={beginEdgeResize('East')} />
      <div className="v7-pip-rz rz-w" onMouseDown={beginEdgeResize('West')} />
      <div className="v7-pip-rz rz-nw" onMouseDown={beginEdgeResize('NorthWest')} />
      <div className="v7-pip-rz rz-ne" onMouseDown={beginEdgeResize('NorthEast')} />
      <div className="v7-pip-rz rz-sw" onMouseDown={beginEdgeResize('SouthWest')} />
      <div className="v7-pip-rz rz-se" onMouseDown={beginEdgeResize('SouthEast')} />

      {/* Ultra-Compact Buttonless Rounded Frosted Glass Pill */}
      <div
        className="v8-pip-glass-pill v9-pip-compact-pill"
        style={{
          width: `${pillW}px`,
          height: `${pillH}px`,
          borderRadius: `${cornerRadius}px`,
        }}
      >
        {/* Exact Perimeter Progress Ring */}
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

        {/* Zero-Button-Space Centered Stage: Only Subject Watermark + Bodoni MM:SS */}
        <div
          className="v8-pip-stage v9-pip-pure-stage"
          style={{
            width: `${BASE_W}px`,
            height: `${BASE_H}px`,
            transform: `scale(${scale.toFixed(4)})`,
          }}
        >
          {/* 11% Centered Background Subject Watermark */}
          <div
            className="v8-pip-watermark"
            style={{ fontSize: `${watermarkPx}px` }}
            aria-hidden="true"
          >
            {subjectTitle}
          </div>

          {/* Pure Bodoni MM:SS Countdown — Minutes & Seconds ONLY */}
          <div className="v9-pip-pure-clock" aria-label={ `${neg ? '-' : ''}${left}:${right}` }>
            {neg && <span className="v8-pip-neg">−</span>}
            <span
              className="v8-pip-digits"
              style={{ fontSize: `${digitFontPx}px` }}
            >
              {left}
            </span>
            <span
              className={`v8-pip-colon ${isRunning ? 'is-live' : ''}`}
              style={{ fontSize: `${Math.round(digitFontPx * 0.86)}px` }}
            >
              :
            </span>
            <span
              className="v8-pip-digits"
              style={{ fontSize: `${digitFontPx}px` }}
            >
              {right}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipWindowApp;
