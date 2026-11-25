import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  LayoutDashboard,
  Timer,
  ListTodo,
  ChartNoAxesCombined,
  Sparkles,
  CalendarCheck2,
  GraduationCap,
  Settings2,
  Play,
  Pause,
  PictureInPicture2,
  Maximize2,
  Palette,
  Download,
  FileSpreadsheet,
  Rocket,
  CornerDownLeft,
  type LucideIcon,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { DARK_THEMES, resolveThemeId } from '../utils/themes';
import type { ActiveTimer, StudyState } from '../types/study';

interface CommandItem {
  id: string;
  group: 'Navigate' | 'Study Actions' | 'Appearance & Data';
  label: string;
  subtitle: string;
  shortcut?: string;
  Icon: LucideIcon;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const {
    state,
    timer,
    displayTime,
    navigate,
    toggleTimer,
    updatePip,
    toggleMini,
    zen,
    setZen,
    updatePrefs,
    exportJson,
    exportCsv,
  } = useStudy() as {
    state: StudyState;
    timer: ActiveTimer | null;
    displayTime: string;
    navigate: (view: string, subtab?: string) => void;
    toggleTimer: () => void;
    updatePip: (patch: Record<string, unknown>) => void;
    toggleMini: () => void;
    zen: boolean;
    setZen: (v: boolean) => void;
    updatePrefs: (patch: Record<string, unknown>) => void;
    exportJson: () => void;
    exportCsv: () => void;
  };

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const currentTheme = resolveThemeId(state?.timerPrefs?.theme);
    return [
      {
        id: 'nav-home',
        group: 'Navigate',
        label: 'Study Center (Home)',
        subtitle: 'আজকের সারাংশ, বিষয়ভিত্তিক অগ্রগতি ও স্টাডি স্ট্যাটাস',
        shortcut: 'Alt+1',
        Icon: LayoutDashboard,
        action: () => navigate('home'),
      },
      {
        id: 'nav-focus',
        group: 'Navigate',
        label: 'Focus Session & Pomodoro',
        subtitle: timer ? `চলমান টাইমার · ${displayTime}` : 'পড়ার সেশন ও ফোকাস টাইমার শুরু করুন',
        shortcut: 'Alt+2',
        Icon: Timer,
        action: () => navigate('focus'),
      },
      {
        id: 'nav-todo',
        group: 'Navigate',
        label: 'To-Do Timeline & Tasks',
        subtitle: 'আজকের কাজের তালিকা ও সময়সূচি পরিচালনা করুন',
        shortcut: 'Alt+3',
        Icon: ListTodo,
        action: () => navigate('todo'),
      },
      {
        id: 'nav-board',
        group: 'Navigate',
        label: 'Task Board (Drag & Drop)',
        subtitle: 'To Do ↔ Doing কাজ ড্র্যাগ করে পরিচালনা করুন',
        Icon: ListTodo,
        action: () => navigate('motivation', 'board'),
      },
      {
        id: 'nav-insights',
        group: 'Navigate',
        label: 'Study Insights & Analytics',
        subtitle: 'সাপ্তাহিক গ্রাফ, স্ট্রিক ও বিষয়ভিত্তিক বিশ্লেষণ',
        shortcut: 'Alt+4',
        Icon: ChartNoAxesCombined,
        action: () => navigate('insights'),
      },
      {
        id: 'nav-overview',
        group: 'Navigate',
        label: 'Goals & Motivation Overview',
        subtitle: 'লক্ষ্য, র‍্যাঙ্ক XP এবং দীর্ঘমেয়াদি পরিকল্পনা',
        Icon: Sparkles,
        action: () => navigate('motivation', 'overview'),
      },
      {
        id: 'nav-sprint',
        group: 'Navigate',
        label: 'Sprint Planner',
        subtitle: 'ক্লাস ও রিভিশন স্প্রিন্ট ড্যাশবোর্ড',
        Icon: Rocket,
        action: () => navigate('sprint'),
      },
      {
        id: 'nav-tracker',
        group: 'Navigate',
        label: 'Daily Subject Tracker',
        subtitle: 'প্রতিদিনের বিষয়ভিত্তিক অনুশীলন চেকলিস্ট',
        Icon: CalendarCheck2,
        action: () => navigate('motivation', 'tracker'),
      },
      {
        id: 'nav-suite-routine',
        group: 'Navigate',
        label: 'Student Suite · Weekly Routine & Syllabus',
        subtitle: 'রুটিন, সিলেবাস ট্র্যাকার ও পরীক্ষার সময়সূচি',
        shortcut: 'Alt+5',
        Icon: GraduationCap,
        action: () => navigate('suite', 'syllabus'),
      },
      {
        id: 'nav-settings',
        group: 'Navigate',
        label: 'Settings, SQLite Data & Backup',
        subtitle: 'প্রোফাইল, টাইমার সময় ও ব্যাকআপ সেটিংস',
        shortcut: 'Alt+6',
        Icon: Settings2,
        action: () => navigate('settings'),
      },
      {
        id: 'act-toggle-timer',
        group: 'Study Actions',
        label:
          timer?.status === 'running'
            ? 'Request Pause on Active Timer'
            : timer?.status === 'paused'
            ? 'Resume Focus Timer'
            : 'Start Focus Session Now',
        subtitle: timer ? `বর্তমান সময়: ${displayTime}` : 'নির্বাচিত বিষয়ে ফোকাস সেশন চালু করুন',
        Icon: timer?.status === 'running' ? Pause : Play,
        action: () => toggleTimer(),
      },
      {
        id: 'act-pip',
        group: 'Study Actions',
        label: 'Open Floating PiP Timer',
        subtitle: 'পৃষ্ঠার ভেতরে ভাসমান মিনি টাইমার চালু করুন',
        Icon: PictureInPicture2,
        action: () => updatePip({ open: true }),
      },
      {
        id: 'act-mini',
        group: 'Study Actions',
        label: 'Toggle Mini Corner Widget',
        subtitle: 'Windows 11 কোণায় ছোট Always-on-Top উইজেট মোড',
        Icon: Maximize2,
        action: () => toggleMini(),
      },
      {
        id: 'act-zen',
        group: 'Study Actions',
        label: zen ? 'Exit Zen Fullscreen Chamber' : 'Enter Zen Fullscreen Chamber',
        subtitle: 'বিক্ষেপমুক্ত ফুলস্ক্রিন ফোকাস মোড',
        Icon: Sparkles,
        action: () => setZen(!zen),
      },
      ...DARK_THEMES.map((th) => ({
        id: `theme-${th.id}`,
        group: 'Appearance & Data' as const,
        label: `Dark Theme: ${th.name} (${th.bnName})`,
        subtitle:
          currentTheme === th.id
            ? `বর্তমানে চালু আছে · ${th.subtitle}`
            : th.subtitle,
        Icon: Palette,
        action: () => updatePrefs({ theme: th.id }),
      })),
      {
        id: 'data-backup',
        group: 'Appearance & Data',
        label: 'Export Full JSON Backup',
        subtitle: 'সব তথ্য JSON ফাইলে সংরক্ষণ করুন',
        Icon: Download,
        action: () => exportJson(),
      },
      {
        id: 'data-csv',
        group: 'Appearance & Data',
        label: 'Export Study Sessions (CSV)',
        subtitle: 'পড়ার সেশনের স্প্রেডশিট তালিকা রপ্তানি করুন',
        Icon: FileSpreadsheet,
        action: () => exportCsv(),
      },
    ];
  }, [
    state?.timerPrefs?.theme,
    timer,
    displayTime,
    navigate,
    toggleTimer,
    updatePip,
    toggleMini,
    zen,
    setZen,
    updatePrefs,
    exportJson,
    exportCsv,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const runItem = (item?: CommandItem) => {
    if (!item) return;
    onClose();
    requestAnimationFrame(() => item.action());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0
      );
      return;
    }
    if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      runItem(filtered[activeIndex]);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="cmdk-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1, ease: [0.2, 0, 0, 1] }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="cmdk-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Study Sentry Quick Command Palette"
            initial={{ opacity: 0, scale: 0.985, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: -4 }}
            transition={{ duration: 0.11, ease: [0.2, 0, 0, 1] }}
            onKeyDown={handleKeyDown}
          >
            <div className="cmdk-search-row">
              <Search size={17} className="cmdk-search-icon" />
              <input
                ref={inputRef}
                type="text"
                className="cmdk-input"
                placeholder="যেতে চান কোথায় বা কী করতে চান? (যেমন: Focus, Routine, Backup, Theme)…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="cmdk-esc" onClick={onClose}>
                ESC
              </kbd>
            </div>

            <div className="cmdk-list" role="listbox">
              {filtered.length === 0 ? (
                <div className="cmdk-empty">কোনো কমান্ড পাওয়া যায়নি।</div>
              ) : (
                filtered.map((item, idx) => {
                  const selected = idx === activeIndex;
                  const showGroup =
                    idx === 0 || filtered[idx - 1].group !== item.group;
                  const Icon = item.Icon;
                  return (
                    <React.Fragment key={item.id}>
                      {showGroup && (
                        <div className="cmdk-group-heading">{item.group}</div>
                      )}
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`cmdk-item ${selected ? 'selected' : ''}`}
                        onPointerEnter={() => setActiveIndex(idx)}
                        onClick={() => runItem(item)}
                      >
                        <span className="cmdk-item-icon">
                          <Icon size={16} />
                        </span>
                        <span className="cmdk-item-copy">
                          <strong>{item.label}</strong>
                          <small>{item.subtitle}</small>
                        </span>
                        {item.shortcut ? (
                          <kbd className="cmdk-shortcut">{item.shortcut}</kbd>
                        ) : (
                          selected && <CornerDownLeft size={14} className="cmdk-enter" />
                        )}
                      </button>
                    </React.Fragment>
                  );
                })
              )}
            </div>

            <div className="cmdk-footer">
              <span>↑↓ নির্বাচন করুন</span>
              <span>↵ চালু করুন</span>
              <span>Ctrl+K যেকোনো জায়গা থেকে</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
