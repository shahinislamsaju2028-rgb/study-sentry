import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckCheck, Search, Sparkles } from 'lucide-react';
import { ModalShell } from './Modals';
import { sprintChapterName } from '../utils/sprintSchedule';
import { bnNum } from '../utils/bangla';

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

  return createPortal(
    <ModalShell title={chapter.chapter} onClose={onClose} wide>
      <div ref={root} className="v30-syl-modal">
        {catalog && list.length > 0 && (
          <>
            <div className="v30-syl-modal-top">
              <div className="v30-syl-modal-stat">
                <strong>{bnNum(progress.pct)}%</strong>
                <span>
                  {bnNum(progress.done)} / {bnNum(progress.total)} টপিক সম্পন্ন
                </span>
              </div>

              <button
                type="button"
                className={`v30-syl-markall ${allDone ? 'is-all' : ''}`}
                onClick={toggleAll}
              >
                <CheckCheck size={14} />
                {allDone ? 'রিসেট' : 'সব সম্পন্ন'}
              </button>
            </div>

            <div
              className="v30-syl-modal-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.pct}
            >
              <i style={{ width: `${progress.pct}%` }} />
            </div>

            {list.length > 4 && (
              <div className="v30-syl-modal-tools">
                <label className="v30-syl-search">
                  <Search size={14} />
                  <input
                    placeholder="টপিক খুঁজুন…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <div className="v30-syl-filter-pills">
                  {[
                    ['all', 'সব'],
                    ['todo', 'বাকি'],
                    ['done', 'সম্পন্ন'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={filter === id ? 'is-active' : ''}
                      onClick={() => setFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!catalog ? (
          <p className="v30-syl-empty-note" role="status">
            {loadError ? 'তালিকা লোড হয়নি।' : 'লোড হচ্ছে…'}
          </p>
        ) : !list.length ? (
          <p className="v30-syl-empty-note">এই অধ্যায়ের জন্য আলাদা উপ-টপিক নেই।</p>
        ) : (
          <div className="v30-syl-topic-list">
            {filtered.map((item, i) => {
              const isDone = Boolean(checks[item.id]);
              const showGroup = i === 0 || filtered[i - 1].group !== item.group;
              return (
                <React.Fragment key={item.id}>
                  {showGroup && (
                    <h4 className="v30-syl-group-title">
                      <Sparkles size={12} /> {item.group}
                    </h4>
                  )}
                  <button
                    type="button"
                    className={`v30-syl-topic-row ${isDone ? 'is-done' : ''}`}
                    aria-pressed={isDone}
                    onClick={() => onChange({ ...checks, [item.id]: !isDone })}
                  >
                    <span className="v30-syl-topic-box" aria-hidden="true">
                      {isDone && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="v30-syl-topic-label">{item.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}

        <div className="v30-syl-modal-foot">
          <button type="button" className="v30-glow-btn" onClick={onClose}>
            সম্পন্ন
          </button>
        </div>
      </div>
    </ModalShell>,
    document.body
  );
}
