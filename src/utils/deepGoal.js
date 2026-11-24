import { timerElapsedMs } from './stats';

export const GOAL_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Math',
  'Biology',
  'English',
  'Bangla',
  'ICT',
  'Class',
];
export const DEEP_GOAL_SECONDS = 90 * 60;
export const GOAL_BREAK_SECONDS = 10 * 60;
export const LOCK_AFTER_SECONDS = 7 * 60; // Strict 7-minute lock on ALL focus sessions
export const HALF_GOAL_SECONDS = 45 * 60;
export const PAUSE_WAITS = [30, 60, 120];

// Fixed strict Focus Guard allowlist — user cannot add arbitrary distracting software
export const FIXED_ALLOWED_APPS = [
  {
    exe: 'brave.exe',
    name: 'Brave Browser',
    desc: 'শুধুমাত্র অনুমোদিত স্টাডি ডোমেইন চালু থাকবে; অন্য ডোমেইন 3 সেকেন্ডে বন্ধ হবে',
  },
  {
    exe: 'SumatraPDF.exe',
    name: 'SumatraPDF',
    desc: 'সর্বদা অনুমোদিত — PDF বই ও লেকচার শিট রিভিউ',
  },
  {
    exe: 'PotPlayerMini64.exe',
    name: 'PotPlayer',
    desc: 'সর্বদা অনুমোদিত — অফলাইন ক্লাস ভিডিও প্লেয়ার',
  },
];

export const FIXED_SYSTEM_UTILITIES = [
  { name: 'Windows Snipping Tool & Greenshot', desc: 'স্ক্রিনশট নিলে টাইমার পজ হবে না' },
  { name: 'Windows Brightness & Volume Flyout', desc: 'ব্রাইটনেস/সাউন্ড পরিবর্তনে পজ হবে না' },
  { name: 'অনুমোদিত সফটওয়্যারে ট্যাব পরিবর্তন', desc: 'Alt+Tab / Ctrl+Tab নির্বিঘ্নে কাজ করবে' },
];

export const FIXED_BRAVE_DOMAINS = [
  { domain: 'gemini.google.com', label: 'Google Gemini', required: true },
  { domain: 'notebook.google.com', label: 'Google NotebookLM', note: 'notebooklm.google.com সহ', required: true },
];

export const OPTIONAL_ARENA_DOMAIN = {
  domain: 'arena.ai/agent',
  label: 'Arena AI Agent',
  desc: 'চাইলে Brave-এ arena.ai/agent ব্যবহারের অনুমতি চালু রাখতে পারেন',
};

export const DEFAULT_ALLOWED_APPS = ['brave.exe', 'SumatraPDF.exe', 'PotPlayerMini64.exe', 'PotPlayer.exe', 'Greenshot.exe', 'SnippingTool.exe'];
export const DEFAULT_ALLOWED_SITES = ['gemini.google.com', 'notebook.google.com', 'notebooklm.google.com'];

export const PREMADE_PRODUCTIVE_APPS = FIXED_ALLOWED_APPS.map((a) => ({
  exe: a.exe,
  name: a.name,
  category: 'অনুমোদিত স্টাডি সফটওয়্যার',
}));

export const PREMADE_STUDY_SITES = FIXED_BRAVE_DOMAINS.map((d) => ({
  domain: d.domain,
  label: d.label,
}));

export const DEFAULT_PIP = {
  open: true,
  clockStyle: 'flip',
  layout: 'compact',
  corner: 'top-right',
  left: null,
  top: null,
  width: 224,
  height: 126,
  subject: 'Physics',
  taskId: '',
  theme: 'obsidian-amber',
  opacity: 100,
  idleMinutes: 25,
};

export function focusSessionElapsedSec(timer, now = Date.now()) {
  if (!timer || timer.phase === 'break') return 0;
  const current = Math.floor(timerElapsedMs(timer, now) / 1000);
  const base = timer.kind === 'deep_goal' ? Number(timer.goalBaseSec) || 0 : 0;
  return Math.max(0, base + current);
}

/**
 * Universal 7-minute focus lock:
 * Once a user focuses for >= 7 minutes (420 seconds) in ANY focus session,
 * they CANNOT stop, reset, or finish the session early until the full planned
 * duration completes (or if they close the whole app, elapsed progress is saved
 * and remaining minutes become a recovery toast / task).
 */
export function isFocusSessionLocked(timer, now = Date.now()) {
  if (!timer || timer.phase === 'break' || timer.status === 'alarm') return false;
  const elapsed = focusSessionElapsedSec(timer, now);
  if (elapsed < LOCK_AFTER_SECONDS) return false;
  if (timer.mode === 'pomodoro' && Number(timer.durationSec) > 0) {
    return elapsed < Number(timer.durationSec);
  }
  return true;
}

export function deepGoalElapsed(timer, now = Date.now()) {
  if (timer?.kind !== 'deep_goal') return 0;
  const current = Math.floor(timerElapsedMs(timer, now) / 1000);
  return Math.max(0, Math.min(DEEP_GOAL_SECONDS, (Number(timer.goalBaseSec) || 0) + current));
}

export function deepGoalLocked(timer, now = Date.now()) {
  return isFocusSessionLocked(timer, now);
}

export function formatClockMinutes(seconds) {
  const n = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

export function goalKind(subject) {
  return subject === 'Class' ? 'class' : 'study';
}

export function goalLimit(kind) {
  return kind === 'class' ? 3 : 5;
}
