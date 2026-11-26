import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { bnNum } from '../utils/bangla';

/**
 * ILLUSTRATED FOCUS-COMPLETION HERO
 *
 * The old completion sheet opened with a plain line of text. This is a small
 * illustrated celebration instead: a rotating light-burst, a floating laurel
 * of sparkles and a gold trophy that pops in with a spring. Everything is
 * inline SVG + CSS so it costs no extra bundle weight and animates on the
 * GPU.
 */
export default function FocusCompletionHero({ subjectName = '', durationSec = 0, xp = 0 }) {
  const motes = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const radius = 74 + (i % 3) * 12;
        return {
          id: i,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          delay: `${(i % 8) * 0.16}s`,
          size: 2.4 + (i % 3) * 1.3,
          tone: ['#fde68a', '#fbbf24', '#fef3c7', '#f472b6'][i % 4],
        };
      }),
    []
  );

  const minutes = Math.max(0, Math.floor((Number(durationSec) || 0) / 60));
  const seconds = Math.max(0, Math.round((Number(durationSec) || 0) % 60));

  return (
    <div className="v43-celebration-hero" aria-hidden="true">
      <div className="v43-celebration-stage">
        {/* rotating light rays */}
        <svg className="v43-celebration-rays" viewBox="0 0 240 240" width="240" height="240">
          <defs>
            <linearGradient id="v43Ray" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="v43Halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.38" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="120" cy="120" r="118" fill="url(#v43Halo)" />
          {Array.from({ length: 16 }, (_, i) => (
            <path
              key={i}
              d="M120 120 L113 18 L127 18 Z"
              fill="url(#v43Ray)"
              transform={`rotate(${i * 22.5} 120 120)`}
            />
          ))}
        </svg>

        {/* floating sparkles */}
        <svg className="v43-celebration-motes" viewBox="-120 -120 240 240" width="240" height="240">
          {motes.map((m) => (
            <circle
              key={m.id}
              cx={m.x}
              cy={m.y}
              r={m.size}
              fill={m.tone}
              className="v43-celebration-mote"
              style={{ animationDelay: m.delay }}
            />
          ))}
        </svg>

        {/* the trophy */}
        <svg className="v43-celebration-trophy" viewBox="0 0 120 120" width="118" height="118">
          <defs>
            <linearGradient id="v43Gold" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="38%" stopColor="#fbbf24" />
              <stop offset="72%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="v43Ribbon" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#be185d" />
            </linearGradient>
          </defs>
          {/* laurel */}
          <path
            d="M44 86 C22 74 18 44 30 22 C34 40 44 52 58 58"
            fill="none"
            stroke="#86efac"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
          <path
            d="M76 86 C98 74 102 44 90 22 C86 40 76 52 62 58"
            fill="none"
            stroke="#86efac"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
          {/* cup */}
          <path
            d="M38 30 H82 V56 C82 70 72 78 60 78 C48 78 38 70 38 56 Z"
            fill="url(#v43Gold)"
          />
          <path d="M38 36 H28 C28 48 32 54 40 55" fill="none" stroke="#fbbf24" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M82 36 H92 C92 48 88 54 80 55" fill="none" stroke="#fbbf24" strokeWidth="3.4" strokeLinecap="round" />
          <rect x="54" y="78" width="12" height="10" rx="2.5" fill="#d97706" />
          <rect x="44" y="88" width="32" height="8" rx="4" fill="url(#v43Gold)" />
          {/* star on the cup */}
          <path
            d="M60 38 L63.2 46.4 L72 47 L65 53 L67.2 62 L60 57.6 L52.8 62 L55 53 L48 47 L56.8 46.4 Z"
            fill="#fffbeb"
            fillOpacity="0.92"
          />
          {/* ribbon */}
          <path d="M52 78 L60 96 L68 78" fill="url(#v43Ribbon)" fillOpacity="0.9" />
        </svg>

        <div className="v43-celebration-badge">
          <Sparkles size={13} />
          <b>
            {bnNum(minutes)}:{bnNum(seconds).padStart(2, '0')}
          </b>
          <small>{bnNum(xp)} XP</small>
        </div>
      </div>

      <div className="v43-celebration-copy">
        <strong>ফোকাস সেশন সম্পন্ন!</strong>
        <span>{subjectName ? `${subjectName} · ` : ''}অভিনন্দন, একটানা ধরে রেখেছেন</span>
      </div>
    </div>
  );
}
