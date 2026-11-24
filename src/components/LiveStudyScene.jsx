import React, { useId } from 'react';

/**
 * Studio-Grade Expressive 3-State Student Study Illustration for Study Lounge.
 *
 * 1) `studying`: Cozy warm-lit focus desk — golden lamp casting volumetric beam,
 *    glowing laptop/mobile + illuminated open textbook, focused student with
 *    studio headphones leaning in & writing, floating focus motes, emerald LIVE pill.
 * 2) `break` | `paused`: Warm sunset tea-break scene — amber twilight window,
 *    headphones resting around neck, student stretching back happily with a
 *    steaming tea/coffee mug (animated rising steam), ribbon-bookmarked notebook,
 *    amber BREAK pill.
 * 3) `idle` | `offline`: Serene moonlit study nook — deep indigo starry window with
 *    crescent moon, switched-off desk lamp, neatly stacked closed books & sleeping
 *    laptop, student resting peacefully with calm closed eyes & soft floating z·z,
 *    slate RESTING pill.
 */
export default function LiveStudyScene({ status = 'offline', device = null, seed = '' }) {
  const uid = useId().replace(/:/g, '');
  const isStudying = status === 'studying';
  const isBreak = status === 'break' || status === 'paused';
  const mode = isStudying ? 'studying' : isBreak ? 'break' : 'resting';

  const palettes = [
    ['#818cf8', '#4f46e5'],
    ['#34d399', '#059669'],
    ['#fbbf24', '#d97706'],
    ['#38bdf8', '#0284c7'],
    ['#f472b6', '#db2777'],
    ['#a78bfa', '#7c3aed'],
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const [hoodieTop, hoodieBot] = palettes[hash % palettes.length];

  return (
    <svg
      className={`v30-scene v30-scene-${mode}`}
      viewBox="0 0 280 164"
      role="img"
      aria-label={
        isStudying
          ? 'লাইভ ফোকাস সেশন চলছে'
          : isBreak
          ? 'বিরতিতে আছে'
          : 'এখন পড়ছে না'
      }
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          {isStudying ? (
            <>
              <stop offset="0%" stopColor="#1b2438" />
              <stop offset="55%" stopColor="#131929" />
              <stop offset="100%" stopColor="#0c101b" />
            </>
          ) : isBreak ? (
            <>
              <stop offset="0%" stopColor="#261c2e" />
              <stop offset="55%" stopColor="#191526" />
              <stop offset="100%" stopColor="#100e1a" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#111522" />
              <stop offset="100%" stopColor="#090c14" />
            </>
          )}
        </linearGradient>

        <linearGradient id={`win-${uid}`} x1="0" y1="0" x2="0" y2="1">
          {isStudying ? (
            <>
              <stop offset="0%" stopColor="#0f1b33" />
              <stop offset="100%" stopColor="#1b2e4b" />
            </>
          ) : isBreak ? (
            <>
              <stop offset="0%" stopColor="#31204a" />
              <stop offset="65%" stopColor="#6b3453" />
              <stop offset="100%" stopColor="#c2634b" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#080d1a" />
              <stop offset="100%" stopColor="#111a2e" />
            </>
          )}
        </linearGradient>

        <radialGradient id={`beam-${uid}`} cx="52%" cy="10%" r="78%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.58" />
          <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`breakGlow-${uid}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`screen-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        <linearGradient id={`hoodie-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mode === 'resting' ? '#3b445b' : hoodieTop} />
          <stop offset="100%" stopColor={mode === 'resting' ? '#23293a' : hoodieBot} />
        </linearGradient>
      </defs>

      {/* Backdrop */}
      <rect x="0" y="0" width="280" height="164" fill={`url(#bg-${uid})`} />

      {/* Wall Bookshelf Silhouette */}
      <g opacity={isStudying ? '0.65' : '0.35'}>
        <rect x="92" y="34" width="66" height="3.5" rx="1.75" fill="#334155" />
        <rect x="98" y="21" width="6" height="13" rx="1.2" fill="#6366f1" />
        <rect x="106" y="23" width="5" height="11" rx="1.2" fill="#f59e0b" />
        <rect x="113" y="19" width="6.5" height="15" rx="1.2" fill="#10b981" />
        <rect x="142" y="25" width="9" height="9" rx="2" fill="#475569" />
      </g>

      {/* Atmospheric Window */}
      <g>
        <rect
          x="18"
          y="16"
          width="56"
          height="54"
          rx="10"
          fill={`url(#win-${uid})`}
          stroke={isBreak ? '#fb923c' : '#475569'}
          strokeOpacity={isBreak ? '0.38' : '0.45'}
          strokeWidth="1.5"
        />
        {isBreak ? (
          /* Warm Sunset Horizon & Soft Clouds */
          <>
            <circle cx="46" cy="54" r="10" fill="#fde68a" opacity="0.82" />
            <rect x="24" y="42" width="20" height="3.5" rx="1.75" fill="#fbcfe8" opacity="0.45" />
            <rect x="46" y="34" width="18" height="3" rx="1.5" fill="#fde68a" opacity="0.38" />
          </>
        ) : (
          /* Night Crescent Moon & Twinkling Stars */
          <>
            <circle
              cx="35"
              cy="32"
              r="6.8"
              fill={isStudying ? '#fde68a' : '#cbd5e1'}
              opacity={isStudying ? '0.92' : '0.7'}
            />
            <circle cx="38.5" cy="29.8" r="6" fill={isStudying ? '#12213b' : '#0b1222'} />
            <circle cx="56" cy="27" r="1.4" fill="#f8fafc" opacity="0.8" />
            <circle cx="62" cy="39" r="1.1" fill="#e2e8f0" opacity="0.6" />
            <circle cx="30" cy="53" r="1" fill="#cbd5e1" opacity="0.5" />
          </>
        )}
        <path d="M46 16v54M18 43h56" stroke="#1e293b" strokeWidth="1.4" opacity="0.65" />
      </g>

      {/* Status Pill Inside Scene */}
      <g transform="translate(190, 14)">
        <rect
          width="74"
          height="22"
          rx="11"
          fill={
            isStudying
              ? 'rgba(16, 185, 129, 0.22)'
              : isBreak
              ? 'rgba(251, 146, 60, 0.22)'
              : 'rgba(51, 65, 85, 0.45)'
          }
          stroke={isStudying ? '#34d399' : isBreak ? '#fb923c' : '#64748b'}
          strokeOpacity="0.65"
        />
        <circle
          cx="13"
          cy="11"
          r="3.6"
          fill={isStudying ? '#34d399' : isBreak ? '#fb923c' : '#94a3b8'}
          className={isStudying ? 'v30-scene-pulse' : ''}
        />
        <text
          x="23"
          y="14.5"
          fontSize="8.6"
          fontWeight="800"
          letterSpacing="0.6"
          fill={isStudying ? '#d1fae5' : isBreak ? '#ffedd5' : '#cbd5e1'}
        >
          {isStudying ? 'STUDYING' : isBreak ? 'ON BREAK' : 'RESTING'}
        </text>
      </g>

      {/* Architect Desk Lamp */}
      <g>
        <path
          d="M228 126h18M237 126l5-29-18-19"
          fill="none"
          stroke={isStudying ? '#e2e8f0' : isBreak ? '#94a3b8' : '#475569'}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M213 80l14-8 6 11-16 6z"
          fill={isStudying ? '#f59e0b' : isBreak ? '#d97706' : '#334155'}
        />
        {isStudying && (
          <>
            <polygon
              points="219,83 118,128 248,128"
              fill={`url(#beam-${uid})`}
              className="v30-lamp-cone"
            />
            <circle cx="221" cy="84" r="3.8" fill="#fef3c7" />
          </>
        )}
      </g>

      {/* Cozy Potted Plant */}
      <g>
        <rect
          x="26"
          y="116"
          width="15"
          height="10"
          rx="3"
          fill={isStudying || isBreak ? '#b45309' : '#475569'}
        />
        <path
          d="M33.5 116c-2-9-8-13-10-18M33.5 116c0-10 2-15 1-20M33.5 116c3-9 8-12 10-17"
          fill="none"
          stroke={isStudying ? '#34d399' : isBreak ? '#2dd4bf' : '#4b5563'}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </g>

      {/* Wooden Desk */}
      <rect
        x="48"
        y="126"
        width="206"
        height="7.5"
        rx="3.75"
        fill={isStudying ? '#9a6b46' : isBreak ? '#7c5640' : '#3e3535'}
      />
      <path
        d="M64 133.5v22M236 133.5v22"
        stroke={isStudying ? '#6d4b31' : isBreak ? '#563c2d' : '#292324'}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* ==================== STATE 1: ACTIVELY STUDYING ==================== */}
      {isStudying && (
        <g className="v30-char-studying">
          {/* Ergonomic Chair */}
          <rect x="70" y="88" width="11" height="44" rx="5.5" fill="#334155" />

          {/* Student Leaning In Attentively */}
          <path
            d="M82 126c2-20 12-34 28-34 14 0 22 10 26 34z"
            fill={`url(#hoodie-${uid})`}
          />
          {/* Head */}
          <circle cx="115" cy="72" r="15.5" fill="#e0ab8b" />
          <path
            d="M99 70c0-12 8-19 19-18 9 1 15 8 14 16-4-4-10-5-16-4-6 1-12 3-17 6z"
            fill="#1b1926"
          />
          {/* Focused Eye & Determined Slight Smile */}
          <circle cx="122" cy="74" r="1.7" fill="#0f172a" />
          <path
            d="M118 80q4 2.2 7.5 0"
            fill="none"
            stroke="#7c4d38"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Glowing Studio Headphones */}
          <path
            d="M101 69a15 15 0 0 1 27-4"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <rect x="98" y="66" width="6.5" height="12" rx="3.2" fill="#f59e0b" />

          {/* Writing Arm + Pen */}
          <path
            d="M120 100l19 19 21-1"
            fill="none"
            stroke={hoodieTop}
            strokeWidth="8.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M157 118l8-12"
            stroke="#fef08a"
            strokeWidth="2.3"
            strokeLinecap="round"
            className="v30-pen-write"
          />

          {/* Open Illuminated Book */}
          <path
            d="M144 122l17-4.5 17 4.5v4l-17-3-17 3z"
            fill="#fef3c7"
            stroke="#d97706"
            strokeWidth="1"
          />

          {/* Glowing Laptop or Mobile */}
          {device === 'mobile' ? (
            <g>
              <rect
                x="190"
                y="100"
                width="16"
                height="25"
                rx="3.2"
                fill="#0f172a"
                stroke="#7dd3fc"
                strokeWidth="1.2"
              />
              <rect x="192" y="103" width="12" height="19" rx="1.6" fill={`url(#screen-${uid})`} />
            </g>
          ) : (
            <g>
              <path
                d="M186 92h32l-5 31h-32z"
                fill="#0f172a"
                stroke="#7dd3fc"
                strokeOpacity="0.72"
                strokeWidth="1.3"
              />
              <path
                d="M188.5 95h26.5l-4 25h-26.5z"
                fill={`url(#screen-${uid})`}
                opacity="0.9"
              />
              <rect x="174" y="122" width="40" height="4" rx="2" fill="#cbd5e1" />
            </g>
          )}

          {/* Floating Focus Sparkles */}
          <circle cx="152" cy="64" r="1.8" fill="#fde68a" className="v30-mote-1" />
          <circle cx="172" cy="76" r="1.4" fill="#34d399" className="v30-mote-2" />
        </g>
      )}

      {/* ==================== STATE 2: COZY TEA / COFFEE BREAK ==================== */}
      {isBreak && (
        <g className="v30-char-break">
          <circle cx="156" cy="104" r="34" fill={`url(#breakGlow-${uid})`} />

          {/* Reclined Chair */}
          <path d="M68 84l-4 44h12l4-44z" fill="#29253b" stroke="#4c4369" strokeWidth="1" />

          {/* Relaxed Upright Student Enjoying a Breather */}
          <path
            d="M78 126c1-19 10-33 25-33 13 0 21 11 23 33z"
            fill={`url(#hoodie-${uid})`}
          />
          {/* Headphones Resting Around Neck */}
          <ellipse cx="103" cy="93" rx="11" ry="4" fill="none" stroke="#fbbf24" strokeWidth="2.5" />

          {/* Cheerful Relaxed Head */}
          <circle cx="102" cy="72" r="15" fill="#dca686" />
          <path
            d="M87 70c0-11 8-18 18-17 9 1 14 7 13 15-4-3.5-9-4.5-15-3.5-6 1-11 3-16 5.5z"
            fill="#1e1b29"
          />
          {/* Happy Closed Smile Eyes & Relaxed Smile */}
          <path
            d="M104 71q3-2.5 6 0"
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M103 78q4.5 3.2 8.5 0"
            fill="none"
            stroke="#7c4d38"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Arm Holding Toward Warm Tea/Coffee Mug */}
          <path
            d="M112 102l18 15 14-2"
            fill="none"
            stroke={hoodieTop}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Warm Ceramic Tea/Coffee Mug + Rising Steam Curls */}
          <g>
            <rect x="145" y="111" width="15" height="15" rx="3.5" fill="#fb923c" />
            <path
              d="M160 114.5h3.2a3.2 3.2 0 0 1 0 6.4H160"
              fill="none"
              stroke="#fb923c"
              strokeWidth="2"
            />
            <path
              d="M149 107c-2-4 2-7 0-11"
              fill="none"
              stroke="#fde68a"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="v30-steam-1"
            />
            <path
              d="M154 106c-2-5 2.5-8 0.5-13"
              fill="none"
              stroke="#ffedd5"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="v30-steam-2"
            />
          </g>

          {/* Closed Book with Bookmark Ribbon */}
          <rect x="176" y="119" width="36" height="7" rx="2" fill="#4c1d95" />
          <rect x="178" y="121" width="32" height="3" rx="1" fill="#fde68a" opacity="0.8" />
          <path d="M196 122v9l3-2 3 2v-9" fill="#fb7185" />
        </g>
      )}

      {/* ==================== STATE 3: NOT STUDYING / RESTING ==================== */}
      {mode === 'resting' && (
        <g className="v30-char-resting" opacity="0.85">
          {/* Chair Back */}
          <path d="M68 82l-6 46h12l6-46z" fill="#1b2234" stroke="#334155" strokeWidth="1" />

          {/* Peacefully Resting Student */}
          <path
            d="M76 126c0-19 9-32 23-32 13 0 19 12 20 32z"
            fill={`url(#hoodie-${uid})`}
          />
          <circle cx="97" cy="74" r="14.8" fill="#b48a72" />
          <path
            d="M82 72c0-11 8-18 18-17 8 0 13 6 12 14-4-3-9-4-15-3-5 1-10 3-15 6z"
            fill="#161824"
          />
          {/* Peaceful Sleeping Eyes */}
          <path
            d="M99 75q3.2 2.4 6.4 0"
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Floating Soft Z · Z */}
          <text
            x="118"
            y="62"
            fontSize="10.5"
            fontWeight="700"
            fill="#94a3b8"
            className="v30-zzz-1"
          >
            z
          </text>
          <text
            x="128"
            y="52"
            fontSize="8.5"
            fontWeight="700"
            fill="#64748b"
            className="v30-zzz-2"
          >
            z
          </text>

          {/* Neatly Stacked Closed Books & Sleeping Laptop */}
          <rect x="146" y="119" width="34" height="7" rx="2" fill="#293548" />
          <rect x="149" y="113" width="29" height="6" rx="2" fill="#3b4963" />
          <rect x="188" y="122" width="34" height="4" rx="2" fill="#475569" />
        </g>
      )}
    </svg>
  );
}
