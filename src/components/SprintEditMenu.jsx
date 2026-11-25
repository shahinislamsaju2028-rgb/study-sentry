import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarRange,
  Check,
  ChevronRight,
  Pencil,
  RefreshCw,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useStudy } from '../context/StudyContext';
import { bnNum } from '../utils/bangla';
import { toDateKey } from '../utils/seedData';
import { dateFromKey } from '../utils/stats';
import { generateSprintSchedule } from '../utils/sprintSchedule';

const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const addDaysKey = (d, n) => {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() + n);
  return toDateKey(x);
};

const cleanData = (d) =>
  d && Array.isArray(d.sprints) ? d : { sprints: [], selectedSprintId: null };

/** Identity of a schedule item that survives a regeneration. */
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

/**
 * SPRINT EDIT MENU — a real, working dropdown for an existing sprint project.
 *
 * Previously the pencil icon in the Overview sprint banner called a modal type that
 * had no handler, so clicking it did nothing. This component renders a proper
 * anchored menu with live, functional actions:
 *   · rename the project
 *   · shift the schedule window (‑৭ / +৭ days)
 *   · regenerate the schedule from the saved modules
 *   · jump straight into the Sprint Planner
 *   · delete the project
 */
export default function SprintEditMenu({
  sprint,
  align = 'right',
  variant = 'icon',
  label = 'স্প্রিন্ট সম্পাদনা',
  onNavigateToPlanner,
  onDeleted,
}) {
  const { state, commit, toast, phaseMode, openModal } = useStudy();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(sprint?.name || '');
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setNameDraft(sprint?.name || '');
    setRenaming(false);
  }, [sprint?.id, sprint?.name]);

  useEffect(() => {
    if (!open) return undefined;

    const place = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = 288;
      const left =
        align === 'right'
          ? Math.max(12, Math.min(window.innerWidth - width - 12, r.right - width))
          : Math.max(12, Math.min(window.innerWidth - width - 12, r.left));
      setPos({ top: r.bottom + 8, left });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    const onDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, align]);

  if (!sprint) return null;

  const save = (fn) =>
    commit((prev) => ({
      ...prev,
      sprintData: fn(cleanData(prev.sprintData)),
    }));

  const patchSprint = (patch) =>
    save((d) => ({
      ...d,
      sprints: d.sprints.map((s) => (s.id === sprint.id ? { ...s, ...patch } : s)),
    }));

  const renameSprint = () => {
    const next = nameDraft.trim();
    if (!next) {
      toast('প্রজেক্টের নাম লিখুন।');
      return;
    }
    patchSprint({ name: next });
    setRenaming(false);
    toast('প্রজেক্টের নাম আপডেট হয়েছে।');
  };

  const shiftWindow = (days) => {
    const start = addDaysKey(sprint.start, days);
    const end = addDaysKey(sprint.end, days);
    patchSprint({ start, end });
    toast(
      days > 0
        ? `শিডিউল ${bnNum(days)} দিন পরে সরানো হয়েছে।`
        : `শিডিউল ${bnNum(Math.abs(days))} দিন আগে সরানো হয়েছে।`
    );
  };

  const regenerate = () => {
    const modules = Array.isArray(sprint.modules) ? sprint.modules : [];
    if (!modules.length) {
      toast('এই প্রজেক্টে কোনো বিষয়/অধ্যায় সেভ নেই — নতুন প্রজেক্ট তৈরি করে মডিউল যোগ করুন।');
      return;
    }
    try {
      const { classes, tasks } = generateSprintSchedule({
        start: sprint.start,
        end: sprint.end,
        modules,
        phaseMode,
      });
      // Keep completion state for items that survive the regeneration.
      // The match is semantic (module + phase + title), so it still works when
      // the underlying ids were generated before the deterministic scheme.
      const doneClasses = new Set(
        (sprint.classes || []).filter((c) => c.done).map((c) => semanticKey(c))
      );
      const doneTasks = new Set(
        (sprint.tasks || []).filter((t) => t.done).map((t) => semanticKey(t))
      );
      const keptClasses = classes.filter((c) => doneClasses.has(semanticKey(c))).length;
      const keptTasks = tasks.filter((t) => doneTasks.has(semanticKey(t))).length;
      patchSprint({
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
        scheduleVersion: 3,
      });
      toast(
        keptClasses || keptTasks
          ? `শিডিউল নতুন করে সাজানো হয়েছে — ${bnNum(keptClasses + keptTasks)}টি সম্পন্ন আইটেম অক্ষত আছে।`
          : 'শিডিউল নতুন করে সাজানো হয়েছে।'
      );
    } catch (err) {
      toast(err?.message || 'শিডিউল তৈরি করা যায়নি।');
    }
  };

  // Deleting a sprint asks for confirmation first — the same dialog the
  // Sprint Planner uses, so the two never disagree about what happens.
  const deleteSprint = () => {
    setOpen(false);
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
        toast('স্প্রিন্ট প্রজেক্ট মুছে ফেলা হয়েছে।');
        onDeleted?.();
      },
    });
  };

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="v34-sprint-edit-menu"
          style={{ top: pos.top, left: pos.left }}
          role="menu"
          aria-label="স্প্রিন্ট সম্পাদনা মেনু"
        >
          <div className="v34-sem-head">
            <span className="v34-sem-ico">
              <Pencil size={14} />
            </span>
            <div>
              <strong>{sprint.name}</strong>
              <small>
                {sprint.start
                  ? `${bnNum(dateFromKey(sprint.start).getDate())} → ${bnNum(
                      dateFromKey(sprint.end || sprint.start).getDate()
                    )}`
                  : 'তারিখ নেই'}
              </small>
            </div>
            <button type="button" className="v34-sem-close" onClick={() => setOpen(false)} aria-label="বন্ধ করুন">
              <X size={14} />
            </button>
          </div>

          {renaming ? (
            <div className="v34-sem-rename">
              <input
                autoFocus
                value={nameDraft}
                maxLength={80}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') renameSprint();
                  if (e.key === 'Escape') setRenaming(false);
                }}
                placeholder="প্রজেক্টের নাম"
                aria-label="প্রজেক্টের নাম"
              />
              <button type="button" className="v34-sem-btn is-primary" onClick={renameSprint}>
                <Check size={13} /> সংরক্ষণ
              </button>
            </div>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="v34-sem-item"
              onClick={() => {
                setNameDraft(sprint.name || '');
                setRenaming(true);
              }}
            >
              <Pencil size={14} />
              <span>নাম পরিবর্তন করুন</span>
              <ChevronRight size={13} />
            </button>
          )}

          <div className="v34-sem-divider" />

          <div className="v34-sem-row-label">শিডিউলের সময়সীমা সরান</div>
          <div className="v34-sem-shift">
            <button type="button" role="menuitem" className="v34-sem-btn" onClick={() => shiftWindow(-7)}>
              ৭ দিন আগে
            </button>
            <button type="button" role="menuitem" className="v34-sem-btn" onClick={() => shiftWindow(7)}>
              ৭ দিন পরে
            </button>
          </div>

          <div className="v34-sem-divider" />

          <button type="button" role="menuitem" className="v34-sem-item" onClick={regenerate}>
            <Wand2 size={14} />
            <span>শিডিউল নতুন করে সাজান</span>
          </button>

          {onNavigateToPlanner && (
            <button
              type="button"
              role="menuitem"
              className="v34-sem-item"
              onClick={() => {
                setOpen(false);
                onNavigateToPlanner();
              }}
            >
              <CalendarRange size={14} />
              <span>স্প্রিন্ট প্ল্যানারে যান</span>
            </button>
          )}

          <div className="v34-sem-divider" />

          <button type="button" role="menuitem" className="v34-sem-item is-danger" onClick={deleteSprint}>
            <Trash2 size={14} />
            <span>প্রজেক্ট মুছে ফেলুন</span>
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`v34-sem-trigger ${variant === 'icon' ? 'is-icon' : 'is-full'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {variant === 'icon' ? <Pencil size={14} /> : <Pencil size={14} />}
        {variant !== 'icon' && <span>সম্পাদনা</span>}
      </button>
      {menu}
    </>
  );
}
