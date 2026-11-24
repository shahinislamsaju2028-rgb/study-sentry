import { addDays, toDateKey, uid } from './seedData';
import { dateFromKey } from './stats';
import { PHASE_MODE_OPTIONS, normalizePhaseMode } from './studyPhases';

export const ALL_SPRINT_PHASES = ['dawn', 'morning', 'afternoon', 'night', 'late_night'];
export const SPRINT_PHASES = ['dawn', 'morning', 'afternoon', 'night'];

export function getSprintPhasesForMode(mode = 'first4') {
  const norm = normalizePhaseMode(mode);
  const found = PHASE_MODE_OPTIONS.find((x) => x.id === norm) || PHASE_MODE_OPTIONS[0];
  return found.slotIds;
}

/**
 * PRE-MADE SPRINT NAMES — grouped, so a fresher starting HSC-28 can pick by
 * situation instead of scanning one long flat list.  Every group answers a
 * different question ("what am I doing right now?").
 *
 * Each entry may be renamed by the student: right-click it in the dropdown.
 * Their edit is what later appears in the dropdown, and it is stored per user.
 */
export const SPRINT_NAME_GROUPS = [
  {
    id: 'fresh',
    label: 'এইচএসসি ২৮ · একদম শুরু',
    hint: 'প্রথম দিন থেকে শুরু করছেন',
    names: [
      'এইচএসসি 28 শুরু থেকে স্প্রিন্ট',
      'প্রথম পত্র বেসিক গোড়াপত্তন',
      'সিলেবাস হ্যালোআউট স্প্রিন্ট',
      'বই-খাতা গুছিয়ে শুরু',
      '৭ বিষয় সমান তালে শুরু',
      'ক্লাস-শিট সেটআপ স্প্রিন্ট',
      'নতুন অধ্যায় এক্সপ্লোর',
      'দৈনিক ৪ ঘণ্টা অভ্যাস গড়া',
    ],
  },
  {
    id: 'core',
    label: 'বিষয়ভিত্তিক · ডিপ স্টাডি',
    hint: 'এক বা দুই বিষয়ে গভীরে যাওয়া',
    names: [
      'পদার্থ–গণিত ডিপ প্র্যাকটিস স্প্রিন্ট',
      'রসায়ন–জীববিজ্ঞান কনসেপ্ট স্প্রিন্ট',
      'উচ্চতর গণিত ম্যারাথন',
      'বাংলা ১ম পত্র টেক্সট স্টাডি',
      'ইংরেজি ১ম পত্র রাইটিং স্প্রিন্ট',
      'আইসিটি প্রোগ্রামিং ও নেটওয়ার্ক',
      'এক অধ্যায় একদিনে চ্যালেঞ্জ',
      'কঠিন কনসেপ্ট ভেঙে ফেলা',
    ],
  },
  {
    id: 'exam',
    label: 'পরীক্ষা ও টেস্ট প্রস্তুতি',
    hint: 'টেস্ট, মডেল টেস্ট, সিকিউ',
    names: [
      'সাপ্তাহিক টেস্ট প্রস্তুতি স্প্রিন্ট',
      'টেস্ট এক্সাম ক্র্যাশ প্রস্তুতি',
      'মডেল টেস্ট ও সিকিউ-এমসিকিউ বুস্ট',
      'বোর্ড প্রশ্ন অ্যানালাইসিস স্প্রিন্ট',
      'সৃজনশীল লেখার দ্রুততা',
      'এমসিকিউ স্পিড রান',
      'প্রি-টেস্ট ফাইনাল রিভিশন',
      'পরীক্ষার আগের ৭ দিন',
    ],
  },
  {
    id: 'recovery',
    label: 'ব্যাকলগ ও রিকভারি',
    hint: 'পিছিয়ে পড়া কভার করা',
    names: [
      'ব্যাকলগ ক্লিয়ার চ্যালেঞ্জ',
      'বাকি থাকা অধ্যায় উদ্ধার',
      'দুর্বল টপিক রি-বিল্ড',
      'মিস হওয়া ক্লাস কভার',
      'পড়া বাকি খাতা শেষ করা',
      'পুনরায় শুরু · রিস্টার্ট স্প্রিন্ট',
    ],
  },
  {
    id: 'revision',
    label: 'রিভিশন ও ফাইনাল',
    hint: 'পুরোনো পড়া ঝালাই',
    names: [
      'এইচএসসি 28 ফাইনাল রিভিশন স্প্রিন্ট',
      'সাপ্তাহিক অধ্যায় মাস্টারি স্প্রিন্ট',
      'দ্রুত রিভিশন · ৩ দিনে ৫ অধ্যায়',
      'নোট-ম্যাপ রিভিশন',
      'ভুলের খাতা ঝালানো',
      'মেমোরি রিফ্রেশ স্প্রিন্ট',
    ],
  },
];

