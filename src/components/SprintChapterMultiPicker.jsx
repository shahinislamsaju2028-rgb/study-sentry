import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Atom,
  BookOpen,
  Briefcase,
  Check,
  FlaskConical,
  Languages,
  Landmark,
  Leaf,
  Monitor,
  Search,
  Sigma,
  Sparkles,
} from 'lucide-react';
import { loadCurriculum } from './CurriculumPicker';
import { sprintChapterName } from '../utils/sprintSchedule';
import { bnNum, bnSubject } from '../utils/bangla';
import { getAcademicGroup } from '../utils/groupSubjects';
import { useOptionalStudy } from '../context/StudyContext';

/**
 * The one icon each subject wears in the chapter grid — the number badge is
 * gone. Size and colour are shared by every icon; selection paints it with the
 * theme amber.
 */
export const SUBJECT_CHAPTER_ICONS = {
  Physics: Atom,
  Chemistry: FlaskConical,
  Math: Sigma,
  'Higher Math': Sigma,
  Biology: Leaf,
  Bangla: BookOpen,
  English: Languages,
  ICT: Monitor,
  Accounting: Briefcase,
  'Business Organization & Management': Briefcase,
  'Finance, Banking & Insurance': Briefcase,
  'Production Management & Marketing': Briefcase,
  Statistics: Sigma,
  Economics: Landmark,
  History: Landmark,
  'Islamic History & Culture': Landmark,
  Sociology: Landmark,
  'Social Work': Landmark,
  'Civics & Good Governance': Landmark,
  Logic: Landmark,
  'Geography & Environment': Landmark,
  Psychology: Landmark,
};

export function chapterIconFor(subject) {
  return SUBJECT_CHAPTER_ICONS[subject] || BookOpen;
}

/**
 * CHAPTER MULTI-SELECT — used by the Sprint Planner.
 *
 * · Each chapter is a small card with a checkbox/toggle.
 * · Selected chapters are marked with an amber border and a light amber wash.
 * · A search box and a "সব সিলেক্ট / সব বাদ" button sit on top.
 * · The grid lays out in 2–3 columns.
 * · The icon of the subject replaces the old chapter number.
 */
