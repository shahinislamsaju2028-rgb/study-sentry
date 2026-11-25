// Fixed choices for new subject tasks. Existing/custom records are never deleted.
export const PREMADE_SUBJECTS = ['Physics', 'Chemistry', 'Math', 'Biology', 'English', 'Bangla', 'ICT'];

export const SUBJECT_PALETTES = {
  Physics: { color: '#48c8ff', bg: '#102842', edge: '#2b6888' },
  Chemistry: { color: '#b19aff', bg: '#25203e', edge: '#625397' },
  Math: { color: '#ffbd48', bg: '#29231f', edge: '#8b6a26' },
  'Higher Math': { color: '#ffbd48', bg: '#29231f', edge: '#8b6a26' }, // legacy alias → Math
  Biology: { color: '#5fd97a', bg: '#0d2a18', edge: '#2f7a41' },
  English: { color: '#f07bc3', bg: '#302139', edge: '#854d73' },
  Bangla: { color: '#fa818f', bg: '#30202c', edge: '#87485b' },
  ICT: { color: '#36cfe9', bg: '#0a2737', edge: '#267489' },
  Class: { color: '#cad0e5', bg: '#272a3a', edge: '#62667f' },
  // মানবিক
  History: { color: '#e8b473', bg: '#2e2317', edge: '#8a6534' },
  'Islamic History & Culture': { color: '#7fd1c1', bg: '#132b2c', edge: '#2f6f6c' },
  Sociology: { color: '#f0a3c4', bg: '#301f2b', edge: '#8b5473' },
  'Social Work': { color: '#f59fb0', bg: '#31212a', edge: '#91596a' },
  Economics: { color: '#8fd39a', bg: '#152a1d', edge: '#3d7350' },
  'Civics & Good Governance': { color: '#9fb8f0', bg: '#1b2338', edge: '#4a5f96' },
  Logic: { color: '#c4a2f0', bg: '#271e39', edge: '#6b4e9c' },
  'Geography & Environment': { color: '#6fd0c4', bg: '#102b2b', edge: '#2f6f68' },
  Psychology: { color: '#f2a6d8', bg: '#301f30', edge: '#8a5480' },
  // ব্যবসায় শিক্ষা
  Accounting: { color: '#7fd4a8', bg: '#122b22', edge: '#377358' },
  'Business Organization & Management': { color: '#f2c56b', bg: '#2e2617', edge: '#8a6c33' },
  'Finance, Banking & Insurance': { color: '#78c7f5', bg: '#102836', edge: '#336b91' },
  'Production Management & Marketing': { color: '#f0a06a', bg: '#301f16', edge: '#8c5a35' },
  Statistics: { color: '#a3b8f7', bg: '#1b2138', edge: '#4d5c97' },
};

const SUBJECT_ICON_KEYS = {
  Physics: 'atom',
  Chemistry: 'flask',
  Math: 'sigma',
  'Higher Math': 'sigma',
  Biology: 'dna',
  English: 'languages',
  Bangla: 'languages',
  ICT: 'monitor',
  // মানবিক
  History: 'landmark',
  'Islamic History & Culture': 'sparkles',
  Sociology: 'users',
  'Social Work': 'heart-hands',
  Economics: 'trending-up',
  'Civics & Good Governance': 'scale',
  Logic: 'network',
  'Geography & Environment': 'globe',
  Psychology: 'brain',
  // ব্যবসায় শিক্ষা
  Accounting: 'calculator',
  'Business Organization & Management': 'building',
  'Finance, Banking & Insurance': 'banknote',
  'Production Management & Marketing': 'factory',
  Statistics: 'chart-column',
};

export function iconForSubject(name) {
  return SUBJECT_ICON_KEYS[name] || 'book';
}

export function findSubject(subjects, name) {
  return (
    (subjects || []).find(
      (s) => String(s.name || '').trim().toLowerCase() === String(name).toLowerCase()
    ) || null
  );
}

export function subjectName(subjects, id) {
  return (subjects || []).find((s) => s.id === id)?.name || '';
}


/* ══════════════════════════════════════════════════════════════════════════
   6.txt · ⓶⓹ — ONE MATHS, PLEASE
   ──────────────────────────────────────────────────────────────────────────
   The app shipped two maths subjects: "Math" and "Higher Math", with the same
   colour, the same sigma icon and the same chapter list. A student had to
   choose between two names for one subject everywhere a subject was picked.

   `canonicalSubject()` folds the legacy key into Math. It is applied at the
   read boundaries (subject names on cards, chips, filters) rather than by
   rewriting saved records, so old data keeps working and nothing is lost.
   ══════════════════════════════════════════════════════════════════════════ */
export function canonicalSubject(name) {
  const n = String(name || '').trim();
  if (!n) return n;
  if (n === 'Higher Math' || n === 'Higher Mathematics' || n === 'HigherMath') return 'Math';
  return n;
}
