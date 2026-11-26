import { bnNum } from './bangla';

export const AURA_RANKS = [
  { tier: 1, name: 'Novice', minXp: 0, badge: '🌱', color: '#94a3b8' },
  { tier: 2, name: 'Apprentice', minXp: 250, badge: '📘', color: '#60a5fa' },
  { tier: 3, name: 'Initiate', minXp: 600, badge: '⚡', color: '#38bdf8' },
  { tier: 4, name: 'Focused', minXp: 1100, badge: '🎯', color: '#34d399' },
  { tier: 5, name: 'Scholar', minXp: 1800, badge: '🧠', color: '#c9a227' },
  { tier: 6, name: 'Disciplined', minXp: 2700, badge: '🛡️', color: '#ff9808' },
  { tier: 7, name: 'Relentless', minXp: 3900, badge: '🔥', color: '#ff9808' },
  { tier: 8, name: 'Vanguard', minXp: 5400, badge: '⚔️', color: '#ec4899' },
  { tier: 9, name: 'Mastermind', minXp: 7200, badge: '👑', color: '#a855f7' },
  { tier: 10, name: 'Apex', minXp: 9500, badge: '💎', color: '#8b5cf6' },
  { tier: 11, name: 'Legend', minXp: 12500, badge: '🌟', color: '#ffd369' },
];

