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
 * Study-phase cards using the Drive v4.2 sculpted progress-chamber visual,
 * adapted to the active v60 theme and phase-goal/status data model.
 */
export default function PhaseInsights() {
  const { state, phaseSnapshot, updatePrefs, setPhaseModalOpen } = useStudy();

  const phases = phaseSnapshot?.phases || [];
  const phaseTargetMin = Number(state.timerPrefs?.phaseDurationMin) || 150;
  const doneCount = phases.filter((phase) => phase.done || phase.minGoalMet).length;
  const totalStudiedMin = Math.floor(
    phases.reduce((sum, phase) => sum + (Number(phase.studiedSec) || 0), 0) / 60,
  );

  return (
    <section
      className="min-phases-shell v29-phases-showcase v60-phase-chambers"
      aria-label={`${bnNum(phases.length)}-প্রহরের দৈনিক স্টাডি ইনসাইটস`}
    >
      <header className="min-phases-head">
        <div className="min-phases-title">
          <h3>অধ্যয়ন প্রহর</h3>
          <span className="v60-phase-summary">
            {bnNum(doneCount)}/{bnNum(phases.length)} সম্পন্ন · মোট {bnNum(totalStudiedMin)} মিনিট
          </span>
        </div>

        <div className="min-phases-controls">
          <div className="min-phase-goals" role="group" aria-label="প্রতি প্রহরের লক্ষ্য">
            {PHASE_DURATION_PRESETS.map((option) => (
              <button
                key={option.min}
                type="button"
                className={phaseTargetMin === option.min ? 'active' : ''}
                onClick={() => updatePrefs({ phaseDurationMin: option.min })}
              >
                {option.label}
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
          const isComplete = Boolean(phase.done || phase.minGoalMet);
          const studiedSec = Math.max(0, Number(phase.studiedSec) || 0);
          const studiedMin = Math.floor(studiedSec / 60);
          const targetMin = Number(phase.targetMin) || phaseTargetMin;
          const pct = Math.max(0, Math.min(100, Math.round(Number(phase.pct) || 0)));
          const fillPct = studiedSec > 0 ? Math.max(8, pct) : 0;

          return (
            <article
              key={phase.id}
              className={`v29-phase-card ${isComplete ? 'is-done' : ''} ${
                phase.isWindowActive ? 'is-active' : ''
              } ${phase.isRunningNow ? 'is-running' : ''} ${phase.done ? 'is-target-done' : ''}`}
              style={{ '--p-accent': phase.accent || '#ff9808' }}
            >
              <div className="v29-phase-head">
                <div className="v29-phase-id">
                  <span className="v29-phase-ico" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <div>
                    <h4>{phase.label}</h4>
                    <small>{phase.windowLabel}</small>
                  </div>
                </div>

                {isComplete ? (
                  <span className="v29-phase-badge done">
                    <Check size={12} strokeWidth={2.7} aria-hidden="true" />
                    সম্পন্ন
                  </span>
                ) : phase.isRunningNow ? (
                  <span className="v29-phase-badge live">লাইভ</span>
                ) : phase.isWindowActive ? (
                  <span className="v29-phase-badge active">এখন</span>
                ) : null}
              </div>

              <div
                className={`v29-phase-meter-box ${studiedSec > 0 ? 'has-study' : ''}`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-valuetext={`${bnNum(studiedMin)} / ${bnNum(targetMin)} মিনিট`}
                aria-label={`${phase.label} প্রহরে ${bnNum(pct)}% সম্পন্ন`}
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
                  <div className="v29-phase-time-readout">
                    <strong>{bnNum(studiedMin)}</strong>
                    <span>/ {bnNum(targetMin)} মিনিট</span>
                  </div>
                  <b className="v29-phase-pct-chip">{bnNum(pct)}%</b>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
