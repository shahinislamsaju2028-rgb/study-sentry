import React from 'react';
import {
  MoonStar,
  SlidersHorizontal,
  Sparkles,
  Sun,
  SunMedium,
  Sunrise,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
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

/** A quiet phase overview: clear labels, a single dimensional progress fill,
 * and a restrained glass highlight on the phase currently in its time window. */
export default function PhaseInsights() {
  const { state, phaseSnapshot, updatePrefs, setPhaseModalOpen } = useStudy();

  const phases = phaseSnapshot?.phases || [];
  const phaseTargetMin = Number(state.timerPrefs?.phaseDurationMin) || 150;

  return (
    <section
      className="min-phases-shell v29-phases-showcase"
      aria-label={`${bnNum(phases.length)}-প্রহরের দৈনিক স্টাডি ইনসাইটস`}
    >
      <header className="min-phases-head">
        <div className="min-phases-title">
          <h3>অধ্যয়ন প্রহর</h3>
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
        {phases.map((phase) => {
          const Icon = ICON_MAP[phase.id] || Sun;
          const pct = Math.max(0, Math.min(100, Math.round(phase.pct || 0)));

          return (
            <article
              key={phase.id}
              className={`v29-phase-card ${phase.done || phase.minGoalMet ? 'is-done' : ''} ${
                phase.isWindowActive ? 'is-active' : ''
              } ${phase.isRunningNow ? 'is-running' : ''}`}
              style={{ '--p-accent': phase.accent || '#f59e0b' }}
            >
              <div className="v29-phase-head">
                <div className="v29-phase-id">
                  <span className="v29-phase-ico" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <h4>{phase.label}</h4>
                </div>
              </div>

              <div
                className="v56-phase-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={`${phase.label} প্রহরে ${bnNum(pct)}% সম্পন্ন`}
              >
                <span
                  className="v56-phase-progress-fill"
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
