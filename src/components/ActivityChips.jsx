import React from 'react';
import {
  BookOpen,
  BookOpenCheck,
  ClipboardPenLine,
  Dumbbell,
  GraduationCap,
  Layers,
  RefreshCw,
  Siren,
  Timer,
} from 'lucide-react';
import { activityBangla, activityName, SUBJECT_ACTIVITIES } from '../utils/subjectActivities';

/**
 * ActivityChips — the single, shared icon+label chip control.
 *
 * The Tasks board has always shown ক্লাস / লেকচার শিট রিভিউ / প্র্যাকটিস / রিভিশন
 * as icon boxes; every other picker (Focus config, sprint planner, exam prep)
 * now uses the exact same component so the language never drifts.
 */

// Exactly the icon set the Tasks board has always used for কাজের ধরন — one
// vocabulary everywhere, per the brief.
const ACTIVITY_ICON = {
  Class: BookOpenCheck,
  'Lecture Sheet Review': ClipboardPenLine,
  Practice: Dumbbell,
  Revision: RefreshCw,
};

const ACTIVITY_HINT = {
  Class: 'শিক্ষকের ক্লাস',
  'Lecture Sheet Review': 'শিট পড়া ও রিভিউ',
  Practice: 'অনুশীলনী ও প্রশ্নব্যাংক',
  Revision: 'পুরোনো পড়া ঝালাই',
};

/* `activityName()` returns the stored English key. Callers that test the label
   with a Bangla regex (the config summary) were getting the English word back
   and hiding the row. `activityLabel()` is the one place that maps a key to its
   Bangla label, and it is what every display surface should use. */
export function activityLabel(id) {
  const key = activityName(id) || id;
  return activityBangla[key] || key || '';
}

export function activityIcon(id) {
  return ACTIVITY_ICON[activityName(id) || id] || BookOpen;
}

/** the four study activities, exactly as the Tasks board offers them */
export function ActivityChips({ value, onChange, disabled = false, compact = false, label = 'পড়ার ধরন' }) {
  const current = activityName(value) || value;
  return (
    <div
      className={`say-chip-row ${compact ? 'is-compact' : ''}`}
      role="group"
      aria-label={label}
    >
      {SUBJECT_ACTIVITIES.map((id) => {
        const Icon = ACTIVITY_ICON[id] || BookOpen;
        const on = current === id;
        return (
          <button
            type="button"
            key={id}
            className={`say-chip tone-activity ${on ? 'is-on' : ''}`}
            aria-pressed={on}
            disabled={disabled}
            title={ACTIVITY_HINT[id]}
            onClick={() => onChange?.(id)}
          >
            <span className="say-chip-ico">
              <Icon size={compact ? 14 : 15} />
            </span>
            <span className="say-chip-txt">{activityBangla[id] || id}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * UrgencyChips — কম / মাঝারি / জরুরি, same chip anatomy, escalating tone.
 */
const URGENCY = [
  { id: 'low', label: 'কম', Icon: Timer, tone: 'calm' },
  { id: 'medium', label: 'মাঝারি', Icon: Layers, tone: 'warm' },
  { id: 'high', label: 'জরুরি', Icon: Siren, tone: 'hot' },
];

export function UrgencyChips({ value = 'medium', onChange, disabled = false, compact = false }) {
  return (
    <div className={`say-chip-row ${compact ? 'is-compact' : ''}`} role="group" aria-label="কাজের জরুরি মাত্রা">
      {URGENCY.map(({ id, label, Icon, tone }) => (
        <button
          type="button"
          key={id}
          className={`say-chip tone-${tone} ${value === id ? 'is-on' : ''}`}
          aria-pressed={value === id}
          disabled={disabled}
          onClick={() => onChange?.(id)}
        >
          <span className="say-chip-ico">
            <Icon size={compact ? 14 : 15} />
          </span>
          <span className="say-chip-txt">{label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * StudyModeChips — the study / revision / exam-prep trio that the tasks
 * board uses for paper work, mirrored for the sprint planner.
 */
const MODES = [
  { id: 'study', label: 'পড়া', Icon: BookOpen, tone: 'study' },
  { id: 'revision', label: 'রিভিশন', Icon: RefreshCw, tone: 'revision' },
  { id: 'exam', label: 'পরীক্ষা প্রস্তুতি', Icon: GraduationCap, tone: 'exam' },
];

export function StudyModeChips({ value = 'study', onChange, disabled = false, compact = false }) {
  return (
    <div className={`say-chip-row ${compact ? 'is-compact' : ''}`} role="group" aria-label="পড়ার মোড">
      {MODES.map(({ id, label, Icon, tone }) => (
        <button
          type="button"
          key={id}
          className={`say-chip tone-${tone} ${value === id ? 'is-on' : ''}`}
          aria-pressed={value === id}
          disabled={disabled}
          onClick={() => onChange?.(id)}
        >
          <span className="say-chip-ico">
            <Icon size={compact ? 14 : 15} />
          </span>
          <span className="say-chip-txt">{label}</span>
        </button>
      ))}
    </div>
  );
}

/** small standalone chip used where only the icon+label of an activity is needed */
export function ActivityBadge({ id }) {
  const Icon = activityIcon(id);
  return (
    <span className="say-activity-badge">
      <Icon size={12} />
      {activityBangla[activityName(id)] || id}
    </span>
  );
}

export { ACTIVITY_ICON };
