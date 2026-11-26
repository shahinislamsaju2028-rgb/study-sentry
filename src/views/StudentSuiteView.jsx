import { BanglaDateInput, BanglaTimeInput } from '../components/BanglaInputs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sprintTasksForViews } from '../utils/sprintProjection';
import {
  Target,
  Layers,
  Layers3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Check,
  Sunrise,
  Sun,
  SunMedium,
  MoonStar,
  Bell,
  BellRing,
  Clock3,
  Copy,
  Play,
  Sparkles,
  LayoutGrid,
  ListChecks,
  Columns3,
  Search,
  BookOpenCheck,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { getAcademicSubjectChoices } from '../utils/academicSubjects';
import { ModalShell } from '../components/Modals';
import { PreviewSubjectIcon } from '../components/PreviewSubjectIcon';
import SubjectCards from '../components/SubjectCards';
import { PREMADE_SUBJECTS, subjectName } from '../utils/premadeSubjects';
import CurriculumPicker, { loadCurriculum } from '../components/CurriculumPicker';
import SyllabusChecklist, {
  getChapterChecklist,
  getChapterTypes,
  chapterProgress,
  checklistProgress,
} from '../components/SyllabusChecklist';
import SyllabusChapterTree from '../components/SyllabusChapterTree';
import { taskHeading } from '../utils/taskHeading';
import { addDays, toDateKey, uid } from '../utils/seedData';
import { dateFromKey, daysUntil } from '../utils/stats';
import { bnChapterName, bnDate, bnDay, bnNum, bnSample, bnSubject } from '../utils/bangla';
import { subjectColor } from '../utils/subjectColors';

const SUITE_TABS = [
  { id: 'routine', bnLabel: 'সাপ্তাহিক রুটিন', icon: CalendarDays },
  { id: 'syllabus', bnLabel: 'সিলেবাস', icon: Layers3 },
  { id: 'exams', bnLabel: 'পরীক্ষা', icon: Target },
];

const ALL_PERIODS = [
  {
    key: 'dawn',
    label: 'ভোর',
    hint: '5:30 AM – 10:00 AM',
    tone: '#fb923c',
    Icon: Sunrise,
  },
  {
    key: 'morning',
    label: 'সকাল',
    hint: '10:01 AM – 2:00 PM',
    tone: '#fbbf24',
    Icon: Sun,
  },
  {
    key: 'afternoon',
    label: 'দুপুর',
    hint: '2:01 PM – 6:00 PM',
    tone: '#38bdf8',
    Icon: SunMedium,
  },
  {
    key: 'night',
    label: 'রাত',
    hint: '6:01 PM – 10:00 PM',
    tone: '#a78bfa',
    Icon: MoonStar,
  },
  {
    key: 'late_night',
    label: 'গভীর রাত',
    hint: '10:01 PM – 2:00 AM',
    tone: '#4f46e5',
    Icon: Sparkles,
  },
];

/**
 * The weekly routine always shows the FULL day — ভোর (dawn) থেকে গভীর রাত
 * (late night) — no matter which study-phase preset the timer uses. The
 * routine is a plan of the whole day; the phase preset only decides which
 * phases drive the focus timer.
 */
function periodsForPhaseMode() {
  return ALL_PERIODS;
}

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const EDITOR_META = { exam: ['পরীক্ষা', 'exams'], chapter: ['অধ্যায়', 'syllabus'] };
// Subjects that ship with a pre-made HSC chapter list. The list itself is
// scoped to the student's academic group by `getAcademicSubjectChoices`.
const CATALOG_SUBJECTS = [
  'Physics', 'Chemistry', 'Math', 'Biology',
  'History', 'Sociology', 'Economics', 'Psychology', 'Civics & Good Governance',
  'Logic', 'Geography & Environment', 'Islamic History & Culture', 'Social Work',
  'Accounting', 'Business Organization & Management', 'Finance, Banking & Insurance',
  'Production Management & Marketing', 'Statistics',
  'ICT', 'Bangla', 'English',
];

function SuiteEditor({ type, item, onClose }) {
  const { state, putItem, toast } = useStudy();
  const first = state.subjects[0]?.id || '';
  const titleRef = useRef(null);
  const meta = EDITOR_META[type];
  const sample = (key) =>
    key === 'targetScore' && state.isDemo
      ? bnNum(bnSample(item?.[key], state.isDemo))
      : bnSample(item?.[key], state.isDemo);
  const original = (key, value) => (value === sample(key) ? item?.[key] || '' : value);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => ({
    subjectId: first,
    dateKey: toDateKey(addDays(new Date(), 14)),
    title: '',
    targetScore: '',
    syllabusNote: '',
    chapter: '',
    chapters: [],
    paper: '',
    curriculumType: '',
    curriculumTopic: '',
    ...(item || {}),
    ...(item
      ? {
          title: sample('title'),
          targetScore: sample('targetScore'),
          syllabusNote: sample('syllabusNote'),
          chapter: sample('chapter'),
        }
      : {}),
  }));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const save = (e) => {
    e.preventDefault();
    if (type === 'exam') {
      if (!form.title.trim()) {
        setError('পরীক্ষার নাম লিখুন।');
        titleRef.current?.focus();
        return;
      }
      const id = item?.id || uid(type);
      const payload = {
        ...item,
        id,
        title: original('title', form.title.trim()),
        subjectId: form.subjectId,
        dateKey: form.dateKey,
        targetScore: original('targetScore', form.targetScore.trim()),
        syllabusNote: original('syllabusNote', form.syllabusNote.trim()),
      };
      putItem(meta[1], payload);
      toast(`${meta[0]} ${item ? 'আপডেট' : 'যোগ'} হয়েছে।`);
      onClose();
      return;
    }

    // Chapter — the student may have picked several chapters in one go.
    const picked = Array.isArray(form.chapters) && form.chapters.length
      ? form.chapters.map((c) => String(c || '').trim()).filter(Boolean)
      : form.chapter.trim()
        ? [form.chapter.trim()]
        : [];
    if (!picked.length) {
      setError('অধ্যায়ের নাম বেছে নিন বা লিখুন।');
      titleRef.current?.focus();
      return;
    }

    // Multi-chapter add: one syllabus entry per chapter.
    if (picked.length > 1 && !item) {
      const base = {
        subjectId: form.subjectId,
        paper: form.paper || '',
        curriculumType: form.curriculumType || '',
        curriculumTopic: form.curriculumTopic || '',
        theory: false,
        notes: false,
        practice: false,
        revised: false,
      };
      for (const name of picked) {
        putItem('syllabus', { ...base, id: uid('chapter'), chapter: name });
      }
      toast(`${bnNum(picked.length)}টি অধ্যায় যোগ হয়েছে।`);
      onClose();
      return;
    }

    const id = item?.id || uid(type);
    const payload = {
      ...item,
      id,
      subjectId: form.subjectId,
      paper: form.paper || '',
      curriculumType: form.curriculumType || '',
      curriculumTopic: form.curriculumTopic || '',
      chapter: original('chapter', picked[0]),
      theory: !!item?.theory,
      notes: !!item?.notes,
      practice: !!item?.practice,
      revised: !!item?.revised,
    };
    if (item) {
      const key = (x) => JSON.stringify([x.subjectId || '', x.paper || '', x.chapter || '']);
      const oldKey = key(item);
      const newKey = key(payload);
      if (oldKey !== newKey) {
        const history = { ...(item.checklistHistory || {}), [oldKey]: item.checklistDone || {} };
        payload.checklistHistory = history;
        payload.checklistDone = history[newKey] || {};
      }
    }
    putItem(meta[1], payload);
    toast(`${meta[0]} ${item ? 'আপডেট' : 'যোগ'} হয়েছে।`);
    onClose();
  };

  return createPortal(
    <ModalShell title={`${meta[0]} ${item ? 'সম্পাদনা' : 'যোগ করুন'}`} onClose={onClose} wide>
      <form
        onSubmit={save}
        onKeyDown={(e) => {
          if (
            !e.defaultPrevented &&
            e.key === 'Enter' &&
            e.target.tagName === 'INPUT' &&
            !e.target.closest('.cs-search')
          ) {
            e.preventDefault();
            save(e);
          }
        }}
      >
        <div className="form-group">
          <div className="form-label">বিষয়</div>
          <SubjectCards
            compact
            label="বিষয় নির্বাচন"
            subjects={state.subjects}
            value={subjectName(state.subjects, form.subjectId)}
            onSelect={(_name, sub) =>
              setForm((prev) => ({
                ...prev,
                subjectId: sub?.id || '',
                paper: '',
                chapter: '',
                curriculumType: '',
                curriculumTopic: '',
              }))
            }
          />
          {form.subjectId &&
            !PREMADE_SUBJECTS.includes(subjectName(state.subjects, form.subjectId)) && (
              <p className="legacy-task-note">
                {bnSubject(subjectName(state.subjects, form.subjectId))}
              </p>
            )}
        </div>
        {type === 'exam' && (
          <>
            <label className="form-label form-group">
              পরীক্ষার নাম
              <input
                ref={titleRef}
                className="form-input"
                value={form.title}
                onChange={(e) => {
                  set('title', e.target.value);
                  setError('');
                }}
                placeholder="যেমন: পদার্থবিজ্ঞান মডেল টেস্ট"
                maxLength="120"
                required
                autoFocus
              />
            </label>
            <div className="form-grid-2">
              <label className="form-label form-group">
                তারিখ
                <BanglaDateInput
                  className="form-input"
                  value={form.dateKey}
                  onChange={(e) => set('dateKey', e.target.value)}
                  required
                />
              </label>
              <label className="form-label form-group">
                লক্ষ্য নম্বর <span className="optional">(ঐচ্ছিক)</span>
                <input
                  className="form-input"
                  value={form.targetScore}
                  onChange={(e) => set('targetScore', e.target.value)}
                  placeholder="যেমন: ৯০%"
                  maxLength="40"
                />
              </label>
            </div>
            <label className="form-label form-group">
              সিলেবাস নোট <span className="optional">(ঐচ্ছিক)</span>
              <textarea
                className="form-textarea"
                rows="2"
                value={form.syllabusNote}
                onChange={(e) => set('syllabusNote', e.target.value)}
                placeholder="অধ্যায় বা সংক্ষিপ্ত নোট…"
              />
            </label>
          </>
        )}
        {type === 'chapter' && (
          <CurriculumPicker
            multi={!item}
            chapters={form.chapters || []}
            subject={subjectName(state.subjects, form.subjectId)}
            paper={form.paper}
            chapter={form.chapter}
            type={form.curriculumType}
            topic={form.curriculumTopic}
            onChange={(v) =>
              setForm((prev) => ({
                ...prev,
                paper: v.paper,
                chapter: v.chapter,
                chapters: v.chapters || [],
                curriculumType: v.type,
                curriculumTopic: v.topic,
              }))
            }
          />
        )}
        {error && (
          <p className="wr-form-error" role="alert">
            {error}
          </p>
        )}
        <button className="action-btn primary-emerald full-btn" type="button" onClick={save}>
          {item ? 'সংরক্ষণ করুন' : `${meta[0]} যোগ করুন`}
        </button>
      </form>
    </ModalShell>,
    document.body
  );
}

