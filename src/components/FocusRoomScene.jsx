import React, { useId } from 'react';

/**
 * FocusRoomScene — wide, detailed study-room illustration for the Focus tab.
 * Canvas 1200×400; the tab frame uses aspect-ratio 3:1 so nothing crops.
 *
 * Depth layers (back → front):
 *   wall → window → shelf/poster → chair → character torso → DESK →
 *   desk items → arms/head (in front of the desk) → foreground props
 *
 * The top-right area (x > 960, y < 210) is kept as bare wall: the analogue /
 * digital clock is absolutely positioned there by the view, so it reads as a
 * clock hung on the room's wall.
 *
 * Posture per state:
 *   studying → leaning in over an open book, pencil in hand, headphones on
 *   break    → leaning back, arms stretched up, mug steaming
 *   resting  → head down on folded arms, "z" motes, lamp dimmed
 */
export default function FocusRoomScene({ status = 'offline' }) {
  const uid = useId().replace(/:/g, '');
  const isStudying = status === 'studying';
  const isBreak = status === 'break' || status === 'paused';
  const mode = isStudying ? 'studying' : isBreak ? 'break' : 'resting';

  const lampLit = isStudying ? 1 : isBreak ? 0.5 : 0.22;
  const skyTop = isStudying ? '#1b2436' : isBreak ? '#3d2517' : '#0e1424';
  const skyBottom = isStudying ? '#31415c' : isBreak ? '#8a4b26' : '#1a2233';

  /* ── the head, shared across the three postures ───────────────────── */
  const Head = ({ cx, cy, tilt, eyes, mouth, phones }) => (
    <g transform={`rotate(${tilt} ${cx} ${cy})`}>
      {/* hair: full cap behind, plus a swept fringe in front */}
      <ellipse cx={cx} cy={cy - 6} rx="33" ry="35" fill="#2a1d13" />
      {/* face */}
      <ellipse cx={cx} cy={cy + 2} rx="27.5" ry="29" fill={`url(#${uid}skin)`} />
      {/* swept fringe + a lit strand so the hair reads at a glance */}
      <path
        d={`M${cx - 28} ${cy - 4}
            q1 -26 28 -27 q27 1 28 27
            q-3 -13 -13 -16 q-7 8 -20 7 q-13 -1 -23 9 Z`}
        fill="#2a1d13"
      />
      <path
        d={`M${cx - 19} ${cy - 20} q10 -9 24 -6`}
        stroke="#463322" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85"
      />
      {/* ears */}
      <circle cx={cx - 27.5} cy={cy + 4} r="4.6" fill="#c89468" />
      <circle cx={cx + 27.5} cy={cy + 4} r="4.6" fill="#c89468" />
      {/* eyes → eyes is 'down' | 'happy' | 'sleep' */}
      {eyes === 'down' && (
        <>
          <path d={`M${cx - 14} ${cy + 4} q5 4 10 0`} stroke="#2a1b10" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d={`M${cx + 4} ${cy + 4} q5 4 10 0`} stroke="#2a1b10" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d={`M${cx - 15} ${cy - 5} q6 -3 11 -1`} stroke="#2a1b10" strokeWidth="1.7" fill="none" opacity="0.75" />
          <path d={`M${cx + 4} ${cy - 5} q6 -3 11 -1`} stroke="#2a1b10" strokeWidth="1.7" fill="none" opacity="0.75" />
        </>
      )}
      {eyes === 'happy' && (
        <>
          <path d={`M${cx - 14} ${cy + 4} q5 -6 10 0`} stroke="#2a1b10" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d={`M${cx + 4} ${cy + 4} q5 -6 10 0`} stroke="#2a1b10" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      )}
      {eyes === 'sleep' && (
        <>
          <path d={`M${cx - 14} ${cy + 4} q5 5 10 0`} stroke="#2a1b10" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d={`M${cx + 4} ${cy + 4} q5 5 10 0`} stroke="#2a1b10" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      )}
      {/* nose */}
      <path d={`M${cx} ${cy + 8} q3 4 -1 5`} stroke="#a97b52" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* mouth */}
      {mouth === 'smile' && <path d={`M${cx - 6} ${cy + 17} q6 4 12 0`} stroke="#8a5a44" strokeWidth="2.2" fill="none" strokeLinecap="round" />}
      {mouth === 'grin' && <path d={`M${cx - 8} ${cy + 15} q8 9 16 0 q-8 4 -16 0 Z`} fill="#8a5a44" />}
      {mouth === 'calm' && <path d={`M${cx - 6} ${cy + 18} q6 -2 12 0`} stroke="#8a5a44" strokeWidth="2" fill="none" strokeLinecap="round" />}
      {/* headphones: 'on' wears them, 'neck' rests around the neck */}
      {phones === 'on' && (
        <>
          <path d={`M${cx - 31} ${cy - 2} q2 -34 31 -34 q29 0 31 34`} fill="none" stroke="#3b475f" strokeWidth="6.5" strokeLinecap="round" />
          <rect x={cx - 37} y={cy - 10} width="12" height="21" rx="6" fill="#3b475f" />
          <rect x={cx + 25} y={cy - 10} width="12" height="21" rx="6" fill="#3b475f" />
        </>
      )}
    </g>
  );

  return (
    <svg
      className={`focus-room-scene is-${mode}`}
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={
        isStudying
          ? 'টেবিলে ঝুঁকে পড়াশোনা করছে'
          : isBreak
            ? 'চেয়ারে হেলান দিয়ে বিরতি নিচ্ছে'
            : 'টেবিলে মাথা রেখে বিশ্রাম নিচ্ছে'
      }
    >
      <defs>
        <linearGradient id={`${uid}wall`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#2a1e13" />
          <stop offset="55%" stopColor="#1e1610" />
          <stop offset="100%" stopColor="#140f0a" />
        </linearGradient>
        <radialGradient id={`${uid}wallGlow`} cx="0.5" cy="0.1" r="0.8">
          <stop offset="0%" stopColor="#c99a4e" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#c99a4e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1309" />
          <stop offset="100%" stopColor="#0b0704" />
        </linearGradient>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0.15" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>
        <linearGradient id={`${uid}curtain`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#553b23" />
          <stop offset="100%" stopColor="#2c1f13" />
        </linearGradient>
        <radialGradient id={`${uid}moonGlow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#f5e3b8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f5e3b8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}deskTop`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b4128" />
          <stop offset="100%" stopColor="#33230f" />
        </linearGradient>
        <linearGradient id={`${uid}lampCone`} x1="0.42" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ffe2a8" stopOpacity={0.42 * lampLit + 0.08} />
          <stop offset="100%" stopColor="#ffe2a8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}lampShade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e6bb6c" />
          <stop offset="100%" stopColor="#8d6a2c" />
        </linearGradient>
        <linearGradient id={`${uid}hoodie`} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor="#54688f" />
          <stop offset="100%" stopColor="#2b3752" />
        </linearGradient>
        <radialGradient id={`${uid}skin`} cx="0.4" cy="0.26" r="0.9">
          <stop offset="0%" stopColor="#eec4a0" />
          <stop offset="100%" stopColor="#c89468" />
        </radialGradient>
        <linearGradient id={`${uid}page`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#f7efdd" />
          <stop offset="100%" stopColor="#cbbfa6" />
        </linearGradient>
        <filter id={`${uid}soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <radialGradient id={`${uid}vig`} cx="0.5" cy="0.45" r="0.8">
          <stop offset="58%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.42" />
        </radialGradient>
      </defs>

      {/* ══════ ROOM SHELL ══════ */}
      <rect width="1200" height="400" fill={`url(#${uid}wall)`} />
      <rect width="1200" height="400" fill={`url(#${uid}wallGlow)`} />
      <g stroke="#31241a" strokeWidth="1" opacity="0.45">
        <line x1="0" y1="126" x2="1200" y2="126" />
        <line x1="452" y1="0" x2="452" y2="312" />
        <line x1="906" y1="0" x2="906" y2="312" />
      </g>
      <rect x="0" y="312" width="1200" height="88" fill={`url(#${uid}floor)`} />
      <path d="M0 312 H1200" stroke="#3d2c1a" strokeWidth="2" />
      {/* rug */}
      <ellipse cx="600" cy="378" rx="330" ry="17" fill="#2b1d10" opacity="0.7" />
      <ellipse cx="600" cy="378" rx="252" ry="11" fill="#352410" opacity="0.55" />

      {/* ══════ WINDOW (left) ══════ */}
      <g>
        <rect x="60" y="44" width="268" height="222" rx="9" fill="#0b1120" stroke="#4d3722" strokeWidth="5" />
        <rect x="68" y="52" width="252" height="206" rx="5" fill={`url(#${uid}sky)`} />
        <g fill="#e7ecf7">
          <circle cx="98" cy="78" r="1.6" opacity="0.7" />
          <circle cx="138" cy="100" r="1.1" opacity="0.55" />
          <circle cx="190" cy="74" r="1.4" opacity="0.75" />
          <circle cx="256" cy="90" r="1.2" opacity="0.5" />
          <circle cx="290" cy="132" r="1.5" opacity="0.65" />
          <circle cx="112" cy="150" r="1" opacity="0.45" />
          <circle cx="232" cy="146" r="1.3" opacity="0.6" />
        </g>
        {!isBreak ? (
          <g>
            <circle cx="226" cy="104" r="32" fill={`url(#${uid}moonGlow)`} />
            <circle cx="226" cy="104" r="16" fill="#f3e6c8" />
            <circle cx="219" cy="99" r="3.2" fill="#e2d2ae" opacity="0.7" />
            <circle cx="232" cy="110" r="2.2" fill="#e2d2ae" opacity="0.55" />
          </g>
        ) : (
          <g>
            <circle cx="204" cy="232" r="40" fill="#ffb066" opacity="0.25" />
            <circle cx="204" cy="232" r="20" fill="#ffc98a" opacity="0.9" />
          </g>
        )}
        <g fill="#0a0f1a" opacity="0.6">
          <rect x="80" y="212" width="24" height="46" />
          <rect x="110" y="198" width="18" height="60" />
          <rect x="134" y="222" width="28" height="36" />
          <rect x="170" y="206" width="20" height="52" />
          <rect x="224" y="216" width="24" height="42" />
          <rect x="258" y="204" width="18" height="54" />
        </g>
        <g fill="#c99a4e" opacity="0.45">
          <rect x="85" y="222" width="4" height="4" />
          <rect x="96" y="234" width="4" height="4" />
          <rect x="116" y="208" width="4" height="4" />
          <rect x="123" y="226" width="4" height="4" />
          <rect x="176" y="218" width="4" height="4" />
          <rect x="264" y="216" width="4" height="4" />
        </g>
        <g stroke="#3d2b1a" strokeWidth="5" strokeLinecap="round">
          <line x1="194" y1="52" x2="194" y2="258" />
          <line x1="68" y1="156" x2="320" y2="156" />
        </g>
        <path d="M50 40 q24 58 11 118 q-8 60 15 112 l-32 6 V40 Z" fill={`url(#${uid}curtain)`} />
        <path d="M338 40 q-24 58 -11 118 q8 60 -15 112 l32 6 V40 Z" fill={`url(#${uid}curtain)`} />
        <path d="M84 46 q13 52 5 108" stroke="#6b4d2e" strokeWidth="2" fill="none" opacity="0.55" />
        <path d="M304 46 q-13 52 -5 108" stroke="#6b4d2e" strokeWidth="2" fill="none" opacity="0.55" />
        <rect x="48" y="264" width="292" height="10" rx="4" fill="#3f2c19" />
      </g>

      {/* window plant */}
      <g>
        <path d="M112 264 q-4 -24 7 -36 q-16 6 -13 22 q-14 -11 -9 -26 q-9 18 5 29 q-11 2 -13 11 Z" fill="#3f6144" />
        <path d="M126 264 q5 -28 -4 -40 q18 8 15 26 q13 -13 6 -28 q11 19 -2 30 q13 0 17 12 Z" fill="#4c7351" />
        <rect x="106" y="254" width="32" height="12" rx="3" fill="#7a5330" />
      </g>

      {/* ══════ WALL SHELF + POSTER ══════ */}
      <g>
        <rect x="470" y="140" width="112" height="7" rx="2.5" fill="#46321d" />
        <rect x="476" y="110" width="11" height="30" rx="2" fill="#8a5a3c" />
        <rect x="489" y="116" width="9" height="24" rx="2" fill="#c99a4e" />
        <rect x="500" y="104" width="12" height="36" rx="2" fill="#5c7a8a" />
        <rect x="514" y="118" width="8" height="22" rx="2" fill="#a35f5f" />
        <rect x="524" y="112" width="10" height="28" rx="2" fill="#6f7f52" />
        <rect x="544" y="104" width="32" height="28" rx="3" fill="#241a11" stroke="#6b4c2c" strokeWidth="2" />
        <circle cx="560" cy="114" r="4.5" fill="#c99a4e" opacity="0.6" />
        <path d="M548 130 l9 -8 l7 5 l5 -3 l5 6 Z" fill="#8a6a3c" opacity="0.7" />
      </g>
      {/* motivational poster */}
      <g transform="rotate(-1.5 690 96) scale(0.84) translate(112 20)">
        <rect x="650" y="70" width="86" height="104" rx="4" fill="#1c150e" stroke="#5d4227" strokeWidth="3" />
        <rect x="660" y="80" width="66" height="66" rx="2" fill="#2a2018" />
        <path d="M666 146 l18 -34 l14 20 l10 -12 l14 26 Z" fill="#7d5c33" opacity="0.8" />
        <circle cx="704" cy="96" r="7" fill="#c99a4e" opacity="0.55" />
        <rect x="668" y="152" width="50" height="4" rx="2" fill="#6b4c2c" opacity="0.7" />
        <rect x="676" y="160" width="34" height="3" rx="1.5" fill="#6b4c2c" opacity="0.45" />
      </g>

      {/* ══════ CLOCK WALL ZONE: soft halo only ══════ */}
      <ellipse cx="1062" cy="112" rx="128" ry="106" fill="#c99a4e" opacity={isStudying ? 0.1 : 0.055} filter={`url(#${uid}soft)`} />

      {/* ══════ CHAIR + CHARACTER TORSO (behind the desk) ══════ */}
      <g transform="translate(628 322) scale(1.14) translate(-628 -322)">
        {/* chair back */}
        {isBreak ? (
          <g transform="rotate(-8 600 300)">
            <rect x="556" y="196" width="17" height="116" rx="8" fill="#3a2714" />
            <rect x="561" y="204" width="7" height="100" rx="3.5" fill="#4a3119" />
          </g>
        ) : (
          <g>
            <rect x="558" y="200" width="17" height="112" rx="8" fill="#3a2714" />
            <rect x="563" y="208" width="7" height="96" rx="3.5" fill="#4a3119" />
          </g>
        )}

        {/* torso */}
        {isStudying && (
          <g>
            <path d="M568 330 q-8 -62 30 -72 q12 -4 26 -4 q14 0 26 4 q38 10 30 72 Z" fill={`url(#${uid}hoodie)`} />
            <path d="M596 262 q28 12 62 0" stroke="#42557a" strokeWidth="3" fill="none" opacity="0.6" />
            {/* backpack strap */}
            <path d="M584 276 q34 -14 74 -2" stroke="#2e3a52" strokeWidth="7" fill="none" opacity="0.75" />
          </g>
        )}
        {isBreak && (
          <g transform="rotate(-7 600 300)">
            <path d="M566 330 q-10 -58 28 -68 q12 -4 28 -4 q16 0 28 4 q38 10 28 68 Z" fill={`url(#${uid}hoodie)`} />
            <path d="M596 266 q28 12 62 0" stroke="#42557a" strokeWidth="3" fill="none" opacity="0.6" />
          </g>
        )}
        {!isStudying && !isBreak && (
          <g>
            <path d="M570 330 q-6 -54 30 -64 q12 -4 26 -4 q14 0 26 4 q36 10 30 64 Z" fill={`url(#${uid}hoodie)`} />
            <path d="M596 272 q28 12 62 0" stroke="#42557a" strokeWidth="3" fill="none" opacity="0.6" />
          </g>
        )}
      </g>

      {/* ══════ DESK (in front of the torso) ══════ */}
      <g transform="translate(-42 0)">
        <ellipse cx="900" cy="318" rx="130" ry="13" fill="#ffd99b" opacity={0.08 + lampLit * 0.14} />
        <rect x="352" y="306" width="628" height="13" rx="5" fill={`url(#${uid}deskTop)`} />
        <rect x="352" y="306" width="628" height="4" rx="2" fill="#7a5836" opacity="0.75" />
        <rect x="372" y="319" width="10" height="74" rx="3" fill="#33230f" />
        <rect x="950" y="319" width="10" height="74" rx="3" fill="#33230f" />
        {/* front apron, not a black bar */}
        <rect x="382" y="320" width="576" height="16" rx="3" fill="#2a1c10" opacity="0.85" />
        {/* side drawer unit */}
        <rect x="838" y="322" width="104" height="64" rx="4" fill="#31210f" />
        <rect x="852" y="336" width="76" height="16" rx="3" fill="#3d2a15" />
        <rect x="852" y="360" width="76" height="16" rx="3" fill="#3d2a15" />
        <rect x="880" y="342" width="20" height="4" rx="2" fill="#7a5836" />
        <rect x="880" y="366" width="20" height="4" rx="2" fill="#7a5836" />
      </g>

      {/* ══════ DESK ITEMS (on the surface) ══════ */}
      <g transform="translate(-42 0)">
        {/* open notebook */}
        <g>
          <path d="M470 306 L540 297 L540 306 L470 313 Z" fill={`url(#${uid}page)`} />
          <path d="M540 297 L612 306 L612 313 L540 306 Z" fill="#dbcfb5" />
          <path d="M540 298 V305" stroke="#9a8a6a" strokeWidth="1.6" />
          <g stroke="#a89a7a" strokeWidth="1.3" opacity="0.7">
            <line x1="480" y1="302" x2="530" y2="298" />
            <line x1="482" y1="306" x2="530" y2="302" />
            <line x1="552" y1="302" x2="602" y2="306" />
            <line x1="552" y1="306" x2="602" y2="310" />
          </g>
        </g>

        {/* stacked books */}
        <g>
          <rect x="612" y="295" width="56" height="10" rx="2" fill="#8a5a3c" />
          <rect x="618" y="285" width="46" height="10" rx="2" fill="#5c7a8a" />
          <rect x="624" y="276" width="36" height="9" rx="2" fill="#a35f5f" />
        </g>

        {/* pencil cup */}
        <g>
          <rect x="700" y="280" width="24" height="26" rx="4" fill="#432f1c" />
          <line x1="706" y1="280" x2="702" y2="262" stroke="#c99a4e" strokeWidth="3" strokeLinecap="round" />
          <line x1="712" y1="280" x2="714" y2="258" stroke="#8a9bb5" strokeWidth="3" strokeLinecap="round" />
          <line x1="718" y1="280" x2="724" y2="264" stroke="#a35f5f" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* mug + steam */}
        <g>
          <rect x="748" y="284" width="26" height="22" rx="4" fill="#7a5330" />
          <rect x="748" y="284" width="26" height="4" rx="2" fill="#8f6238" />
          <path d="M774 289 q11 2 11 8 q0 6 -11 8" fill="none" stroke="#7a5330" strokeWidth="3.5" />
          <g stroke="#efe4ce" strokeWidth="2" strokeLinecap="round" fill="none" opacity={isStudying ? 0.22 : 0.5}>
            <path d="M754 278 q5 -8 0 -14 q-4 -6 1 -12">
              <animate attributeName="opacity" values="0.15;0.6;0.15" dur="3.4s" repeatCount="indefinite" />
            </path>
            <path d="M765 276 q5 -8 0 -14 q-4 -6 1 -12">
              <animate attributeName="opacity" values="0.5;0.15;0.5" dur="3.4s" repeatCount="indefinite" />
            </path>
          </g>
        </g>

        {/* DESK LAMP */}
        <g>
          <rect x="922" y="300" width="46" height="8" rx="3" fill="#33230f" />
          <path d="M945 300 L930 236" stroke="#5a4025" strokeWidth="5" strokeLinecap="round" />
          <path d="M930 236 L932 202" stroke="#5a4025" strokeWidth="5" strokeLinecap="round" />
          <path d="M932 202 L884 188 L896 220 Z" fill={`url(#${uid}lampShade)`} />
          <ellipse cx="896" cy="216" rx="17" ry="7" fill="#ffe6b0" opacity={0.32 + lampLit * 0.55} />
          {isStudying && <ellipse cx="896" cy="216" rx="30" ry="12" fill="#ffd99b" opacity="0.24" filter={`url(#${uid}soft)`} />}
          <path d="M890 216 L972 306 L818 306 Z" fill={`url(#${uid}lampCone)`} />
        </g>
      </g>

      {/* ══════ ARMS + HEAD (in front of the desk) ══════ */}
      {/* scaled up so the figure reads as the focal point of the wide room */}
      {isStudying && (
        <g>
          {/* left forearm flat on the desk, hand steadying the page */}
          <path d="M576 288 q-20 10 -24 18" stroke="#4d5f86" strokeWidth="14" fill="none" strokeLinecap="round" />
          <ellipse cx="549" cy="304" rx="8" ry="6" fill={`url(#${uid}skin)`} />
          {/* right forearm flat on the desk, pencil angled at the page */}
          <path d="M676 290 q22 8 28 14" stroke="#4d5f86" strokeWidth="14" fill="none" strokeLinecap="round" />
          <ellipse cx="708" cy="303" rx="8" ry="6" fill={`url(#${uid}skin)`} />
          <line x1="714" y1="300" x2="676" y2="309" stroke="#c99a4e" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="676" y1="309" x2="668" y2="310" stroke="#2a1d13" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {isBreak && (
        <g transform="rotate(-7 600 300)">
          <path d="M574 274 q-24 -26 -26 -56" stroke="#4d5f86" strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d="M650 274 q24 -26 26 -56" stroke="#4d5f86" strokeWidth="13" fill="none" strokeLinecap="round" />
          <circle cx="548" cy="216" r="7" fill={`url(#${uid}skin)`} />
          <circle cx="676" cy="216" r="7" fill={`url(#${uid}skin)`} />
        </g>
      )}

      <g transform="translate(628 322) scale(1.14) translate(-628 -322)">
      {/* neck + head */}
      {isStudying && (
        <>
          <rect x="608" y="240" width="19" height="22" rx="8" fill="#b5825c" />
          <g transform="translate(0 0)">
            <Head cx={628} cy={230} tilt={-9} eyes="down" mouth="smile" phones="on" />
          </g>
        </>
      )}
      {isBreak && (
        <>
          <rect x="608" y="236" width="19" height="22" rx="8" fill="#b5825c" />
          <Head cx={628} cy={222} tilt={11} eyes="happy" mouth="grin" phones="neck" />
        </>
      )}
      {!isStudying && !isBreak && (
        <>
          <rect x="604" y="244" width="19" height="24" rx="8" fill="#b5825c" />
          <Head cx={624} cy={248} tilt={34} eyes="sleep" mouth="calm" phones="neck" />
          {/* folded arms on the desk, cheek resting on them */}
          <path d="M580 296 q-22 6 -26 12" stroke="#4d5f86" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M676 296 q22 6 26 12" stroke="#4d5f86" strokeWidth="14" fill="none" strokeLinecap="round" />
          <ellipse cx="556" cy="308" rx="8" ry="6" fill={`url(#${uid}skin)`} />
          <ellipse cx="700" cy="308" rx="8" ry="6" fill={`url(#${uid}skin)`} />
        </>
      )}

      {/* z z z while resting */}
      {!isStudying && !isBreak && (
        <g fill="#d3bd98" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          <text x="666" y="216" fontSize="15" opacity="0.7">
            z
            <animate attributeName="opacity" values="0.2;0.85;0.2" dur="4s" repeatCount="indefinite" />
          </text>
          <text x="682" y="196" fontSize="19" opacity="0.5">
            z
            <animate attributeName="opacity" values="0.55;0.15;0.55" dur="4s" repeatCount="indefinite" />
          </text>
          <text x="700" y="172" fontSize="14" opacity="0.32">
            z
          </text>
        </g>
      )}
      </g>{/* /character scale */}

      {/* ══════ FOREGROUND ══════ */}
      {/* floor plant, far left, to anchor the foreground */}
      <g>
        <path d="M96 340 q-14 -40 4 -62 q-26 10 -22 40 q-22 -30 -8 -54 q-14 30 8 50 q-18 4 -22 26 Z" fill="#35543c" />
        <path d="M116 340 q10 -44 -8 -66 q30 12 24 44 q20 -22 6 -50 q16 32 -6 52 q20 2 26 20 Z" fill="#42674a" />
        <path d="M106 340 q-2 -34 -2 -50" stroke="#2c4632" strokeWidth="2.5" fill="none" />
        <path d="M84 340 h46 l-6 30 h-34 Z" fill="#6b4a2c" />
        <rect x="80" y="334" width="54" height="10" rx="4" fill="#7d5734" />
      </g>

      {/* ══════ AMBIENT MOTES ══════ */}
      <g fill="#ffd99b">
        <circle cx="352" cy="190" r="1.8" opacity={isStudying ? 0.5 : 0.18}>
          <animate attributeName="cy" values="190;170;190" dur="7s" repeatCount="indefinite" />
        </circle>
        <circle cx="836" cy="158" r="1.4" opacity={isStudying ? 0.42 : 0.14}>
          <animate attributeName="cy" values="158;140;158" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="772" cy="112" r="1.2" opacity={isStudying ? 0.3 : 0.1}>
          <animate attributeName="cy" values="112;98;112" dur="8s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* vignette */}
      <rect width="1200" height="400" fill={`url(#${uid}vig)`} pointerEvents="none" />
    </svg>
  );
}
