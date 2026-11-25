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
export default function FocusRoomScene({ status = 'offline', fill = true, tall = false, wallClock = null }) {
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
      viewBox={tall ? '0 -118 1200 636' : '0 0 1200 400'}
      preserveAspectRatio={`xMidYMid ${fill && !tall ? 'slice' : 'slice'}`}
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
      <rect x="0" y="-120" width="1200" height="640" fill={`url(#${uid}wall)`} />
      <rect x="0" y="-120" width="1200" height="640" fill={`url(#${uid}wallGlow)`} />
      {/* 4-2.txt ② — in fullscreen the room grows upward instead of cropping.
          A ceiling band, cornice and crown moulding give the extra height
          something to be: architecture, not wallpaper. */}
      {tall && (
        <g>
          <rect x="0" y="-120" width="1200" height="26" fill="#120c07" />
          <path d="M0 -94 H1200" stroke="#4a3620" strokeWidth="2.5" opacity="0.7" />
          <path d="M0 -88 H1200" stroke="#33251a" strokeWidth="1.4" opacity="0.6" />
          <rect x="0" y="-120" width="1200" height="7" fill="#5a4128" opacity="0.5" />
          {/* two barely-visible beams receding to the light — they read as depth
              without drawing an actual ceiling plane */}
          <path d="M0 -104 L1200 -110" stroke="#000" strokeWidth="22" opacity="0.14" />
        </g>
      )}
      <g stroke="#31241a" strokeWidth="1" opacity="0.45">
        <line x1="0" y1="126" x2="1200" y2="126" />
        <line x1="452" y1="0" x2="452" y2="312" />
        <line x1="906" y1="0" x2="906" y2="312" />
      </g>
      <rect x="0" y="312" width="1200" height={tall ? 210 : 88} fill={`url(#${uid}floor)`} />
      {tall && (
        <g>
          {/* the floor keeps going: three board seams and a soft light falloff
              so the extra 130 units at the bottom are a room, not a blank strip */}
          <g stroke="#2a1c10" strokeWidth="1.6" opacity="0.5">
            <path d="M0 344 H1200" />
            <path d="M0 380 H1200" />
            <path d="M0 424 H1200" />
            <path d="M0 476 H1200" />
          </g>
          <rect x="0" y="486" width="1200" height="36" fill="#070402" opacity="0.55" />
        </g>
      )}
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
        <g>
        {/* ── THE WATERFALL — every tree is gone ────────────────────────────
            6.txt · ⓷ — the window used to hold four layered canopies (two of
            them full "handmade trees" with trunks, forks and leaf clusters).
            All four are gone. What fills the pane now is a cliff face with a
            continuous fall running off its lip: a rock head at the top of the
            pane, one wide sheet of water dropping ~150 units to a churn pool
            on the sill, three stepped ledges that break the sheet into
            segments, rising spray, and a mist band that drifts.

            The fall is drawn as one tall sheet with bright vertical threads
            inside it, so it reads as water from any crop of the picture: the
            top of the window (full screen), the middle (card), and the pool
            (fullscreen's lower rail) all contain a piece of it. */}

        {/* ── the cliff: two rock planes, near-dark and mid-dark ── */}
        <g>
          <path d="M60 264 V96 q16 -18 34 -12 q12 -22 30 -14 q16 -18 34 -6 q18 -10 30 6 q16 0 20 18 q8 14 2 28 v148 Z" fill="#0a121d" />
          <path d="M60 250 q14 -26 40 -20 q14 -30 42 -20 q18 -18 40 0 q20 -4 26 16 q10 12 8 26 v24 H60 Z" fill="#0d1826" />
          {/* a lit edge along the top of the cliff, moon side */}
          <path d="M92 100 q12 -14 30 -9 M138 96 q14 -12 30 -3 M182 104 q14 -6 26 6" stroke="#2c4462" strokeWidth="1.8" fill="none" opacity="0.5" strokeLinecap="round" />
          {/* rock crevices */}
          <g stroke="#060c14" strokeWidth="1.6" fill="none" opacity="0.7">
            <path d="M96 140 l16 22 l-6 18" />
            <path d="M150 132 l-8 26 l10 16" />
            <path d="M206 148 l10 24" />
            <path d="M118 196 l22 8" />
          </g>
        </g>

        {/* ── the lip: the notch the water spills over ── */}
        <path d="M148 150 q30 -14 62 -3 q12 6 6 16 q-30 10 -66 2 q-12 -5 -2 -15 Z" fill="#152539" />
        <path d="M150 152 q30 -12 60 -2" stroke="#3a577a" strokeWidth="1.6" fill="none" opacity="0.6" />
        <ellipse cx="178" cy="156" rx="30" ry="7" fill="#8fc4ea" opacity="0.24" />

        {/* ── the fall itself: one continuous sheet, lip to pool ──────────────
            The first pass broke the water on two wide ledges, which read as a
            tiered garden fountain — exactly the shape a waterfall is not. The
            ledges are gone. What is left is one tall sheet dropping ~90 units
            from the notch to the pool, narrow at the top and fanning slightly
            as it falls, with bright threads inside it and a thin white edge
            down each side. Two dark outcrops sit *behind* the sheet, never in
            front of it, so nothing cuts the water in half. */}
        <g>
          {/* the sheet — narrow at the lip, widening as gravity thins it out */}
          <path d="M152 158 q-3 30 1 56 q2 16 6 26 h40 q5 -12 7 -28 q3 -26 0 -54 Z" fill="#cfe6f7" opacity="0.17" />
          {/* the bright body of the water */}
          <path d="M160 158 q-2 30 1 54 q2 15 5 24 h26 q4 -10 6 -26 q2 -24 0 -52 Z" fill="#e6f3ff" opacity="0.22" />
          {/* white edges — water catches light where its surface turns */}
          <path d="M159 158 q-3 32 2 58 q2 12 4 18" stroke="#f2f9ff" strokeWidth="1.6" fill="none" opacity="0.55" strokeLinecap="round" />
          <path d="M197 158 q3 32 -2 58 q-2 12 -4 18" stroke="#f2f9ff" strokeWidth="1.4" fill="none" opacity="0.45" strokeLinecap="round" />
          {/* four threads, each on its own loop so they never pulse together */}
          <g stroke="#dcecfb" strokeWidth="2.2" fill="none" strokeLinecap="round">
            <path d="M166 160 q-2 34 2 60 q1 12 3 18">
              <animate attributeName="opacity" values="0.45;0.95;0.45" dur="1.9s" repeatCount="indefinite" />
            </path>
            <path d="M176 159 q1 34 -1 60 q-1 12 1 18">
              <animate attributeName="opacity" values="0.9;0.35;0.9" dur="1.35s" repeatCount="indefinite" />
            </path>
            <path d="M185 160 q-1 32 2 58 q2 12 2 18">
              <animate attributeName="opacity" values="0.35;0.85;0.35" dur="2.7s" repeatCount="indefinite" />
            </path>
            <path d="M192 162 q-2 30 1 54 q2 12 1 16">
              <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.6s" repeatCount="indefinite" />
            </path>
          </g>
          {/* two outcrops behind the sheet — dark, never over the water */}
          <path d="M138 200 q-4 -12 8 -14 q14 -2 16 10 q1 8 -6 10 q-14 3 -18 -6 Z" fill="#0b1420" opacity="0.85" />
          <path d="M210 214 q-2 -10 8 -12 q12 -1 14 9 q0 7 -6 9 q-12 2 -16 -6 Z" fill="#0b1420" opacity="0.8" />
          {/* rock shelf the pool sits on */}
          <path d="M100 236 q56 -8 112 -1 q12 4 4 10 q-60 7 -114 0 q-10 -4 -2 -9 Z" fill="#142436" />
        </g>

        {/* ── the churn pool on the sill, with a roil ring ── */}
        <ellipse cx="158" cy="250" rx="76" ry="7.4" fill="#080f18" />
        <ellipse cx="158" cy="248.6" rx="70" ry="6" fill="#1d3348" />
        <ellipse cx="158" cy="248" rx="54" ry="4.4" fill="#27455f" opacity="0.9">
          <animate attributeName="rx" values="48;56;48" dur="5.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.85;0.5" dur="5.5s" repeatCount="indefinite" />
        </ellipse>
        <g fill="#e6f3ff">
          <circle cx="120" cy="246" r="1.7" opacity="0.6">
            <animate attributeName="opacity" values="0.12;0.7;0.12" dur="1.0s" repeatCount="indefinite" />
          </circle>
          <circle cx="148" cy="244" r="2.1" opacity="0.55">
            <animate attributeName="opacity" values="0.62;0.18;0.62" dur="1.3s" repeatCount="indefinite" />
          </circle>
          <circle cx="176" cy="245" r="1.5" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.75;0.3" dur="0.9s" repeatCount="indefinite" />
          </circle>
          <circle cx="198" cy="248" r="1.2" opacity="0.45">
            <animate attributeName="opacity" values="0.55;0.15;0.55" dur="1.45s" repeatCount="indefinite" />
          </circle>
          <circle cx="136" cy="250" r="1.4" opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.7;0.2" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </g>

        <ellipse cx="158" cy="246" rx="30" ry="3" fill="#e6f3ff" opacity="0.35">
          <animate attributeName="opacity" values="0.18;0.5;0.18" dur="2.1s" repeatCount="indefinite" />
        </ellipse>

        {/* spray that lifts off the pool and drifts */}
        <g fill="#cfe6f7" opacity="0.26">
          <circle cx="104" cy="250" r="6">
            <animate attributeName="cy" values="254;238;254" dur="6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.3;0" dur="6s" repeatCount="indefinite" />
          </circle>
          <circle cx="212" cy="248" r="5">
            <animate attributeName="cy" values="252;234;252" dur="7.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.26;0.05;0.26" dur="7.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="158" cy="244" r="4">
            <animate attributeName="cy" values="248;230;248" dur="8.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.1;0.28;0.1" dur="8.6s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* mist band low across the pane, so the rocks sit *behind* the fall */}
        <path d="M68 244 q60 -10 120 -3 q60 7 130 0 v20 H68 Z" fill="#1b2740" opacity="0.3">
          <animate attributeName="opacity" values="0.2;0.34;0.2" dur="9s" repeatCount="indefinite" />
        </path>

        {/* two distant lit windows — someone else is up at this hour */}
        <circle cx="84" cy="214" r="1.5" fill="#ffd99b" opacity="0.5" />
        <circle cx="296" cy="228" r="1.3" fill="#ffd99b" opacity="0.4" />
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

      {/* 6.txt · ⓷ — the last plant that sat directly in front of the glass is
          gone too. A waterfall needs an unobstructed pane; a pot of leaves in
          front of it was the one thing still reading as "tree". */}

      {/* ══════ WALL CLOCK MOUNT ══════
          6.txt · ⓻ — zen mode used to float the analog clock in the page corner,
          which read as UI on top of a picture. Here the same dial is *hung* on
          the bare wall at the top right: a shadow plate behind it, a small
          bracket above it, and the dial passed in as a node so the Focus page
          can keep using the real AnalogFocusDial component rather than a
          redrawn copy. In the Focus card this slot stays empty. */}
      {wallClock && (
        <g transform="translate(936 30)">
          {/* bracket + hook */}
          <rect x="86" y="-10" width="34" height="7" rx="2.5" fill="#2a1c10" />
          <rect x="98" y="-4" width="8" height="6" rx="2" fill="#3d2c1a" />
          {/* a soft contact shadow so it sits against the wall */}
          <ellipse cx="104" cy="158" rx="88" ry="11" fill="#000" opacity="0.2" filter={`url(#${uid}soft)`} />
          <foreignObject x="-2" y="0" width="196" height="196">
            <div
              // eslint-disable-next-line react/no-unknown-property
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                width: '196px',
                height: '196px',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {wallClock}
            </div>
          </foreignObject>
        </g>
      )}

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
      {/* ══════ WALL GALLERY: TWO LANDSCAPES, A SCHOLAR BETWEEN THEM ══════
          The brief: a মনীষীর প্রতিকৃতি — a wise scholar's portrait — belongs
          between the two frames. The pair becomes a triptych: two small night
          landscapes flanking one larger portrait, hung as a set on the same
          eye-line. The scholar is a clean three-quarter bust — cap, grey beard,
          collar, an open book — read at 80px wide, which is all the wall gives. */}

      {/* landscape frame — left, a valley and a lake */}
      <g transform="rotate(-1.6 636 100)">
        <rect x="596" y="56" width="80" height="92" rx="3" fill="#1a130b" stroke="#5a4023" strokeWidth="3" />
        <rect x="602" y="62" width="68" height="80" rx="1.6" fill="#1f1811" stroke="#3a2812" strokeWidth="1.2" />
        <rect x="606" y="66" width="60" height="72" fill="#1c2740" />
        {/* sky wash */}
        <rect x="606" y="66" width="60" height="26" fill="#26344c" opacity="0.8" />
        <circle cx="651" cy="79" r="5.5" fill="#e9d3a3" opacity="0.8" />
        <circle cx="651" cy="79" r="9" fill="#e9d3a3" opacity="0.1" />
        {/* far ridge, near ridge, water */}
        <path d="M606 106 q10 -12 20 -13 q9 -1 16 7 q6 6 12 3 q7 -3 12 3 v18 H606 Z" fill="#2c3f58" />
        <path d="M606 116 q12 -8 22 -6 q10 2 18 8 q8 5 20 2 v18 H606 Z" fill="#1d2c3f" />
        <path d="M606 126 h60 v12 h-60 Z" fill="#16202f" />
        <g stroke="#6f8aa8" strokeWidth="1" opacity="0.32" strokeLinecap="round">
          <line x1="612" y1="130" x2="628" y2="130" />
          <line x1="634" y1="134" x2="654" y2="134" />
          <line x1="616" y1="138" x2="640" y2="138" />
        </g>
        {/* moon glint on the water */}
        <ellipse cx="648" cy="130" rx="7" ry="2" fill="#e9d3a3" opacity="0.18" />
      </g>

      {/* portrait frame — centre, larger, on the lamp side */}
      <g transform="rotate(-0.6 706 92)">
        <rect x="672" y="42" width="86" height="112" rx="4" fill="#1d150d" stroke="#78552e" strokeWidth="3.6" />
        <rect x="679" y="49" width="72" height="98" rx="2.2" fill="#241b12" stroke="#44301a" strokeWidth="1.4" />
        <rect x="683" y="53" width="64" height="90" rx="1.4" fill="#2b2118" />
        {/* a faint warm vignette behind the sitter */}
        <ellipse cx="718" cy="92" rx="26" ry="30" fill="#3a2c1d" opacity="0.55" />

        {/* robe + shoulders */}
        <path d="M692 143 q3 -16 14 -20 q7 -2 12 -2 q8 0 15 3 q10 5 12 19 Z" fill="#3d2f20" />
        {/* collar V */}
        <path d="M706 122 l11 13 l11 -13" fill="none" stroke="#5a452c" strokeWidth="2.4" strokeLinejoin="round" />
        {/* head */}
        <ellipse cx="717" cy="98" rx="13" ry="15" fill="#6a5136" />
        {/* grey beard, a wedge under the cheeks */}
        <path d="M704 98 q0 17 13 25 q13 -8 13 -25 q-6 9 -13 9 q-7 0 -13 -9 Z" fill="#a2a79b" opacity="0.93" />
        {/* moustache */}
        <path d="M710 103 q7 3 14 0" stroke="#828a7e" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* cap: dome with a rim band */}
        <path d="M702 92 q-1 -14 15 -15 q16 1 15 15 q-7 -5 -15 -5 q-8 0 -15 5 Z" fill="#241a11" />
        <path d="M703 87 q14 -5 28 0" stroke="#5f4a2e" strokeWidth="1.6" fill="none" opacity="0.7" />
        {/* eyes, ear, and the lamp's rim light down the right cheek */}
        <path d="M710 97 q3 2 6 0 M723 97 q3 2 6 0" stroke="#2a1f14" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.85" />
        <ellipse cx="731" cy="99" rx="2.6" ry="4" fill="#7d6142" />
        <path d="M731 94 q5 6 2 14" stroke="#c9a46a" strokeWidth="1.7" fill="none" opacity="0.6" strokeLinecap="round" />
        {/* the open book in his hands */}
        <path d="M689 141 l20 -4 v7 l-20 4 Z" fill="#e0d1ae" />
        <path d="M709 137 l20 2 v7 l-20 -2 Z" fill="#cabd9a" />
        <path d="M709 137 v9" stroke="#8f836a" strokeWidth="1.2" />
        {/* name plate */}
        <rect x="691" y="147" width="48" height="4" rx="2" fill="#78552e" opacity="0.6" />
      </g>

      {/* landscape frame — right, a lake and a treeline */}
      <g transform="rotate(1.4 784 104)">
        <rect x="750" y="62" width="70" height="82" rx="3" fill="#191209" stroke="#4e3820" strokeWidth="2.8" />
        <rect x="755" y="67" width="60" height="72" rx="1.4" fill="#1d1610" stroke="#33240f" strokeWidth="1.1" />
        <rect x="758" y="70" width="54" height="66" fill="#1b2740" />
        <circle cx="797" cy="82" r="4.6" fill="#e9d3a3" opacity="0.7" />
        <circle cx="797" cy="82" r="8" fill="#e9d3a3" opacity="0.09" />
        {/* ridge + pines + water */}
        <path d="M758 108 q9 -10 18 -11 q8 -1 14 6 q6 6 11 2 q7 -4 11 3 v16 H758 Z" fill="#2a3d55" />
        <g fill="#152330">
          <path d="M766 116 l4 -12 l4 12 Z" />
          <path d="M775 118 l3.5 -10 l3.5 10 Z" />
          <path d="M800 120 l3 -9 l3 9 Z" />
        </g>
        <path d="M758 124 h54 v12 h-54 Z" fill="#141d2a" />
        <g stroke="#6f8aa8" strokeWidth="1" opacity="0.28" strokeLinecap="round">
          <line x1="764" y1="128" x2="782" y2="128" />
          <line x1="788" y1="132" x2="806" y2="132" />
        </g>
        <ellipse cx="795" cy="128" rx="6" ry="1.8" fill="#e9d3a3" opacity="0.16" />
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
        {/* open notebook, left of the laptop */}
        <g>
          <path d="M452 306 L506 298 L506 307 L452 313 Z" fill={`url(#${uid}page)`} />
          <path d="M506 298 L560 306 L560 313 L506 307 Z" fill="#dbcfb5" />
          <path d="M506 299 V306" stroke="#9a8a6a" strokeWidth="1.6" />
          <g stroke="#a89a7a" strokeWidth="1.2" opacity="0.7">
            <line x1="459" y1="303" x2="500" y2="299.4" />
            <line x1="461" y1="307" x2="500" y2="303.4" />
            <line x1="512" y1="302" x2="553" y2="305.6" />
            <line x1="512" y1="306" x2="553" y2="309.6" />
          </g>
        </g>

        {/* stacked books, far left */}
        <g>
          <rect x="384" y="296" width="58" height="10" rx="2" fill="#8a5a3c" />
          <rect x="390" y="286" width="48" height="10" rx="2" fill="#5c7a8a" />
          <rect x="396" y="277" width="38" height="9" rx="2" fill="#a35f5f" />
        </g>

        {/* ══════ THE LAPTOP — three-quarter view, ~75° off the camera ══════
            4-2.txt ② — the machine used to face the viewer dead-on, so the
            scene read as a screenshot of a laptop rather than a person at a
            desk. It is now drawn in perspective, its far edge receding up and
            right while the near corner comes toward the figure. Both the body
            and the lid follow that axis, so the person's face is unobstructed
            and you read the pose first, the hardware second.

            While resting, the lid closes: the lid rotates down onto the base
            and the screen glow disappears with it. */}

        {/* REST floor of the open lid, exposed when the lid is shut */}
        {!isStudying && (
          <g transform="translate(-54 6)">
            <path d="M596 300 L738 297 L748 309 L590 311 Z" fill="#1b2433" stroke="#2c3a50" strokeWidth="1.4" />
            <path d="M596 300 L738 297 L740 300 L595 303 Z" fill="#33455c" />
            <rect x="640" y="302" width="46" height="2.6" rx="1.3" fill="#26333f" opacity="0.8" />
          </g>
        )}

        {isStudying && (
        <g transform="translate(-54 6)">
          {/* lid — a parallelogram, back edge higher and to the right */}
          <g>
            <path d="M596 296 L600 252 L722 244 L734 292 Z" fill="#1b2433" stroke="#32425a" strokeWidth="2" />
            {/* the panel sits inside the frame, same skew */}
            <path d="M601 292 L605 256 L717 248.5 L728 289 Z" fill="#22364d" />
            {/* code lines, drawn along the skew so they look projected */}
            <g fill="#7ea6ca">
              <path d="M610 276 L678 272 L678 274 L610 278 Z" opacity="0.5" />
              <path d="M610 282 L662 278.6 L662 280.6 L610 284 Z" opacity="0.36" />
              <path d="M612 289 L692 284.4 L692 286.4 L612 291 Z" opacity="0.3" />
              <path d="M612 268 L648 266 L648 268 L612 270 Z" opacity="0.42" />
            </g>
            {/* the live caret line */}
            <path d="M614 272 L640 270.4 L640 272.6 L614 274.2 Z" fill="#b6e0ff" opacity="0.7">
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.7s" repeatCount="indefinite" />
            </path>
            {/* a faint glare diagonal across the glass */}
            <path d="M640 250 L700 246 L676 288 L618 291 Z" fill="#ffffff" opacity="0.035" />
            {/* camera dot on the bezel's top edge */}
            <circle cx="661" cy="246.6" r="0.95" fill="#44586f" />
            <circle cx="716" cy="246" r="0.95" fill="#7dd3a0" />
          </g>

          {/* hinge along the same axis */}
          <path d="M596 296 L722 291 L724 295 L598 299.6 Z" fill="#32425a" />

          {/* base: keyboard deck in the same perspective */}
          <path d="M584 306 L598 298.6 L726 293.6 L744 308 Z" fill="#233043" />
          <path d="M598 298.6 L726 293.6 L727 296.6 L597 301.6 Z" fill="#3a4d66" />
          {/* key rows, raked to match the deck */}
          <g fill="#2e4056" opacity="0.9">
            <path d="M606 303 L716 298.8 L716 300.6 L606 304.8 Z" />
            <path d="M612 306.4 L710 302.8 L710 304.6 L612 308.2 Z" />
          </g>
          {/* trackpad, front-left, where the hand would actually be */}
          <path d="M646 306.4 L684 304.8 L688 308 L648 309.6 Z" fill="#1a2433" opacity="0.9" />

          {/* the cool pool of screen light on the desk, skewed with the base */}
          <ellipse cx="664" cy="311" rx="66" ry="8" fill="#6fa8d8" opacity="0.15" filter={`url(#${uid}soft)`} />
        </g>
        )}

        <g>
          <rect x="820" y="298" width="40" height="8" rx="2" fill="#4a5a6e" />
          <rect x="824" y="290" width="32" height="8" rx="2" fill="#8a5a3c" />
          <rect x="828" y="283" width="24" height="7" rx="2" fill="#c9a86a" />
          <path d="M820 298 h40" stroke="#6b7c92" strokeWidth="1" opacity="0.6" />
        </g>

        {/* mug + steam */}
        <g>
          <rect x="786" y="284" width="26" height="22" rx="4" fill="#7a5330" />
          <rect x="786" y="284" width="26" height="4" rx="2" fill="#8f6238" />
          <path d="M812 289 q11 2 11 8 q0 6 -11 8" fill="none" stroke="#7a5330" strokeWidth="3.5" />
          <g stroke="#efe4ce" strokeWidth="2" strokeLinecap="round" fill="none" opacity={isStudying ? 0.22 : 0.5}>
            <path d="M792 278 q5 -8 0 -14 q-4 -6 1 -12">
              <animate attributeName="opacity" values="0.15;0.6;0.15" dur="3.4s" repeatCount="indefinite" />
            </path>
            <path d="M803 276 q5 -8 0 -14 q-4 -6 1 -12">
              <animate attributeName="opacity" values="0.5;0.15;0.5" dur="3.4s" repeatCount="indefinite" />
            </path>
          </g>
        </g>

        {/* ══════ DESK LAMP — pulled in close to the desk ══════
            Rebuilt from scratch: weighted base with a knurled rim, a two-segment
            arm with real joint knuckles, a tapered tilted shade with a rim ring
            and a vent slot, plus a proper bulb. The arm leans over the keyboard
            instead of standing off beside it. */}
        {/* 6.txt · ⓸ — the lamp rebuilt as a real object rather than a
            silhouette. What it gains:
              · a two-tier weighted base with a knurled collar and a felt pad
                so it looks like it sits ON the desk, not glued to it;
              · a bevelled stem with a highlight edge and a counter-joint at
                the lower knuckle (the arm is two segments, so it needs two);
              · a shade with an outer rim, an inner rim, four rivet heads, a
                rolled bottom lip, a vent slot and a riveted seam;
              · the bulb recess — a hot core, a warmer halo, and a soft
                gradient cone that *breathes* with the session state;
              · a dedicated light cast on the desk surface with its own
                falloff, so the cone has somewhere to land. */}
        <g>
          {/* felt pad + weighted base, two tiers */}
          <ellipse cx="866" cy="308" rx="29" ry="6.5" fill="#160e05" opacity="0.85" />
          <ellipse cx="866" cy="306.5" rx="27" ry="6.2" fill="#2a1c0c" />
          <path d="M840 306.5 q0 -9 26 -9 q26 0 26 9 Z" fill="#3a2812" />
          <path d="M844 306 q0 -6.5 22 -6.5 q22 0 22 6.5 Z" fill="#46301a" />
          <rect x="842" y="297.5" width="48" height="3.6" rx="1.8" fill="#4a3418" />
          {/* knurled collar: six teeth read as metal even at 40% zoom */}
          <g fill="#6b4c26">
            <rect x="856" y="294.4" width="2" height="3" rx="0.6" />
            <rect x="860" y="294.2" width="2" height="3" rx="0.6" />
            <rect x="864" y="294.1" width="2" height="3" rx="0.6" />
            <rect x="868" y="294.1" width="2" height="3" rx="0.6" />
            <rect x="872" y="294.2" width="2" height="3" rx="0.6" />
            <rect x="876" y="294.4" width="2" height="3" rx="0.6" />
          </g>
          <circle cx="866" cy="294" r="4.6" fill="#5a4025" />
          <circle cx="866" cy="294" r="1.9" fill="#7a5a30" />
          <circle cx="865.2" cy="293.2" r="0.7" fill="#c99a4e" opacity="0.75" />

          {/* lower arm — bevelled, with a lit edge down its left side */}
          <path d="M866 292 L848 250" stroke="#5a4025" strokeWidth="5.6" strokeLinecap="round" />
          <path d="M865 291 L847 250" stroke="#8a6536" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
          <path d="M868 291 L850 250" stroke="#2e1e0d" strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />

          {/* lower knuckle: a barrel joint, not a dot */}
          <g>
            <rect x="843" y="246" width="10" height="8" rx="3" fill="#5a4025" transform="rotate(-16 848 250)" />
            <rect x="844.5" y="247.5" width="7" height="2" rx="1" fill="#8a6536" opacity="0.7" transform="rotate(-16 848 250)" />
            <circle cx="848" cy="250" r="2" fill="#2e1e0d" />
          </g>

          {/* upper arm — shorter, steeper; the lever the shade hangs from */}
          <path d="M848 250 L838 214" stroke="#5a4025" strokeWidth="4.6" strokeLinecap="round" />
          <path d="M847.5 248 L837.5 214" stroke="#8a6536" strokeWidth="1.2" opacity="0.55" strokeLinecap="round" />

          {/* upper knuckle + shade yoke */}
          <circle cx="838" cy="212" r="4.4" fill="#5a4025" />
          <circle cx="838" cy="212" r="1.7" fill="#7a5a30" />
          <path d="M838 208 l-4 -6 M838 208 l4 -6" stroke="#4a3418" strokeWidth="2.2" strokeLinecap="round" />

          {/* the shade: outer shell, inner rim, rolled lip */}
          <path d="M842 210 L798 196 L812 232 Z" fill={`url(#${uid}lampShade)`} />
          <path d="M798 196 L812 232" stroke="#3d2a14" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M800 198 L813 231" stroke="#c99a4e" strokeWidth="0.9" opacity="0.5" strokeLinecap="round" />
          {/* rolled bottom lip: a doubled edge catches the bulb */}
          <path d="M812 232 q-1.4 3.2 1.6 4.4" stroke="#8d6a2c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M813 231 q3 4 12 2" stroke="#e8c583" strokeWidth="1.4" fill="none" opacity="0.5" strokeLinecap="round" />
          {/* four rivets along the seam */}
          <g fill="#3d2a14" opacity="0.85">
            <circle cx="831" cy="204.6" r="1.05" />
            <circle cx="820" cy="200.8" r="1.05" />
            <circle cx="809" cy="197.4" r="1.05" />
            <circle cx="801" cy="195.4" r="1.05" />
          </g>
          {/* vent slot */}
          <rect x="827" y="202.4" width="12" height="2.1" rx="1" fill="#2e1e0d" opacity="0.85" />
          <rect x="827" y="202.4" width="12" height="0.7" rx="0.35" fill="#c99a4e" opacity="0.35" />
          {/* glare along the crown of the shade */}
          <path d="M806 197.6 q18 -3.2 34 3.4" stroke="#ffe6b0" strokeWidth="1.5" fill="none" opacity="0.35" />

          {/* the bulb recess — hot core, warm halo, both breathing */}
          <ellipse cx="808" cy="228" rx="15" ry="6.5" fill="#ffe6b0" opacity={0.34 + lampLit * 0.55}>
            <animate attributeName="opacity" values={`${0.3 + lampLit * 0.35};${0.36 + lampLit * 0.6};${0.3 + lampLit * 0.35}`} dur="6.4s" repeatCount="indefinite" />
          </ellipse>
          {isStudying && (
            <ellipse cx="808" cy="230" rx="34" ry="14" fill="#ffd99b" opacity="0.26" filter={`url(#${uid}soft)`} />
          )}
          <ellipse cx="808" cy="228" rx="5.2" ry="4.2" fill="#fff5da" opacity={0.5 + lampLit * 0.45}>
            <animate attributeName="opacity" values={`${0.42 + lampLit * 0.35};${0.6 + lampLit * 0.4};${0.42 + lampLit * 0.35}`} dur="4.2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="807" cy="226.8" rx="1.8" ry="1.4" fill="#fffdf2" opacity={0.55 + lampLit * 0.4} />

          {/* the cone, and the pool it lands in */}
          <path d="M804 230 L902 306 L706 306 Z" fill={`url(#${uid}lampCone)`} />
          <ellipse cx="808" cy="304" rx="86" ry="9" fill="#ffd99b" opacity={0.1 + lampLit * 0.12} filter={`url(#${uid}soft)`} />
        </g>
      </g>

      {/* ══════ ARMS + HEAD (in front of the desk) ══════ */}
      {/* scaled up so the figure reads as the focal point of the wide room */}
      {isStudying && (
        <g>
          {/* ── READING AT THE KEYBOARD ──────────────────────────────────────
              The figure used to lean over an open notebook with a pencil. Now
              it reads off the laptop: both forearms come forward onto the
              keyboard, each hand resolved into a palm, a thumb and four finger
              ticks, and the right hand carries a slow two-beat typing motion.
              The motion is small on purpose — a study session, not a game. */}

          {/* left hand: flat on the near-left corner of the deck, which is the
              closest part of the keyboard to camera in this perspective */}
          <path d="M566 280 q-14 14 -11 23 q2 8 16 9" stroke="#4d5f86" strokeWidth="14.5" fill="none" strokeLinecap="round" />
          <g transform="translate(548 306) rotate(12)">
            <path d="M-10.5 -3 q0 -5 4.6 -5.6 q6.6 -0.9 11.8 0.4 q4.6 1.1 4.6 4.8 q0 3.4 -1.8 4.9 q-1.5 1.3 -2.6 0.2 q-1.2 1.6 -2.9 0.7 q-1.3 1.5 -3.1 0.5 q-1.4 1.4 -3.2 0.3 q-3.9 0.9 -7.4 -1.4 Z" fill={`url(#${uid}skin)`}>
              <animateTransform attributeName="transform" type="translate" values="0 0;0 -0.7;0 0" dur="0.9s" repeatCount="indefinite" />
            </path>
            <ellipse cx="10.4" cy="1.6" rx="4.2" ry="2.3" fill="#d8a071" transform="rotate(-26 10.4 1.6)" />
            <ellipse cx="0" cy="6.6" rx="10" ry="1.5" fill="#0d1017" opacity="0.3" />
          </g>

          {/* right hand: further up the raked deck, so it sits higher and
              smaller than the left one — that height difference is what sells
              the 75° angle more than any line in the hardware does */}
          <path d="M646 282 q18 2 26 6" stroke="#4d5f86" strokeWidth="14" fill="none" strokeLinecap="round" />
          <g transform="translate(664 302) rotate(-9) scale(0.9)">
            <path d="M-10.5 -3 q0 -5 4.6 -5.6 q6.6 -0.9 11.8 0.4 q4.6 1.1 4.6 4.8 q0 3.4 -1.8 4.9 q-1.5 1.3 -2.6 0.2 q-1.2 1.6 -2.9 0.7 q-1.3 1.5 -3.1 0.5 q-1.4 1.4 -3.2 0.3 q-3.9 0.9 -7.4 -1.4 Z" fill={`url(#${uid}skin)`}>
              <animateTransform attributeName="transform" type="translate" values="0 0;0 -0.9;0 0" dur="0.64s" begin="0.18s" repeatCount="indefinite" />
            </path>
            <ellipse cx="-10.4" cy="1.6" rx="4.2" ry="2.3" fill="#d8a071" transform="rotate(26 -10.4 1.6)" />
            <ellipse cx="0" cy="6.6" rx="10" ry="1.5" fill="#0d1017" opacity="0.3" />
          </g>

          {/* the pencil now lies on the notebook, unused, as a prop */}
          <line x1="470" y1="305" x2="510" y2="302" stroke="#c99a4e" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
          <line x1="510" y1="302" x2="517" y2="301.4" stroke="#2a1d13" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
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
          {/* a barely-there breath: head settles 1px and returns every 5s */}
          <g transform="translate(0 0)">
            <animateTransform attributeName="transform" type="translate" values="0 0; 0 1.2; 0 0" dur="5.2s" repeatCount="indefinite" />
            <Head cx={628} cy={230} tilt={-7} eyes="down" mouth="smile" phones="on" />
            {/* cool light from the screen across the cheek */}
            <ellipse cx="641" cy="238" rx="7" ry="4" fill="#8fc4ea" opacity="0.12" />
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
      {/* ══════ FOREGROUND ARTIFACTS — a shelf of objects, not a fake tree ════
          4-2.txt ② — this corner held one thin sprig in a tapered pot: a
          houseplant shape that read as clip-art at every zoom level. The brief
          asked for "many kinds of artefact" instead, so the corner is now a
          three-piece still life: a wide ceramic planter with a fan of broad
          leaves, a stack of books doubled as a plant stand with a small brass
          reading lamp, and a tall floor vase with dried stems. Three objects,
          three heights, three materials (ceramic, paper, brass) — it anchors
          the foreground without being a shape you have seen in every lofi loop. */}
      <g>
        {/* ① wide ceramic planter, low and heavy */}
        <path d="M74 336 q-4 -30 10 -40 q-22 2 -20 24" fill="none" stroke="#3c5c42" strokeWidth="4" strokeLinecap="round" />
        <path d="M92 332 q-6 -34 4 -48 q-24 4 -18 30" fill="none" stroke="#4a6f4e" strokeWidth="4" strokeLinecap="round" />
        <path d="M104 330 q2 -36 14 -46 q16 12 10 34" fill="none" stroke="#3a5a40" strokeWidth="4" strokeLinecap="round" />
        <path d="M118 332 q8 -30 22 -36 q10 14 0 34" fill="none" stroke="#466a4a" strokeWidth="4" strokeLinecap="round" />
        {/* leaf blades, filled, so the silhouette has weight */}
        <path d="M100 328 q-16 -30 -8 -48 q10 12 14 34 Z" fill="#3e6146" />
        <path d="M108 326 q-2 -34 8 -46 q10 14 6 36 Z" fill="#4d7852" />
        <path d="M118 328 q10 -26 22 -30 q4 16 -8 30 Z" fill="#365539" />
        <path d="M96 330 q-18 -18 -22 -34 q14 2 24 20 Z" fill="#456b49" />
        {/* the planter: ceramic, two-tone, with a rim band */}
        <path d="M76 330 h56 l-7 34 h-42 Z" fill="#7a5330" />
        <path d="M76 330 h56 l-2 9 h-52 Z" fill="#8a5f38" />
        <rect x="72" y="324" width="64" height="10" rx="4" fill="#93663c" />
        <rect x="78" y="326" width="52" height="2.4" rx="1.2" fill="#b0834f" opacity="0.6" />
      </g>

      <g>
        {/* ② book stack used as a stand for a small brass lamp */}
        <rect x="146" y="336" width="72" height="10" rx="2" fill="#5a4a6e" />
        <rect x="152" y="326" width="62" height="10" rx="2" fill="#8a5a3c" />
        <rect x="158" y="317" width="52" height="9" rx="2" fill="#3f5c6b" />
        <rect x="146" y="336" width="72" height="2.4" rx="1.2" fill="#7a688f" opacity="0.7" />
        {/* brass base + slim stem + tiny shade — a reading lamp, four times
            smaller than the desk lamp so it reads as foreground furniture */}
        <ellipse cx="186" cy="316" rx="13" ry="3.4" fill="#4a3418" />
        <path d="M186 315 L186 288" stroke="#8a6a34" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M186 290 l-13 -6 l5 14 Z" fill={`url(#${uid}lampShade)`} />
        <ellipse cx="178" cy="296" rx="7" ry="3" fill="#ffe6b0" opacity={0.22 + lampLit * 0.3} />
        <path d="M174 298 L164 316 L206 316 Z" fill={`url(#${uid}lampCone)`} opacity="0.55" />
      </g>

      <g>
        {/* ③ tall floor vase with dried stems — the vertical the corner needed */}
        <path d="M236 348 q-2 -22 6 -28 h16 q8 6 6 28 Z" fill="#6b4a2c" />
        <path d="M239 320 q0 -5 7 -5 h10 q7 0 7 5 q-4 6 -12 6 q-8 0 -12 -6 Z" fill="#7d5734" />
        <g stroke="#c9b48a" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.75">
          <path d="M244 318 q-6 -20 -14 -30" />
          <path d="M248 318 q-1 -24 2 -38" />
          <path d="M252 318 q7 -18 15 -26" />
          <path d="M256 318 q10 -12 20 -16" />
        </g>
        <g fill="#d8c79c" opacity="0.7">
          <ellipse cx="229" cy="287" rx="2.6" ry="4.4" transform="rotate(-28 229 287)" />
          <ellipse cx="250" cy="279" rx="2.4" ry="4.2" />
          <ellipse cx="268" cy="291" rx="2.6" ry="4.2" transform="rotate(22 268 291)" />
          <ellipse cx="277" cy="301" rx="2.2" ry="3.6" transform="rotate(34 277 301)" />
        </g>
      </g>

      {/* ══════ AMBIENT MOTES ══════
          6.txt · ⓹ — "make the whole illustration animated, so that a lot of
          things are moving". Everything below moves without any of it
          competing with the clock: motes drift on long slow loops, the curtain
          breathes, two leaf tips on the planter sway, the desk-lamp's cone
          gains a slow flicker, and a pair of dust motes catch the lamp light.
          Amplitudes are 1–3 units and durations 6–14s — the eye registers it
          as a living room, not as an animation. */}
      <g>
        {/* lamp-lit dust: rises through the cone, fades at the top */}
        <g fill="#ffe6b0">
          <circle cx="792" cy="290" r="1.5" opacity={isStudying ? 0.55 : 0.16}>
            <animate attributeName="cy" values="292;268;244;292" dur="13s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.5;0.1;0" dur="13s" repeatCount="indefinite" />
            <animate attributeName="cx" values="792;786;798;792" dur="13s" repeatCount="indefinite" />
          </circle>
          <circle cx="822" cy="286" r="1.1" opacity={isStudying ? 0.42 : 0.12}>
            <animate attributeName="cy" values="288;266;248;288" dur="17s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.4;0.06;0" dur="17s" repeatCount="indefinite" />
            <animate attributeName="cx" values="822;828;816;822" dur="17s" repeatCount="indefinite" />
          </circle>
          <circle cx="770" cy="294" r="0.9" opacity={isStudying ? 0.34 : 0.1}>
            <animate attributeName="cy" values="296;276;256;296" dur="21s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.3;0.05;0" dur="21s" repeatCount="indefinite" />
          </circle>
        </g>

        <g fill="#ffd99b">
          <circle cx="352" cy="190" r="1.8" opacity={isStudying ? 0.5 : 0.18}>
            <animate attributeName="cy" values="190;170;190" dur="7s" repeatCount="indefinite" />
            <animate attributeName="cx" values="352;356;350;352" dur="11s" repeatCount="indefinite" />
          </circle>
          <circle cx="836" cy="158" r="1.4" opacity={isStudying ? 0.42 : 0.14}>
            <animate attributeName="cy" values="158;140;158" dur="6s" repeatCount="indefinite" />
            <animate attributeName="cx" values="836;830;838;836" dur="9s" repeatCount="indefinite" />
          </circle>
          <circle cx="772" cy="112" r="1.2" opacity={isStudying ? 0.3 : 0.1}>
            <animate attributeName="cy" values="112;98;112" dur="8s" repeatCount="indefinite" />
          </circle>
          {/* two fresh motes near the shelf, so the motion is not all on one side */}
          <circle cx="506" cy="176" r="1.1" opacity={isStudying ? 0.34 : 0.12}>
            <animate attributeName="cy" values="176;160;176" dur="9.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="912" cy="196" r="1.2" opacity={isStudying ? 0.3 : 0.1}>
            <animate attributeName="cy" values="196;178;196" dur="8.4s" repeatCount="indefinite" />
            <animate attributeName="cx" values="912;906;914;912" dur="12s" repeatCount="indefinite" />
          </circle>
        </g>
      </g>

      {/* the curtains breathe — a 2-unit horizontal drift, phase-offset so the
          left and right panels never move together */}
      <g pointerEvents="none">
        <path d="M50 40 q24 58 11 118 q-8 60 15 112 l-32 6 V40 Z" fill="#2c1f13" opacity="0.22">
          <animateTransform attributeName="transform" type="translate" values="0 0; 2.5 0; 0 0" dur="11s" repeatCount="indefinite" />
        </path>
        <path d="M338 40 q-24 58 -11 118 q8 60 -15 112 l32 6 V40 Z" fill="#2c1f13" opacity="0.22">
          <animateTransform attributeName="transform" type="translate" values="0 0; -2 0; 0 0" dur="13s" repeatCount="indefinite" />
        </path>
      </g>

      {/* the planter's two tallest leaves sway — a rotation around the pot rim */}
      <g pointerEvents="none">
        <path d="M100 328 q-16 -30 -8 -48 q10 12 14 34 Z" fill="#3e6146" opacity="0.9">
          <animateTransform attributeName="transform" type="rotate" values="0 104 330; 1.6 104 330; 0 104 330; -1.2 104 330; 0 104 330" dur="12s" repeatCount="indefinite" />
        </path>
        <path d="M118 328 q10 -26 22 -30 q4 16 -8 30 Z" fill="#365539" opacity="0.9">
          <animateTransform attributeName="transform" type="rotate" values="0 116 330; -1.8 116 330; 0 116 330; 1.4 116 330; 0 116 330" dur="9.5s" repeatCount="indefinite" />
        </path>
      </g>

      {/* vignette */}
      <rect x="0" y={tall ? -120 : 0} width="1200" height={tall ? 640 : 400} fill={`url(#${uid}vig)`} pointerEvents="none" />
    </svg>
  );
}