function SprintRoutineTasks({ tasks, compact = false }) {
  if (!tasks.length) return null;
  return (
    <div className={`wr-sprint-list v36-wr-manual-list ${compact ? 'compact' : ''}`}>
      {tasks.map((task) => {
        const tone = subjectColor(task.presetSubject || 'Class');
        return (
          <div className={`wr-sprint-task v36-wr-manual-item v37-wr-auto-item ${task.done ? 'is-done' : ''}`} key={task.id} style={{ '--manual-tone': tone }}>
            <span className="v36-wr-manual-mark"><Layers3 size={14}/></span>
            <div className="v36-wr-manual-copy">
              <strong title={taskHeading(task, [], false)}>{taskHeading(task, [], false)}</strong>
              <small title={bnSubject(task.presetSubject)}>
                <BookOpenCheck size={11} aria-hidden="true" />
                {bnSubject(task.presetSubject)}
              </small>
              <div className="v36-wr-manual-tags">
                <span><Sparkles size={10} aria-hidden="true" />{task.sprintLabel || task.activity || 'স্প্রিন্ট কাজ'}</span>
                {task.paper ? <span><BookOpenCheck size={10} aria-hidden="true" />{task.paper === '1' ? '১ম পত্র' : '২য় পত্র'}</span> : null}
              </div>
            </div>
            {task.done ? <span className="wr-sprint-done">✓</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function WeeklyRoutine({ state, setRoutine }) {
  const { todayKey, toast } = useStudy();
  const periods = useMemo(() => periodsForPhaseMode(), []);
  const todayName = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][dateFromKey(todayKey).getDay()];

  const [layoutMode, setLayoutMode] = useState('day');
  const [selectedDay, setSelectedDay] = useState(todayName);
  const [weekOffset, setWeekOffset] = useState(0);
  const [addingSlot, setAddingSlot] = useState(null);
  const [routineDraft, setRoutineDraft] = useState({ subject: '', paper: '', chapter: '', type: '', topic: '' });
  // Which phase card currently shows the small time popover.
  const [timeSlot, setTimeSlot] = useState(null);
  const [manualEditorSlot, setManualEditorSlot] = useState(null);

  useEffect(() => {
    setSelectedDay(todayName);
  }, [todayName]);

  const todayDate = dateFromKey(todayKey);
  const weekStart = addDays(todayDate, -((todayDate.getDay() + 1) % 7) + weekOffset * 7);
  const rows = DAYS.map((day, i) => ({
    ...((state.routine || []).find((row) => row.day === day) || { day }),
    routineDateKey: toDateKey(addDays(weekStart, i)),
  }));

  const sprintData = state.sprintData || {};
  const selectedSprint =
    (sprintData.sprints || []).find((x) => x.id === sprintData.selectedSprintId) ||
    (sprintData.sprints || []).at(-1);
  const startKey = rows[0].routineDateKey;
  const endKey = rows[6].routineDateKey;
  const sprintItems = useMemo(
    () =>
      selectedSprint
        ? sprintTasksForViews({ sprints: [selectedSprint] }, state.subjects || []).filter(
            (t) => t.dateKey >= startKey && t.dateKey <= endKey
          )
        : [],
    [selectedSprint, state.subjects, startKey, endKey]
  );
  const tasksFor = (row, key) =>
    sprintItems.filter((t) => t.dateKey === row.routineDateKey && t.timeSlot === key);

  const valueFor = (row, key) => {
    const raw = key === 'night' ? row.night ?? row.evening ?? '' : row[key] ?? '';
    return bnSample(raw, state.isDemo);
  };

  const currentRow = rows.find((r) => r.day === selectedDay) || { day: selectedDay };
  const quickSubjects = (state.subjects || []).slice(0, 7);

  const copyToNextDay = (fromDay) => {
    const idx = DAYS.indexOf(fromDay);
    const nextDay = DAYS[(idx + 1) % DAYS.length];
    const src = rows.find((r) => r.day === fromDay) || { day: fromDay };
    periods.forEach(({ key }) => {
      setRoutine(nextDay, key, valueFor(src, key));
      setRoutine(nextDay, `${key}Time`, src[`${key}Time`] || '');
    });
    toast(`${bnDay(fromDay)} → ${bnDay(nextDay)} কপি হয়েছে`);
  };

  return (
    <section className="v30-wr-shell">
      {/* ULTRA-MINIMAL UNIFIED COMMAND BAR (Zero status/reminder badge clutter!) */}
      <header className="v30-wr-topbar">
        <div className="v30-wr-title-side">
          <h3>সাপ্তাহিক রুটিন</h3>
        </div>

        <div className="v30-wr-actions-side">
          <div className="v30-wr-week-pill">
            <button
              type="button"
              aria-label="আগের সপ্তাহ"
              onClick={() => setWeekOffset((w) => w - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <strong>
              {bnDate(dateFromKey(startKey), { day: 'numeric', month: 'short' })} –{' '}
              {bnDate(dateFromKey(endKey), { day: 'numeric', month: 'short' })}
            </strong>
            <button
              type="button"
              aria-label="পরের সপ্তাহ"
              onClick={() => setWeekOffset((w) => w + 1)}
            >
              <ChevronRight size={15} />
            </button>
            {weekOffset !== 0 && (
              <button
                type="button"
                className="v30-wr-reset-wk"
                onClick={() => {
                  setWeekOffset(0);
                  setSelectedDay(todayName);
                }}
              >
                আজ
              </button>
            )}
          </div>

          <div className="v30-wr-view-seg" role="group" aria-label="ভিউ মোড">
            <button
              type="button"
              className={layoutMode === 'day' ? 'is-active' : ''}
              onClick={() => setLayoutMode('day')}
              title="দিন ভিউ"
            >
              <LayoutGrid size={14} />
              <span>দিন</span>
            </button>
            <button
              type="button"
              className={layoutMode === 'week' ? 'is-active' : ''}
              onClick={() => setLayoutMode('week')}
              title="সপ্তাহ ভিউ"
            >
              <Columns3 size={14} />
              <span>সপ্তাহ</span>
            </button>
          </div>

          {layoutMode === 'day' && (
            <button
              type="button"
              className="v30-wr-copy-btn"
              onClick={() => copyToNextDay(selectedDay)}
              title="পরের দিনে কপি করুন"
            >
              <Copy size={13} />
            </button>
          )}
        </div>
      </header>

      {layoutMode === 'day' ? (
        <>
          {/* Premium 7-Day Selector Strip — today is unmistakable */}
          <div className="v34-wr-day-strip" role="tablist" aria-label="সপ্তাহের দিন">
            {rows.map((r) => {
              const isSelected = r.day === selectedDay;
              const isToday = r.routineDateKey === todayKey;
              const planned = periods.filter(
                (p) =>
                  String(valueFor(r, p.key)).trim().length > 0 || tasksFor(r, p.key).length > 0
              ).length;
              return (
                <button
                  type="button"
                  role="tab"
                  key={r.day}
                  aria-selected={isSelected}
                  className={`v34-wr-day-card ${isSelected ? 'is-selected' : ''} ${
                    isToday ? 'is-today' : ''
                  }`}
                  onClick={() => setSelectedDay(r.day)}
                >
                  <span className="v34-wr-day-name">
                    {bnDay(r.day)}
                    {isToday && <em>আজ</em>}
                  </span>
                  <strong className="v34-wr-day-num">
                    {bnDate(dateFromKey(r.routineDateKey), { day: 'numeric', month: 'short' })}
                  </strong>
                </button>
              );
            })}
          </div>

          {/* Premium Phase Columns — each one a clearly highlighted, colour-coded card */}
          <div key={selectedDay} className="v34-wr-grid clean-view-stage">
            {periods.map(({ key, label, hint, tone, Icon }) => {
              const text = valueFor(currentRow, key);
              const timeVal = currentRow[`${key}Time`] || '';
              const reminderOn = Boolean(currentRow[`${key}Remind`]);
              const hasText = String(text).trim().length > 0;
              const sprintTasks = tasksFor(currentRow, key);
              const planned = hasText || sprintTasks.length > 0;

              return (
                <article
                  key={key}
                  className={`v34-wr-slot-card ${planned ? 'has-plan' : 'is-empty'}`}
                  style={{ '--period-tone': tone }}
                >
                  <span className="v34-wr-slot-glow" aria-hidden="true" />

                  <header className="v34-wr-slot-head">
                    <span className="v34-wr-slot-icon">
                      <Icon size={16} />
                    </span>
                    <div className="v34-wr-slot-title">
                      <h4>{label}</h4>
                      <small><Clock3 size={11} aria-hidden="true" />{hint}</small>
                    </div>
                    <span className={`v34-wr-slot-state ${planned ? '' : 'is-empty-state'}`}>
                      {planned && <ListChecks size={11} aria-hidden="true" />}
                      {planned ? `${bnNum(sprintTasks.length + (hasText ? 1 : 0))}টি` : ''}
                    </span>
                  </header>

                  <div className="v34-wr-slot-body">
                    {!planned && (
                      <div className="v45-wr-empty">
                        <Plus size={13} /> কোনো টাস্ক নেই
                      </div>
                    )}
                    <SprintRoutineTasks tasks={sprintTasks} />
                    {hasText && (() => {
                      const entries = String(text).split('||').map((entry) => entry.trim()).filter(Boolean);
                      return (
                        <div className="wr-sprint-list v36-wr-manual-list">
                          {entries.map((entry, entryIndex) => {
                            const parts = entry.split('·').map((part) => part.trim()).filter(Boolean);
                            const subject = parts.length > 1 ? parts[0] : '';
                            const chapter = parts.length > 1 ? parts[1] : parts[0];
                            const details = parts.length > 2 ? parts.slice(2) : [];
                            const tone = subjectColor(subject || 'Class');
                            return (
                              <div key={`${entryIndex}-${entry}`} className="wr-sprint-task v36-wr-manual-item" style={{ '--manual-tone': tone }}>
                                <div className="v36-wr-manual-copy">
                                  <strong title={chapter}>{chapter}</strong>
                                  <small title={subject ? bnSubject(subject) : 'ম্যানুয়াল পরিকল্পনা'}>
                                    <BookOpenCheck size={11} aria-hidden="true" />
                                    {subject ? bnSubject(subject) : 'ম্যানুয়াল পরিকল্পনা'}
                                  </small>
                                  {details.length > 0 && (
                                    <div className="v36-wr-manual-tags">
                                      {details.map((detail, i) => (
                                        <span key={`${detail}-${i}`}>
                                          <ListChecks size={10} aria-hidden="true" />
                                          {detail}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="v36-wr-manual-actions">
                                  <button type="button" className="v36-wr-manual-remove" aria-label={`${chapter} সম্পাদনা করুন`} title="সম্পাদনা" onClick={() => setManualEditorSlot(key)}><Pencil size={12}/></button>
                                  <button type="button" className="v36-wr-manual-remove" aria-label={`${chapter} রুটিন পরিকল্পনা মুছুন`} title="মুছুন" onClick={() => setRoutine(selectedDay, key, entries.filter((_, i) => i !== entryIndex).join(' || '))}><X size={13}/></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {(!hasText || manualEditorSlot === key) && (
                      <textarea
                        className="v34-wr-input v44-wr-note v34-wr-card-note"
                        aria-label={`${bnDay(selectedDay)} ${label}`}
                        rows={1}
                        value={text}
                        onFocus={() => setManualEditorSlot(key)}
                        onChange={(e) => {
                          setRoutine(selectedDay, key, e.target.value);
                          // Auto-grow: the box follows the text, it never
                          // becomes a big empty box.
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onBlur={(e) => {
                          setManualEditorSlot(null);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        placeholder="এই প্রহরের পরিকল্পনা লিখুন…"
                        maxLength={1000}
                      />
                    )}

                    <button type="button" className="v36-routine-open v44-wr-add-row" onClick={() => {
                      setRoutineDraft({ subject: quickSubjects[0]?.name || '', paper: '', chapter: '', type: '', topic: '' });
                      setAddingSlot(key);
                    }} title="প্রি-মেড বিষয়, অধ্যায় ও টপিক বেছে নিন" aria-label="প্রি-মেড বিষয়, অধ্যায় ও টপিক বেছে নিন">
                      <Plus size={13}/>
                      <span>যোগ করুন</span>
                    </button>
                    {addingSlot === key && createPortal(
                      <ModalShell
                        title={`${bnDay(selectedDay)} · ${label} পরিকল্পনা`}
                        eyebrow="রুটিনে যোগ করুন"
                        wide
                        className="v36-routine-modal"
                        onClose={() => setAddingSlot(null)}
                      >
                        <form className="v36-routine-form" onSubmit={(e) => {
                          e.preventDefault();
                          if (!routineDraft.subject || !routineDraft.chapter) return;
                          const entry = [routineDraft.subject, routineDraft.chapter, routineDraft.type, routineDraft.topic]
                            .filter(Boolean).join(' · ');
                          const existing = String(valueFor(currentRow, key)).trim();
                          const next = existing ? `${existing} || ${entry}` : entry;
                          setRoutine(selectedDay, key, next.slice(0, 1000));
                          setManualEditorSlot(null);
                          setAddingSlot(null);
                        }}>
                          <label className="v36-routine-subject-label">বিষয় বেছে নিন</label>
                          <SubjectCards
                            compact
                            label="বিষয় নির্বাচন"
                            subjectNames={(state.subjects || []).map((sub) => sub.name)}
                            subjects={state.subjects || []}
                            value={routineDraft.subject}
                            onSelect={(name) =>
                              setRoutineDraft((prev) => ({
                                ...prev,
                                subject: name,
                                paper: '',
                                chapter: '',
                                type: '',
                                topic: '',
                              }))
                            }
                          />
                          {routineDraft.subject ? (
                            <CurriculumPicker
                              subject={routineDraft.subject}
                              paper={routineDraft.paper}
                              chapter={routineDraft.chapter}
                              type={routineDraft.type}
                              topic={routineDraft.topic}
                              shortSprintChapter={false}
                              onChange={(next) => setRoutineDraft((prev) => ({ ...prev, ...next }))}
                            />
                          ) : <p className="v36-routine-hint">প্রথমে বিষয় নির্বাচন করুন।</p>}
                          <div className="v36-routine-actions">
                            <button className="v36-routine-add-btn" type="submit" disabled={!routineDraft.subject || !routineDraft.chapter}><Plus size={14}/> রুটিনে যোগ করুন</button>
                            <button type="button" onClick={() => setAddingSlot(null)}>বাতিল</button>
                          </div>
                        </form>
                      </ModalShell>,
                      document.body
                    )}
                  </div>

                  <footer className="v34-wr-slot-foot">
                    {/* Clock icon only — clicking it opens the small time
                        popover. When a time is set, the icon carries a tiny
                        amber mark instead of a whole "Select time" box. */}
                    <button
                      type="button"
                      className={`v34-wr-clock ${timeVal ? 'is-set' : ''}`}
                      aria-label={`${bnDay(selectedDay)} ${label} সময় ঠিক করুন`}
                      title={timeVal ? `সময়: ${timeVal}` : 'সময় ঠিক করুন'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTimeSlot({ day: selectedDay, key, anchor: e.currentTarget });
                      }}
                    >
                      <Clock3 size={14} />
                      {timeVal && <i className="v34-wr-clock-mark" aria-hidden="true" />}
                    </button>

                    {/* Bell toggle — no box around it, just the icon. */}
                    <button
                      type="button"
                      className={`v34-wr-bell ${reminderOn ? 'is-on' : ''}`}
                      aria-label={`${label} রিমাইন্ডার ${reminderOn ? 'বন্ধ' : 'চালু'} করুন`}
                      title={reminderOn ? 'রিমাইন্ডার চালু আছে' : 'রিমাইন্ডার চালু করুন'}
                      aria-pressed={reminderOn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoutine(selectedDay, `${key}Remind`, reminderOn ? '' : '1');
                      }}
                    >
                      {reminderOn ? <BellRing size={14} /> : <Bell size={14} />}
                    </button>

                    {timeVal && (
                      <span className="v34-wr-time-read"><Clock3 size={11} aria-hidden="true" />{timeVal}</span>
                    )}

                    {hasText && (
                      <button
                        type="button"
                        className="v34-wr-clear"
                        onClick={() => setRoutine(selectedDay, key, '')}
                        aria-label={`${label} পরিকল্পনা মুছুন`}
                        title="মুছুন"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </footer>

                  {/* Small time popover — no big box, no scrolling. */}
                  {timeSlot && timeSlot.day === selectedDay && timeSlot.key === key && (
                    <div
                      className="v44-wr-time-pop"
                      role="dialog"
                      aria-label="সময় বেছে নিন"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="v44-wr-time-head">
                        <strong>সময় বেছে নিন</strong>
                        <button
                          type="button"
                          aria-label="বন্ধ করুন"
                          onClick={() => setTimeSlot(null)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div className="v44-wr-time-grid">
                        {['05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '16:00', '17:00', '19:00', '20:00', '21:00', '22:00'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={timeVal === t ? 'is-active' : ''}
                            onClick={() => {
                              setRoutine(selectedDay, `${key}Time`, t);
                              setTimeSlot(null);
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <div className="v44-wr-time-foot">
                        <label>
                          <span>নিজে লিখুন</span>
                          <input
                            type="time"
                            value={timeVal}
                            onChange={(e) => setRoutine(selectedDay, `${key}Time`, e.target.value)}
                            aria-label={`${bnDay(selectedDay)} ${label} সময়`}
                          />
                        </label>
                        {timeVal && (
                          <button
                            type="button"
                            className="v44-wr-time-clear"
                            onClick={() => {
                              setRoutine(selectedDay, `${key}Time`, '');
                              setTimeSlot(null);
                            }}
                          >
                            মুছুন
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <section className="card wr-week-matrix-card clean-view-stage" aria-label="সাপ্তাহিক রুটিন">
          <div
            className="wr-matrix-head"
            style={{ gridTemplateColumns: `112px repeat(${periods.length}, minmax(0, 1fr))` }}
          >
            <span>দিন</span>
            {periods.map(({ key, label, tone, Icon }) => (
              <span key={key} className="wr-matrix-col-head" style={{ '--period-tone': tone }}>
                <Icon size={14} /> {label}
              </span>
            ))}
          </div>

          <div className="wr-matrix-rows">
            {rows.map((row) => {
              const isToday = row.routineDateKey === todayKey;
              return (
                <div
                  className={`wr-matrix-row ${isToday ? 'is-today' : ''}`}
                  key={row.day}
                  style={{ gridTemplateColumns: `112px repeat(${periods.length}, minmax(0, 1fr))` }}
                >
                  <button
                    type="button"
                    className="wr-matrix-day"
                    onClick={() => {
                      setSelectedDay(row.day);
                      setLayoutMode('day');
                    }}
                  >
                    <strong>{bnDay(row.day)}</strong>
                    <small>{bnDate(dateFromKey(row.routineDateKey), { day: 'numeric', month: 'short' })}</small>
                    {isToday && <em className="wr-today-tag">আজ</em>}
                  </button>

                  {periods.map(({ key, label, tone }) => {
                    const text = valueFor(row, key);
                    const sprintTasks = tasksFor(row, key);
                    return (
                      <div
                        className={`wr-matrix-cell ${
                          String(text).trim() || sprintTasks.length ? 'filled' : ''
                        }`}
                        key={key}
                        style={{ '--period-tone': tone }}
                      >
                        <SprintRoutineTasks compact tasks={sprintTasks} />
                        <textarea
                          aria-label={`${bnDay(row.day)} ${label}`}
                          rows={2}
                          value={text}
                          onChange={(e) => setRoutine(row.day, key, e.target.value)}
                          placeholder="—"
                          maxLength={180}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}

export default function StudentSuiteView() {
  const {
    state,
    suiteTab,
    setSuiteTab,
    patchItem,
    putItem,
    deleteItem,
    setRoutine,
    openModal,
    toast,
  } = useStudy();
  const [editor, setEditor] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [sylQuery, setSylQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  // The default always points at a subject that has a pre-made chapter list in
  // the SELECTED group — index 3 is the first group-specific subject, because
  // Bangla · English · ICT always occupy the first three slots.
  const [catalogSubject, setCatalogSubject] = useState(
    () => getAcademicSubjectChoices(state?.profile || {})[3] || 'Physics'
  );
  const [catalogPaper, setCatalogPaper] = useState('1');
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState(false);
  const [checkChapter, setCheckChapter] = useState(null);
  const [openChapter, setOpenChapter] = useState(null);

  // Only the subjects that belong to the selected group are offered here.
  const catalogSubjects = getAcademicSubjectChoices(state.profile || {}).filter((name) =>
    CATALOG_SUBJECTS.includes(name)
  );

  // When the student switches group, the previously selected subject may no
  // longer exist in the new group's chapter list — fall back to the first
  // catalog-backed subject of the new group so the picker is never empty.
  useEffect(() => {
    if (!catalogSubjects.length) return;
    if (catalogSubjects.includes(catalogSubject)) return;
    setCatalogSubject(catalogSubjects[0]);
  }, [catalogSubjects.join('|'), catalogSubject]);
  const showSyllabus = !['business', 'humanities'].includes(state.profile?.academicGroup);
  const visibleTabs = SUITE_TABS.filter((t) => showSyllabus || t.id !== 'syllabus');
  const activeTab = visibleTabs.some((t) => t.id === suiteTab) ? suiteTab : 'routine';

  useEffect(() => {
    if (activeTab !== 'syllabus') return undefined;
    let live = true;
    setCatalogError(false);
    loadCurriculum(state?.profile?.academicGroup)
      .then((x) => {
        if (live) setCatalog(x);
      })
      .catch(() => {
        if (live) setCatalogError(true);
      });
    return () => {
      live = false;
    };
  }, [activeTab]);

  const subject = (id) => state.subjects.find((s) => s.id === id);
  const subjectLabel = (id) => bnSubject(subject(id)?.name || 'General');

  const remove = (collection, item, label) =>
    openModal('confirm', {
      title: `${label} মুছে ফেলবেন?`,
      description: 'মুছে ফেলার পর এটি ফেরানো যাবে না।',
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
      onConfirm: () => {
        deleteItem(collection, item.id);
        toast(`${label} মুছে ফেলা হয়েছে।`);
      },
    });

  const checklistFor = (ch) => getChapterChecklist(catalog, subject(ch.subjectId)?.name, ch);
  const chapterTypes = (ch) => getChapterTypes(catalog, subject(ch.subjectId)?.name, ch);
  const progressFor = (ch) => {
    const types = chapterTypes(ch);
    if (types.length) {
      const p = chapterProgress(types, ch);
      if (p.total) return { ...p, legacy: false };
    }
    const list = checklistFor(ch);
    if (list.length) return { ...checklistProgress(list, ch.checklistDone), legacy: false };
    return { done: 0, total: 0, pct: 0, legacy: true };
  };

  const filteredChapters = useMemo(() => {
    const q = sylQuery.trim().toLowerCase();
    return (state.syllabus || []).filter((c) => {
      if (subjectFilter !== 'All' && c.subjectId !== subjectFilter) return false;
      if (!q) return true;
      return String(c.chapter || '').toLowerCase().includes(q);
    });
  }, [state.syllabus, subjectFilter, sylQuery]);

  const groups = [...state.subjects, { id: '', name: 'General', color: '#94a3b8' }]
    .map((s) => ({
      ...s,
      chapters: filteredChapters.filter(
        (c) => (state.subjects.some((sub) => sub.id === c.subjectId) ? c.subjectId : '') === s.id
      ),
    }))
    .filter((s) => s.chapters.length);

  const handleOneClickImport = async () => {
    const sub = state.subjects.find(
      (s) => String(s.name).toLowerCase() === catalogSubject.toLowerCase()
    );
    if (!sub) {
      toast('বিষয়টি পাওয়া যায়নি।');
      return;
    }
    let data = catalog;
    if (!data) {
      try {
        data = await loadCurriculum(state?.profile?.academicGroup);
        setCatalog(data);
      } catch {
        toast('সিলেবাস ক্যাটালগ লোড হয়নি।');
        return;
      }
    }
    const paperKey = catalogSubject === 'ICT' ? '' : catalogPaper;
    const list = data[catalogSubject]?.[paperKey] || [];
    const additions = list.filter(
      (c) =>
        !state.syllabus.some(
          (ex) =>
            ex.subjectId === sub.id &&
            ex.chapter === c.name &&
            String(ex.paper || '') === paperKey
        )
    );
    if (!additions.length) {
      toast('সব অধ্যায় আগেই যুক্ত আছে।');
      return;
    }
    for (const c of additions) {
      putItem('syllabus', {
        id: uid('chapter'),
        subjectId: sub.id,
        paper: paperKey,
        chapter: c.name,
        theory: false,
        notes: false,
        practice: false,
        revised: false,
      });
    }
    toast(`${bnSubject(catalogSubject)}-এর ${bnNum(additions.length)}টি অধ্যায় যুক্ত হয়েছে!`);
    setImportOpen(false);
  };

  return (
    <div className="view-page suite-page v30-suite-page v37-suite">
      {/* Clean 3-Tab Capsule Switcher (কাজের তালিকা removed!) */}
      <div className="v33-seg" role="tablist" aria-label="Student Suite">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`v33-seg-tab ${active ? 'is-active' : ''}`}
              onClick={() => setSuiteTab(tab.id)}
            >
              <span className="v33-seg-ico">
                <Icon size={16} />
              </span>
              <span>{tab.bnLabel}</span>
            </button>
          );
        })}
      </div>

      <div key={activeTab} className="suite-stage-clean clean-view-stage">
        {activeTab === 'routine' && <WeeklyRoutine state={state} setRoutine={setRoutine} />}

        {activeTab === 'syllabus' && (
          <section className="v30-syl-shell">
            {/* Executive Syllabus Header */}
            <header className="v30-syl-hero">
              <div className="v30-syl-hero-left v59-syl-hero-copy">
                <div>
                  <h3>HSC সিলেবাস ট্র্যাকার</h3>
                  <span className="v30-syl-subcount">
                    মোট {bnNum(state.syllabus.length)}টি অধ্যায় ট্র্যাক হচ্ছে
                  </span>
                </div>
              </div>

              <div className="v30-syl-hero-actions">
                {/* 6.txt · ⓶⓺ — "প্রি-মেইড সিলেবাস" is gone. The brief is a
                    syllabus you build yourself: one way in, অধ্যায় যোগ. The
                    importer state stays in the file (untouched, unreferenced by
                    this button) so nothing else that reads it breaks. */}
                <button
                  type="button"
                  className="v30-glow-btn v59-syl-add-btn"
                  onClick={() => setEditor({ type: 'chapter' })}
                >
                  <Plus size={15} /> অধ্যায় যোগ
                </button>
              </div>
            </header>

            {/* 1-Click Pre-made HSC Syllabus Drawer */}
            {importOpen || state.syllabus.length === 0 ? (
              <div className="v30-syl-importer">
                <div className="v30-syl-imp-top">
                  <strong>১-ক্লিকে সম্পূর্ণ পত্রের অধ্যায় যুক্ত করুন</strong>
                  {state.syllabus.length > 0 && (
                    <button
                      type="button"
                      className="v30-wr-x"
                      onClick={() => setImportOpen(false)}
                      aria-label="বন্ধ"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="v30-syl-imp-subjects">
                  <SubjectCards
                    compact
                    label="সিলেবাসের বিষয়"
                    subjectNames={catalogSubjects}
                    subjects={state.subjects || []}
                    value={catalogSubject}
                    onSelect={(name) => {
                      setCatalogSubject(name);
                      setCatalogPaper(name === 'ICT' ? '' : '1');
                    }}
                  />
                </div>

                <div className="v30-syl-imp-foot">
                  {catalogSubject !== 'ICT' ? (
                    <div className="v30-syl-paper-seg">
                      <button
                        type="button"
                        className={catalogPaper === '1' ? 'is-active' : ''}
                        onClick={() => setCatalogPaper('1')}
                      >
                        ১ম পত্র
                      </button>
                      <button
                        type="button"
                        className={catalogPaper === '2' ? 'is-active' : ''}
                        onClick={() => setCatalogPaper('2')}
                      >
                        ২য় পত্র
                      </button>
                    </div>
                  ) : (
                    <span className="v30-syl-subcount">একক পত্র · সম্পূর্ণ তালিকা</span>
                  )}

                  <button type="button" className="v30-glow-btn" onClick={handleOneClickImport}>
                    <Sparkles size={14} /> সব অধ্যায় যোগ করুন
                  </button>
                </div>
              </div>
            ) : null}

            {/* Clean Subject Tab Rail + Instant Chapter Search */}
            {state.syllabus.length > 0 && (
              <nav className="v32-syl-nav" aria-label="সিলেবাস বিষয় পরিরাতা">
                <div className="v33-seg" role="tablist" aria-label="সিলেবাস বিষয়">
                  {[{ id: 'All', name: 'সব বিষয়' }, ...state.subjects].map((s) => {
                    const count =
                      s.id === 'All'
                        ? state.syllabus.length
                        : state.syllabus.filter((c) => c.subjectId === s.id).length;
                    if (s.id !== 'All' && count === 0) return null;
                    const active = subjectFilter === s.id;
                    /* Each tab wears its subject's own colour — the same
                       `subjectColor()` the sprint picker and the group bands
                       use — so a student recognises Physics by its blue before
                       reading the word. 'All' stays neutral: it is not a
                       subject. */
                    const tabTone = s.id === 'All' ? null : subjectColor(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        data-subject-tone={tabTone ? 'on' : undefined}
                        style={tabTone ? { '--sub-tone': tabTone } : undefined}
                        className={`v33-seg-tab v32-syl-tab ${
                          tabTone ? 'is-toned' : ''
                        } ${active ? 'is-active' : ''}`}
                        onClick={() => setSubjectFilter(s.id)}
                      >
                        <span className="v32-syl-tab-icon" aria-hidden="true">
                          {s.id === 'All' ? (
                            <Layers3 size={13} />
                          ) : (
                            <PreviewSubjectIcon subject={s} size={14} />
                          )}
                        </span>
                        <span className="v32-syl-tab-name">
                          {s.id === 'All' ? s.name : bnSubject(s.name)}
                        </span>
                        <span className="v33-seg-badge">{bnNum(count)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 4-2.txt ⑤ — the "অধ্যায় খুঁনু" box in the syllabus is gone.
                    The subject tabs plus the chapter count already scope the
                    list; a search field for a list you can see at a glance was
                    just one more thing to tab past. sylQuery stays in the
                    component (always empty) so the filter logic is untouched. */}
              </nav>
            )}

            {/* Grouped Modern Chapter Cards */}
            {groups.length > 0 ? (
              <div className="v30-syl-groups">
                {groups.map((s) => {
                  const avgPct = Math.round(
                    s.chapters.reduce((n, ch) => n + progressFor(ch).pct, 0) / s.chapters.length
                  );
                  const tone = subjectColor(s.name);
                  return (
                    <section
                      className="v30-syl-group-card"
                      key={s.id || 'general'}
                      style={{ '--sub-tone': tone }}
                    >
                      <header className="v30-syl-group-head">
                        <div className="v30-syl-group-title-wrap">
                          <span className="v30-syl-sub-icon">
                            <PreviewSubjectIcon subject={s} size={18} />
                          </span>
                          <div>
                            <h4>{bnSubject(s.name)}</h4>
                            <small>{bnNum(s.chapters.length)}টি অধ্যায়</small>
                          </div>
                        </div>

                        <div className="v30-syl-group-meter">
                          <div className="v30-syl-group-rail">
                            <i style={{ width: `${avgPct}%` }} />
                          </div>
                          <strong>{bnNum(avgPct)}%</strong>
                        </div>
                      </header>

                      <div className="v30-syl-ch-grid">
                        {s.chapters.map((ch) => {
                          /* 5.txt ① — the card is rebuilt around three things
                             the old one could not say:
                               · the chapter's NAME, in Bengali, without a number
                               · how many TYPES it splits into and how many are
                                 finished — as filled pips, not a text badge
                               · what clicking "সম্পন্ন" actually opens
                             It also carries its own colour, taken from the
                             subject, so a grid of chapters reads as one family
                             rather than eight identical grey plates. */
                          const title = bnChapterName(bnSample(ch.chapter, state.isDemo));
                          const prog = progressFor(ch);
                          const types = chapterTypes(ch);
                          const checklistItems = checklistFor(ch);
                          const typeStates = types.map((type) => {
                            const items = checklistItems.filter((item) => item.group === type.name);
                            const done = items.filter((item) => Boolean((ch.checklistDone || {})[item.id])).length;
                            return {
                              type,
                              done,
                              total: items.length,
                              selected: done > 0,
                              complete: items.length > 0 && done === items.length,
                            };
                          });
                          const typeDone = typeStates.filter((item) => item.complete).length;
                          const donePct = Math.max(0, Math.min(100, prog.pct || 0));
                          return (
                            <article
                              className={`v30-syl-ch-card v52-ch-card ${donePct === 100 ? 'is-complete' : ''}`}
                              key={ch.id}
                              style={{ '--sub-tone': tone }}
                            >
                              {/* ── head: name + percent ring ─────────────── */}
                              <div className="v52-ch-head">
                                <div className="v52-ch-titles">
                                  {ch.paper && (
                                    <span className="v52-ch-paper">
                                      {ch.paper === '1' ? '১ম পত্র' : '২য় পত্র'}
                                    </span>
                                  )}
                                  <h5>
                                    <BookOpenCheck size={15} aria-hidden="true" />
                                    <span>{title}</span>
                                  </h5>
                                </div>
                                <div
                                  className="v52-ch-ring v59-ch-progress"
                                  style={{ '--chapter-progress': `${donePct}%` }}
                                  role="progressbar"
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={donePct}
                                  aria-label={`${title} — ${bnNum(donePct)}% সম্পন্ন`}
                                >
                                  <b>{bnNum(donePct)}<i>%</i></b>
                                </div>
                              </div>

                              {/* The rounded type chip opens the full-screen type/topic checklist. */}
                              <button
                                type="button"
                                className="v52-ch-types v59-ch-types-chip"
                                aria-haspopup="dialog"
                                aria-label={`${title} — ${bnNum(types.length)}টি টাইপ, ${bnNum(typeDone)}টি সম্পন্ন; বিস্তারিত দেখুন`}
                                onClick={() => setCheckChapter(ch.id)}
                              >
                                <span className="v52-ch-types-label">
                                  <Layers size={12} />
                                  <b>{bnNum(types.length)}</b> টাইপ
                                </span>
                                <span className="v52-ch-pips" aria-hidden="true">
                                  {typeStates.length === 0 ? (
                                    <i className="is-empty" />
                                  ) : (
                                    typeStates.map(({ type, selected, complete }, ti) => (
                                      <i
                                        key={type.id || type.name || ti}
                                        className={`${complete ? 'is-done' : ''} ${selected && !complete ? 'is-partial' : ''}`.trim()}
                                      />
                                    ))
                                  )}
                                </span>
                                <span className="v52-ch-types-done">
                                  {bnNum(typeDone)}/{bnNum(types.length)} সম্পন্ন
                                </span>
                                <ChevronRight className="v59-ch-types-arrow" size={13} aria-hidden="true" />
                              </button>

                              {/* ── topic line + the click target ─────────── */}
                              <div className="v52-ch-foot">
                                <span className="v52-ch-topics">
                                  <ListChecks size={13} />
                                  <b>{bnNum(prog.done)}</b>
                                  <span className="v52-ch-slash">/</span>
                                  <b>{bnNum(prog.total)}</b>
                                  টপিক
                                </span>

                                <button
                                  type="button"
                                  className="v52-ch-open"
                                  aria-label={`${title} — টপিক তালিকা খুলুন`}
                                  onClick={() => setCheckChapter(ch.id)}
                                >
                                  সম্পন্ন দেখুন
                                  <ChevronRight size={13} />
                                </button>
                              </div>

                              <div className="v52-ch-bar" aria-hidden="true">
                                <i style={{ width: `${donePct}%` }} />
                              </div>

                              <div className="v52-ch-tools">
                                <button
                                  type="button"
                                  aria-label={`Edit ${title}`}
                                  onClick={() => setEditor({ type: 'chapter', item: ch })}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete ${title}`}
                                  onClick={() => remove('syllabus', ch, 'অধ্যায়')}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              {/* Chapter -> টাইপ -> সাব টপিক -> সাব টাইপ.
                                  The old ক্লাস/লেকচার/প্র্যাকটিস/রিভিশন stage pills
                                  and the ফোকাস button are gone: the student now
                                  expands the chapter and ticks off what is done. */}
                              {/* the in-place topic tree keeps its own toggle; the
                                  paper tag now lives in the card head, so this row
                                  is just the expander */}
                              <button
                                type="button"
                                className={`v52-ch-expand ${openChapter === ch.id ? 'is-open' : ''}`}
                                aria-expanded={openChapter === ch.id}
                                onClick={() =>
                                  setOpenChapter((prev) => (prev === ch.id ? null : ch.id))
                                }
                              >
                                <ChevronRight className="v52-ch-caret" size={13} />
                                {openChapter === ch.id ? 'টপিক লুকান' : 'টপিক দেখুন'}
                              </button>

                              {openChapter === ch.id && (
                                <SyllabusChapterTree
                                  chapter={ch}
                                  types={chapterTypes(ch)}
                                  onToggleTopic={(topicId) =>
                                    patchItem('syllabus', ch.id, {
                                      checklistDone: {
                                        ...(ch.checklistDone || {}),
                                        [topicId]: !(ch.checklistDone || {})[topicId],
                                      },
                                    })
                                  }
                                  onAddSubtype={(topicId, label) =>
                                    patchItem('syllabus', ch.id, {
                                      customSubtypes: {
                                        ...(ch.customSubtypes || {}),
                                        [topicId]: [
                                          ...((ch.customSubtypes || {})[topicId] || []),
                                          { id: `c${Date.now().toString(36)}`, label, done: false },
                                        ],
                                      },
                                    })
                                  }
                                  onToggleSubtype={(topicId, itemId) =>
                                    patchItem('syllabus', ch.id, {
                                      customSubtypes: {
                                        ...(ch.customSubtypes || {}),
                                        [topicId]: ((ch.customSubtypes || {})[topicId] || []).map((it) =>
                                          it.id === itemId ? { ...it, done: !it.done } : it
                                        ),
                                      },
                                    })
                                  }
                                  onRemoveSubtype={(topicId, itemId) =>
                                    patchItem('syllabus', ch.id, {
                                      customSubtypes: {
                                        ...(ch.customSubtypes || {}),
                                        [topicId]: ((ch.customSubtypes || {})[topicId] || []).filter(
                                          (it) => it.id !== itemId
                                        ),
                                      },
                                    })
                                  }
                                />
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : state.syllabus.length > 0 ? (
              <div className="v30-jn-empty">
                <Layers3 size={22} />
                <span>কোনো অধ্যায় পাওয়া যায়নি</span>
              </div>
            ) : null}
          </section>
        )}

        {checkChapter && state.syllabus.find((c) => c.id === checkChapter) && (
          <SyllabusChecklist
            chapter={state.syllabus.find((c) => c.id === checkChapter)}
            subject={subject(state.syllabus.find((c) => c.id === checkChapter).subjectId)?.name}
            catalog={catalog}
            loadError={catalogError}
            onClose={() => setCheckChapter(null)}
            onChange={(checks) => patchItem('syllabus', checkChapter, { checklistDone: checks })}
          />
        )}

        {activeTab === 'exams' && (
          <section>
            <div className="suite-section-head">
              <h3>
                পরীক্ষার সূচি <span>{bnNum(state.exams.length)}</span>
              </h3>
              <button
                type="button"
                className="v30-glow-btn"
                onClick={() => setEditor({ type: 'exam' })}
              >
                <Plus size={15} /> পরীক্ষা যোগ
              </button>
            </div>
            {state.exams.length ? (
              <div className="suite-grid-cards">
                {[...state.exams]
                  .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
                  .map((exam) => {
                    const d = daysUntil(exam.dateKey);
                    const s = subject(exam.subjectId);
                    const title = bnSample(exam.title, state.isDemo);
                    return (
                      <article className="card exam-card" key={exam.id}>
                        <div className="suite-card-top">
                          <span className="subject-tag" style={{ color: s?.color || '#aebdca' }}>
                            <PreviewSubjectIcon subject={s} size={15} /> {subjectLabel(exam.subjectId)}
                          </span>
                          <div className="suite-card-actions">
                            <button
                              className="plain-icon"
                              aria-label={`Edit ${title}`}
                              onClick={() => setEditor({ type: 'exam', item: exam })}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="plain-icon"
                              aria-label={`Delete ${title}`}
                              onClick={() => remove('exams', exam, 'পরীক্ষা')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <h4>{title}</h4>
                        {exam.syllabusNote && <p>{bnSample(exam.syllabusNote, state.isDemo)}</p>}
                        <div className="exam-card-bottom">
                          <div>
                            <strong>
                              {d < 0 ? 'সম্পন্ন' : d === 0 ? 'আজ' : bnNum(d)}
                            </strong>
                            {d > 0 && <span>দিন বাকি</span>}
                          </div>
                          <div className="exam-meta">
                            <span>
                              <CalendarDays size={14} />{' '}
                              {bnDate(dateFromKey(exam.dateKey), {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            {exam.targetScore && (
                              <span>
                                <Target size={14} /> {bnNum(bnSample(exam.targetScore, state.isDemo))}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
              </div>
            ) : (
              <div className="card suite-empty">
                <div>
                  <Target size={24} />
                </div>
                <h3>কোনো পরীক্ষা নির্ধারিত নেই</h3>
                <button
                  type="button"
                  className="v30-glow-btn"
                  onClick={() => setEditor({ type: 'exam' })}
                >
                  <Plus size={15} /> পরীক্ষা যোগ
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {editor && (
        <SuiteEditor
          key={`${editor.type}-${editor.item?.id || 'new'}`}
          type={editor.type}
          item={editor.item}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