// Civil date objects represent calendar selections; real instants use Dhaka (UTC+06).
export function civilDateKey(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function toDateKey(d = new Date()) {
  if(d?.__civilDate)return civilDateKey(d);
  const x=new Date(new Date(d).getTime()+6*3600000);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,'0')}-${String(x.getUTCDate()).padStart(2,'0')}`;
}
export function addDays(baseDate, offsetDays) {
  if(baseDate?.__civilDate){const d=new Date(baseDate);d.__civilDate=true;d.setDate(d.getDate()+offsetDays);return d;}
  return new Date(new Date(baseDate).getTime()+offsetDays*86400000);
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function formatHMS(totalSec) {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function formatHM(totalSec) {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

export function formatClockMMSS(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function createDemoSeedState() {
  const now = new Date();
  const todayKey = toDateKey(now);

  const subjects = [
    { id: 'subj_phy', name: 'Physics', color: '#f59e0b', icon: '⚛️', dailyGoalMin: 90 },
    { id: 'subj_chem', name: 'Chemistry', color: '#ec4899', icon: '🧪', dailyGoalMin: 60 },
    { id: 'subj_math_standard', name: 'Math', color: '#38bdf8', icon: '📐', dailyGoalMin: 60 },
    { id: 'subj_math', name: 'Math', color: '#c9a227', icon: '📐', dailyGoalMin: 90 },
    { id: 'subj_bio', name: 'Biology', color: '#d8c452', icon: '🧬', dailyGoalMin: 60 },
    { id: 'subj_bn', name: 'Bangla', color: '#fb7185', icon: '📘', dailyGoalMin: 60 },
    { id: 'subj_eng', name: 'English', color: '#3b82f6', icon: '📖', dailyGoalMin: 60 },
    { id: 'subj_ict', name: 'ICT', color: '#8b5cf6', icon: '💻', dailyGoalMin: 60 },
  ];

  const sessions = [];
  const makeSession = (dayOffset, startHour, startMin, durationMin, subjId, subjName, notes = '') => {
    const day = addDays(now, dayOffset);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startHour, startMin, 0);
    const end = new Date(start.getTime() + durationMin * 60000);
    sessions.push({
      id: uid('sess'),
      subjectId: subjId,
      subjectName: subjName,
      mode: 'pomodoro',
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      durationSec: durationMin * 60,
      dateKey: toDateKey(start),
      notes,
    });
  };

  makeSession(0, 6, 10, 50, 'subj_phy', 'Physics', 'Chapter 2 Vector & Dynamics CQ practice');
  makeSession(0, 7, 10, 50, 'subj_phy', 'Physics', 'Newtonian Mechanics numericals');
  makeSession(0, 9, 0, 50, 'subj_math', 'Mathematics', 'Calculus differentiation exercise 9.3');
  makeSession(0, 10, 0, 45, 'subj_eng', 'English', 'Grammar modifiers & passage summary');
  makeSession(0, 14, 20, 30, 'subj_ict', 'ICT & Coding', 'C programming & number systems');

  const histPattern = [
    [-1, [[6, 0, 50, 'subj_math', 'Mathematics'], [7, 0, 50, 'subj_phy', 'Physics'], [15, 0, 50, 'subj_chem', 'Chemistry'], [20, 0, 55, 'subj_eng', 'English'], [21, 10, 45, 'subj_ict', 'ICT & Coding']]],
    [-2, [[6, 30, 50, 'subj_phy', 'Physics'], [8, 0, 50, 'subj_math', 'Mathematics'], [16, 0, 50, 'subj_chem', 'Chemistry'], [20, 30, 50, 'subj_phy', 'Physics']]],
    [-3, [[7, 0, 50, 'subj_eng', 'English'], [9, 0, 50, 'subj_math', 'Mathematics'], [19, 0, 60, 'subj_ict', 'ICT & Coding']]],
    [-4, [[6, 0, 50, 'subj_phy', 'Physics'], [7, 0, 50, 'subj_phy', 'Physics'], [10, 0, 50, 'subj_chem', 'Chemistry'], [15, 0, 50, 'subj_math', 'Mathematics'], [20, 0, 60, 'subj_math', 'Mathematics'], [21, 15, 45, 'subj_eng', 'English']]],
    [-5, [[8, 0, 50, 'subj_chem', 'Chemistry'], [19, 30, 50, 'subj_math', 'Mathematics']]],
    [-6, [[6, 30, 50, 'subj_phy', 'Physics'], [9, 0, 50, 'subj_eng', 'English'], [16, 0, 50, 'subj_ict', 'ICT & Coding'], [20, 0, 50, 'subj_math', 'Mathematics']]],
  ];
  histPattern.forEach(([off, blocks]) => {
    blocks.forEach(([h, m, dur, sid, sname]) => makeSession(off, h, m, dur, sid, sname));
  });
  for (let d = -7; d >= -32; d--) {
    if (d % 6 === 0) continue;
    const mins = 90 + ((Math.abs(d) * 37) % 210);
    const pick = subjects[Math.abs(d) % subjects.length];
    makeSession(d, 7, 0, Math.min(90, mins), pick.id, pick.name);
    if (mins > 90) {
      const pick2 = subjects[(Math.abs(d) + 2) % subjects.length];
      makeSession(d, 19, 0, mins - 90, pick2.id, pick2.name);
    }
  }

  return {
    profile: {
      name: 'Personal Student',
      motto: '50/10 Deep Focus • Consistency beats intensity.',
      dailyGoalMin: 300,
      xp: 1940,
      soundEnabled: true,
      autoStartBreak: false,
    },
    timerPrefs: {
      mode: 'pomodoro',
      focusMin: 50,
      breakMin: 10,
      longBreakMin: 15,
      presetKey: '50',
      selectedSubjectId: 'subj_phy',
      focusViewStyle: 'illustrated',
      uiMode: 'campus',
      scratchpad: '• Vector CQ #4: check angle with river current\n• Revise chain rule formula after break',
    },
    commitment: {
      active: true,
      title: '30-Day Pre-Exam Monk Focus Challenge',
      targetHoursPerDay: 5,
      totalDays: 30,
      startedDateKey: toDateKey(addDays(now, -6)),
      pledge: 'Zero doomscrolling during study blocks. Every Pomodoro counts toward my dream result.',
    },
    subjects,
    sessions,
    todos: [
      {
        id: uid('todo'),
        title: 'Morning Formula Revision',
        description: 'Quick warm-up review before deep Pomodoro block.',
        dateKey: todayKey,
        startTime: '06:00',
        durationMin: 30,
        priority: 'Medium',
        category: 'Revision',
        icon: '🔔',
        subjectId: 'subj_phy',
        done: true,
        notes: 'Review vector projection & projectile motion key equations.',
        subtasks: [
          { id: uid('st'), text: 'Vector dot & cross product formulas', done: true },
          { id: uid('st'), text: 'Projectile max height & range', done: true },
        ],
      },
      {
        id: uid('todo'),
        title: 'Physics — Chapter 2 CQ & MCQ Solve',
        description: 'Board questions + conceptual problem set.',
        dateKey: todayKey,
        startTime: '08:00',
        durationMin: 60,
        priority: 'High',
        category: 'Study',
        icon: '⚛️',
        subjectId: 'subj_phy',
        done: false,
        notes: 'Focus on river-boat & rain-umbrella relative velocity problems.',
        subtasks: [
          { id: uid('st'), text: 'Chapter 2 core theory recap', done: true },
          { id: uid('st'), text: 'Solve 5 Board CQ problems', done: false },
          { id: uid('st'), text: '25 timed MCQ practice', done: false },
        ],
      },
      {
        id: uid('todo'),
        title: 'Calculus — Differentiation Ex 9.4',
        description: 'Chain rule & implicit function derivatives.',
        dateKey: todayKey,
        startTime: '16:30',
        durationMin: 50,
        priority: 'High',
        category: 'Study',
        icon: '📐',
        subjectId: 'subj_math',
        done: false,
        notes: '',
        subtasks: [
          { id: uid('st'), text: 'Work through examples 1–6', done: false },
          { id: uid('st'), text: 'Complete 12 exercise problems', done: false },
        ],
      },
      {
        id: uid('todo'),
        title: 'Evening Walk & Stretch',
        description: '15m screen-free recharge before night study session.',
        dateKey: todayKey,
        startTime: '18:30',
        durationMin: 20,
        priority: 'Low',
        category: 'Health',
        icon: '🏃',
        subjectId: '',
        done: false,
        notes: '',
        subtasks: [],
      },
      {
        id: uid('todo'),
        title: 'Night Flashcard & Mistake Log Review',
        description: 'Active recall before sleep.',
        dateKey: todayKey,
        startTime: '21:30',
        durationMin: 40,
        priority: 'Medium',
        category: 'Exam Prep',
        icon: '🧠',
        subjectId: 'subj_chem',
        done: false,
        notes: '',
        subtasks: [
          { id: uid('st'), text: 'Review 10 Chemistry & Physics flashcards', done: false },
          { id: uid('st'), text: "Plan tomorrow's top 3 priorities", done: false },
        ],
      },
    ],
    exams: [
      {
        id: uid('exam'),
        title: 'Physics Paper 1 — Term Assessment',
        subjectId: 'subj_phy',
        dateKey: toDateKey(addDays(now, 14)),
        targetScore: '92%+',
        syllabusNote: 'Chapters 1–5 (Vectors, Dynamics, Work-Energy, Gravity)',
      },
      {
        id: uid('exam'),
        title: 'Higher Mathematics — Calculus Test',
        subjectId: 'subj_math',
        dateKey: toDateKey(addDays(now, 24)),
        targetScore: '95%+',
        syllabusNote: 'Limits, Continuity, Differentiation & Applications',
      },
      {
        id: uid('exam'),
        title: 'Semester / Final Board Preparation',
        subjectId: 'subj_chem',
        dateKey: toDateKey(addDays(now, 68)),
        targetScore: 'A+ Distinction',
        syllabusNote: 'Full Syllabus Revision + Model Tests',
      },
    ],
    syllabus: [
      { id: uid('ch'), subjectId: 'subj_phy', chapter: 'Ch 1: Physical World & Measurement', theory: true, notes: true, practice: true, revised: true },
      { id: uid('ch'), subjectId: 'subj_phy', chapter: 'Ch 2: Vectors', theory: true, notes: true, practice: true, revised: false },
      { id: uid('ch'), subjectId: 'subj_phy', chapter: 'Ch 4: Newtonian Mechanics', theory: true, notes: true, practice: false, revised: false },
      { id: uid('ch'), subjectId: 'subj_math', chapter: 'Ch 9.1–9.3: Limits & Differentiation', theory: true, notes: true, practice: true, revised: false },
      { id: uid('ch'), subjectId: 'subj_math', chapter: 'Ch 9.4–9.6: Successive & Maxima/Minima', theory: true, notes: false, practice: false, revised: false },
      { id: uid('ch'), subjectId: 'subj_chem', chapter: 'Ch 2: Qualitative Chemistry', theory: true, notes: true, practice: false, revised: false },
      { id: uid('ch'), subjectId: 'subj_ict', chapter: 'Ch 3: Number Systems & Digital Logic', theory: true, notes: true, practice: true, revised: true },
    ],
    flashcards: [
      {
        id: uid('fc'),
        subjectId: 'subj_phy',
        front: 'What is the condition for two non-zero vectors A and B to be perpendicular?',
        back: 'Their scalar (dot) product is zero:  A · B = |A||B| cos(90°) = 0.',
      },
      {
        id: uid('fc'),
        subjectId: 'subj_phy',
        front: 'Formula for horizontal range (R) and maximum height (H) of a projectile?',
        back: 'R = (v₀² sin 2θ) / g   and   H = (v₀² sin²θ) / (2g).',
      },
      {
        id: uid('fc'),
        subjectId: 'subj_math',
        front: 'Derivative of d/dx [ ln(sin x) ] ?',
        back: '(1 / sin x) · cos x = cot x.',
      },
      {
        id: uid('fc'),
        subjectId: 'subj_chem',
        front: "Pauli's Exclusion Principle?",
        back: 'No two electrons in the same atom can have the exact same values for all four quantum numbers (n, l, m, s).',
      },
      {
        id: uid('fc'),
        subjectId: 'subj_ict',
        front: "De Morgan's Two Theorems in Boolean Algebra?",
        back: "1) (A + B)' = A' · B'     2) (A · B)' = A' + B'",
      },
    ],
    studyNotes: [
      {
        id: uid('note'),
        subjectId: 'subj_phy',
        title: 'Relative Velocity — River & Boat Shortcut',
        content: '• Shortest time to cross river of width d: steer at α = 90° to current → t_min = d / v_boat\n• Zero drift (shortest path): steer at cos α = -u / v_boat → t = d / √(v_boat² - u²)',
      },
      {
        id: uid('note'),
        subjectId: 'subj_math',
        title: 'Standard Limits Worth Memorizing',
        content: '• lim(x→0) (sin x)/x = 1\n• lim(x→0) (e^x - 1)/x = 1\n• lim(x→0) (1 + x)^(1/x) = e',
      },
    ],
    routine: [
      { day: 'Saturday', morning: 'Physics (50/10 x2)', afternoon: 'College / Lab + Break', evening: 'Higher Math Problem Set' },
      { day: 'Sunday', morning: 'Mathematics Calculus', afternoon: 'Classes & Notes Cleanup', evening: 'Chemistry Organic/Qual.' },
      { day: 'Monday', morning: 'Physics Mechanics', afternoon: 'English + ICT Practice', evening: 'Past Paper CQ Solve' },
      { day: 'Tuesday', morning: 'Chemistry Deep Focus', afternoon: 'Classes + Rest', evening: 'Mathematics Revision' },
      { day: 'Wednesday', morning: 'ICT & Programming', afternoon: 'Physics Lab / Notes', evening: 'Timed MCQ Mock Test' },
      { day: 'Thursday', morning: 'Weak-Topic Catchup', afternoon: 'English Writing & Reading', evening: 'Flashcards & Weekly Review' },
      { day: 'Friday', morning: 'Full Model Test (3h)', afternoon: 'Mistake Analysis + Rest', evening: 'Next Week Planning' },
    ],
  };
}

export function createCleanSlateState(existingName = 'শিক্ষার্থী') {
  const now = new Date();
  return {
    profile: {
      name: existingName || 'শিক্ষার্থী',
      motto: 'প্রতিদিনের নিয়মিত চর্চাই আপনাকে এগিয়ে নেয়।',
      dailyGoalMin: 300,
      xp: 0,
      soundEnabled: true,
      autoStartBreak: false,
    },
    timerPrefs: {
      mode: 'pomodoro',
      focusMin: 50,
      breakMin: 10,
      longBreakMin: 15,
      presetKey: '50',
      selectedSubjectId: 'subj_phy',
      focusViewStyle: 'illustrated',
      uiMode: 'campus',
      scratchpad: '',
    },
    commitment: {
      active: true,
      title: '30-Day Deep Study Commitment',
      targetHoursPerDay: 5,
      totalDays: 30,
      startedDateKey: toDateKey(now),
      pledge: 'Show up every single day and protect my study hours.',
    },
    subjects: [
      { id: 'subj_phy', name: 'Physics', color: '#f59e0b', icon: '⚛️', dailyGoalMin: 90 },
      { id: 'subj_chem', name: 'Chemistry', color: '#ec4899', icon: '🧪', dailyGoalMin: 60 },
      { id: 'subj_math_standard', name: 'Math', color: '#38bdf8', icon: '📐', dailyGoalMin: 60 },
    { id: 'subj_math', name: 'Math', color: '#c9a227', icon: '📐', dailyGoalMin: 90 },
      { id: 'subj_bio', name: 'Biology', color: '#d8c452', icon: '🧬', dailyGoalMin: 60 },
      { id: 'subj_bn', name: 'Bangla', color: '#fb7185', icon: '📘', dailyGoalMin: 60 },
      { id: 'subj_eng', name: 'English', color: '#3b82f6', icon: '📖', dailyGoalMin: 60 },
      { id: 'subj_ict', name: 'ICT', color: '#8b5cf6', icon: '💻', dailyGoalMin: 60 },
    ],
    sessions: [],
    todos: [],
    exams: [],
    syllabus: [],
    flashcards: [],
    studyNotes: [],
    routine: [
      { day: 'Saturday', morning: '', afternoon: '', evening: '' },
      { day: 'Sunday', morning: '', afternoon: '', evening: '' },
      { day: 'Monday', morning: '', afternoon: '', evening: '' },
      { day: 'Tuesday', morning: '', afternoon: '', evening: '' },
      { day: 'Wednesday', morning: '', afternoon: '', evening: '' },
      { day: 'Thursday', morning: '', afternoon: '', evening: '' },
      { day: 'Friday', morning: '', afternoon: '', evening: '' },
    ],
  };
}
