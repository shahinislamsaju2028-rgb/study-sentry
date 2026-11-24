import React from 'react';
import PremiumSubjectIcon from './PremiumSubjectIcon';
import { PREMADE_SUBJECTS } from '../utils/premadeSubjects';
import {
  Atom,
  FlaskConical,
  Sigma,
  Dna,
  Languages,
  BookOpen,
  Monitor,
  BookMarked,
  Palette,
  Globe,
  Landmark,
  Scale,
  Brain,
  Users,
  HeartHandshake,
  TrendingUp,
  Network,
  Sparkles,
  Calculator,
  Building2,
  Banknote,
  Factory,
  ChartColumn,
} from 'lucide-react';

export const STUDY_ICONS = [
  { key:'atom', label:'Physics', Icon:Atom, legacy:'⚛️' },
  { key:'flask', label:'Chemistry', Icon:FlaskConical, legacy:'🧪' },
  { key:'sigma', label:'Mathematics', Icon:Sigma, legacy:'📐' },
  { key:'dna', label:'Biology', Icon:Dna, legacy:'🧬' },
  { key:'language', label:'Language', Icon:Languages, legacy:'📘' },
  { key:'book', label:'Reading', Icon:BookOpen, legacy:'📖' },
  { key:'monitor', label:'Computing', Icon:Monitor, legacy:'💻' },
  { key:'bookmark', label:'Study', Icon:BookMarked, legacy:'📚' },
  { key:'globe', label:'World', Icon:Globe, legacy:'🌍' },
  { key:'palette', label:'Creative', Icon:Palette, legacy:'🎨' },
];

/**
 * Every HSC subject now gets its own pictogram — a মানবিক or ব্যবসায় student
 * sees a meaningful glyph instead of a generic book.
 */
export const SUBJECT_ICON_MAP = {
  // ── common to every group ──
  Bangla: 'language',
  English: 'book',
  ICT: 'monitor',

  // ── বিজ্ঞান ──
  Physics: 'atom',
  Chemistry: 'flask',
  Math: 'sigma',
  'Higher Math': 'sigma',
  Biology: 'dna',

  // ── মানবিক ──
  History: 'landmark',
  'Islamic History & Culture': 'sparkles',
  Sociology: 'users',
  'Social Work': 'hands',
  Economics: 'trend',
  'Civics & Good Governance': 'scale',
  Logic: 'network',
  'Geography & Environment': 'globe',
  Psychology: 'brain',

  // ── ব্যবসায় শিক্ষা ──
  Accounting: 'calculator',
  'Business Organization & Management': 'building',
  'Finance, Banking & Insurance': 'banknote',
  'Production Management & Marketing': 'factory',
  Statistics: 'chart',
};

const SUBJECT_ICON_COMPONENTS = {
  atom: Atom,
  flask: FlaskConical,
  sigma: Sigma,
  dna: Dna,
  language: Languages,
  book: BookOpen,
  monitor: Monitor,
  bookmark: BookMarked,
  globe: Globe,
  palette: Palette,
  landmark: Landmark,
  scale: Scale,
  brain: Brain,
  users: Users,
  hands: HeartHandshake,
  trend: TrendingUp,
  network: Network,
  sparkles: Sparkles,
  calculator: Calculator,
  building: Building2,
  banknote: Banknote,
  factory: Factory,
  chart: ChartColumn,
};

const norm = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

export function iconKeyFor(subject) {
  if (subject?.previewVectorIcon && STUDY_ICONS.some((i) => i.key === subject.previewVectorIcon))
    return subject.previewVectorIcon;

  const name = subject?.name ?? '';
  const exact = SUBJECT_ICON_MAP[name];
  if (exact) return exact;

  const text = `${subject?.id || ''} ${name}`.toLowerCase();
  if (/phy|physics/.test(text)) return 'atom';
  if (/chem|chemistry/.test(text)) return 'flask';
  if (/math/.test(text)) return 'sigma';
  if (/bio/.test(text)) return 'dna';
  if (/bangla|bengali|subj_bn/.test(text)) return 'language';
  if (/eng|english/.test(text)) return 'book';
  if (/ict|coding|computer/.test(text)) return 'monitor';
  if (/account/.test(text)) return 'calculator';
  if (/financ|bank|insur/.test(text)) return 'banknote';
  if (/market|production/.test(text)) return 'factory';
  if (/statistic/.test(text)) return 'chart';
  if (/econom/.test(text)) return 'trend';
  if (/psycholog/.test(text)) return 'brain';
  if (/sociolog|social work/.test(text)) return 'users';
  if (/governance|civics/.test(text)) return 'scale';
  if (/logic/.test(text)) return 'network';
  if (/geograph|environment/.test(text)) return 'globe';
  if (/history/.test(text)) return 'landmark';
  if (/islamic/.test(text)) return 'sparkles';
  if (/business|management|organization/.test(text)) return 'building';

  const legacy = STUDY_ICONS.find((i) => i.legacy === subject?.icon);
  return legacy?.key || 'bookmark';
}

export function PreviewSubjectIcon({ subject, size = 20 }) {
  if ([...PREMADE_SUBJECTS, 'Class'].includes(subject?.name))
    return <PremiumSubjectIcon name={subject.name} size={size} />;
  const key = iconKeyFor(subject);
  const Icon = SUBJECT_ICON_COMPONENTS[key] || STUDY_ICONS.find((i) => i.key === key)?.Icon || BookMarked;
  return <Icon size={size} strokeWidth={1.85} aria-hidden="true" />;
}