export default function SprintChapterMultiPicker({
  subject,
  paper = '1',
  selected = [],
  onToggle,
  onSetAll,
  onPaperChange,
  onMetrics,
}) {
  const study = useOptionalStudy();
  const academicGroup = getAcademicGroup(study?.state?.profile || {});
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  // The grid gives every column exactly the width the longest chapter name in
  // this list needs — short rows never leave a gap, long rows never truncate.
  const [colWidth, setColWidth] = useState(210);
  const onMetricsRef = useRef(onMetrics);
  onMetricsRef.current = onMetrics;
  const probeRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setCatalog(null);
    loadCurriculum(academicGroup)
      .then((x) => alive && setCatalog(x))
      .catch(() => alive && setError('কারিকুলাম তালিকা লোড করা যায়নি'));
    return () => {
      alive = false;
    };
  }, [academicGroup]);

  useEffect(() => {
    setQuery('');
  }, [subject, paper]);

  const chosenPaper = subject === 'ICT' ? '' : paper || '1';
  const subjectCatalog =
    catalog?.[subject] || (subject === 'Math' ? catalog?.['Higher Math'] : null);
  const chapters = subjectCatalog?.[chosenPaper] || [];
  const Icon = chapterIconFor(subject);

  const selectedSet = useMemo(
    () => new Set((selected || []).map((name) => sprintChapterName(name))),
    [selected]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = chapters.map((ch) => ({
      raw: ch.name,
      name: sprintChapterName(ch.name),
    }));
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [chapters, query]);

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selectedSet.has(r.name));

  // Measure the widest label once the cards exist, then lock every column to
  // that width (icon 24 + gaps 16 + tick 17 + paddings 18 + 8px slack).
  useEffect(() => {
    if (!chapters.length) return undefined;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      const nodes = probeRef.current?.querySelectorAll('[data-chp-probe]');
      if (!nodes?.length) return;
      let widest = 0;
      nodes.forEach((n) => {
        widest = Math.max(widest, n.getBoundingClientRect().width);
      });
      if (widest > 0) {
        // icon 19 + gap 6 + name + gap 6 + tick 15 + padding 14 + 2px slack
        const next = Math.ceil(Math.min(420, Math.max(120, widest + 62)));
        setColWidth((prev) => (Math.abs(prev - next) > 1 ? next : prev));
        // report only the measured width; the parent decides how many columns
        // it wants (2–3) and sizes the split from that
        onMetricsRef.current?.(next);
      }
    };
    measure();
    // Guarded: a headless test DOM may not implement rAF.
    const raf =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame(measure)
        : window.setTimeout(measure, 16);
    return () => {
      alive = false;
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(raf);
      } else {
        window.clearTimeout(raf);
      }
    };
  }, [chapters]);

  return (
    <div className="v45-chp" style={{ '--chp-col': `${colWidth}px` }}>
      {/* Invisible probe: measures the longest chapter name in this list. */}
      <div className="v45-chp-probe" ref={probeRef} aria-hidden="true">
        {chapters.map((ch) => (
          <span key={ch.name} data-chp-probe>
            {sprintChapterName(ch.name)}
          </span>
        ))}
      </div>
      <div className="v45-chp-head">
        <span className="v45-chp-title">
          <Sparkles size={14} /> {bnSubject(subject)} · অধ্যায় বেছে নিন
        </span>

        {subject !== 'ICT' && (
          <div className="v45-chp-papers" role="tablist" aria-label="পত্র নির্বাচন">
            {[
              ['1', '১ম পত্র'],
              ['2', '২য় পত্র'],
            ].map(([p, lbl]) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={chosenPaper === p}
                className={`v45-chp-paper ${chosenPaper === p ? 'is-active' : ''}`}
                onClick={() => onPaperChange?.(p)}
              >
                {lbl}
              </button>
            ))}
          </div>
        )}

        <label className="v45-chp-search">
          <Search size={13} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="অধ্যায় খুঁজুন…"
            aria-label="অধ্যায় খুঁজুন"
          />
        </label>

        <button
          type="button"
          className={`v45-chp-all ${allSelected ? 'is-all' : ''}`}
          onClick={() =>
            onSetAll?.(
              filtered.map((r) => r.name),
              !allSelected
            )
          }
        >
          <Check size={12.5} strokeWidth={3} />
          {allSelected ? 'সব বাদ' : 'সব সিলেক্ট'}
        </button>
      </div>

      {!catalog && !error && <p className="v45-chp-note">প্রি-মেড অধ্যায় লোড হচ্ছে…</p>}
      {error && <p className="v45-chp-note is-warn">{error}</p>}

      <div className="v45-chp-grid" role="group" aria-label="অধ্যায় তালিকা">
        {filtered.map(({ name }, idx) => {
          const active = selectedSet.has(name);
          return (
            <button
              key={name}
              type="button"
              role="checkbox"
              aria-checked={active}
              className={`v45-chp-card ${active ? 'is-selected' : ''}`}
              style={{ '--chp-hue': `${(idx * 47) % 360}` }}
              onClick={() => onToggle?.(name)}
              title={name}
            >
              <span className="v45-chp-ico">
                <Icon size={16} strokeWidth={1.9} />
              </span>
              <span className="v45-chp-name">{name}</span>
              <span className="v45-chp-tick" aria-hidden="true">
                {active ? <Check size={12} strokeWidth={3.2} /> : null}
              </span>
            </button>
          );
        })}
        {catalog && !filtered.length && (
          <div className="v45-chp-empty">কোনো অধ্যায় পাওয়া যায়নি</div>
        )}
      </div>

      <p className="v45-chp-foot">
        {bnNum(selected.length)}টি অধ্যায় নির্বাচিত — প্রতিটির জন্য ক্লাস সংখ্যা স্বয়ংক্রিয়ভাবে বসবে।
      </p>
    </div>
  );
}
