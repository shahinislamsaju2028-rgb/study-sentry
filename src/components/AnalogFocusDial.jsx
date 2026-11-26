import React, { memo, useMemo, useState } from 'react';

/**
 * ANALOG COUNTDOWN DIAL — a true mechanical presentation of the focus timer.
 *
 * The classic digital readout was replaced by a physical, instrument-grade dial:
 *  - a machined obsidian face inside a champagne-gold, knurled bezel
 *  - 60 calibrated minute ticks (majors every 5) plus applied hour indices
 *  - a champagne progress arc that fills as the session burns down
 *  - one tapered "remaining" hand driven by the real remaining seconds
 *  - a restrained hairline sweep hand that ticks every second (silent, no jank)
 *
 * ORIENTATION CONTRACT (v35)
 * --------------------------
 * The earlier build mixed an SVG `transform` attribute with a CSS `transform`
 * on the same <g>. In SVG 2 the attribute *is* the CSS property, so the two
 * fought each other and the numerals/hands ended up pointing the wrong way.
 * Every rotating part now uses a pure CSS transform with an explicit
 * `transform-box: view-box` + `transform-origin: 50% 50%` (the viewBox centre),
 * and NO `transform` attribute is ever emitted for it.
 *
 * The component is intentionally dependency-free and paints purely with SVG so the
 * hero stage stays at 60fps while the timer runs.
 */

const TAU = Math.PI * 2;
const C = 130; // viewBox centre (viewBox is 260 x 260)

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

function hourMarkerPath(cx, cy, inner, outer, angleDeg, halfWidth) {
  const [x1, y1] = polar(cx, cy, outer, angleDeg);
  const [x2, y2] = polar(cx, cy, inner, angleDeg);
  const a = ((angleDeg - 90) * Math.PI) / 180;
  const nx = Math.cos(a);
  const ny = Math.sin(a);
  const w = halfWidth;
  return `M ${x1 - ny * w} ${y1 + nx * w} L ${x2 - ny * w} ${y2 + nx * w} L ${
    x2 + ny * w
  } ${y2 - nx * w} L ${x1 + ny * w} ${y1 - nx * w} Z`;
}

