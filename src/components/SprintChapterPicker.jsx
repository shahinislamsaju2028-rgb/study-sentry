import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, PencilLine, Search, Sparkles } from 'lucide-react';
import { loadCurriculum } from './CurriculumPicker';
import { sprintChapterName } from '../utils/sprintSchedule';
import { bnNum, bnSubject } from '../utils/bangla';
import { getAcademicGroup } from '../utils/groupSubjects';
import { useOptionalStudy } from '../context/StudyContext';

/**
 * Effortless 1-Click Inline Pre-made Chapter, Paper & Topic Picker for Sprint Planner.
 * Displays 1st/2nd Paper switch + clickable pre-made HSC curriculum chapters directly
 * on screen (zero popup hunting, zero forced typing), with instant search & optional
 * pre-made Type/Topic pills and custom chapter fallback.
 */
export default function SprintChapterPicker({ subject, value, onChange }) {
  const study = useOptionalStudy();
  const academicGroup = getAcademicGroup(study?.state?.profile || {});
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setCatalog(null);
    loadCurriculum(academicGroup)
      .then((x) => alive && setCatalog(x))
      .catch(() => alive && setError('কারিকুলাম তালিকা লোড করা যায়নি'));
    return () => {
      alive = false;
    };
  }, [academicGroup]);

  useEffect(() => {
    setQuery('');
    setCustomMode(false);
    setShowTopics(false);
  }, [subject]);

  const paper = subject === 'ICT' ? '' : value.paper || '1';
  const subjectCatalog =
    catalog?.[subject] || (subject === 'Math' ? catalog?.['Higher Math'] : null);
  const chapters = subjectCatalog?.[paper] || [];

  const picked = useMemo(
    () =>
      chapters.find(
        (x) => x.name === value.chapter || sprintChapterName(x.name) === value.chapter
      ) || null,
    [chapters, value.chapter]
  );

  const types = picked?.types || [];
  const selectedType = types.find((t) => t.name === value.curriculumType) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter(
      (x) =>
        sprintChapterName(x.name).toLowerCase().includes(q) ||
        String(x.name || '').toLowerCase().includes(q)
    );
  }, [chapters, query]);

  return (
    <div className="v29-inline-chapter-picker">
      {/* Header Row: Paper 1-Click Tabs + Search + Custom Toggle */}
      <div className="v29-icp-topbar">
        <div className="v29-icp-left">
          <span className="v29-icp-label">
            <BookOpen size={14} /> {bnSubject(subject)} · প্রি-মেইড অধ্যায় বেছে নিন
          </span>

          {subject !== 'ICT' && (
            <div className="v29-icp-papers" role="tablist" aria-label="পত্র নির্বাচন">
              {[
                ['1', '১ম পত্র'],
                ['2', '২য় পত্র'],
              ].map(([p, lbl]) => {
                const isAct = paper === p;
                return (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={isAct}
                    className={`v29-icp-paper-btn ${isAct ? 'active' : ''}`}
                    onClick={() => {
                      setCustomMode(false);
                      setQuery('');
                      onChange({
                        ...value,
                        paper: p,
                        chapter: '',
                        curriculumType: '',
                        curriculumTopic: '',
                      });
                    }}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="v29-icp-tools">
          {!customMode && chapters.length > 5 && (
            <label className="v29-icp-search">
              <Search size={13} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="অধ্যায় খুঁজুন..."
                aria-label="অধ্যায় খুঁজুন"
              />
            </label>
          )}
          <button
            type="button"
            className={`v29-icp-custom-btn ${customMode ? 'active' : ''}`}
            onClick={() => setCustomMode((v) => !v)}
          >
            <PencilLine size={12.5} />
            <span>{customMode ? 'প্রি-মেইড তালিকা' : 'নিজে লিখুন'}</span>
          </button>
        </div>
      </div>

      {/* 1-Click Pre-made Chapters Grid OR Custom Input */}
      {customMode ? (
        <div className="v29-icp-custom-box">
          <input
            type="text"
            maxLength={140}
            value={value.chapter || ''}
            placeholder={`${bnSubject(subject)}-এর অধ্যায় বা টপিকের নাম লিখুন...`}
            onChange={(e) =>
              onChange({
                ...value,
                paper,
                chapter: e.target.value,
                curriculumType: '',
                curriculumTopic: '',
              })
            }
          />
        </div>
      ) : (
        <div
          className="v29-icp-chapter-grid"
          role="radiogroup"
          aria-label="প্রি-মেইড অধ্যায় তালিকা"
        >
          {filtered.map((ch, idx) => {
            const cleanName = sprintChapterName(ch.name);
            const isSelected = value.chapter === cleanName || value.chapter === ch.name;
            return (
              <button
                key={ch.name}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`v29-icp-ch-card ${isSelected ? 'active' : ''}`}
                onClick={() =>
                  onChange({
                    ...value,
                    paper,
                    chapter: cleanName,
                    curriculumType: '',
                    curriculumTopic: '',
                  })
                }
              >
                <span className="v29-icp-ch-num">{bnNum(idx + 1)}</span>
                <span className="v29-icp-ch-title">{cleanName}</span>
                {isSelected && (
                  <span className="v29-icp-ch-check" aria-hidden="true">
                    <Check size={13} strokeWidth={2.8} />
                  </span>
                )}
              </button>
            );
          })}

          {!filtered.length && (
            <div className="v29-icp-empty">
              {error || (!catalog ? 'প্রি-মেইড অধ্যায় লোড হচ্ছে…' : 'কোনো অধ্যায় পাওয়া যায়নি')}
            </div>
          )}
        </div>
      )}

      {/* Optional 1-Click Pre-made Sub-Type / Topic Chips when a Chapter is Selected */}
      {!customMode && picked && types.length > 0 && (
        <div className="v29-icp-subtopics-wrap">
          <div className="v29-icp-subhead">
            <span>
              <Sparkles size={12} /> নির্বাচিত: <strong>{sprintChapterName(picked.name)}</strong>
            </span>
            <button
              type="button"
              className="v29-icp-subtoggle"
              onClick={() => setShowTopics((v) => !v)}
            >
              {showTopics
                ? 'টপিক তালিকা লুকান'
                : value.curriculumType
                ? `টাইপ: ${value.curriculumType}`
                : 'নির্দিষ্ট টাইপ/টপিক বাছুন (ঐচ্ছিক)'}
            </button>
          </div>

          {showTopics && (
            <div className="v29-icp-type-drawer">
              <div className="v29-icp-chip-row" role="group" aria-label="অধ্যায়ের টাইপ">
                <button
                  type="button"
                  className={`v29-icp-mini-chip ${!value.curriculumType ? 'active' : ''}`}
                  onClick={() =>
                    onChange({ ...value, paper, curriculumType: '', curriculumTopic: '' })
                  }
                >
                  সম্পূর্ণ অধ্যায়
                </button>
                {types.map((t) => {
                  const act = value.curriculumType === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      className={`v29-icp-mini-chip ${act ? 'active' : ''}`}
                      onClick={() =>
                        onChange({
                          ...value,
                          paper,
                          curriculumType: t.name,
                          curriculumTopic: '',
                        })
                      }
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>

              {selectedType?.topics?.length > 0 && (
                <div className="v29-icp-chip-row sub" role="group" aria-label="টপিক নির্বাচন">
                  <button
                    type="button"
                    className={`v29-icp-mini-chip ${!value.curriculumTopic ? 'active' : ''}`}
                    onClick={() => onChange({ ...value, paper, curriculumTopic: '' })}
                  >
                    সব টপিক
                  </button>
                  {selectedType.topics.map((tp) => {
                    const act = value.curriculumTopic === tp;
                    return (
                      <button
                        key={tp}
                        type="button"
                        className={`v29-icp-mini-chip ${act ? 'active' : ''}`}
                        onClick={() => onChange({ ...value, paper, curriculumTopic: tp })}
                      >
                        {tp}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
