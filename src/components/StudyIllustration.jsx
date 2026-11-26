import React, { useId } from 'react';

/**
 * FOCUS HERO ILLUSTRATION — a richer, fully-animated study vignette.
 *
 * Adds over the previous single-figure scene:
 *  - a layered ambient halo + soft floor reflection
 *  - a live "desk lamp" cone that brightens while the session runs
 *  - drifting dust motes inside the light beam
 *  - an open book whose pages lift and a pen that actually writes
 *  - a breathing student who leans into the page when studying
 *  - a wall clock whose hand creeps forward with the session
 *  - a stacked bookshelf + a slowly rotating globe for depth
 *
 * Everything is inline SVG + CSS so the illustration stays crisp and GPU-cheap.
 */
export function StudyIllustration({ width = 260, studying = false, className = '' }) {
  const id = useId().replace(/:/g, '');
  const active = Boolean(studying);

  return (
    <svg
      className={`v5-dynamic-student-svg v34-focus-illustration ${active ? 'is-studying' : 'is-idle'} ${className}`}
      width={width}
      viewBox="0 0 340 200"
      role="img"
      aria-label={
        active
          ? 'স্টুডেন্ট টেবিলের দিকে ঝুঁকে গভীর মনোযোগে পড়াশোনা করছে'
          : 'স্টুডেন্ট টেবিলের সামনে সোজা হয়ে শান্তভাবে বসে আছে'
      }
    >
      <defs>
        <radialGradient id={`${id}glow`}>
          <stop stopColor="#ff9808" stopOpacity={active ? '0.40' : '0.16'} />
          <stop offset="0.6" stopColor="#3b82f6" stopOpacity={active ? '0.14' : '0.07'} />
          <stop offset="1" stopColor="#090d16" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}floor`} cx="50%" cy="0%" r="80%">
          <stop stopColor="#ff9808" stopOpacity={active ? '0.20' : '0.07'} />
          <stop offset="1" stopColor="#090d16" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}lampCone`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ffd369" stopOpacity={active ? '0.46' : '0.12'} />
          <stop offset="1" stopColor="#ffd369" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id={`${id}hoodie`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id={`${id}pageL`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#cbd5e1" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={`${id}pageR`} x1="1" y1="0" x2="0" y2="1">
          <stop stopColor="#f8fafc" stopOpacity="0.95" />
          <stop offset="1" stopColor="#94a3b8" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id={`${id}globe`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#38bdf8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1e3a8a" stopOpacity="0.35" />
        </linearGradient>
        <clipPath id={`${id}beamClip`}>
          <path d="M244 52 L282 156 L128 156 Z" />
        </clipPath>
      </defs>

      {/* Ambient aura */}
      <ellipse cx="170" cy="104" rx="150" ry="88" fill={`url(#${id}glow)`} className="v5-stu-aura" />

      {/* Floor pool of light */}
      <ellipse cx="205" cy="152" rx="86" ry="20" fill={`url(#${id}floor)`} className="v34-illus-floor" />

      {/* Wall clock — creeps forward while studying */}
      <g className="v34-illus-wallclock" transform="translate(58 26)">
        <circle cx="0" cy="0" r="17" fill="#0d1220" stroke="#ff9808" strokeOpacity="0.45" strokeWidth="1.6" />
        <circle cx="0" cy="0" r="13" fill="none" stroke="#ffffff" strokeOpacity="0.08" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const r1 = i % 3 === 0 ? 8.4 : 10.2;
          return (
            <line
              key={i}
              x1={Math.sin(a) * r1}
              y1={-Math.cos(a) * r1}
              x2={Math.sin(a) * 12}
              y2={-Math.cos(a) * 12}
              stroke={i % 3 === 0 ? '#ffd369' : '#64748b'}
              strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
              strokeLinecap="round"
            />
          );
        })}
        <g className="v34-illus-clock-hand">
          <line x1="0" y1="0" x2="0" y2="-8" stroke="#e2e8f0" strokeWidth="1.6" strokeLinecap="round" />
        </g>
        <g className="v34-illus-clock-min">
          <line x1="0" y1="0" x2="0" y2="-11" stroke="#f8fafc" strokeWidth="1.2" strokeLinecap="round" />
        </g>
        <circle cx="0" cy="0" r="1.7" fill="#ffd369" />
      </g>

      {/* Globe on the shelf (slow spin) */}
      <g className="v34-illus-globe" transform="translate(102 34)">
        <circle cx="0" cy="0" r="13" fill={`url(#${id}globe)`} stroke="#7dd3fc" strokeOpacity="0.5" strokeWidth="1.1" />
        <ellipse cx="0" cy="0" rx="5.6" ry="13" fill="none" stroke="#e0f2fe" strokeOpacity="0.32" strokeWidth="0.9" />
        <line x1="-13" y1="0" x2="13" y2="0" stroke="#e0f2fe" strokeOpacity="0.28" strokeWidth="0.9" />
        <path d="M-6 16 L6 16 L4 20 L-4 20 Z" fill="#475569" />
      </g>

      {/* Chair backrest */}
      <rect x="116" y="90" width="80" height="60" rx="15" fill="#131927" stroke="#28344d" strokeWidth="2" />
      <rect x="124" y="98" width="64" height="20" rx="10" fill="#0f1524" stroke="#28344d" strokeOpacity="0.7" strokeWidth="1" />

      {/* Student body */}
      <g className="v5-stu-torso-group">
        <path
          d="M118 148 L122 116 Q125 94 148 91 L166 91 Q189 94 192 116 L196 148 Z"
          fill={`url(#${id}hoodie)`}
        />
        <path d="M143 92 Q157 103 171 92" fill="none" stroke="#93c5fd" strokeWidth="2" opacity="0.65" />
        <rect x="150" y="80" width="14" height="15" rx="6" fill="#d9a17c" />

        <g className="v5-stu-head-group">
          <ellipse cx="157" cy="60" rx="23" ry="25" fill="#eab693" />
          <path d="M133 60 Q131 31 157 30 Q183 31 181 59 Q174 46 163 45 Q147 47 133 60 Z" fill="#181e29" />
          <path d="M141 40 Q157 31 173 41" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" />

          <g className="v5-stu-face-details">
            <circle cx="148" cy="62" r="6.3" fill="rgba(255,255,255,0.08)" stroke="#1e293b" strokeWidth="2" />
            <circle cx="166" cy="62" r="6.3" fill="rgba(255,255,255,0.08)" stroke="#1e293b" strokeWidth="2" />
            <path d="M154.3 62 H159.7" stroke="#1e293b" strokeWidth="2" />
            <circle cx="148" cy={active ? '64.2' : '61.8'} r="2" fill="#0f172a" className="v5-stu-eye" />
            <circle cx="166" cy={active ? '64.2' : '61.8'} r="2" fill="#0f172a" className="v5-stu-eye" />
            <path
              d={active ? 'M153 74 Q157 75.5 161 74' : 'M152 73 Q157 77 162 73'}
              stroke="#9a5b4a"
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* Left arm */}
        <path
          className="v5-stu-arm-left"
          d={active ? 'M124 114 Q116 132 137 144' : 'M123 114 Q117 134 130 146'}
          stroke="#e2ac89"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />

        {/* Right arm + pen */}
        <g className="v5-stu-arm-right">
          <path
            d={active ? 'M190 114 Q198 132 174 144' : 'M191 114 Q197 134 184 146'}
            stroke="#e2ac89"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {active && (
            <line
              x1="173"
              y1="144"
              x2="164"
              y2="132"
              stroke="#ffd369"
              strokeWidth="2.8"
              strokeLinecap="round"
              className="v5-stu-pen"
            />
          )}
        </g>
      </g>

      {/* Lamp beam + dust motes */}
      <path d="M244 52 L282 156 L128 156 Z" fill={`url(#${id}lampCone)`} className="v5-stu-lamp-beam" />
      <g clipPath={`url(#${id}beamClip)`} className="v34-illus-motes">
        {[
          [176, 96, 1.5, 0],
          [206, 78, 1.1, 0.7],
          [232, 118, 1.3, 1.4],
          [162, 132, 1, 2.1],
          [248, 92, 1.2, 2.8],
        ].map(([x, y, r, delay], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill="#ffd369"
            className="v34-illus-mote"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </g>

      {/* Open book with turning pages */}
      <g className="v5-stu-book">
        <path d="M126 147 Q142 138 158 146 Q174 138 190 147 L192 150 L124 150 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M126 147 Q142 140 158 146 L158 150 L126 149 Z" fill={`url(#${id}pageL)`} />
        <path d="M190 147 Q174 140 158 146 L158 150 L190 149 Z" fill={`url(#${id}pageR)`} />
        <line x1="158" y1="145" x2="158" y2="150" stroke="#64748b" strokeWidth="1.2" />
        {active && (
          <path
            d="M158 146 Q170 138 182 143 Q172 146 158 147 Z"
            fill="#ffffff"
            fillOpacity="0.85"
            className="v34-illus-page"
          />
        )}
      </g>

      {/* Stacked reference books */}
      <rect x="76" y="141" width="36" height="8" rx="2.5" fill="#ff9808" />
      <rect x="80" y="133" width="28" height="8" rx="2.5" fill="#3b82f6" />
      <line x1="83" y1="137" x2="104" y2="137" stroke="#dbeafe" strokeWidth="1.4" opacity="0.7" />

      {/* Desk plant */}
      <path d="M54 138 H70 L67 150 H57 Z" fill="#ff9808" />
      <path
        d="M62 138 C61 127 54 122 52 118 C58 120 62 125 62 138 M62 138 C63 126 70 121 73 118 C69 125 66 130 62 138"
        stroke="#38bdf8"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Architect desk lamp */}
      <rect x="214" y="146" width="34" height="4" rx="2" fill="#64748b" />
      <path d="M232 146 L252 64 L239 52" stroke="#94a3b8" strokeWidth="3.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M231 45 Q244 36 254 49 L240 60 Q230 53 231 45 Z" fill="#ff9808" />
      <circle cx="243" cy="54" r="3.5" fill={active ? '#ffd369' : '#ffd369'} opacity={active ? '1' : '0.45'} className="v34-illus-bulb" />

      {/* Coffee mug */}
      <rect x="262" y="134" width="14" height="16" rx="3" fill="#e2e8f0" />
      <path d="M276 137 Q282 137 281 143 Q280 146 276 146" fill="none" stroke="#e2e8f0" strokeWidth="2" />

      {/* Desk surface */}
      <line x1="36" y1="151" x2="300" y2="151" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
      <line x1="38" y1="149" x2="298" y2="149" stroke="#ff9808" strokeWidth="1.4" strokeOpacity={active ? '0.55' : '0.2'} />
      <path d="M62 154 L56 178 M274 154 L280 178" stroke="#334155" strokeWidth="4" strokeLinecap="round" />

      {/* Focus sparkles */}
      {active && (
        <g className="v5-stu-sparkles">
          <circle cx="112" cy="66" r="2" fill="#ffd369" />
          <circle cx="204" cy="58" r="1.8" fill="#60a5fa" />
          <path d="M98 86 v6 m-3 -3 h6 M214 80 v6 m-3 -3 h6" stroke="#ffd369" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

export default StudyIllustration;