/** Split an "HH:MM:SS" style string into total seconds (robust to any length). */
export function parseClockSeconds(value) {
  const parts = String(value ?? '')
    .trim()
    .split(':')
    .map((p) => Number(p) || 0);
  if (!parts.length) return 0;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

const TickRing = memo(function TickRing({ major, minor, cx, cy, r1, r2, color, width }) {
  return (
    <g aria-hidden="true">
      {Array.from({ length: 60 }, (_, i) => {
        const isMajor = i % 5 === 0;
        const a = i * 6;
        const [x1, y1] = polar(cx, cy, isMajor ? r1 : r1 + (r2 - r1) * 0.45, a);
        const [x2, y2] = polar(cx, cy, r2, a);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isMajor ? major : minor}
            strokeWidth={isMajor ? width : Math.max(0.6, width * 0.5)}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
});

export default function AnalogFocusDial({
  remainingSec = 0,
  totalSec = 0,
  size = 300,
  isAlarm = false,
  isPaused = false,
  isRunning = false,
  className = '',
  label = '',
  sublabel = '',
}) {
  const total = Math.max(1, Math.round(totalSec) || 1);
  const remain = Math.max(0, Math.min(total, Math.round(remainingSec) || 0));
  const elapsedPct = Math.max(0, Math.min(100, ((total - remain) / total) * 100));

  const R = 116;
  const circleR = 102; // progress arc track
  const tickOuter = 96;
  const tickInner = 88;

  const arcLen = 2 * Math.PI * circleR;
  const dash = (elapsedPct / 100) * arcLen;

  // ── REVERSE COUNTDOWN CONTRACT (v43) ──────────────────────────────────────
  // Both hands are driven by the RAW remaining seconds, never by a modulo.
  // The old build used `remain % 60` (seconds hand) and `remain % 3600`
  // (minute hand), so whenever the value crossed the 60 → 0 boundary the hand
  // snapped back FORWARD to 60 and only then resumed running backwards.
  // Removing the modulo makes the angle a monotonically decreasing value, so
  // the hand keeps travelling backwards through the wrap instead of reversing.
  //
  //   • Remaining hand — one full turn per hour of session. A 45-minute timer
  //     therefore starts on the "9" (270°) and winds back 9 → 8 → 7 → … → 12.
  //   • Second sweep   — one full turn per minute, always counter-clockwise.
  const remainAngle = (remain / 60) * 6;
  const secAngle = remain * 6;

  // The sweep is re-anchored on every tick. A normal tick moves it exactly 6°
  // backwards and is animated over one second; a large jump (session reset,
  // view remount, subject change) must SNAP instead of spinning the hand.
  const [sweep, setSweep] = useState({ angle: secAngle, dur: 0 });
  const [prevSecAngle, setPrevSecAngle] = useState(secAngle);
  if (prevSecAngle !== secAngle) {
    const jump = Math.abs(secAngle - prevSecAngle);
    setPrevSecAngle(secAngle);
    setSweep({ angle: secAngle, dur: jump > 24 ? 0 : 1 });
  }

  // Western numerals read instantly on a dial face.  Six o'clock is left free
  // for the mechanical readout window, exactly like a classic instrument.
  const numerals = useMemo(
    () =>
      [
        { label: '12', angle: 0 },
        { label: '3', angle: 90 },
        { label: '6', angle: 180 },
        { label: '9', angle: 270 },
      ].map((n) => {
        const [x, y] = polar(C, C, n.angle === 180 ? 67 : 64, n.angle);
        return { ...n, x, y };
      }),
    []
  );

  // Applied hour indices (12 batons) sit just inside the minute track.
  const hourIndices = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        key: `h${i}`,
        d: hourMarkerPath(C, C, 79, 85, i * 30, 2.4),
        major: i % 3 === 0,
      })),
    []
  );

  const handColor = isAlarm ? '#fb7185' : '#f8fafc';
  const sweepColor = isAlarm ? '#fb7185' : '#e7c88a';

  return (
    <div
      className={`v34-analog-dial ${isAlarm ? 'is-alarm' : ''} ${
        isPaused ? 'is-paused' : ''
      } ${isRunning ? 'is-running' : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`অ্যানালগ ডায়াল — অবশিষ্ট ${Math.floor(remain / 60)} মিনিট ${
        remain % 60
      } সেকেন্ড`}
    >
      <svg viewBox="0 0 260 260" width="100%" height="100%" aria-hidden="true">
        <defs>
          <radialGradient id="v34dialFace" cx="38%" cy="26%" r="82%">
            <stop offset="0%" stopColor="#20242f" />
            <stop offset="52%" stopColor="#12151d" />
            <stop offset="100%" stopColor="#07090e" />
          </radialGradient>
          <linearGradient id="v34dialBezel" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
            <stop offset="22%" stopColor="#d97706" stopOpacity="0.78" />
            <stop offset="48%" stopColor="#fef3c7" stopOpacity="0.9" />
            <stop offset="72%" stopColor="#b45309" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#fcd34d" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id="v34dialHand" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={isAlarm ? '#fda4af' : '#b45309'} />
            <stop offset="34%" stopColor={isAlarm ? '#fecdd3' : '#fde68a'} />
            <stop offset="62%" stopColor={isAlarm ? '#fb7185' : '#fbbf24'} />
            <stop offset="100%" stopColor={isAlarm ? '#9f1239' : '#92400e'} />
          </linearGradient>
          <linearGradient id="v34dialGlass" x1="0.1" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" />
            <stop offset="42%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="v34dialInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <filter id="v34dialGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="v34dialSoft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="v34dialFaceClip">
            <circle cx={C} cy={C} r={R} />
          </clipPath>
        </defs>

        {/* Machined outer bezel */}
        <circle cx={C} cy={C} r={R + 11} fill="url(#v34dialBezel)" opacity="0.92" />
        <circle cx={C} cy={C} r={R + 6} fill="#0a0c12" />
        <circle cx={C} cy={C} r={R + 6} fill="none" stroke="#fde68a" strokeOpacity="0.28" strokeWidth="1" />

        {/* Knurled bezel notches — 72 fine cuts around the metal rim */}
        <g aria-hidden="true" opacity="0.5">
          {Array.from({ length: 72 }, (_, i) => {
            const a = i * 5;
            const [x1, y1] = polar(C, C, R + 7, a);
            const [x2, y2] = polar(C, C, R + 10.6, a);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#3a2a08"
                strokeOpacity="0.55"
                strokeWidth="1"
              />
            );
          })}
        </g>

        {/* Dial face */}
        <circle cx={C} cy={C} r={R} fill="url(#v34dialFace)" />
        <circle cx={C} cy={C} r={R} fill="none" stroke="#ffffff" strokeOpacity="0.09" strokeWidth="1" />
        <circle cx={C} cy={C} r={R - 13} fill="none" stroke="#fbbf24" strokeOpacity="0.10" strokeWidth="1" />
        <circle cx={C} cy={C} r={R - 13} fill="url(#v34dialInner)" />

        {/* Engraved inner chapter ring */}
        <circle
          cx={C}
          cy={C}
          r="54"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.07"
          strokeWidth="1"
          strokeDasharray="1.5 4.5"
        />

        {/* Progress arc — burns down counter-clockwise, matching the hands */}
        <circle
          cx={C}
          cy={C}
          r={circleR}
          fill="none"
          stroke={isAlarm ? '#fb7185' : '#fbbf24'}
          strokeOpacity={isAlarm ? 0.9 : 0.62}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${arcLen}`}
          strokeDashoffset={arcLen - dash}
          className="v34-dial-arc"
          style={{ transform: 'rotate(-90deg)', transformBox: 'view-box', transformOrigin: '50% 50%' }}
        />

        {/* Applied hour indices (12 batons) */}
        <g aria-hidden="true">
          {hourIndices.map((h) => (
            <path
              key={h.key}
              d={h.d}
              fill={isAlarm ? '#fecdd3' : h.major ? '#f8fafc' : '#cbd5e1'}
              opacity={h.major ? 0.95 : 0.62}
            />
          ))}
        </g>

        {/* Calibrated ticks */}
        <TickRing
          cx={C}
          cy={C}
          r1={tickInner}
          r2={tickOuter}
          major={isAlarm ? '#fecdd3' : '#e7e5e4'}
          minor="#6b7280"
          width={2}
        />

        {/* Quarter numerals — upright, never rotated */}
        {numerals.map((n) => (
          <text
            key={n.label}
            x={n.x}
            y={n.y}
            fill="#dbe3ec"
            fontSize="16"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="central"
            className="v34-dial-numeral"
          >
            {n.label}
          </text>
        ))}

        {/* Hairline second sweep — always winds backwards, never snaps forward */}
        <g
          className="v34-dial-sweep"
          style={{
            transform: `rotate(${sweep.angle}deg)`,
            transitionDuration: `${sweep.dur}s`,
          }}
        >
          <line
            x1={C}
            y1={C + 10}
            x2={C}
            y2={C - 78}
            stroke={sweepColor}
            strokeOpacity="0.42"
            strokeWidth="0.9"
          />
          <circle cx={C} cy={C - 78} r="1.7" fill={sweepColor} fillOpacity="0.7" />
        </g>

        {/* Main remaining hand — a tapered dauphine with a round counterweight */}
        <g
          className="v34-dial-hand"
          style={{ transform: `rotate(${remainAngle}deg)` }}
        >
          {/* stem */}
          <rect
            x={C - 2.2}
            y={C + 2}
            width="4.4"
            height="16"
            rx="2.2"
            fill={isAlarm ? '#fb7185' : '#d97706'}
            opacity="0.9"
          />
          {/* tapered blade */}
          <path
            d={`M ${C - 8} ${C + 4} L ${C - 2.2} ${C - 82} L ${C + 2.2} ${C - 82} L ${
              C + 8
            } ${C + 4} Z`}
            fill="url(#v34dialHand)"
            filter="url(#v34dialGlow)"
          />
          {/* counterweight */}
          <circle
            cx={C}
            cy={C + 20}
            r="6.4"
            fill={isAlarm ? '#fb7185' : '#fcd34d'}
            opacity="0.95"
          />
          <circle
            cx={C}
            cy={C + 20}
            r="2.4"
            fill="#0b0e14"
            opacity="0.5"
          />
        </g>

        {/* Glass reflection */}
        <g clipPath="url(#v34dialFaceClip)" aria-hidden="true">
          <path
            d={`M ${C - 108} ${C - 40} Q ${C - 40} ${C - 122} ${C + 62} ${C - 104} Q ${
              C + 10
            } ${C - 46} ${C - 108} ${C + 12} Z`}
            fill="url(#v34dialGlass)"
          />
        </g>

        {/* Centre cap */}
        <circle cx={C} cy={C} r="11" fill="#0b0e14" stroke={isAlarm ? '#fb7185' : '#fbbf24'} strokeOpacity="0.6" strokeWidth="1.6" />
        <circle cx={C} cy={C} r="6.4" fill={isAlarm ? '#fb7185' : '#fbbf24'} opacity="0.22" filter="url(#v34dialSoft)" />
        <circle cx={C} cy={C} r="4" fill={isAlarm ? '#fb7185' : '#fde68a'} />

        {/* Readout window (small, mechanical — never a big digital screen) */}
        <g>
          <rect
            x={C - 34}
            y={C + 30}
            width="68"
            height="21"
            rx="7"
            fill="#06080d"
            stroke="#fbbf24"
            strokeOpacity="0.24"
          />
          <text
            x={C}
            y={C + 41}
            fill="#f8fafc"
            fontSize="13"
            fontWeight="800"
            textAnchor="middle"
            dominantBaseline="central"
            className="v34-dial-readout"
          >
            {`${String(Math.floor(remain / 60)).padStart(2, '0')}:${String(remain % 60).padStart(2, '0')}`}
          </text>
        </g>
      </svg>

      {(label || sublabel) && (
        <div className="v34-dial-caption">
          {label && <strong>{label}</strong>}
          {sublabel && <small>{sublabel}</small>}
        </div>
      )}
    </div>
  );
}
