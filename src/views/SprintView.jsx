import SprintNameDropdown, { SprintCustomNameInput, SprintOverloadChip } from '../components/SprintNameDropdown';
import CustomSelect from '../components/CustomSelect';
import SprintChapterMultiPicker from '../components/SprintChapterMultiPicker';
import { TaskSlotPicker, slotMetaById } from '../components/TodoPreviewControls';
import {
  generateSprintSchedule,
  compareSprintItems,
  sprintChapterName,
  sprintItemTitle,
  PREMADE_SPRINT_NAMES,
  sprintGroupsWithOverrides,
} from '../utils/sprintSchedule';
import { BanglaDateInput, BanglaNumberInput, BanglaTimeInput } from '../components/BanglaInputs';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ModalShell } from '../components/Modals';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  Check,
  ChevronDown,
  Pencil,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  Layers3,
  Play,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { toDateKey } from '../utils/seedData';
import { bnDate, bnDay, bnNum, bnSample, bnSubject, bnTask } from '../utils/bangla';
import { dateFromKey } from '../utils/stats';
import { formatActivityLabel } from '../utils/subjectActivities';
import SprintContextMenu from '../components/SprintContextMenu';
import { PreviewSubjectIcon } from '../components/PreviewSubjectIcon';
import SprintMinutesControl from '../components/SprintMinutesControl';
import { subjectColor } from '../utils/subjectColors';
import { getAcademicSubjectChoices } from '../utils/academicSubjects';

const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const dayDiff = (a, b) =>
  Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
