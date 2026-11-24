/**
 * SUBJECT COLOR ATLAS — one single source of truth.
 *
 * Every place in Study Sentry that needs a subject colour (task chips, sprint rows,
 * syllabus chapters, XP quests, group cards, donut slices, focus badges…) must read
 * from this table so a subject always looks the same across the whole app.
 *
 * The base hues mirror the approved subject palette:
 *   Physics → blue · Chemistry → violet · Math → amber · Biology → green
 *   English → pink · Bangla → rose · ICT → cyan
 *
 * Inside a subject we still need to tell a class from a lecture sheet from a
 * practice set, so every subject ships three *variants*:
 *   class   → the deepest, most grounded tone
 *   sheet   → the mid tone (lecture sheet / note / material)
 *   practice→ the brightest, most energetic tone
 */

export const SUBJECT_COLOR_ATLAS = {
  Physics: {
    base: '#48c8ff',
    class: '#2b7fb8',
    sheet: '#48c8ff',
    practice: '#9ee4ff',
    bg: '#102842',
    edge: '#2b6888',
  },
  Chemistry: {
    base: '#b19aff',
    class: '#6f57c4',
    sheet: '#b19aff',
    practice: '#d9c9ff',
    bg: '#25203e',
    edge: '#625397',
  },
  Math: {
    base: '#ffbd48',
    class: '#b9821f',
    sheet: '#ffbd48',
    practice: '#ffe0a3',
    bg: '#29231f',
    edge: '#8b6a26',
  },
  Biology: {
    // Biology used to be mint-green. In the amber theme it becomes a warm
    // chartreuse-gold so it stays distinguishable without reintroducing green.
    base: '#d8c452',
    class: '#9a8a2c',
    sheet: '#d8c452',
    practice: '#f2e79a',
    bg: '#2b2710',
    edge: '#8a7a24',
  },
  English: {
    base: '#f07bc3',
    class: '#b34d8b',
    sheet: '#f07bc3',
    practice: '#fbb6e0',
    bg: '#302139',
    edge: '#854d73',
  },
  Bangla: {
    base: '#fa818f',
    class: '#bf4d5c',
    sheet: '#fa818f',
    practice: '#ffc0c6',
    bg: '#30202c',
    edge: '#87485b',
  },
  ICT: {
    base: '#36cfe9',
    class: '#1d8ba3',
    sheet: '#36cfe9',
    practice: '#a5eefa',
    bg: '#0a2737',
    edge: '#267489',
  },
  Class: {
    base: '#cad0e5',
    class: '#7f8699',
    sheet: '#cad0e5',
    practice: '#e8ebf5',
    bg: '#272a3a',
    edge: '#62667f',
  },
};

export const SUBJECT_COLOR_FALLBACK = {
  base: '#a78bfa',
  class: '#6d55b8',
  sheet: '#a78bfa',
  practice: '#d6c8ff',
  bg: '#24203a',
  edge: '#5b4a86',
};

/** Alias table — old records and user entries may use a longer/older name. */
const ALIASES = {
  physics: 'Physics',
  'physical science': 'Physics',
  'পদার্থবিজ্ঞান': 'Physics',
  chemistry: 'Chemistry',
  'general chemistry': 'Chemistry',
  'রসায়ন': 'Chemistry',
  math: 'Math',
  mathematics: 'Math',
  'higher math': 'Math',
  'higher mathematics': 'Math',
  'advanced math': 'Math',
  'গণিত': 'Math',
  'উচ্চতর গণিত': 'Math',
  biology: 'Biology',
  'life science': 'Biology',
  'জীববিজ্ঞান': 'Biology',
  english: 'English',
  'ইংরেজি': 'English',
  bangla: 'Bangla',
  bengali: 'Bangla',
  'বাংলা': 'Bangla',
  ict: 'ICT',
  'ict & coding': 'ICT',
  'ict & coding ': 'ICT',
  computing: 'ICT',
  'আইসিটি': 'ICT',
  class: 'Class',
  general: 'Class',
};

/** Resolve any spelling into the canonical atlas key. */
export function subjectKey(name) {
  const raw = String(name ?? '').trim();
  if (!raw) return 'Class';
  if (SUBJECT_COLOR_ATLAS[raw]) return raw;
  const lower = raw.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  for (const key of Object.keys(SUBJECT_COLOR_ATLAS)) {
    if (key.toLowerCase() === lower) return key;
  }
  return 'Class';
}

/**
 * @param {string} name  subject name
 * @param {'base'|'class'|'sheet'|'practice'} variant
 */
export function subjectColor(name, variant = 'base') {
  const key = subjectKey(name);
  const entry = SUBJECT_COLOR_ATLAS[key] || SUBJECT_COLOR_FALLBACK;
  return entry[variant] || entry.base;
}

/** Full palette for a subject — handy when a card needs bg + edge + text tones. */
export function subjectPalette(name) {
  const key = subjectKey(name);
  return SUBJECT_COLOR_ATLAS[key] || SUBJECT_COLOR_FALLBACK;
}

/** A translucent wash of the subject colour, safe on dark surfaces. */
export function subjectTint(name, alpha = 0.16) {
  const hex = subjectColor(name, 'base').replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A ready-to-use CSS custom-property bag for inline styles. */
export function subjectVars(name, variant = 'base') {
  const palette = subjectPalette(name);
  const tone = subjectColor(name, variant);
  return {
    '--sub-tone': tone,
    '--sub-base': palette.base,
    '--sub-bg': palette.bg,
    '--sub-edge': palette.edge,
    '--sub-wash': subjectTint(name, 0.16),
  };
}
