import React from 'react';
import {
  PREMADE_SUBJECTS,
  SUBJECT_PALETTES,
  canonicalSubject,
  findSubject,
} from '../utils/premadeSubjects';
import { bnNum, bnSubject } from '../utils/bangla';
import { PreviewSubjectIcon } from './PreviewSubjectIcon';

const FALLBACK_PALETTE = { color: '#d1b36a', bg: '#29261e', edge: '#766438' };
const subjectKey = (name) => canonicalSubject(String(name || '').trim()).toLowerCase();

/**
 * Shared subject selector. The default list remains the seven built-in
 * subjects; group-specific surfaces may pass `subjectNames` while keeping the
 * exact same icon, chip, selected glow, and keyboard semantics.
 */
export default function SubjectCards({
  subjects = [],
  subjectNames,
  value = '',
  onSelect,
  label = 'Choose a topic',
  compact = false,
  sessions = [],
  showStats = false,
  disabled = false,
  includeClass = false,
  className = '',
}) {
  const names = Array.isArray(subjectNames)
    ? subjectNames
    : includeClass
      ? [...PREMADE_SUBJECTS, 'Class']
      : PREMADE_SUBJECTS;

  const maxSeconds = Math.max(
    1,
    ...names.map((name) => {
      const sub = findSubject(subjects, name) || subjects.find(
        (candidate) => subjectKey(candidate?.name) === subjectKey(name)
      );
      return sessions
        .filter((session) => sub && session.subjectId === sub.id)
        .reduce((total, session) => total + (Number(session.durationSec) || 0), 0);
    })
  );

  return (
    <div
      className={`premium-subject-grid v48-subject-chips ${compact ? 'compact' : ''} ${className}`.trim()}
      role="group"
      aria-label={label}
    >
      {names.map((name) => {
        const info = SUBJECT_PALETTES[name] || FALLBACK_PALETTE;
        const sub = findSubject(subjects, name) || subjects.find(
          (candidate) => subjectKey(candidate?.name) === subjectKey(name)
        ) || null;
        const selected = subjectKey(value) === subjectKey(name);
        const logs = sessions.filter((session) => sub && session.subjectId === sub.id);
        const seconds = logs.reduce(
          (total, session) => total + (Number(session.durationSec) || 0),
          0
        );

        return (
          <button
            type="button"
            key={name}
            className={`premium-subject-card ${selected ? 'selected' : ''} ${showStats ? 'has-stats' : ''}`}
            style={{
              '--sc-color': info.color,
              '--sc-bg': info.bg,
              '--sc-edge': info.edge,
            }}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onSelect?.(name, sub)}
          >
            <span className="premium-subject-icon">
              <PreviewSubjectIcon subject={sub || { name }} size={18} />
            </span>
            <span className="premium-subject-copy">
              <strong>{bnSubject(name)}</strong>
              {showStats && (
                <small>
                  {bnNum(logs.length)}টি সেশন · {bnNum(Math.floor(seconds / 60))} মিনিট
                </small>
              )}
            </span>
            {showStats && (
              <i className="premium-subject-track" title="সময় তুলনা">
                <i style={{ width: `${Math.min(100, (seconds / maxSeconds) * 100)}%` }} />
              </i>
            )}
          </button>
        );
      })}
    </div>
  );
}