/** flat list kept for legacy call-sites that only need the names */
export const PREMADE_SPRINT_NAMES = SPRINT_NAME_GROUPS.flatMap((g) => g.names);

/** turn the saved per-user rename map into the dropdown's group structure */
export function sprintGroupsWithOverrides(overrides = {}) {
  return SPRINT_NAME_GROUPS.map((group) => ({
    ...group,
    names: group.names.map((name) =>
      overrides[name] && String(overrides[name]).trim() ? String(overrides[name]).trim() : name
    ),
  }));
}

// Only sprint labels are shortened. The catalog remains unchanged for syllabus lookup.
export function sprintChapterName(name = '') {
  return String(name)
    .replace(/^\s*(?:অধ্যা(?:য়|য়|য)|chapter|unit|ইউনিট)\s*[০-৯0-9]+\s*[:：.\-–—]?\s*/iu, '')
    .replace(/\s*\((?:অনুশীলনী\s*)?[০-৯0-9.\s–—\-ও,]+\)\s*$/u, '')
    .trim();
}

// Format app-generated Sprint titles without changing custom or saved titles.
export function sprintItemTitle(item, isClass = item?._itemType === 'class') {
  const chapter = sprintChapterName(item?.chapter || '');
  const raw = String(item?.title || '');
  const n = isClass
    ? item?.index
    : item?.step === 0
    ? item?.lectureIndex
    : item?.step === 3
    ? item?.revisionIndex
    : item?.practiceIndex;
  const suffix = raw.match(
    /(?:^|\s[·—-]\s)(Lecture Sheet(?: Practice| Review)?|Recorded Class|Lecture|Class|Question Bank(?: Solve)?|Book Practice|Cycle Book Solve|Practice|Revision|লেকচার শিট|রেকর্ডেড ক্লাস|কোশ্চেন ব্যাংক|প্রশ্নব্যাংক|বুক প্র্যাকটিস)\s+(\d+)$/i
  );
  if (suffix && chapter && sprintChapterName(raw.slice(0, suffix.index).trim()) === chapter) {
    const label = /^(Lecture Sheet|লেকচার শিট)/i.test(suffix[1])
      ? 'লেকচার শিট রিভিউ'
      : /^(Recorded Class|Lecture|Class|রেকর্ডেড ক্লাস)$/i.test(suffix[1])
      ? 'ক্লাস'
      : /^Revision$/i.test(suffix[1])
      ? 'রিভিশন'
      : 'প্র্যাকটিস';
    return `${chapter} · ${label} ${suffix[2]}`;
  }
  if (!raw && chapter) {
    const label = isClass
      ? 'ক্লাস'
      : item?.step === 0
      ? 'লেকচার শিট রিভিউ'
      : item?.step === 3
      ? 'রিভিশন'
      : 'প্র্যাকটিস';
    return `${chapter} · ${label}${n ? ' ' + n : ''}`;
  }
  return sprintChapterName(raw || chapter);
}

export function normalizeSprintPhaseSlot(raw) {
  if (raw === 'noon') return 'afternoon';
  if (ALL_SPRINT_PHASES.includes(raw)) return raw;
  return 'dawn';
}

export function compareSprintItems(a, b) {
  const phase = (x) => {
    const p = x.phaseId === 'noon' ? 'afternoon' : x.phaseId;
    return ALL_SPRINT_PHASES.indexOf(p);
  };
  return (
    String(a.date || '').localeCompare(String(b.date || '')) ||
    (phase(a) < 0 ? 9 : phase(a)) - (phase(b) < 0 ? 9 : phase(b)) ||
    Number(a.scheduleOrder ?? 999999) - Number(b.scheduleOrder ?? 999999) ||
    String(a.subject || '').localeCompare(String(b.subject || '')) ||
    (a._itemType === 'class' ? 0 : a.step === 0 ? 1 : 2) -
      (b._itemType === 'class' ? 0 : b.step === 0 ? 1 : 2) ||
    String(a.id || '').localeCompare(String(b.id || ''))
  );
}

