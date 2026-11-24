import React from 'react';
import {
  Check,
  MoonStar,
  SlidersHorizontal,
  Sparkles,
  Sun,
  SunMedium,
  Sunrise,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { formatHM } from '../utils/seedData';
import { bnNum } from '../utils/bangla';

const PHASE_DURATION_PRESETS = [
  { min: 120, label: '২ ঘ.' },
  { min: 150, label: '২.৫ ঘ.' },
  { min: 180, label: '৩ ঘ.' },
];

const ICON_MAP = {
  dawn: Sunrise,
  morning: Sun,
  noon: SunMedium,
  night: MoonStar,
  late_night: Sparkles,
};

/**
 * Clean, Minimal Visual Box Study Phase Tracker inside Insights.
 * Replaces any thin line with a sculpted liquid-fill Progress Box inside every phase card,
 * showing completed time, target, and fill percentage clearly for 4 or 5 study phases.
 */
export default function PhaseInsights() {
  const {
    state,
    phaseSnapshot,
    updatePrefs,
    setPhaseModalOpen,
  } = useStudy();

  const phases = phaseSnapshot?.phases || [];
  const phaseTargetMin = Number(state.timerPrefs?.phaseDurationMin) || 150;
  const doneCount = phases.filter((p) => p.done || p.minGoalMet).length;
  const totalStudiedSec = phases.reduce((sum, p) => sum + (p.studiedSec || 0), 0);

  return (
    <section
      className="min-phases-shell v29-phases-showcase"
      aria-label={`${bnNum(phases.length)}-প্রহরের দৈনিক স্টাডি ইনসাইটস`}
    >
      <header className="min-phases-head">
        <div className="min-phases-title">
          <h3>অধ্যয়ন প্রহর</h3>
          <span>
            {bnNum(doneCount)}/{bnNum(phases.length)} সম্পন্ন · মোট {formatHM(totalStudiedSec)}
          </span>
        </div>

        <div className="min-phases-controls">
          <div className="min-phase-goals" role="group" aria-label="প্রতি প্রহরের লক্ষ্য">
            {PHASE_DURATION_PRESETS.map((opt) => (
              <button
                key={opt.min}
                type="button"
                className={phaseTargetMin === opt.min ? 'active' : ''}
                onClick={() => updatePrefs({ phaseDurationMin: opt.min })}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="min-phase-config-btn"
            onClick={() => setPhaseModalOpen(true)}
            title="৪টি বা ৫টি অধ্যয়ন প্রহর নির্বাচন করুন"
          >
            <SlidersHorizontal size={13} />
            <span>প্রহর</span>
          </button>
        </div>
      </header>

      <div
        className={`min-phases-grid v29-phases-grid ${phases.length === 5 ? 'cols-5' : 'cols-4'}`}
        style={{ '--phase-cols': phases.length || 4 }}
      >
        {phases.map((p) => {
          const Icon = ICON_MAP[p.id] || Sun;
          const isComplete = p.done || p.minGoalMet;
          const pct = Math.max(0, Math.min(100, Math.round(p.pct || 0)));
          const fillPct = p.studiedSec > 0 ? Math.max(8, pct) : 0;

          return (
            <article
              key={p.id}
              className={`v29-phase-card ${isComplete ? 'is-done' : ''} ${
                p.isWindowActive ? 'is-active' : ''
              } ${p.isRunningNow ? 'is-running' : ''}`}
              style={{ '--p-accent': p.accent || '#f59e0b' }}
            >
              {/* Top Row: Colored Icon + Phase Name + Status Badge */}
              <div className="v29-phase-head">
                <div className="v29-phase-id">
                  <span className="v29-phase-ico" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <div>
                    <h4>{p.label}</h4>
                    <small>{p.windowLabel}</small>
                  </div>
                </div>

                {isComplete ? (
                  <span className="v29-phase-badge done">
                    <Check size={12} strokeWidth={2.7} /> সম্পন্ন
                  </span>
                ) : p.isRunningNow ? (
                  <span className="v29-phase-badge live">লাইভ</span>
                ) : p.isWindowActive ? (
                  <span className="v29-phase-badge active">এখন</span>
                ) : null}
              </div>

              {/* Visual Progress Chamber Box (Rich Sculpted Fill Box — NOT a straight line!) */}
              <div
                className={`v29-phase-meter-box ${p.studiedSec > 0 ? 'has-study' : ''}`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={`${p.label} প্রহরে ${bnNum(pct)}% সম্পন্ন`}
              >
                <div
                  className="v29-phase-meter-fill"
                  style={{ width: `${fillPct}%` }}
                  aria-hidden="true"
                />
                <div className="v29-phase-meter-grid" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="v29-phase-meter-content">
                  {/* Only the elapsed time is shown — the "elapsed / target" denominator
                      was noisy and made the box hard to read at a glance. */}
                  <div className="v29-phase-time-readout">
                    <strong>{formatHM(p.studiedSec)}</strong>
                  </div>
                  <b className="v29-phase-pct-chip">{bnNum(pct)}%</b>
                </div>
              </div>

              {/* v35 — the per-phase start button was retired: the Insights
                  phase cards are now a pure read-out. A phase can still be
                  started from the Focus screen or the Timeline. */}
            </article>
          );
        })}
      </div>
    </section>
  );
}
