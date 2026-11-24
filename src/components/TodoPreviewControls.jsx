import React, { useRef, useState } from 'react';
import {
  Atom,
  Banknote,
  BookOpen,
  Brain,
  Building2,
  Calculator,
  ChartColumn,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Dna,
  Factory,
  FlaskConical,
  Globe,
  HeartHandshake,
  Landmark,
  Languages,
  Monitor,
  MoonStar,
  Network,
  Pencil,
  Scale,
  Sigma,
  Sparkles,
  Sun,
  SunMedium,
  Sunrise,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { addDays, toDateKey, civilDateKey } from '../utils/seedData';
import { bnDate } from '../utils/bangla';
import { dateFromKey } from '../utils/stats';
import { PREMADE_SUBJECTS } from '../utils/premadeSubjects';
import { PHASE_MODE_OPTIONS, normalizePhaseMode } from '../utils/studyPhases';
import PremiumSubjectIcon from './PremiumSubjectIcon';

export const TASK_ICONS = [
  { key: 'book', label: 'Book', Icon: BookOpen, legacy: '📚' },
  { key: 'atom', label: 'Physics', Icon: Atom, legacy: '⚛️' },
  { key: 'flask', label: 'Science', Icon: FlaskConical, legacy: '🧪' },
  { key: 'calculator', label: 'Math', Icon: Calculator, legacy: '📐' },
  { key: 'brain', label: 'Review', Icon: Brain, legacy: '🧠' },
  { key: 'target', label: 'Goal', Icon: Target, legacy: '🎯' },
  { key: 'pencil', label: 'Writing', Icon: Pencil, legacy: '📝' },
  { key: 'monitor', label: 'Computer', Icon: Monitor, legacy: '💻' },
  { key: 'languages', label: 'Language', Icon: Languages, legacy: '📖' },
  { key: 'list', label: 'Task list', Icon: ClipboardList, legacy: '🔔' },
  { key: 'check', label: 'Complete', Icon: CheckCircle2, legacy: '✅' },
  // মানবিক + ব্যবসায় — every HSC group gets a pictogram of its own
  { key: 'sigma', label: 'Mathematics', Icon: Sigma, legacy: '∑' },
  { key: 'dna', label: 'Biology', Icon: Dna, legacy: '🧬' },
  { key: 'landmark', label: 'History', Icon: Landmark, legacy: '🏛️' },
  { key: 'sparkles', label: 'Culture', Icon: Sparkles, legacy: '✨' },
  { key: 'users', label: 'Sociology', Icon: Users, legacy: '👥' },
  { key: 'heart-hands', label: 'Social work', Icon: HeartHandshake, legacy: '🤝' },
  { key: 'trending-up', label: 'Economics', Icon: TrendingUp, legacy: '📈' },
  { key: 'scale', label: 'Governance', Icon: Scale, legacy: '⚖️' },
  { key: 'network', label: 'Logic', Icon: Network, legacy: '🕸️' },
  { key: 'globe', label: 'Geography', Icon: Globe, legacy: '🌍' },
  { key: 'building', label: 'Business', Icon: Building2, legacy: '🏢' },
  { key: 'banknote', label: 'Finance', Icon: Banknote, legacy: '💵' },
  { key: 'factory', label: 'Production', Icon: Factory, legacy: '🏭' },
  { key: 'chart-column', label: 'Statistics', Icon: ChartColumn, legacy: '📊' },
];

export const TODO_CATEGORIES = ['Study', 'Revision', 'Exam Preparation'];

const BN_SLOT_NUMS = ['1', '2', '3', '4', '5'];

// 5 Canonical Task & Study Phase Slots (including 5th phase: গভীর রাত 10:01 PM – 2:00 AM)
export const ALL_TASK_TIME_SLOTS = [
  {
    id: 'dawn',
    phaseId: 'dawn',
    num: '1',
    bnLabel: 'ভোর',
    enLabel: 'Dawn',
    timeRange: '5:30 AM – 10:00 AM',
    compactRange: '5:30–10:00',
    fullLabel: 'ভোর (5:30–10:00)',
    time: '05:30',
    tone: '#fb923c',
    Icon: Sunrise,
  },
  {
    id: 'morning',
    phaseId: 'morning',
    num: '2',
    bnLabel: 'সকাল',
    enLabel: 'Morning',
    timeRange: '10:01 AM – 2:00 PM',
    compactRange: '10:01–2:00',
    fullLabel: 'সকাল (10:01–2:00)',
    time: '10:01',
    tone: '#fbbf24',
    Icon: Sun,
  },
  {
    id: 'afternoon',
    phaseId: 'noon',
    num: '3',
    bnLabel: 'দুপুর',
    enLabel: 'Noon',
    timeRange: '2:01 PM – 6:00 PM',
    compactRange: '2:01–6:00',
    fullLabel: 'দুপুর (2:01–6:00)',
    time: '14:01',
    tone: '#38bdf8',
    Icon: SunMedium,
  },
  {
    id: 'night',
    phaseId: 'night',
    num: '4',
    bnLabel: 'রাত',
    enLabel: 'Night',
    timeRange: '6:01 PM – 10:00 PM',
    compactRange: '6:01–10:00',
    fullLabel: 'রাত (6:01–10:00)',
    time: '18:01',
    tone: '#a78bfa',
    Icon: MoonStar,
  },
  {
    id: 'late_night',
    phaseId: 'late_night',
    num: '5',
    bnLabel: 'গভীর রাত',
    enLabel: 'Deep Night',
    timeRange: '10:01 PM – 2:00 AM',
    compactRange: '10:01–2:00',
    fullLabel: 'গভীর রাত (10:01–2:00)',
    time: '22:01',
    tone: '#f472b6',
    Icon: Sparkles,
    isNew: true,
  },
];

export function getTaskTimeSlots(phaseMode = 'first4') {
  const mode = normalizePhaseMode(phaseMode);
  const spec = PHASE_MODE_OPTIONS.find((m) => m.id === mode) || PHASE_MODE_OPTIONS[0];
  return spec.slotIds.map((sid, idx) => {
    const base = ALL_TASK_TIME_SLOTS.find((s) => s.id === sid);
    return { ...base, num: BN_SLOT_NUMS[idx] || String(idx + 1) };
  });
}

// Default 4 slots preserved for backward compatibility
export const TASK_TIME_SLOTS = getTaskTimeSlots('first4');

export function slotMetaById(slotId) {
  const norm = slotId === 'noon' ? 'afternoon' : slotId === 'evening' ? 'night' : slotId;
  return ALL_TASK_TIME_SLOTS.find((s) => s.id === norm) || null;
}

export function inferSlotFromTime(timeStr) {
  const m = parseTaskTime(timeStr);
  if (m === null) return 'dawn';
  if (m >= 330 && m <= 600) return 'dawn';
  if (m >= 601 && m <= 840) return 'morning';
  if (m >= 841 && m <= 1080) return 'afternoon';
  if (m >= 1081 && m <= 1320) return 'night';
  if (m >= 1321 || (m >= 0 && m <= 120)) return 'late_night';
  return null;
}

const SLOT_ORDER_MAP = {
  dawn: 0,
  morning: 1,
  afternoon: 2,
  noon: 2,
  night: 3,
  late_night: 4,
};

export function slotForTask(task) {
  if (task?.timeSlot && slotMetaById(task.timeSlot)) {
    return slotMetaById(task.timeSlot);
  }
  if (task?.startTime) {
    return slotMetaById(inferSlotFromTime(task.startTime)) || slotMetaById('dawn');
  }
  return slotMetaById('dawn');
}

export function compareTimelineTasksDawnFirst(a, b) {
  const slotA = slotForTask(a)?.id || 'dawn';
  const slotB = slotForTask(b)?.id || 'dawn';
  const orderA = SLOT_ORDER_MAP[slotA] ?? 5;
  const orderB = SLOT_ORDER_MAP[slotB] ?? 5;
  if (orderA !== orderB) return orderA - orderB;

  const minA = parseTaskTime(a?.startTime);
  const minB = parseTaskTime(b?.startTime);
  const normA = minA === null ? 9999 : minA < 240 ? minA + 1440 : minA;
  const normB = minB === null ? 9999 : minB < 240 ? minB + 1440 : minB;
  if (normA !== normB) return normA - normB;

  if (
    a?.sprintLink &&
    b?.sprintLink &&
    Number.isFinite(a.scheduleOrder) &&
    Number.isFinite(b.scheduleOrder) &&
    a.scheduleOrder !== b.scheduleOrder
  ) {
    return a.scheduleOrder - b.scheduleOrder;
  }
  return String(a?.id || '').localeCompare(String(b?.id || ''));
}

export function TaskSlotPicker({ value, onChange, phaseMode = 'first4', ariaLabel = 'সময়ের প্রহর নির্বাচন করুন' }) {
  const slots = getTaskTimeSlots(phaseMode);
  const normalizedVal = value === 'noon' ? 'afternoon' : value;
  const current = slots.some((s) => s.id === normalizedVal)
    ? normalizedVal
    : slotMetaById(normalizedVal)?.id || slots[0]?.id || 'dawn';

  return (
    <div
      className={`premade-slot-grid ${slots.length === 5 ? 'is-five-slots' : ''}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {slots.map((slot) => {
        const Icon = slot.Icon;
        const selected = current === slot.id;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            key={slot.id}
            className={`premade-slot-btn ${selected ? 'selected' : ''}`}
            style={{ '--slot-tone': slot.tone }}
            onClick={() => onChange(slot)}
          >
            <span className="slot-icon-wrap">
              <Icon size={16} />
            </span>
            <span className="slot-copy">
              <strong>{slot.bnLabel}</strong>
              <small>{slot.compactRange}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function canonicalCategory(value) {
  const category = String(value || '').trim().toLowerCase();
  if (category === 'study' || category === '') return 'Study';
  if (category === 'revision') return 'Revision';
  if (category === 'exam prep' || category === 'exam preparation') return 'Exam Preparation';
  return null;
}

export function taskIconKey(task) {
  if (TASK_ICONS.some((icon) => icon.key === task?.previewTaskIcon)) return task.previewTaskIcon;
  const match = TASK_ICONS.find((icon) => icon.legacy === task?.icon);
  if (match) return match.key;
  const title = String(task?.title || '').toLowerCase();
  if (/physic/.test(title)) return 'atom';
  if (/chem|science/.test(title)) return 'flask';
  if (/math|calculus/.test(title)) return 'calculator';
  if (/biology/.test(title)) return 'dna';
  if (/account/.test(title)) return 'calculator';
  if (/financ|bank|insur/.test(title)) return 'banknote';
  if (/market|production/.test(title)) return 'factory';
  if (/statistic/.test(title)) return 'chart-column';
  if (/econom/.test(title)) return 'trending-up';
  if (/psycholog/.test(title)) return 'brain';
  if (/sociolog|social work/.test(title)) return 'users';
  if (/governance|civics/.test(title)) return 'scale';
  if (/logic/.test(title)) return 'network';
  if (/geograph|environment/.test(title)) return 'globe';
  if (/history/.test(title)) return 'landmark';
  if (/islamic/.test(title)) return 'sparkles';
  if (/business|management|organization/.test(title)) return 'building';
  if (/revis|recall|flashcard/.test(title)) return 'brain';
  return 'book';
}

export function TaskVectorIcon({ task, size = 18 }) {
  const subject = PREMADE_SUBJECTS.includes(task?.presetSubject)
    ? task.presetSubject
    : PREMADE_SUBJECTS.includes(task?.title)
    ? task.title
    : null;
  if (subject) return <PremiumSubjectIcon name={subject} size={size} />;
  const entry = TASK_ICONS.find((i) => i.key === taskIconKey(task)) || TASK_ICONS[0];
  const Icon = entry.Icon;
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" />;
}

export function parseTaskTime(time) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function timeFromMinutes(value) {
  const n = ((Math.round(Number(value) || 0) % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

export function displayTaskTime(value, explicitSlotId) {
  const slot = explicitSlotId
    ? slotMetaById(explicitSlotId)
    : value
    ? slotMetaById(inferSlotFromTime(value))
    : null;
  if (slot) return `${slot.bnLabel} (${slot.compactRange})`;
  return 'যেকোনো সময়';
}

export function defaultTaskTime() {
  return '09:00';
}

export function TaskCalendar({ value, onSelect, onClose }) {
  const container = useRef(null);
  const initial = dateFromKey(value);
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1, 12));
  const [focusKey, setFocusKey] = useState(value || toDateKey());
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const numberOfDays = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12).getDate();
  const shiftMonth = (offset) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
    setMonth(next);
    setFocusKey(civilDateKey(next));
  };
  const navigate = (e, key) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const next = addDays(
      dateFromKey(key),
      { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    );
    const nextKey = toDateKey(next);
    setFocusKey(nextKey);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1, 12));
    requestAnimationFrame(() => container.current?.querySelector(`[data-date="${nextKey}"]`)?.focus());
  };
  return (
    <div className="tp-picker-panel tp-calendar" ref={container} role="group" aria-label="Choose date">
      <div className="tp-calendar-heading">
        <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
          <ChevronLeft size={16} />
        </button>
        <strong aria-live="polite">{bnDate(month, { month: 'long', year: 'numeric' })}</strong>
        <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="tp-calendar-week">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="tp-calendar-grid">
        {Array.from({ length: first.getDay() }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: numberOfDays }, (_, i) => {
          const date = new Date(month.getFullYear(), month.getMonth(), i + 1, 12);
          const key = civilDateKey(date);
          const selected = key === value;
          return (
            <button
              type="button"
              data-date={key}
              key={key}
              className={selected ? 'selected' : ''}
              aria-pressed={selected}
              tabIndex={focusKey === key ? 0 : -1}
              onKeyDown={(e) => navigate(e, key)}
              onClick={() => onSelect(key)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="tp-picker-foot">
        <button type="button" onClick={() => onSelect(toDateKey())}>
          Today
        </button>
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export function TaskClock({ value, onChange, onClose, phaseMode = 'first4' }) {
  const currentSlot = inferSlotFromTime(value);
  return (
    <div className="tp-picker-panel tp-slot-panel" role="group" aria-label="Select Time Slot">
      <TaskSlotPicker
        phaseMode={phaseMode}
        value={currentSlot}
        onChange={(slot) => {
          onChange(slot.time);
          onClose?.();
        }}
      />
      <div className="tp-picker-foot">
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