const addDaysKey = (d, n) => {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() + n);
  return toDateKey(x);
};
const fmtDate = (d) =>
  d ? bnDate(dateFromKey(d), { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtShortDate = (d) =>
  d ? bnDate(dateFromKey(d), { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
const todayStr = () => toDateKey();
const sprintEndMs = (sp) =>
  sp?.end ? new Date(`${sp.end}T${sp.endTime || '23:59'}:00`).getTime() : null;
const cleanData = (d) =>
  d && Array.isArray(d.sprints) ? d : { sprints: [], selectedSprintId: null };

function sprintCountdown(sp, now) {
  const end = sprintEndMs(sp);
  if (!end) return null;
  const sec = Math.max(0, Math.floor((end - now) / 1000));
  return {
    expired: sec === 0,
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    mins: Math.floor((sec % 3600) / 60),
  };
}

export function SprintOverviewSummary({ onOpenSprint }) {
  const { state, now } = useStudy();
  const data = cleanData(state.sprintData);
  const sprint =
    data.sprints.find((s) => s.id === data.selectedSprintId) || data.sprints.at(-1) || null;
  const cd = sprintCountdown(sprint, now);
  const today = todayStr();

  if (!sprint) {
    return (
      <section className="card sp-yb-summary-card">
        <div className="sp-yb-summary-head">
          <div className="clean-icon-heading">
            <Rocket size={19} className="sp-icon-yellow" />
            <h3>স্প্রিন্ট প্ল্যানার</h3>
          </div>
          <button type="button" className="sp-yb-cta-btn" onClick={onOpenSprint}>
            <Plus size={14} /> অনবোর্ডিং শুরু করুন
          </button>
        </div>
      </section>
    );
  }

  const classes = sprint.classes || [];
  const tasks = sprint.tasks || [];
  const all = [...classes, ...tasks];
  const done = all.filter((x) => x.done).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const late = all.filter((x) => !x.done && (!x.date || x.date < today)).length;

  return (
    <section className="card sp-yb-summary-card">
      <div className="sp-yb-summary-head">
        <div className="clean-icon-heading">
          <Rocket size={19} className="sp-icon-yellow" />
          <h3>{bnSample(sprint.name, state.isDemo)}</h3>
        </div>
        <button type="button" className="sp-yb-cta-btn" onClick={onOpenSprint}>
          শিডিউল দেখুন <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="sp-yb-kpi-row">
        <div className="sp-yb-kpi yellow">
          <span>সময় বাকি</span>
          <strong>
            {cd?.expired ? 'সময় পূর্ণ' : `${bnNum(cd?.days ?? 0)}d ${bnNum(cd?.hours ?? 0)}h`}
          </strong>
        </div>
        <div className="sp-yb-kpi blue">
          <span>ক্লাস</span>
          <strong>
            {bnNum(classes.filter((c) => c.done).length)} / {bnNum(classes.length)}
          </strong>
        </div>
        <div className="sp-yb-kpi yellow">
          <span>অনুশীলন ধাপ</span>
          <strong>
            {bnNum(tasks.filter((t) => t.done).length)} / {bnNum(tasks.length)}
          </strong>
        </div>
        <div className="sp-yb-kpi blue">
          <span>অগ্রগতি {late > 0 ? `(বাকি ${bnNum(late)})` : ''}</span>
          <strong>{bnNum(pct)}%</strong>
        </div>
      </div>
    </section>
  );
}

/**
 * Identity of a schedule item that survives a regeneration — used to carry the
 * "done" state across an edit.
 */
const semanticKey = (item) =>
  [
    item?.moduleId || '',
    item?.chapter || '',
    item?.phaseId || '',
    item?.kind === 'Practice'
      ? 'practice'
      : item?.kind === 'Revision'
        ? 'revision'
        : item?.kind === 'Lecture Sheet Review'
          ? 'lecture'
          : item?.title || '',
    item?.title || '',
  ].join('|');

export default function SprintView({ embedded = false, editSprintId = null, onEditHandled = null }) {
  const { state, commit, now, prepareFocus, timer, toast, openModal, phaseMode } = useStudy();
  const SUBJECTS = getAcademicSubjectChoices(state.profile || {});
  const data = cleanData(state.sprintData);
  const sprint =
    data.sprints.find((s) => s.id === data.selectedSprintId) || data.sprints.at(-1) || null;

  // Clean read-only schedule modes after onboarding: 'today' | 'weekly' | 'overall' | 'onboarding'
  const [viewMode, setViewMode] = useState('today');
  const [weekOffset, setWeekOffset] = useState(0);

  // Measured width of the chapter columns → the phase rail claims the rest.
  // 3 columns on a wide screen, 2 when the window gets tight (per the brief:
  // 2–3 columns, every box as wide as the longest chapter in it).
  const [chpCol, setChpCol] = useState(210);
  const [chpPerRow, setChpPerRow] = useState(3);
  useEffect(() => {
    const fit = () => setChpPerRow(window.innerWidth >= 1320 ? 3 : 2);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Right-click menu on a sprint + the sprint currently being edited.
  const [ctxMenu, setCtxMenu] = useState(null);
  const [editingSprintId, setEditingSprintId] = useState(null);
  // The title dropdown locks while a sprint is being edited and shows a small
  // marker when it comes back to life.
  const [justUnlockedName, setJustUnlockedName] = useState(false);
  const [heroMenuOpen, setHeroMenuOpen] = useState(false);

  // Modern 1-Click Onboarding State — Pre-made Durations + Auto Dates (ends at 12:00 AM / 23:59)
  const DURATION_PRESETS = [5, 7, 10, 15, 20, 30, 45, 60];
  // One distinct colour per subject tile (no colour is reused).
// One hue per subject, identical to the Focus-nav subject chips so a subject
// looks the same everywhere in the app.  Math/Math-2 share the amber slot
// because they are one subject to the student ("ম্যাথ").
const SUBJECT_TILE_TONES = {
  Bangla: '#fa818f',
  English: '#f07bc3',
  ICT: '#36cfe9',
  Physics: '#48c8ff',
  Chemistry: '#b19aff',
  Math: '#ffbd48',
  'Higher Math': '#ffbd48',
  Biology: '#48d3ab',
  Accounting: '#7fd4a8',
  'Business Organization & Management': '#f2c56b',
  'Finance, Banking & Insurance': '#78c7f5',
  'Production Management & Marketing': '#f0a06a',
  Statistics: '#a3b8f7',
  Economics: '#8fd39a',
  History: '#e8b473',
  'Islamic History & Culture': '#7fd1c1',
  'Civics & Good Governance': '#9fb8f0',
  Logic: '#c4a2f0',
  'Geography & Environment': '#6fd0c4',
  Psychology: '#f2a6d8',
  Sociology: '#f0a3c4',
  'Social Work': '#f59fb0',
  Class: '#cad0e5',
};

const CLASS_COUNT_PRESETS = [3, 5, 8, 10, 12, 15, 20];
  const CLASS_MIN_PRESETS = [45, 60, 75, 90, 120];
  const defaultPhaseSlot = phaseMode === 'last4' ? 'morning' : 'dawn';
  const [selectedDays, setSelectedDays] = useState(15);
  const [sessionsPerDay, setSessionsPerDay] = useState(3);
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [form, setForm] = useState(() => ({
    name: PREMADE_SPRINT_NAMES[0],
    start: todayStr(),
    end: addDaysKey(todayStr(), 14),
    endTime: '23:59',
  }));

  const applyDurationDays = (days, baseStart = form.start || todayStr()) => {
    const cleanDays = Math.max(1, Math.min(365, Math.round(Number(days) || 15)));
    setSelectedDays(cleanDays);
    setForm((prev) => ({
      ...prev,
      start: baseStart,
      end: addDaysKey(baseStart, cleanDays - 1),
      endTime: '23:59',
    }));
  };

  const computedTotalDays = useMemo(() => {
    if (!form.start || !form.end || form.end < form.start) return selectedDays;
    const a = new Date(`${form.start}T12:00:00`).getTime();
    const b = new Date(`${form.end}T12:00:00`).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [form.start, form.end, selectedDays]);

  // The draft starts on the student's OWN first subject (never a hard-coded
  // Physics), so a business / humanities student sees a populated chapter grid
  // straight away.
  const defaultSubject = SUBJECTS[0] || 'Physics';
  const [moduleDraft, setModuleDraft] = useState(() => ({
    subject: defaultSubject,
    chapter: '',
    chapters: [],
    paper: '1',
    curriculumType: '',
    curriculumTopic: '',
    classCount: 5,
    classMin: 60,
    reviewMin: 30,
    practiceMin: 45,
    phaseId: defaultPhaseSlot,
  }));

  const [draftCurriculum, setDraftCurriculum] = useState([]);

  const today = todayStr();
  const cd = sprintCountdown(sprint, now);

  const save = (fn) =>
    commit((prev) => ({
      ...prev,
      sprintData: fn(cleanData(prev.sprintData)),
    }));

  // Pre-made titles can be renamed by the student (right-click → এডিট).
  // The overrides live in state.sprintData.nameOverrides so they persist with
  // the rest of the sprint data and never fork into a second control.
  const nameOverrides = data.nameOverrides || {};
  const navNameGroups = useMemo(() => sprintGroupsWithOverrides(nameOverrides), [nameOverrides]);
  const navNames = useMemo(
    () => (navNameGroups.length ? navNameGroups.flatMap((g) => g.names) : PREMADE_SPRINT_NAMES),
    [navNameGroups]
  );
  const renamePreset = (original, nextName) => {
    save((d) => {
      const map = { ...(d.nameOverrides || {}) };
      if (!nextName) delete map[original];
      else map[original] = nextName;
      return { ...d, nameOverrides: map };
    });
    // keep the form in sync when the currently-picked preset is renamed
    setForm((f) => {
      if (!nextName) return f;
      const shown = nameOverrides[original] || original;
      return f.name === shown ? { ...f, name: nextName } : f;
    });
    toast(nextName ? 'প্রি-মেইড নাম এডিট হয়েছে' : 'আসল নাম ফিরিয়ে আনা হয়েছে');
  };


  const addDraftModule = () => {
    const picked = (moduleDraft.chapters?.length
      ? moduleDraft.chapters
      : [moduleDraft.chapter]
    )
      .map((x) => String(x || '').trim())
      .filter(Boolean);
    const unique = [...new Set(picked)];
    if (!unique.length) {
      toast('অন্তত একটি অধ্যায় বেছে নিন।');
      return;
    }
    setDraftCurriculum((prev) => [
      ...prev,
      ...unique.map((ch) => ({
        id: uid(),
        subject: moduleDraft.subject,
        chapter: ch,
        paper: moduleDraft.paper,
        curriculumType: moduleDraft.curriculumType,
        curriculumTopic: moduleDraft.curriculumTopic,
        classCount: Math.max(1, Math.min(300, Math.floor(Number(moduleDraft.classCount) || 1))),
        classMin: moduleDraft.classMin ? Math.max(5, Math.min(720, Number(moduleDraft.classMin) || 50)) : null,
        reviewMin: Math.max(0, Math.min(240, Number(moduleDraft.reviewMin) || 0)),
        practiceMin: Math.max(0, Math.min(240, Number(moduleDraft.practiceMin) || 0)),
        phaseId: moduleDraft.phaseId,
      })),
    ]);
    setModuleDraft((m) => ({ ...m, chapter: '', chapters: [], curriculumType: '', curriculumTopic: '' }));
  };

  const removeDraftModule = (id) => {
    setDraftCurriculum((prev) => prev.filter((m) => m.id !== id));
  };

  /** Turn the currently selected chapters into modules (no duplicates). */
  const collectSelectedModules = () => {
    const picked = (moduleDraft.chapters?.length ? moduleDraft.chapters : [moduleDraft.chapter])
      .map((x) => String(x || '').trim())
      .filter(Boolean);
    if (!picked.length) return draftCurriculum;
    // Auto class count: a single picked chapter keeps the stepper value; a
    // multi-selection spreads the same total across the chapters.
    const totalClasses = Math.max(1, Math.floor(Number(moduleDraft.classCount) || 1));
    const perChapter =
      picked.length === 1 ? totalClasses : Math.max(1, Math.round(totalClasses / picked.length));
    const fresh = picked
      .filter(
        (ch) =>
          !draftCurriculum.some(
            (m) =>
              m.chapter === ch &&
              m.subject === moduleDraft.subject &&
              (m.paper || '') === (moduleDraft.paper || '')
          )
      )
      .map((ch) => ({
        id: uid(),
        subject: moduleDraft.subject,
        chapter: ch,
        paper: moduleDraft.paper,
        curriculumType: moduleDraft.curriculumType,
        curriculumTopic: moduleDraft.curriculumTopic,
        classCount: perChapter,
        classMin: moduleDraft.classMin ? Math.max(5, Math.min(720, Number(moduleDraft.classMin) || 50)) : null,
        reviewMin: Math.max(0, Math.min(240, Number(moduleDraft.reviewMin) || 0)),
        practiceMin: Math.max(0, Math.min(240, Number(moduleDraft.practiceMin) || 0)),
        phaseId: moduleDraft.phaseId,
      }));
    return fresh.length ? [...draftCurriculum, ...fresh] : draftCurriculum;
  };

  const launchSprintFromOnboarding = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.start || !form.end || form.end < form.start) {
      toast('স্প্রিন্টের নাম ও সঠিক শুরুর/শেষ তারিখ দিন।');
      return;
    }
    // Ticked chapters count even if the student never pressed "যুক্ত করুন".
    const selectedModules = collectSelectedModules();
    if (!selectedModules.length) {
      toast('অন্তত ১টি বিষয়/অধ্যায় নির্বাচন করুন।');
      return;
    }

    const over = selectedModules.filter((m) => Number(m.classMin || 0) + Number(m.reviewMin ?? 30) + Number(m.practiceMin ?? 45) > 240);
    if (over.length) {
      toast(`প্রহর-সীমা অতিক্রম করছে: ${over.map((m) => m.chapter).join(', ')}। সময় কমিয়ে আবার তৈরি করুন।`);
      return;
    }
    let classes, tasks;
    try {
      ({ classes, tasks } = generateSprintSchedule({
        start: form.start,
        end: form.end,
        modules: selectedModules,
        phaseMode,
        slotsPerDay: sessionsPerDay,
      }));
    } catch (err) {
      toast(err.message);
      return;
    }

    const periodMinutes = new Map();
    const recordLoad = (item, minutes) => {
      const key = `${item.date}/${item.phaseId}`;
      periodMinutes.set(key, (periodMinutes.get(key) || 0) + Math.max(0, Number(minutes) || 0));
    };
    classes.forEach((item) => recordLoad(item, item.duration));
    tasks.forEach((item) => recordLoad(item, item.duration));
    const overloaded = [...periodMinutes.entries()].filter(([, minutes]) => minutes > 240);
    if (overloaded.length) {
      const [key, minutes] = overloaded[0];
      const phase = slotMetaById(key.split('/')[1])?.bnLabel || 'নির্বাচিত প্রহর';
      toast(`${phase}-এ মোট ${bnNum(minutes)} মিনিট কাজ হচ্ছে—চার ঘণ্টার সীমা ছাড়াচ্ছে। সময় বা দৈনিক প্রহর সমন্বয় করুন।`);
      return;
    }

    const sp = {
      id: editingSprintId || uid(),
      name: form.name.trim(),
      start: form.start,
      end: form.end,
      endTime: '23:59',
      scheduleVersion: 4,
      sessionsPerDay,
      modules: selectedModules,
      classes,
      tasks,
    };

    if (editingSprintId) {
      // Editing keeps the SAME sprint — only its content is replaced. The
      // completion state of the old items is carried over by matching the
      // semantic key (module + phase + title).
      const previous = data.sprints.find((x) => x.id === editingSprintId);
      const doneClasses = new Set(
        (previous?.classes || []).filter((c) => c.done).map((c) => semanticKey(c))
      );
      const doneTasks = new Set(
        (previous?.tasks || []).filter((t) => t.done).map((t) => semanticKey(t))
      );
      const keptClasses = classes.filter((c) => doneClasses.has(semanticKey(c))).length;
      const keptTasks = tasks.filter((t) => doneTasks.has(semanticKey(t))).length;
      save((d) => ({
        sprints: d.sprints.map((x) =>
          x.id === editingSprintId
            ? {
                ...x,
                ...sp,
                classes: classes.map((c) =>
                  doneClasses.has(semanticKey(c))
                    ? { ...c, done: true, completedAt: c.completedAt || null }
                    : c
                ),
                tasks: tasks.map((t) =>
                  doneTasks.has(semanticKey(t))
                    ? { ...t, done: true, completedAt: t.completedAt || null }
                    : t
                ),
              }
            : x
        ),
        selectedSprintId: editingSprintId,
      }));
      toast(
        keptClasses || keptTasks
          ? `স্প্রিন্ট আপডেট হয়েছে — ${bnNum(keptClasses + keptTasks)}টি সম্পন্ন আইটেম অক্ষত আছে।`
          : 'স্প্রিন্ট আপডেট হয়েছে!'
      );
    } else {
      save((d) => ({ sprints: [...d.sprints, sp], selectedSprintId: sp.id }));
      toast('স্প্রিন্ট প্ল্যান তৈরি হয়েছে! স্বয়ংক্রিয়ভাবে শিডিউল সাজানো হয়েছে।');
    }
    setDraftCurriculum([]);
    setForm((f) => ({ ...f, name: PREMADE_SPRINT_NAMES[0], endTime: '23:59' }));
    setWeekOffset(0);
    if (editingSprintId) {
      // Editing ended: flash the "unlocked" marker, then let it fade.
      setJustUnlockedName(true);
      window.setTimeout(() => setJustUnlockedName(false), 2400);
    }
    setEditingSprintId(null);
    setViewMode('today');
  };

  /**
   * Opens the creation wizard pre-filled with everything the sprint already
   * has, so saving updates THAT sprint instead of making a new one.
   */
  const openSprintEditor = (target) => {
    if (!target) return;
    setEditingSprintId(target.id);
    setForm({
      name: target.name || PREMADE_SPRINT_NAMES[0],
      start: target.start || todayStr(),
      end: target.end || addDaysKey(target.start || todayStr(), 14),
      endTime: '23:59',
    });
    const days =
      target.start && target.end
        ? Math.max(
            1,
            Math.round(
              (new Date(`${target.end}T12:00:00`) - new Date(`${target.start}T12:00:00`)) /
                86400000
            ) + 1
          )
        : 15;
    setSelectedDays(days);
    setSessionsPerDay(Number(target.sessionsPerDay) || 3);
    setShowCustomDates(false);
    setDraftCurriculum(
      Array.isArray(target.modules) ? target.modules.map((m) => ({ ...m })) : []
    );
    setModuleDraft((prev) => ({
      ...prev,
      subject: (Array.isArray(target.modules) && target.modules[0]?.subject) || prev.subject,
      chapter: '',
      chapters: [],
    }));
    setViewMode('onboarding');
    setCtxMenu(null);
  };

  /** Closes the wide edit dialog and leaves the planner exactly as it was. */
  const closeSprintEditor = () => {
    setEditingSprintId(null);
    setCtxMenu(null);
    setViewMode('today');
    setJustUnlockedName(true);
    window.setTimeout(() => setJustUnlockedName(false), 2400);
  };

  // The hero dropdown closes on outside click, Escape or scroll.
  useEffect(() => {
    if (!heroMenuOpen) return undefined;
    const onDown = (e) => {
      if (!e.target.closest?.('.v45-hero-name')) setHeroMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setHeroMenuOpen(false);
    };
    const onScroll = () => setHeroMenuOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [heroMenuOpen]);

  // A sprint right-clicked in the Overview opens its editor here.
  useEffect(() => {
    if (!editSprintId) return;
    const target = data.sprints.find((x) => x.id === editSprintId);
    if (!target) {
      onEditHandled?.();
      return;
    }
    openSprintEditor(target);
    onEditHandled?.();
  }, [editSprintId]);

  const startSprintFocus = (item) => {
    if (!sprint || item.done) return;
    if (timer) {
      toast('চলমান সেশন শেষ করে নতুন কাজ শুরু করুন।');
      return;
    }
    if (item.date && item.date > today) {
      toast(`এই কাজটি ${fmtDate(item.date)} তারিখে নির্ধারিত।`);
      return;
    }
    const isClass = item._itemType === 'class';
    prepareFocus({
      source: isClass ? 'sprint-class' : 'sprint-task',
      sprintId: sprint.id,
      ...(isClass ? { classId: item.id } : { sprintTaskId: item.id }),
      subjectName: item.subject,
      activityType: isClass
        ? 'recorded'
        : item.step === 0
        ? 'sheet'
        : item.step === 1
        ? 'bank'
        : item.step === 3 ? 'revision' : 'practice',
      phaseId: item.phaseId === 'afternoon' ? 'noon' : item.phaseId,
      cycle: item.cycle || '',
      chapter: item.chapter || '',
      className: isClass ? item.title : item.fromClass || '',
      workLabel: isClass ? 'ক্লাস' : item.kind || 'প্র্যাকটিস',
      title: item.title,
      videoPosition: item.videoPosition || '',
      questionTarget: item.questionTarget || '',
      requiredMinutes: Math.max(1, Number(item.duration) || 45),
      minutes: Math.max(1, Number(item.duration) || 45),
    });
  };

  const deleteSprint = () =>
    sprint &&
    openModal('confirm', {
      title: 'স্প্রিন্ট মুছবেন?',
      description: `"${sprint.name}" মুছে নতুন স্প্রিন্ট তৈরি করতে পারবেন।`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
      onConfirm: () => {
        save((d) => {
          const rest = d.sprints.filter((s) => s.id !== sprint.id);
          return { sprints: rest, selectedSprintId: rest.at(-1)?.id || null };
        });
        setViewMode('onboarding');
      },
    });

  // Unified items for Today / Weekly / Overall Timeline
  const unifiedItems = useMemo(() => {
    if (!sprint) return [];
    const cList = (sprint.classes || []).map((c) => ({
      ...c,
      _itemType: 'class',
      typeBadge: `ক্লাস ${bnNum(c.index || 1)}`,
      date: c.date || sprint.start,
    }));
    const tList = (sprint.tasks || []).map((t) => ({
      ...t,
      _itemType: 'task',
      typeBadge:
        t.step === 0
          ? `লেকচার শিট রিভিউ ${bnNum(t.lectureIndex || 1)}`
          : t.step === 3
          ? `রিভিউ ${bnNum(t.revisionIndex || 1)}`
          : `${formatActivityLabel(t.kind || 'Practice') || 'প্র্যাকটিস'} ${bnNum(t.practiceIndex || 1)}`,
      date: t.date || sprint.start,
    }));
    return [...cList, ...tList].sort(compareSprintItems);
  }, [sprint]);

  const stats = useMemo(() => {
    if (!sprint) return null;
    const classes = sprint.classes || [];
    const tasks = sprint.tasks || [];
    const all = [...classes, ...tasks];
    const done = all.filter((x) => x.done).length;
    const overdue = all.filter((x) => !x.done && (!x.date || x.date < today));
    const pct = all.length ? Math.round((done / all.length) * 100) : 0;
    return {
      totalClasses: classes.length,
      doneClasses: classes.filter((x) => x.done).length,
      totalTasks: tasks.length,
      doneTasks: tasks.filter((x) => x.done).length,
      pct,
      overdueCount: overdue.length,
    };
  }, [sprint, today]);

  // 1. Today's Schedule (Today + Overdue incomplete items)
  const todaySchedule = useMemo(
    () =>
      unifiedItems.filter(
        (item) => item.date === today || (!item.done && item.date < today)
      ),
    [unifiedItems, today]
  );

  // 2. Weekly View (7-day window anchored around today + weekOffset * 7)
  const weekDays = useMemo(() => {
    const anchor = dateFromKey(today);
    const sunday = new Date(anchor);
    sunday.setDate(anchor.getDate() - anchor.getDay() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const key = toDateKey(d);
      const dayItems = unifiedItems.filter((it) => it.date === key);
      const doneCount = dayItems.filter((it) => it.done).length;
      return { date: d, key, items: dayItems, doneCount };
    });
  }, [unifiedItems, today, weekOffset]);

  // 3. Overall Project Timeline grouped by Date
  const overallGroups = useMemo(() => {
    const map = new Map();
    unifiedItems.forEach((item) => {
      const k = item.date || sprint?.start || today;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(item);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [unifiedItems, sprint, today]);

  const activeMode = viewMode;

  const renderScheduleRow = (item) => {
    const isClass = item._itemType === 'class';
    const isLate = !item.done && item.date < today;
    const isFuture = !item.done && item.date > today;

    return (
      <article
        key={`${item._itemType}-${item.id}`}
        className={`sp-yb-item v34-sp-row ${item.done ? 'done' : isLate ? 'late' : ''}`}
        style={{ '--sp-accent': subjectColor(item.subject, isClass ? 'class' : 'practice') }}
      >
        <i className="v34-sp-row-rail" aria-hidden="true" />

        <div className="v34-sp-row-body">
          <div className="v36-sp-title-row">
            <strong className="sp-chapter-title">
              {bnSample(item.chapter ? sprintChapterName(item.chapter) : sprintItemTitle(item, isClass), state.isDemo)}
            </strong>
            <span className={`v34-sp-type ${isClass ? 'is-class' : 'is-task'}`}>
              {isClass ? <BookOpen size={12} /> : <Zap size={12} />}
              {item.typeBadge}
            </span>
          </div>

          <div className="v34-sp-row-meta">
            <span className="v34-sp-meta-item is-subject">{bnSubject(item.subject)}</span>
            {item.phaseId && (
              <span className="v34-sp-meta-item">
                {slotMetaById(item.phaseId)?.bnLabel || item.phaseId}
              </span>
            )}
            {item.duration && (
              <span className="v34-sp-meta-item">
                <Clock3 size={11} /> {bnNum(item.duration)} মি.
              </span>
            )}
            <span className="v34-sp-meta-item">
              <CalendarDays size={11} /> {fmtDate(item.date)}
            </span>
            {isLate && <span className="sp-late-inline">বকেয়া</span>}
          </div>
        </div>

        <div className="v34-sp-row-actions">
          {item.done ? (
            <span className="sp-done-pill">
              <CheckCircle2 size={14} /> সম্পন্ন
            </span>
          ) : (
            <button
              type="button"
              className={`sp-focus-launch-btn v36-sp-focus-icon ${isClass ? '' : 'blue'}`}
              disabled={isFuture}
              title={isFuture ? fmtShortDate(item.date) : 'ফোকাস শুরু'}
              aria-label={isFuture ? `${fmtShortDate(item.date)} পর্যন্ত অপেক্ষা` : 'ফোকাস শুরু'}
              onClick={() => startSprintFocus(item)}
            >
              <Play size={16} fill="currentColor" />
            </button>
          )}
        </div>
      </article>
    );
  };

  // The whole creation wizard, reused inline for a NEW sprint and inside
  // the wide edit dialog when an existing sprint is being edited.
  //
  // v45 layout:
  //   · ONE full-width name dropdown (no − / +, no duplicate title card)
  //   · One single border around the whole onboarding block
  //   · Class time · Sheet review · Practice sit in ONE row of three equal
  //     columns; the class-count stepper owns a row of its own
  //   · The overload warning only appears above 240 minutes
  const workloadMinutes =
    Number(moduleDraft.classMin || 0) +
    Number(moduleDraft.reviewMin || 0) +
    Number(moduleDraft.practiceMin || 0);

  const toggleChapter = (name) => {
    setModuleDraft((prev) => {
      const has = prev.chapters.includes(name);
      const nextChapters = has
        ? prev.chapters.filter((x) => x !== name)
        : [...prev.chapters, name];
      return {
        ...prev,
        chapters: nextChapters,
        chapter: has ? nextChapters.at(-1) || '' : name,
      };
    });
  };

  const setAllChapters = (names, select) => {
    setModuleDraft((prev) => ({
      ...prev,
      chapters: select
        ? [...new Set([...prev.chapters, ...names])]
        : prev.chapters.filter((x) => !names.includes(x)),
      chapter: select ? names.at(-1) || prev.chapter : prev.chapter,
    }));
  };

  const sprintWizard = (
    <section className="v36-sprint-wizard-inline v45-onboard-sheet">
      <form
        className="v29-sprint-wizard clean-view-stage"
        onSubmit={launchSprintFromOnboarding}
      >
        {/* STEP 1 — one row of four controls, then a full-width date strip */}
        <div className="v29-sw-section v38-sprint-plan-section v45-plan-section">
          <div className="v29-sw-step-head">
            <span className="v29-sw-step-badge">১</span>
            <div>
              <h3>প্রজেক্টের নাম ও কত দিনের প্ল্যান</h3>
            </div>
          </div>

          <div className="v45-plan-grid">
            <div className="v29-sw-block v45-plan-col v45-plan-col-name">
              <SprintNameDropdown
                groups={navNameGroups}
                names={navNames}
                value={form.name}
                onChange={(name) => setForm((prev) => ({ ...prev, name }))}
                onRenamePreset={renamePreset}
                disabled={Boolean(editingSprintId)}
                justUnlocked={justUnlockedName}
              />
            </div>

            <div className="v29-sw-block v45-plan-col v45-plan-col-duration">
              <SprintMinutesControl label="স্প্রিন্টের দৈর্ঘ্য (দিন)" value={computedTotalDays} min={1} max={365} step={1} unit="দিন" presets={DURATION_PRESETS} onChange={(days) => { setShowCustomDates(false); applyDurationDays(days, form.start || todayStr()); }} />
            </div>

            <div className="v29-sw-block v45-plan-col v45-plan-col-sessions">
              <SprintMinutesControl label="প্রতিদিনের ক্লাস-সেট" value={sessionsPerDay} min={2} max={4} step={1} unit="সেট" presets={[2, 3, 4]} onChange={setSessionsPerDay} />
            </div>

            <div className="v29-sw-block v45-plan-col v45-plan-col-end">
              <div className="v45-plan-end-head">
                <span className="v29-sw-label">শেষ তারিখ</span>
                <button
                  type="button"
                  className="v29-sw-link-toggle"
                  onClick={() => setShowCustomDates((v) => !v)}
                >
                  <CalendarDays size={13} />
                  <span>{showCustomDates ? 'অটো তারিখ' : 'কাস্টম'}</span>
                </button>
              </div>
              <div className="v29-sw-date-pill gold v45-plan-end-pill">
                <small>সমাপ্তি (রাত ১২:০০)</small>
                <strong>{fmtDate(form.end)}</strong>
              </div>
            </div>
          </div>

          <div className="v45-plan-dates-row v48-plan-dates-row">
            <SprintCustomNameInput
              value={form.name}
              disabled={Boolean(editingSprintId)}
              onChange={(name) => setForm((prev) => ({ ...prev, name }))}
            />
            <div className="v29-sw-date-pill v45-plan-start-pill">
              <small>শুরু</small>
              <strong>{fmtDate(form.start)}</strong>
            </div>
            <span className="v29-sw-date-arrow" aria-hidden="true">→</span>
            <div className="v29-sw-date-pill gold">
              <small>শেষ</small>
              <strong>{fmtDate(form.end)}</strong>
            </div>
            <span className="v29-sw-total-badge">
              মোট {bnNum(computedTotalDays)} দিনের প্ল্যান
            </span>
          </div>

          {showCustomDates && (
            <div className="v29-sw-custom-dates">
              <label className="sp-field-box blue-accent">
                <span>শুরুর তারিখ পরিবর্তন</span>
                <BanglaDateInput
                  value={form.start}
                  onChange={(e) => {
                    const nextStart = e.target.value || todayStr();
                    setForm((prev) => ({
                      ...prev,
                      start: nextStart,
                      end: addDaysKey(nextStart, Math.max(1, selectedDays) - 1),
                      endTime: '23:59',
                    }));
                  }}
                  required
                />
              </label>
              <label className="sp-field-box yellow-accent">
                <span>শেষ তারিখ পরিবর্তন (রাত ১২:০০ পর্যন্ত)</span>
                <BanglaDateInput
                  value={form.end}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      end: e.target.value,
                      endTime: '23:59',
                    }))
                  }
                  required
                />
              </label>
            </div>
          )}
        </div>

        {/* STEP 2 — SUBJECT, CHAPTERS, CLASS LOAD, PHASE */}
        <div className="v29-sw-section">
          <div className="v29-sw-step-head">
            <span className="v29-sw-step-badge blue">২</span>
            <div>
              <h3>বিষয়, অধ্যায় ও ক্লাস নির্বাচন ({bnNum(draftCurriculum.length)}টি যুক্ত)</h3>
            </div>
          </div>

          <div className="v29-sw-block">
            <span className="v29-sw-label">বিষয় বেছে নিন</span>
            <div
              className="v28-sprint-subject-grid"
              role="radiogroup"
              aria-label="বিষয় নির্বাচন করুন"
            >
              {SUBJECTS.map((s) => {
                const active = moduleDraft.subject === s;
                // Every subject owns a distinct hue — no two tiles share a
                // colour, so the grid reads like a palette, not a repeat.
                const subTone = SUBJECT_TILE_TONES[s] || '#c9a86a';
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`v28-sprint-sub-chip ${active ? 'active' : ''}`}
                    style={{ '--sub-tone': subTone }}
                    onClick={() =>
                      setModuleDraft({
                        ...moduleDraft,
                        subject: s,
                        paper: s === 'ICT' ? '' : '1',
                        chapter: '',
                        chapters: [],
                        curriculumType: '',
                        curriculumTopic: '',
                      })
                    }
                  >
                    <span className="v37-sprint-sub-icon"><PreviewSubjectIcon subject={{ name: s }} size={17}/></span>
                    <span className="v37-sprint-sub-name">{bnSubject(s)}</span>
                    {active && <CheckCircle2 className="v37-sprint-sub-check" size={13}/>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CHAPTERS (left, 2–3 measured columns) + the phase stack (right).
              Nothing is stretched to fill: the phase rail simply occupies the
              space the chapter columns leave behind. */}
          <div
            className="v48-step2-split v48-step2"
            style={{ '--chp-split': `${chpCol * chpPerRow + (chpPerRow - 1) * 8 + 34}px` }}
          >
            <div className="v48-step2-chapters">
              <SprintChapterMultiPicker
                subject={moduleDraft.subject}
                paper={moduleDraft.paper}
                selected={moduleDraft.chapters}
                onToggle={toggleChapter}
                onSetAll={setAllChapters}
                onMetrics={(w) => setChpCol(w)}
                onPaperChange={(paper) =>
                  setModuleDraft((prev) => ({ ...prev, paper, chapter: '', chapters: [] }))
                }
              />
            </div>

            <aside className="v48-step2-phase">
              <span className="v29-sw-label">কোন প্রহরে পড়বেন?</span>
              <TaskSlotPicker
                phaseMode={phaseMode}
                value={moduleDraft.phaseId}
                onChange={(slot) => setModuleDraft({ ...moduleDraft, phaseId: slot.id })}
                ariaLabel="স্প্রিন্ট পড়ার প্রহর নির্বাচন করুন"
              />
            </aside>
          </div>

          {/* ONE ROW · FOUR COLUMNS — class count, class time, sheet review,
              practice. The overload chip rides the same row. */}
          <div className="v29-sw-block v45-quad-wrap">
            <div className="v45-quad">
              <div className="v45-quad-cell">
                <SprintMinutesControl
                  label="ক্লাস সংখ্যা"
                  value={Math.max(1, Math.min(300, Number(moduleDraft.classCount) || 1))}
                  min={1}
                  max={300}
                  step={1}
                  unit="টি ক্লাস"
                  presets={CLASS_COUNT_PRESETS}
                  onChange={(n) => setModuleDraft((prev) => ({ ...prev, classCount: n }))}
                />
                {!CLASS_COUNT_PRESETS.includes(Number(moduleDraft.classCount)) && (
                  <BanglaNumberInput
                    className="v38-class-count-custom"
                    min="1"
                    max="300"
                    aria-label="কাস্টম ক্লাস সংখ্যা"
                    placeholder="কাস্টম সংখ্যা…"
                    value={moduleDraft.classCount}
                    onChange={(e) => setModuleDraft({ ...moduleDraft, classCount: e.target.value })}
                  />
                )}
              </div>
              <div className="v45-quad-cell">
                <SprintMinutesControl
                  label="প্রতি ক্লাসের সময়"
                  value={moduleDraft.classMin}
                  presets={CLASS_MIN_PRESETS}
                  onChange={(classMin) => setModuleDraft((prev) => ({ ...prev, classMin }))}
                />
              </div>
              <div className="v45-quad-cell">
                <SprintMinutesControl
                  label="শিট রিভিউ"
                  value={moduleDraft.reviewMin}
                  presets={[15, 20, 25, 30, 45, 60, 90]}
                  onChange={(reviewMin) => setModuleDraft((prev) => ({ ...prev, reviewMin }))}
                />
              </div>
              <div className="v45-quad-cell">
                <SprintMinutesControl
                  label="প্র্যাকটিস"
                  value={moduleDraft.practiceMin}
                  presets={[20, 30, 45, 60, 75, 90, 120]}
                  onChange={(practiceMin) => setModuleDraft((prev) => ({ ...prev, practiceMin }))}
                />
              </div>
            </div>
            <SprintOverloadChip minutes={workloadMinutes} />
          </div>

          <div className="v29-sw-add-bar">
            <div className="v29-sw-draft-preview">
              {moduleDraft.chapter ? (
                <span>
                  প্রস্তুত: <strong>{bnSubject(moduleDraft.subject)}</strong> ·{' '}
                  <b>{moduleDraft.chapter}</b>
                  {moduleDraft.chapters.length > 1
                    ? ` +${bnNum(moduleDraft.chapters.length - 1)} আরও`
                    : ''}{' '}
                  · {bnNum(moduleDraft.classCount)}টি ক্লাস ·{' '}
                  {slotMetaById(moduleDraft.phaseId)?.bnLabel}
                </span>
              ) : (
                <span className="muted">অধ্যায় বাছুন</span>
              )}
            </div>
            <button
              type="button"
              className={`v29-sw-add-btn ${moduleDraft.chapter ? 'is-ready' : ''}`}
              onClick={addDraftModule}
            >
              <Plus size={16} /> অধ্যায়টি তালিকায় যুক্ত করুন
            </button>
          </div>

          {draftCurriculum.length > 0 && (
            <div className="v29-sw-queue">
              <span className="v29-sw-queue-title">
                যুক্ত করা অধ্যায়সমূহ ({bnNum(draftCurriculum.length)}টি)
              </span>
              <div className="v29-sw-queue-grid">
                {draftCurriculum.map((mod, idx) => {
                  const sl = slotMetaById(mod.phaseId);
                  const SlIcon = sl?.Icon || Clock3;
                  return (
                    <div key={mod.id} className="v29-sw-mod-card">
                      <span className="v29-sw-mod-idx">{bnNum(idx + 1)}</span>
                      <div className="v29-sw-mod-info">
                        <div className="v29-sw-mod-top">
                          <span className="sub">{bnSubject(mod.subject)}</span>
                          {mod.paper && (
                            <span className="paper">
                              {mod.paper === '2' ? '২য় পত্র' : '১ম পত্র'}
                            </span>
                          )}
                          <span
                            className="phase"
                            style={{ '--slot-tone': sl?.tone || '#fbbf24' }}
                          >
                            <SlIcon size={11.5} /> {sl?.bnLabel || mod.phaseId}
                          </span>
                        </div>
                        <strong>{mod.chapter}</strong>
                        <small>
                          {bnNum(mod.classCount)}টি ক্লাস
                          {mod.classMin ? ` · প্রতি ক্লাস ${bnNum(mod.classMin)} মিনিট` : ''}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="sp-item-trash"
                        onClick={() => removeDraftModule(mod.id)}
                        aria-label="Remove module"
                        title="তালিকা থেকে সরান"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="sp-yb-form-footer v29-sw-footer">
          {sprint && (
            <button
              type="button"
              className="action-btn"
              onClick={() => (editingSprintId ? closeSprintEditor() : setViewMode('today'))}
            >
              {editingSprintId ? 'বাতিল করুন' : 'ফিরে যান'}
            </button>
          )}
          <button type="submit" className="sp-yb-submit-btn">
            <Rocket size={15} />{' '}
            {editingSprintId ? 'স্প্রিন্ট আপডেট করুন' : 'স্প্রিন্ট তৈরি ও শিডিউল সাজান'}
          </button>
        </div>
      </form>
    </section>
  );

  return (
    <div className={`${embedded ? '' : 'view-page '}sp-yb-page`}>
      {/* While the creation sheet is open, the hero + KPI strip step aside so
          the whole form fits on one screen. */}
      {viewMode !== 'onboarding' && (
      <>
      {/* Top Hero Header — the sprint title is ONE full-width dropdown.
          Picking a sprint activates it; right-clicking it (or the dropdown)
          opens the amber edit menu. */}
      <section className="sp-glass-card sp-yb-hero v45-hero">
        <div className="v45-hero-top">
          <span className="sp-yb-badge-icon">
            <Rocket size={20} />
          </span>
          <div
            className="v45-hero-name"
            onContextMenu={(e) => {
              if (!sprint) return;
              e.preventDefault();
              e.stopPropagation();
              setCtxMenu({ sprint, x: e.clientX, y: e.clientY });
            }}
            title={sprint ? 'এডিট করতে ডান-ক্লিক করুন' : undefined}
          >
            <span className="v45-name-dd-label">
              স্প্রিন্ট প্রজেক্ট (নির্বাচন করুন)
              {justUnlockedName && (
                <span className="v45-name-dd-unlocked" role="status">
                  <Check size={11} strokeWidth={3.2} /> আবার সক্রিয়
                </span>
              )}
            </span>
            <button
              type="button"
              className="v45-name-dd-trigger v45-hero-dd-trigger"
              aria-haspopup="listbox"
              aria-expanded={heroMenuOpen}
              aria-label="স্প্রিন্ট নির্বাচন করুন"
              disabled={data.sprints.length === 0}
              onClick={() => setHeroMenuOpen((v) => !v)}
            >
              <strong>
                {sprint
                  ? bnSample(sprint.name, state.isDemo)
                  : 'স্প্রিন্ট প্ল্যানার অনবোর্ডিং'}
              </strong>
              <ChevronDown size={16} className={`v45-name-dd-chevron ${heroMenuOpen ? 'is-open' : ''}`} />
            </button>
            {sprint && (
              <span className="sp-yb-dates">
                <CalendarDays size={13} /> {fmtDate(sprint.start)} → {fmtDate(sprint.end)}
              </span>
            )}

            {heroMenuOpen && (
              <div className="v45-name-dd-menu v45-hero-menu" role="listbox" aria-label="স্প্রিন্ট তালিকা">
                {data.sprints.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    role="option"
                    aria-selected={sp.id === sprint?.id}
                    className={`v45-name-dd-option ${sp.id === sprint?.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      save((d) => ({ ...d, selectedSprintId: sp.id }));
                      setViewMode('today');
                      setHeroMenuOpen(false);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHeroMenuOpen(false);
                      setCtxMenu({ sprint: sp, x: e.clientX, y: e.clientY });
                    }}
                    title="এডিট করতে ডান-ক্লিক করুন"
                  >
                    <span>{bnSample(sp.name, state.isDemo)}</span>
                    {sp.id === sprint?.id && <Check size={14} strokeWidth={2.8} />}
                  </button>
                ))}
                {sprint && (
                  <button
                    type="button"
                    className="v45-name-dd-option v45-hero-edit-row"
                    onClick={() => {
                      setHeroMenuOpen(false);
                      openSprintEditor(sprint);
                    }}
                  >
                    <span><Pencil size={13} /> এই স্প্রিন্ট এডিট করুন</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="v45-hero-actions">
            <button
              type="button"
              className="v36-sp-new-btn"
              onClick={() => setViewMode('onboarding')}
              title="নতুন স্প্রিন্ট প্ল্যানার"
            >
              <Plus size={15} />
              নতুন স্প্রিন্ট
            </button>
          </div>
        </div>

        <div className="sp-yb-hero-controls">
          {sprint && (
            <div className="v33-sp-subnav">
              <div className="v33-seg" role="tablist" aria-label="স্প্রিন্ট ভিউ">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === 'today'}
                  className={`v33-seg-tab ${activeMode === 'today' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('today')}
                >
                  <span className="v33-seg-ico">
                    <CalendarClock size={14} />
                  </span>
                  আজকের শিডিউল
                  <span className="v33-seg-badge">{bnNum(todaySchedule.length)}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === 'overall'}
                  className={`v33-seg-tab ${activeMode === 'overall' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('overall')}
                >
                  <span className="v33-seg-ico">
                    <CalendarRange size={14} />
                  </span>
                  সম্পূর্ণ প্রজেক্ট
                  <span className="v33-seg-badge">{bnNum(unifiedItems.length)}</span>
                </button>
              </div>

              <span className="v33-sp-subnav-note">
                <Info size={13} />
                {activeMode === 'today' &&
                  `${bnNum(todaySchedule.filter((i) => !i.done).length)}টি বাকি · ${bnNum(
                    todaySchedule.filter((i) => i.done).length
                  )}টি সম্পন্ন`}
                {activeMode === 'overall' &&
                  `${bnNum(stats?.doneTasks ?? 0)} / ${bnNum(stats?.totalTasks ?? 0)} ধাপ সম্পন্ন`}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* KPI Telemetry Strip (Shown in Read-Only Schedule Views) */}
      {sprint && stats && viewMode !== 'onboarding' && (
        <div className="sp-yb-stats-grid">
          <div className="sp-glass-card sp-stat-card yellow">
            <div className="sp-stat-icon">
              <Clock3 size={18} />
            </div>
            <div>
              <span>সময়সীমা</span>
              <strong>
                {cd?.expired
                  ? 'সময় পূর্ণ'
                  : `${bnNum(cd?.days ?? 0)}d · ${bnNum(cd?.hours ?? 0)}h · ${bnNum(cd?.mins ?? 0)}m`}
              </strong>
            </div>
          </div>

          <div className="sp-glass-card sp-stat-card blue">
            <div className="sp-stat-icon">
              <BookOpen size={18} />
            </div>
            <div>
              <span>সম্পন্ন ক্লাস</span>
              <strong>
                {bnNum(stats.doneClasses)} / {bnNum(stats.totalClasses)}
              </strong>
            </div>
          </div>

          <div className="sp-glass-card sp-stat-card yellow">
            <div className="sp-stat-icon">
              <Zap size={18} />
            </div>
            <div>
              <span>অনুশীলন ধাপ</span>
              <strong>
                {bnNum(stats.doneTasks)} / {bnNum(stats.totalTasks)}
              </strong>
            </div>
          </div>

          <div className="sp-glass-card sp-stat-card blue">
            <div className="sp-stat-icon">
              {stats.overdueCount > 0 ? <AlertTriangle size={18} /> : <Sparkles size={18} />}
            </div>
            <div>
              <span>সম্পূর্ণ অগ্রগতি</span>
              <strong>
                {bnNum(stats.pct)}%
                {stats.overdueCount > 0 && (
                  <em className="sp-late-tag">বাকি {bnNum(stats.overdueCount)}</em>
                )}
              </strong>
            </div>
          </div>
        </div>
      )}

      </>
      )}

      {/* ===================================================================
          MODERN 1-CLICK SPRINT CREATOR (Pre-made Name, Pre-made Days, Auto Dates,
          1-Click Subject + Chapter + Class Count + Duration + Colored Phase Slots)
          =================================================================== */}

      {activeMode === 'onboarding' && !editingSprintId && sprintWizard}

      {/* A saved sprint opens in a WIDE dialog so every saved field fits on
          one screen without the page having to scroll. */}
      {editingSprintId &&
        createPortal(
          <ModalShell
            title="স্প্রিন্ট প্রজেক্ট সম্পাদনা"
            eyebrow="স্প্রিন্ট প্ল্যানার · এডিট"
            onClose={closeSprintEditor}
            extraWide
            className="v44-sprint-edit-modal"
          >
            {sprintWizard}
          </ModalShell>,
          document.body
        )}

      {/* ===================================================================
          VIEW 1: TODAY'S SCHEDULE (আজকের শিডিউল)
          =================================================================== */}
      {sprint && activeMode === 'today' && (
        <section className="sp-glass-card sp-yb-list-card clean-view-stage">
          <div className="sp-yb-steps-header">
            <div className="sp-card-title-row">
              <CalendarClock size={18} className="sp-icon-yellow" />
              <h3>আজকের শিডিউল · {fmtDate(today)}</h3>
            </div>
            <span className="chip-blue">{bnNum(todaySchedule.length)}টি নির্ধারিত কাজ</span>
          </div>

          <div className="sp-yb-items">
            {todaySchedule.length > 0 ? (
              todaySchedule.map(renderScheduleRow)
            ) : (
              <div className="sp-yb-empty">
                আজকের জন্য কোনো বাকি ক্লাস বা অনুশীলন নেই। সম্পূর্ণ প্রজেক্টে সব ধাপ দেখুন।
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===================================================================
          VIEW 3: OVERALL PROJECT TIMELINE (সম্পূর্ণ প্রজেক্টের ভিউ)
          =================================================================== */}
      {sprint && activeMode === 'overall' && (
        <section className="sp-glass-card sp-yb-list-card clean-view-stage">
          <div className="sp-yb-steps-header">
            <div className="sp-card-title-row">
              <CalendarRange size={18} className="sp-icon-yellow" />
              <h3>সম্পূর্ণ প্রজেক্ট টাইমলাইন ({bnNum(unifiedItems.length)}টি ধাপ)</h3>
            </div>
            <span className="chip-yellow">{bnNum(stats?.pct || 0)}% সম্পন্ন</span>
          </div>

          <div className="sp-overall-timeline">
            {overallGroups.length > 0 ? (
              overallGroups.map(([dateKey, items]) => {
                const allDone = items.every((i) => i.done);
                const isToday = dateKey === today;
                return (
                  <div
                    key={dateKey}
                    className={`sp-tl-group ${isToday ? 'today' : ''} ${allDone ? 'done' : ''}`}
                  >
                    <div className="sp-tl-date-col">
                      <span className="sp-tl-dot" aria-hidden="true" />
                      <strong>{fmtShortDate(dateKey)}</strong>
                      {isToday && <span className="sp-tl-today">আজ</span>}
                      <span className="sp-tl-meter">
                        <i
                          style={{
                            width: `${Math.round(
                              (items.filter((x) => x.done).length / items.length) * 100
                            )}%`,
                          }}
                        />
                      </span>
                      <small>
                        {bnNum(items.filter((x) => x.done).length)}/{bnNum(items.length)} সম্পন্ন
                      </small>
                    </div>
                    <div className="sp-yb-items">{items.map(renderScheduleRow)}</div>
                  </div>
                );
              })
            ) : (
              <div className="sp-yb-empty">কোনো শিডিউল ডেটা নেই।</div>
            )}
          </div>
        </section>
      )}

      {/* RIGHT-CLICK MENU ON A SPRINT */}
      {ctxMenu && (
        <SprintContextMenu
          sprint={ctxMenu.sprint}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          onEdit={() => openSprintEditor(ctxMenu.sprint)}
          onDuplicate={() => {
            const src = ctxMenu.sprint;
            setCtxMenu(null);
            // A copy keeps every module, class and task — only the identity
            // (and the schedule's done state) starts fresh.
            const copy = {
              ...src,
              id: uid(),
              name: `${src.name} (কপি)`,
              classes: (src.classes || []).map((c) => ({ ...c, id: uid(), done: false, completedAt: null })),
              tasks: (src.tasks || []).map((t) => ({ ...t, id: uid(), done: false, completedAt: null })),
            };
            save((d) => ({ sprints: [...d.sprints, copy], selectedSprintId: copy.id }));
            toast('স্প্রিন্টের অনুলিপি তৈরি হয়েছে।');
            setViewMode('today');
          }}
          onOpenPlanner={() => {
            save((d) => ({ ...d, selectedSprintId: ctxMenu.sprint.id }));
            setViewMode('today');
          }}
          onDelete={() => {
            const target = ctxMenu.sprint;
            setCtxMenu(null);
            openModal('confirm', {
              title: 'স্প্রিন্ট মুছবেন?',
              description: `"${target.name}" মুছে নতুন স্প্রিন্ট তৈরি করতে পারবেন।`,
              confirmLabel: 'মুছে ফেলুন',
              danger: true,
              onConfirm: () => {
                save((d) => {
                  const rest = d.sprints.filter((x) => x.id !== target.id);
                  return { sprints: rest, selectedSprintId: rest.at(-1)?.id || null };
                });
                toast('স্প্রিন্ট প্রজেক্ট মুছে ফেলা হয়েছে।');
              },
            });
          }}
        />
      )}
    </div>
  );
}