export function generateSprintSchedule({ start, end, modules = [], phaseMode = 'first4', slotsPerDay = 3 }) {
  const first = Date.parse(`${start}T00:00:00Z`);
  const last = Date.parse(`${end}T00:00:00Z`);
  const days = Math.floor((last - first) / 86400000) + 1;
  if (!Number.isFinite(days) || days < 1 || days > 366) {
    throw new Error('স্প্রিন্ট ১–৩৬৬ দিনের মধ্যে রাখুন।');
  }
  const estimate =
    modules.reduce(
      (n, m) => n + days * 2 + 2 * Math.max(1, Math.min(300, Math.floor(Number(m.classCount) || 1))),
      0
    ) + days;
  if (estimate > 6000) {
    throw new Error('শিডিউল খুব বড় (সর্বোচ্চ ৬০০০ আইটেম); দিন বা বিষয় কমান।');
  }

  // Respect user's phaseMode, while honoring late_night if explicitly chosen on a module
  const hasLateNightMod = modules.some((m) => m.phaseId === 'late_night');
  const activePool = hasLateNightMod && phaseMode === 'first4'
    ? ALL_SPRINT_PHASES
    : getSprintPhasesForMode(phaseMode);
  const fallbackPhase = activePool[0] || 'dawn';

  const classes = [];
  const tasks = [];
  const date = (i) => toDateKey(addDays(dateFromKey(start), i));

  const normModPhase = (pid) => {
    const slot = normalizeSprintPhaseSlot(pid);
    return ALL_SPRINT_PHASES.includes(slot) ? slot : fallbackPhase;
  };

  const used = new Set(modules.map((m) => normModPhase(m.phaseId)));
  const free = activePool.filter((p) => !used.has(p));
  const reviewPhase =
    modules.length >= 2 && modules.length < activePool.length && free.length ? free.at(-1) : null;
  const extraPhase =
    modules.length === 2 ? free.filter((p) => p !== reviewPhase).at(-1) || null : null;

  const work = modules.map((mod, index) => ({
    mod,
    index,
    next: 1,
    practice: 0,
    revision: 0,
    count: Math.max(1, Math.min(300, Math.floor(Number(mod.classCount) || 1))),
    chapter: sprintChapterName(mod.chapter),
    phase: normModPhase(mod.phaseId),
    classMin: Math.max(5, Number(mod.classMin) || 60),
    reviewMin: Math.max(0, Number(mod.reviewMin ?? 30)),
    practiceMin: Math.max(0, Number(mod.practiceMin ?? 45)),
    extraCount: 0,
    targetExtras: 0,
  }));

  const info = (w, phase) => ({
    subject: w.mod.subject,
    chapter: w.chapter,
    paper: w.mod.paper || '',
    curriculumType: w.mod.curriculumType || '',
    curriculumTopic: w.mod.curriculumTopic || '',
    phaseId: phase,
    moduleId: w.mod.id || `module-${w.index}`,
  });

  // Deterministic ids: the same module + phase + sequence always produces the
  // same id, so a regenerated (or shifted) schedule keeps the completion state
  // of every class and task that survived.
  const stableId = (kind, w, phase, seq) =>
    `${kind}-${String(w.mod.id || `module-${w.index}`).replace(/[^a-zA-Z0-9_-]/g, '')}-${phase}-${seq}`;

  const addClass = (w, phase, day, order) => {
    const n = w.next++;
    const base = info(w, phase);
    const classId = stableId('sclass', w, phase, n);
    classes.push({
      ...base,
      id: classId,
      index: n,
      scheduleOrder: order,
      title: `${w.chapter} · ক্লাস ${n}`,
      duration: w.classMin,
      date: date(day),
      done: false,
      completedAt: null,
    });
    tasks.push({
      ...base,
      id: stableId('swork', w, phase, `lec-${n}`),
      fromClassId: classId,
      lectureIndex: n,
      scheduleOrder: order + 1,
      step: 0,
      kind: 'Lecture Sheet Review',
      name: 'লেকচার শিট রিভিউ',
      title: `${w.chapter} · লেকচার শিট রিভিউ ${n}`,
      duration: w.reviewMin,
      date: date(day),
      done: false,
    });
    return n;
  };

  const slotsNeeded = Math.max(2, Math.min(4, Number(slotsPerDay) || 3));
  const preferred = [...new Set(work.map((w) => w.phase))];
  const dayPhases = [...preferred, ...activePool.filter((p) => !preferred.includes(p))].slice(0, slotsNeeded);
  const phaseOwners = new Set();
  for (const phase of dayPhases) { const owner = work.find((w) => w.phase === phase); if (owner) phaseOwners.add(owner); }
  for (const w of work) w.targetExtras = w.count - Math.min(w.count, phaseOwners.has(w) ? days : 0);
  const totalClasses = work.reduce((n, w) => n + w.count, 0);
  const overflowDays = Math.max(0, totalClasses - days * slotsNeeded);
  if (overflowDays > days) throw new Error('এই সময়সীমায় ক্লাস শেষ করতে প্রতিদিনের প্রহর ৪-এ বাড়ান বা স্প্রিন্ট দীর্ঘ করুন।');
  const overflowDaySet = new Set(Array.from({ length: overflowDays }, (_, i) => Math.floor(((i + 1) * days) / overflowDays) - 1));

  // Assign each subject its preferred period first, then distribute remaining
  // sets by completion pressure. This avoids front-loading one subject while
  // keeping workloads feasible and limits a subject to two sets/day unless needed.
  for (let day = 0; day < days; day++) {
    const remainingDays = days - day;
    const dailyCount = new Map(work.map((w) => [w, 0]));
    const todaysPhases = [...dayPhases];
    if (overflowDaySet.has(day)) {
      const extra = activePool.find((p) => !todaysPhases.includes(p)) || (todaysPhases.includes('night') ? 'late_night' : 'night');
      todaysPhases.push(extra);
    }
    for (let slot = 0; slot < todaysPhases.length; slot++) {
      const phase = todaysPhases[slot];
      const pending = work.filter((w) => w.next <= w.count);
      if (!pending.length) break;
      const due = (w) => (w.count - w.next + 1) / remainingDays;
      const baseSlot = pending.filter((w) => w.phase === phase && !dailyCount.get(w));
      let pool = baseSlot;
      if (!pool.length) {
        pool = pending.filter((w) => (dailyCount.get(w) || 0) < 2);
      }
      if (!pool.length) {
        pool = pending.filter((w) => (dailyCount.get(w) || 0) < 3 && w.count - w.next + 1 > 2 * (remainingDays - 1));
      }
      if (!pool.length) continue;
      pool.sort((a, b) => due(b) - due(a) || Number(b.phase === phase) - Number(a.phase === phase) || a.index - b.index);
      const w = pool[0];
      const order = slot * 1000;
      const n = addClass(w, phase, day, order);
      tasks.push({
        ...info(w, phase),
        id: stableId('swork', w, phase, `prac-${n}`),
        step: 2,
        practiceIndex: n,
        scheduleOrder: order + 2,
        kind: 'Practice',
        name: 'প্র্যাকটিস',
        title: `${w.chapter} · প্র্যাকটিস ${n}`,
        duration: w.practiceMin,
        date: date(day),
        done: false,
      });
      dailyCount.set(w, (dailyCount.get(w) || 0) + 1);
    }
    // Night revisions are kept separate from daytime lecture-set capacity.
    for (const w of work) {
      if (w.next > 1) tasks.push({
        ...info(w, 'night'),
        id: stableId('swork', w, 'night', `rev-${day + 1}`),
        step: 3,
        revisionIndex: day + 1,
        scheduleOrder: w.index * 10000 + 9000,
        kind: 'Revision',
        name: 'রিভিশন',
        title: `${w.chapter} · রিভিশন ${day + 1}`,
        duration: 45,
        date: date(day),
        done: false,
      });
    }
  }
  const left = work.reduce((sum, w) => sum + Math.max(0, w.count - w.next + 1), 0);
  if (left) throw new Error('নির্বাচিত দৈনিক প্রহর ও স্প্রিন্টের দিনে সব ক্লাস শেষ করা সম্ভব হচ্ছে না। প্রহর ৪-এ বাড়ান বা স্প্রিন্ট দীর্ঘ করুন।');
  return { classes, tasks };
}
