import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckCheck, Search, Sparkles } from 'lucide-react';
import { ModalShell } from './Modals';
import { sprintChapterName } from '../utils/sprintSchedule';
import { bnChapterName, bnNum } from '../utils/bangla';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** 'Ch 3' / 'অধ্যায় ৩' / 'Chapter 3' -> 3 */
export function chapterNumber(title = '') {
  const raw = String(title)
    .replace(/^\s*(?:অধ্যা(?:য়|য়|য)|চ্যাপ্টার|ch(?:apter)?\.?)\s*[ঃ:]?\s*/iu, '')
    .trim();
  const m = raw.match(/^([০-৯0-9]+)/);
  if (!m) return null;
  const token = m[1];
  const latin = Array.from(token)
    .map((d) => (BN_DIGITS.indexOf(d) >= 0 ? String(BN_DIGITS.indexOf(d)) : d))
    .join('');
  const n = Number(latin);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve the HSC catalog entry that matches a syllabus chapter.
 * Chapters written as "Ch 3: …" are matched by their ordinal, so the
 * type / sub-topic tree is available for imported English titles too.
 */
export function findCatalogChapter(catalog, subject, chapter) {
  const papers = catalog?.[subject];
  if (!papers || !chapter?.chapter) return null;
  const lists = chapter.paper ? [papers[chapter.paper] || []] : Object.values(papers);
  const chapters = lists.flat().map((x) => ({
    ...x,
    paper: x.paper || (chapter.paper || Object.keys(papers).find((k) => (papers[k] || []).includes(x)) || '1'),
  }));
  const exact = chapters.filter((x) => x.name === chapter.chapter);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const candidates = chapters.filter(
    (x) => sprintChapterName(x.name) === sprintChapterName(chapter.chapter)
  );
  if (candidates.length === 1) return candidates[0];

  const wanted = chapterNumber(chapter.chapter);
  if (wanted == null) return null;
  const byNumber = chapters.filter((x) => chapterNumber(x.name) === wanted);
  if (byNumber.length === 1) return byNumber[0];
  if (byNumber.length > 1) {
    // Both papers restart their numbering, so fall back to the paper the
    // student is actually working in; otherwise the 1st paper wins.
    const paper = chapter.paper || '1';
    const samePaper = byNumber.filter((x) => (x.paper || '1') === paper);
    if (samePaper.length === 1) return samePaper[0];
    if (samePaper.length > 1) return samePaper[0];
  }
  return null;
}

/**
 * Chapter -> টাইপ -> সাব টপিক.
 * This is the ONLY structure the syllabus screen shows: the old
 * ক্লাস / লেকচার / প্র্যাকটিস / রিভিশন stages are gone.
 */
export function getChapterTypes(catalog, subject, chapter) {
  const found = findCatalogChapter(catalog, subject, chapter);
  if (!found) return [];
  if (!found.types?.length) {
    return [{ name: 'অধ্যায়', topics: [{ id: 'chapter', label: found.name }] }];
  }
  return found.types.map((t, i) => ({
    name: t.name,
    topics: (t.topics?.length ? t.topics : [t.name]).map((label, j) => ({
      id: `${i}:${j}`,
      label,
    })),
  }));
}

export function getChapterChecklist(catalog, subject, chapter) {
  const found = findCatalogChapter(catalog, subject, chapter);
  if (!found) return [];
  if (!found.types?.length) {
    return [{ id: 'chapter', group: 'অধ্যায়', label: found.name, chapterOnly: true }];
  }
  const result = [];
  for (let i = 0; i < found.types.length; i++) {
    const t = found.types[i];
    if (t.topics?.length) {
      t.topics.forEach((label, j) => result.push({ id: `${i}:${j}`, group: t.name, label }));
    } else {
      result.push({ id: `${i}:0`, group: t.name, label: t.name });
    }
  }
  return result;
}

export function checklistProgress(list, checks = {}) {
  const done = list.reduce((n, x) => n + (checks?.[x.id] ? 1 : 0), 0);
  return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
}

/**
 * Progress across catalog topics AND the user's own sub-types.
 */
export function chapterProgress(types, chapter) {
  const checks = chapter?.checklistDone || {};
  const custom = chapter?.customSubtypes || {};
  let total = 0;
  let done = 0;
  types.forEach((type) => {
    type.topics.forEach((topic) => {
      total += 1;
      if (checks[topic.id]) done += 1;
      const extras = custom[topic.id] || [];
      total += extras.length;
      done += extras.filter((x) => x.done).length;
    });
  });
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export default function SyllabusChecklist({
  chapter,
  subject,
  catalog,
  loadError = false,
  onClose,
  onChange,
}) {
  const list = getChapterChecklist(catalog, subject, chapter);
  const checks = chapter.checklistDone || {};
  const progress = checklistProgress(list, checks);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'todo' | 'done'
  const root = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const id = requestAnimationFrame(() =>
      root.current?.closest('[role=dialog]')?.querySelector('.modal-heading button')?.focus()
    );
    return () => {
      cancelAnimationFrame(id);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((item) => {
      const isDone = Boolean(checks[item.id]);
      if (filter === 'todo' && isDone) return false;
      if (filter === 'done' && !isDone) return false;
      if (!q) return true;
      return item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q);
    });
  }, [list, checks, query, filter]);

  const allDone = list.length > 0 && progress.done === list.length;

  const toggleAll = () => {
    const next = { ...checks };
    list.forEach((item) => {
      next[item.id] = !allDone;
    });
    onChange(next);
  };

  /* 5.txt ① — the checklist dialog, rebuilt.
     What was wrong with it: the title was the raw catalog string ("Ch 1:
     Physical World …"), the progress was a percentage *and* a bar *and* a
     "0/4 টপিক সম্পন্ন" line all saying the same thing, the type headings were
     small caps over a list of unlabelled checkboxes, and the footer carried one
     yellow button that did nothing different from closing the dialog.

     Now: a header that names the chapter in Bengali and shows the tally as
     filled rings, a type grid where each type is a card with its own count and
     a colour, and a footer that states the outcome and closes. */
  const chapterTitle = bnChapterName(chapter.chapter);
  const groups = useMemo(() => {
    const out = [];
    filtered.forEach((item) => {
      const last = out[out.length - 1];
      if (last && last.name === item.group) last.items.push(item);
      else out.push({ name: item.group, items: [item] });
    });
    return out.map((g, i) => {
      const all = list.filter((x) => x.group === g.name);
      const done = all.filter((x) => Boolean(checks[x.id])).length;
      return {
        ...g,
        index: i,
        total: all.length,
        done,
        selected: done > 0,
        complete: all.length > 0 && done === all.length,
        pct: all.length ? Math.round((done / all.length) * 100) : 0,
      };
    });
  }, [filtered, list, checks]);

  return createPortal(
    /* 6.txt · ⓶⓼ — the topic list is a full-screen sheet now: two columns of
       large topic names instead of one narrow scrolling column. */
    <ModalShell title={chapterTitle} onClose={onClose} fullScreen>
      <div ref={root} className="v30-syl-modal v52-ck" data-subject={subject || ""}>
        {/* ── hero: chapter name, subject, and the tally as rings ─────────── */}
        <header className="v52-ck-hero">
          <div className="v52-ck-hero-copy">
            <div className="v52-ck-eyebrow">
              <span className="v52-ck-subject">{subject || 'সাধারণ'}</span>
              {chapter.paper && (
                <span className="v52-ck-paper">
                  {chapter.paper === '1' ? '১ম পত্র' : '২য় পত্র'}
                </span>
              )}
            </div>
            <h3>{chapterTitle}</h3>
            <p>
              <b>{bnNum(progress.done)}</b> / {bnNum(progress.total)} টপিক সম্পন্ন
            </p>
          </div>

          <div
            className="v52-ck-hero-ring"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.pct}
            aria-label={`${chapterTitle} — ${bnNum(progress.pct)}% সম্পন্ন`}
          >
            <svg viewBox="0 0 72 72" aria-hidden="true">
              <circle className="v52-ck-ring-track" cx="36" cy="36" r="30" />
              <circle
                className="v52-ck-ring-arc"
                cx="36"
                cy="36"
                r="30"
                style={{ strokeDasharray: `${(progress.pct / 100) * 188.5} 188.5` }}
              />
            </svg>
            <div className="v52-ck-ring-num">
              <b>{bnNum(progress.pct)}<i>%</i></b>
              <small>সম্পন্ন</small>
            </div>
          </div>
        </header>

        {catalog && list.length > 0 && (
          <>
            {/* ── tools: search + filter, now inside a single capsule ──────── */}
            {list.length > 4 && (
              <div className="v52-ck-tools">
                <label className="v52-ck-search">
                  <Search size={14} />
                  <input
                    placeholder="টপিক খুঁজুন…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} aria-label="খোঁজা বাতিল">
                      ✕
                    </button>
                  )}
                </label>
                <div className="v52-ck-filter" role="tablist" aria-label="টপিক ফিল্টার">
                  {[
                    ['all', 'সব'],
                    ['todo', 'বাকি'],
                    ['done', 'সম্পন্ন'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={filter === id}
                      className={filter === id ? 'is-active' : ''}
                      onClick={() => setFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`v52-ck-all ${allDone ? 'is-all' : ''}`}
                  onClick={toggleAll}
                >
                  <CheckCheck size={14} />
                  {allDone ? 'রিসেট' : 'সব'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── the type cards ─────────────────────────────────────────────── */}
        {!catalog ? (
          <p className="v30-syl-empty-note" role="status">
            {loadError ? 'তালিকা লোড হয়নি।' : 'লোড হচ্ছে…'}
          </p>
        ) : !list.length ? (
          <p className="v30-syl-empty-note">এই অধ্যায়ের জন্য আলাদা উপ-টপিক নেই।</p>
        ) : !filtered.length ? (
          <p className="v30-syl-empty-note">এই ফিল্টারে কোনো টপিক নেই।</p>
        ) : (
          <div className="v52-ck-types">
            {groups.map((g) => (
              <section
                key={g.name}
                className={`v52-ck-type v59-ck-type ${g.selected ? 'is-selected' : ''} ${g.complete ? 'is-complete' : ''}`}
                data-toned={g.index % 5}
                aria-label={`${g.name}: ${g.selected ? 'সিলেক্টেড' : 'সিলেক্ট করা হয়নি'}, ${bnNum(g.done)}/${bnNum(g.total)} সম্পন্ন`}
              >
                <header className="v52-ck-type-head">
                  <span className="v52-ck-type-mark">
                    <Sparkles size={12} />
                  </span>
                  <div className="v52-ck-type-copy">
                    <strong>{g.name}</strong>
                    <small>
                      {bnNum(g.done)}/{bnNum(g.total)} সম্পন্ন
                    </small>
                  </div>
                  <span className={`v59-ck-type-state ${g.selected ? 'is-selected' : ''}`}>
                    {g.selected && <Check size={10} aria-hidden="true" />}
                    {g.selected ? 'সিলেক্টেড' : 'সিলেক্ট করা হয়নি'}
                  </span>
                  <span className="v52-ck-type-pct" aria-hidden="true">
                    {bnNum(g.pct)}%
                  </span>
                </header>

                <div className="v52-ck-type-rail" aria-hidden="true">
                  <i style={{ width: `${g.pct}%` }} />
                </div>

                <div className="v52-ck-topics">
                  {g.items.map((item) => {
                    const isDone = Boolean(checks[item.id]);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`v52-ck-topic ${isDone ? 'is-done' : ''}`}
                        aria-pressed={isDone}
                        onClick={() => onChange({ ...checks, [item.id]: !isDone })}
                      >
                        <span className="v52-ck-topic-box" aria-hidden="true">
                          {isDone && <Check size={12} strokeWidth={3.2} />}
                        </span>
                        <span className="v52-ck-topic-label">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="v52-ck-foot">
          <span className="v52-ck-foot-note">
            {allDone ? 'সব টপিক সম্পন্ন — চমৎকার।' : `${bnNum(progress.total - progress.done)}টি টপিক বাকি`}
          </span>
          <button type="button" className="v52-ck-done-btn" onClick={onClose}>
            ঠিক আছে
          </button>
        </footer>
      </div>
    </ModalShell>,
    document.body
  );
}
