import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Sparkles, Trophy } from 'lucide-react';
import { bnNum } from '../utils/bangla';
import { studyAudio } from '../utils/audioEngine';

const CONFETTI_COLORS = [
  '#fbbf24',
  '#34d399',
  '#38bdf8',
  '#f472b6',
  '#a78bfa',
  '#fde68a',
  '#fb923c',
];

/**
 * Celebratory Confetti & Sparkle Burst modal shown when the student reaches
 * Rank #1 on the Study Lounge Leaderboard (or shows clean session rank summary).
 */
export default function RankOneCelebration({ notice, onClose }) {
  const isRankOne = notice?.rank === 1;

  const particles = useMemo(() => {
    if (!isRankOne) return [];
    return Array.from({ length: 38 }, (_, i) => {
      const angle = (i / 38) * Math.PI * 2 + (i % 3) * 0.14;
      const dist = 120 + (i % 5) * 44;
      const tx = Math.round(Math.cos(angle) * dist);
      const ty = Math.round(Math.sin(angle) * dist - 34);
      const rot = (i * 57) % 360;
      const delay = ((i % 7) * 0.05).toFixed(2);
      const size = 6 + (i % 4) * 2.5;
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const shape = i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'pill' : 'diamond';
      return { id: i, tx, ty, rot, delay, size, color, shape };
    });
  }, [isRankOne, notice?.circle, notice?.seconds]);

  useEffect(() => {
    if (!notice) return undefined;
    if (isRankOne) {
      try {
        studyAudio.playCompletionSound?.();
      } catch (_) {}
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notice, isRankOne, onClose]);

  if (!notice) return null;

  const totalSec = Math.max(0, Number(notice.seconds) || 0);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const timeText = h > 0 ? `${bnNum(h)} ঘণ্টা ${bnNum(m)} মিনিট` : `${bnNum(m)} মিনিট`;

  return createPortal(
    <div
      className={`sc-result-backdrop ${isRankOne ? 'is-rank-one-celebration' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sc-result-title"
      onClick={onClose}
    >
      <div
        className={`sc-result ${isRankOne ? 'sc-rank1-card' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isRankOne && (
          <div className="sc-confetti-stage" aria-hidden="true">
            {particles.map((p) => (
              <span
                key={p.id}
                className={`sc-confetti-piece shape-${p.shape}`}
                style={{
                  '--tx': `${p.tx}px`,
                  '--ty': `${p.ty}px`,
                  '--rot': `${p.rot}deg`,
                  '--delay': `${p.delay}s`,
                  '--size': `${p.size}px`,
                  '--col': p.color,
                }}
              />
            ))}
          </div>
        )}

        {isRankOne ? (
          <>
            {/* ── ILLUSTRATED PODIUM SCENE ─────────────────────────────── */}
            <div className="sc-rank1-stage" aria-hidden="true">
              <svg className="sc-rank1-rays" viewBox="0 0 320 220" width="320" height="220">
                <defs>
                  <linearGradient id="scRay" x1="0" y1="1" x2="0.6" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.06" />
                    <stop offset="55%" stopColor="#fde68a" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                  </linearGradient>
                  <radialGradient id="scHalo" cx="50%" cy="52%" r="50%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
                    <stop offset="58%" stopColor="#f59e0b" stopOpacity="0.11" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="scPodium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="46%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  <linearGradient id="scLaurel" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#86efac" />
                    <stop offset="100%" stopColor="#15803d" />
                  </linearGradient>
                </defs>

                <circle cx="160" cy="112" r="108" fill="url(#scHalo)" />
                {Array.from({ length: 18 }, (_, i) => (
                  <path
                    key={i}
                    d="M160 112 L153 6 L167 6 Z"
                    fill="url(#scRay)"
                    transform={`rotate(${i * 20} 160 112)`}
                    className="sc-rank1-ray"
                    style={{ animationDelay: `${(i % 9) * 0.12}s` }}
                  />
                ))}

                {/* laurel wreath */}
                <path
                  d="M108 150 C74 134 66 92 84 58 C92 84 106 104 128 114"
                  fill="none"
                  stroke="url(#scLaurel)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M212 150 C246 134 254 92 236 58 C228 84 214 104 192 114"
                  fill="none"
                  stroke="url(#scLaurel)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                {[86, 100, 114, 128].map((y, i) => (
                  <ellipse key={`l${i}`} cx={98 - i * 1.5} cy={y + 6} rx="7" ry="13" fill="url(#scLaurel)" opacity="0.72" transform={`rotate(-32 ${98 - i * 1.5} ${y + 6})`} />
                ))}
                {[86, 100, 114, 128].map((y, i) => (
                  <ellipse key={`r${i}`} cx={222 + i * 1.5} cy={y + 6} rx="7" ry="13" fill="url(#scLaurel)" opacity="0.72" transform={`rotate(32 ${222 + i * 1.5} ${y + 6})`} />
                ))}

                {/* the champion figure standing on the podium */}
                <g className="sc-rank1-champion">
                  <ellipse cx="160" cy="188" rx="52" ry="11" fill="#000" opacity="0.34" />
                  {/* podium */}
                  <path d="M126 186 H194 L202 214 H118 Z" fill="url(#scPodium)" />
                  <path d="M126 186 H194 L192 178 H128 Z" fill="#fde68a" opacity="0.85" />
                  <text x="160" y="207" textAnchor="middle" fontSize="17" fontWeight="800" fill="#4a2c05">১</text>
                  {/* body */}
                  <path d="M142 178 C142 158 150 150 160 150 C170 150 178 158 178 178 Z" fill="#fde68a" />
                  <path d="M160 150 C160 150 150 148 149 138 C148 130 152 124 160 124 C168 124 172 130 171 138 C170 148 160 150 160 150 Z" fill="#fcd9a6" />
                  {/* arms raised in celebration */}
                  <path d="M146 156 L124 138" stroke="#fcd9a6" strokeWidth="8" strokeLinecap="round" />
                  <path d="M174 156 L196 138" stroke="#fcd9a6" strokeWidth="8" strokeLinecap="round" />
                  <circle cx="122" cy="136" r="6" fill="#fcd9a6" />
                  <circle cx="198" cy="136" r="6" fill="#fcd9a6" />
                  {/* medal */}
                  <circle cx="160" cy="164" r="9" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
                  <path d="M160 158 L162 163 L167 163 L163 166 L164 171 L160 168 L156 171 L157 166 L153 163 L158 163 Z" fill="#fffbeb" />
                </g>
              </svg>

              <div className="sc-rank1-crown-wrap">
                <div className="sc-rank1-halo" />
                <Crown size={36} strokeWidth={2.2} />
                <span className="sc-rank1-num">#১</span>
              </div>
            </div>

            <span className="sc-rank1-eyebrow">
              <Sparkles size={13} /> অভিনন্দন · লিডারবোর্ডে শীর্ষস্থান অর্জন!
            </span>

            <h2 id="sc-result-title">আপনি এখন #১ অবস্থানে!</h2>

            <p className="sc-rank1-group">
              <Trophy size={14} /> <strong>{notice.circle}</strong>
            </p>

            {totalSec > 0 && (
              <div className="sc-rank1-hours-pill">
                আজকের ফোকাস সময়: <strong>{timeText}</strong>
              </div>
            )}

            <p className="sc-rank1-msg">
              অসাধারণ ধারাবাহিকতা! আপনার এই একাগ্রতা ধরে রাখুন এবং শীর্ষস্থান অটুট রাখুন।
            </p>

            <button type="button" className="sc-rank1-cta" onClick={onClose}>
              <Sparkles size={15} /> দারুণ! এগিয়ে যান
            </button>
          </>
        ) : (
          <>
            <span>✦ সেশন সম্পন্ন</span>
            <h2 id="sc-result-title">আজকের অবস্থান #{bnNum(notice.rank)}</h2>
            <p>
              <strong>{notice.circle}</strong>
            </p>
            <p>
              {notice.delta === null
                ? 'আপনি শীর্ষ অবস্থানে আছেন!'
                : `পরের অবস্থানে উঠতে আর মাত্র ${bnNum(Math.ceil(notice.delta / 60))} মিনিট ফোকাস প্রয়োজন`}
            </p>
            <button type="button" onClick={onClose}>
              ঠিক আছে
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
