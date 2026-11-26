import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, Layers3, Sparkles } from 'lucide-react';
import { loadCurriculum } from './CurriculumPicker';
import { sprintChapterName } from '../utils/sprintSchedule';
import { bnChapterName, bnNum, bnSubject } from '../utils/bangla';
import { getAcademicGroup } from '../utils/groupSubjects';
import { useOptionalStudy } from '../context/StudyContext';

const CHAPTER_ACCENTS = { first: '#fbbf24', second: '#818cf8' };
const INDEXED_CHAPTER_SUBJECTS = new Set(['physics', 'chemistry', 'biology', 'ict']);

/**
 * The single chapter-selection surface used across tasks, Focus, syllabus,
 * routines, and sprint planning. It pairs a compact subject/paper header with
 * rounded-rectangle chapter cards; search and free-text tools are intentionally
 * absent so every host presents the same quick, visual picker.
 */
export default function ChapterPicker({
  subject = '',
  paper = '',
  chapter = '',
  type = '',
  topic = '',
  chapters = [],
  multi = false,
  onChange,
  shortSprintChapter = false,
  compact = false,
  stepIndex = '',
  label = '',
  emptyHint = '',
}) {
  const study = useOptionalStudy();
  const academicGroup = getAcademicGroup(study?.state?.profile || {});

  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  /* ── load the catalogue once per academic group ──────────────────────── */
  useEffect(() => {
    let alive = true;
    setCatalog(null);
    setLoadError('');
    loadCurriculum(academicGroup)
      .then((x) => alive && setCatalog(x))
      .catch(() => alive && setLoadError('কারিকুলাম তালিকা লোড করা যায়নি'));
    return () => {
      alive = false;
    };
  }, [academicGroup]);

  /* ── reset transient UI whenever the subject or paper changes ────────── */
  useEffect(() => {
    setShowDetails(false);
  }, [subject, paper]);

  const subjectCatalog = useMemo(() => {
    if (!catalog) return null;
    const direct = catalog[subject];
    if (direct) return direct;
    // Math and Higher Math share the same official chapter list.
    if (subject === 'Math') return catalog['Higher Math'] || null;
    return null;
  }, [catalog, subject]);

  const hasPapers = Boolean(
    subject &&
      subject !== 'ICT' &&
      subjectCatalog &&
      Object.keys(subjectCatalog).length > 0
  );

  const chosenPaper = hasPapers ? paper || '1' : '';

  const rawChapters = useMemo(() => {
    if (!subjectCatalog) return [];
    const list = subjectCatalog[chosenPaper] || subjectCatalog['1'] || [];
    return list.map((ch) => {
      const name = sprintChapterName(ch.name) || ch.name;
      return {
        raw: ch.name,
        name,
        label: bnChapterName(name),
        types: ch.types || [],
      };
    });
  }, [subjectCatalog, chosenPaper]);

  const filtered = rawChapters;

  const selectedSet = useMemo(() => {
    const names = multi
      ? chapters && chapters.length
        ? chapters
        : chapter
        ? [chapter]
        : []
      : chapter
      ? [chapter]
      : [];
    return new Set(names.map((n) => sprintChapterName(n) || n));
  }, [multi, chapters, chapter]);

  const isPicked = (name) =>
    selectedSet.has(name) ||
    (shortSprintChapter && selectedSet.has(sprintChapterName(name)));

  const pickedEntry = useMemo(() => {
    if (multi || !chapter) return null;
    const needle = sprintChapterName(chapter) || chapter;
    return rawChapters.find((c) => c.name === needle) || null;
  }, [multi, chapter, rawChapters]);

  const types = pickedEntry?.types || [];
  const activeTypeObj = types.find((t) => t.name === type) || null;
  const topics = activeTypeObj?.topics || [];

  /* ── selection handlers ─────────────────────────────────────────────── */
  const toggleChapter = (name) => {
    if (!multi) {
      const already = isPicked(name);
      onChange?.({
        paper: chosenPaper,
        chapter: already ? '' : name,
        chapters: already ? [] : [name],
        type: '',
        topic: '',
      });
      return;
    }
    const next = new Set(selectedSet);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    const list = [...next];
    onChange?.({
      paper: chosenPaper,
      chapter: list[list.length - 1] || '',
      chapters: list,
      type: '',
      topic: '',
    });
  };

  const setAll = (on) => {
    if (!multi) return;
    const list = on ? filtered.map((c) => c.name) : [];
    onChange?.({
      paper: chosenPaper,
      chapter: list[list.length - 1] || '',
      chapters: list,
      type: '',
      topic: '',
    });
  };

  const pickPaper = (p) => {
    if (p === chosenPaper) return;
    onChange?.({ paper: p, chapter: '', chapters: [], type: '', topic: '' });
  };

  /* Chapter cards are label-first; the shared CSS gives each column equal
     tracks so no item in a row is narrower than its neighbour. */

  const allPicked =
    multi && filtered.length > 0 && filtered.every((c) => isPicked(c.name));

  // Chapter selection has its own cool, consistent palette: it never borrows
  // the selected subject's color. Paper two gets a lilac shift so the shared
  // segmented control stays recognisable without inheriting subject hues.
  const chapterAccent = chosenPaper === '2' ? CHAPTER_ACCENTS.second : CHAPTER_ACCENTS.first;
  const indexedSubject = INDEXED_CHAPTER_SUBJECTS.has(String(subject).trim().toLowerCase());

  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      className={`chapter-picker ${compact ? 'is-compact' : ''}`}
      style={{
        '--chp-accent': chapterAccent,
        '--chp-paper-accent': chapterAccent,
        '--chp-paper': chosenPaper || '1',
      }}
    >
      {label && <div className="chapter-picker-label">{label}</div>}

      {/* ── top bar: selected subject · paper switch · optional bulk pick ── */}
      <div className={`chapter-picker-bar ${stepIndex ? 'has-step-index' : ''}`}>
        <span className="chapter-picker-title">
          {stepIndex && <span className="chapter-picker-step" aria-label={`ধাপ ${stepIndex}`}>{stepIndex}</span>}
          <BookOpen size={15} strokeWidth={2.2} aria-hidden="true" />
          <span className="chapter-picker-subject-name">
            {subject ? bnSubject(subject) : 'বিষয় বেছে নিন'}
            {!subject && <em>{emptyHint || 'আগে বিষয় নির্বাচন করুন'}</em>}
          </span>
        </span>

        <div className="chapter-picker-tools">
          {hasPapers && (
            <div
              className="chapter-picker-papers"
              role="tablist"
              aria-label="পত্র নির্বাচন"
              data-paper={chosenPaper === '2' ? '2' : '1'}
            >
              <span className="chapter-picker-paper-indicator" aria-hidden="true" />
              {[
                ['1', '১ম পত্র'],
                ['2', '২য় পত্র'],
              ].map(([p, lbl]) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={chosenPaper === p}
                  className={`chapter-picker-paper ${
                    chosenPaper === p ? 'is-active' : ''
                  }`}
                  onClick={() => pickPaper(p)}
                >
                  <span className="chp-paper-copy"><b>{lbl}</b></span>
                </button>
              ))}
            </div>
          )}

          {multi && (
            <button
              type="button"
              className={`chapter-picker-all ${allPicked ? 'is-all' : ''}`}
              onClick={() => setAll(!allPicked)}
            >
              <Check size={12} strokeWidth={3} />
              {allPicked ? 'সব বাদ' : 'সব সিলেক্ট'}
            </button>
          )}

        </div>
      </div>

      {/* ── body ───────────────────────────────────────────────────────── */}
      {!subject ? (
        <p className="chapter-picker-hint">{emptyHint || 'আগে বিষয় নির্বাচন করুন।'}</p>
      ) : (
        <>
          {!catalog && !loadError && (
            <p className="chapter-picker-hint">প্রি-মেড অধ্যায় লোড হচ্ছে…</p>
          )}
          {loadError && (
            <p className="chapter-picker-hint is-warn" role="alert">
              {loadError}
            </p>
          )}

          <div
            className="chapter-picker-grid is-dense"
            role={multi ? 'group' : 'radiogroup'}
            aria-label="অধ্যায় তালিকা"
          >
            {filtered.map((c, index) => {
              const active = isPicked(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  role={multi ? 'checkbox' : 'radio'}
                  aria-checked={active}
                  className={`chapter-picker-card ${active ? 'is-active' : ''}`}
                  onClick={() => toggleChapter(c.name)}
                  title={c.label}
                >
                  <span className="chapter-picker-content">
                    {indexedSubject && (
                      <span className="chapter-picker-index" aria-hidden="true">
                        {index + 1}
                      </span>
                    )}
                    <span className="chapter-picker-name">{c.label}</span>
                  </span>
                </button>
              );
            })}

            {catalog && !filtered.length && (
              <p className="chapter-picker-empty">কোনো অধ্যায় পাওয়া যায়নি</p>
            )}
          </div>
        </>
      )}

      {/* ── selection summary + optional type/topic refinement ─────────── */}
      {(types.length > 0 || (multi && selectedSet.size > 0)) && (
        <div className="chapter-picker-foot">
          <div className="chapter-picker-summary">
            <Layers3 size={13} />
            {multi ? (
              <span>
                <b>{bnNum(selectedSet.size)}টি</b> অধ্যায় নির্বাচিত
              </span>
            ) : (
              <span>
                নির্বাচিত: <b>{bnChapterName(sprintChapterName(chapter) || chapter)}</b>
              </span>
            )}
          </div>

          {types.length > 0 && (
            <button
              type="button"
              className={`chapter-picker-detail-toggle ${showDetails ? 'is-open' : ''}`}
              onClick={() => setShowDetails((v) => !v)}
            >
              <Sparkles size={12} />
              {type ? `ধাপ: ${type}` : 'ধাপ / টপিক বাছুন (ঐচ্ছিক)'}
              <ChevronDown size={13} className="chapter-picker-caret" />
            </button>
          )}
        </div>
      )}

      {showDetails && types.length > 0 && (
        <div className="chapter-picker-details">
          <div className="chapter-picker-chips" role="group" aria-label="ধাপ">
            <button
              type="button"
              className={`chapter-picker-chip ${!type ? 'is-active' : ''}`}
              onClick={() =>
                onChange?.({
                  paper: chosenPaper,
                  chapter,
                  chapters: multi ? [...selectedSet] : chapter ? [chapter] : [],
                  type: '',
                  topic: '',
                })
              }
            >
              সম্পূর্ণ অধ্যায়
            </button>
            {types.map((t) => (
              <button
                key={t.name}
                type="button"
                className={`chapter-picker-chip ${type === t.name ? 'is-active' : ''}`}
                onClick={() =>
                  onChange?.({
                    paper: chosenPaper,
                    chapter,
                    chapters: multi ? [...selectedSet] : chapter ? [chapter] : [],
                    type: t.name,
                    topic: '',
                  })
                }
              >
                {t.name}
              </button>
            ))}
          </div>

          {topics.length > 0 && (
            <div className="chapter-picker-chips is-soft" role="group" aria-label="টপিক">
              <button
                type="button"
                className={`chapter-picker-chip ${!topic ? 'is-active' : ''}`}
                onClick={() =>
                  onChange?.({
                    paper: chosenPaper,
                    chapter,
                    chapters: multi ? [...selectedSet] : chapter ? [chapter] : [],
                    type,
                    topic: '',
                  })
                }
              >
                সব টপিক
              </button>
              {topics.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  className={`chapter-picker-chip ${topic === tp ? 'is-active' : ''}`}
                  onClick={() =>
                    onChange?.({
                      paper: chosenPaper,
                      chapter,
                      chapters: multi ? [...selectedSet] : chapter ? [chapter] : [],
                      type,
                      topic: tp,
                    })
                  }
                >
                  {tp}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
