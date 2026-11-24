import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { bnNum } from '../utils/bangla';

/**
 * Inline chapter checklist.
 *
 * Level 1  — টাইপ        (chapter type, from the HSC catalog)
 * Level 2  — সাব টপিক    (sub-topic under that type)
 * Level 3  — সাব টাইপ    (the student's own sub-type, added by hand)
 *
 * The student ticks the items they have actually completed; nothing is
 * auto-assumed and there is no "focus" shortcut here.
 */
export default function SyllabusChapterTree({
  chapter,
  types = [],
  onToggleTopic,
  onAddSubtype,
  onToggleSubtype,
  onRemoveSubtype,
}) {
  const checks = chapter?.checklistDone || {};
  const custom = chapter?.customSubtypes || {};

  const [openTypes, setOpenTypes] = useState(() => new Set());
  const [drafts, setDrafts] = useState({});

  const toggleType = (name) =>
    setOpenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const submitDraft = (topicId) => {
    const raw = (drafts[topicId] || '').trim();
    if (!raw) return;
    onAddSubtype(topicId, raw);
    setDrafts((prev) => ({ ...prev, [topicId]: '' }));
  };

  const rows = useMemo(
    () =>
      types.map((type) => {
        const extras = type.topics.flatMap((t) => custom[t.id] || []);
        const total =
          type.topics.length + extras.length;
        const done =
          type.topics.filter((t) => checks[t.id]).length +
          extras.filter((x) => x.done).length;
        return { type, total, done };
      }),
    [types, checks, custom]
  );

  if (!types.length) {
    return (
      <div className="v33-syl-expand">
        <p className="v33-syl-empty">এই অধ্যায়ের জন্য প্রি-মেড সিলেবাস নেই। নিচে নিজের টপিক যোগ করুন।</p>
        <div className="v33-syl-add">
          <input
            value={drafts.__own || ''}
            onChange={(e) => setDrafts((prev) => ({ ...prev, __own: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const raw = (drafts.__own || '').trim();
              if (!raw) return;
              onAddSubtype('chapter', raw);
              setDrafts((prev) => ({ ...prev, __own: '' }));
            }}
            placeholder="নিজের টপিক লিখুন…"
            aria-label="নিজের টপিক লিখুন"
          />
          <button
            type="button"
            onClick={() => {
              const raw = (drafts.__own || '').trim();
              if (!raw) return;
              onAddSubtype('chapter', raw);
              setDrafts((prev) => ({ ...prev, __own: '' }));
            }}
          >
            <Plus size={13} /> যোগ
          </button>
        </div>
        <ul className="v33-syl-subtype v33-syl-subtype--own">
          {(custom.chapter || []).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`v33-syl-topic ${item.done ? 'is-done' : ''}`}
                onClick={() => onToggleSubtype('chapter', item.id)}
              >
                <span className="v33-syl-box" aria-hidden="true">
                  {item.done && <Check size={13} strokeWidth={3} />}
                </span>
                <span className="v33-syl-topic-label">{item.label}</span>
              </button>
              <button
                type="button"
                className="v33-syl-del"
                aria-label="মুছুন"
                onClick={() => onRemoveSubtype('chapter', item.id)}
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="v33-syl-expand">
      {rows.map(({ type, total, done }) => {
        const open = openTypes.has(type.name);
        const complete = total > 0 && done === total;
        return (
          <div key={type.name} className={`v33-syl-type ${open ? 'is-open' : ''} ${complete ? 'is-complete' : ''}`}>
            <button
              type="button"
              className="v33-syl-type-head"
              aria-expanded={open}
              onClick={() => toggleType(type.name)}
            >
              <ChevronRight className="v33-syl-caret" size={13} />
              <span className="v33-syl-type-name">{type.name}</span>
              <span className="v33-syl-type-count">
                {bnNum(done)}/{bnNum(total)}
              </span>
            </button>

            {open && (
              <div className="v33-syl-type-body">
                {type.topics.map((topic) => {
                  const isDone = Boolean(checks[topic.id]);
                  const extras = custom[topic.id] || [];
                  return (
                    <div key={topic.id}>
                      <button
                        type="button"
                        className={`v33-syl-topic ${isDone ? 'is-done' : ''}`}
                        aria-pressed={isDone}
                        onClick={() => onToggleTopic(topic.id)}
                      >
                        <span className="v33-syl-box" aria-hidden="true">
                          {isDone && <Check size={13} strokeWidth={3} />}
                        </span>
                        <span className="v33-syl-topic-label">{topic.label}</span>
                      </button>

                      {extras.length > 0 && (
                        <ul className="v33-syl-subtype">
                          {extras.map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                className={`v33-syl-topic ${item.done ? 'is-done' : ''}`}
                                aria-pressed={item.done}
                                onClick={() => onToggleSubtype(topic.id, item.id)}
                              >
                                <span className="v33-syl-box" aria-hidden="true">
                                  {item.done && <Check size={12} strokeWidth={3} />}
                                </span>
                                <span className="v33-syl-topic-label">{item.label}</span>
                              </button>
                              <button
                                type="button"
                                className="v33-syl-del"
                                aria-label="মুছুন"
                                onClick={() => onRemoveSubtype(topic.id, item.id)}
                              >
                                <Trash2 size={11} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="v33-syl-add">
                        <input
                          value={drafts[topic.id] || ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [topic.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            submitDraft(topic.id);
                          }}
                          placeholder="সাব টাইপ যোগ করুন…"
                          aria-label={`${topic.label} — সাব টাইপ যোগ করুন`}
                        />
                        <button type="button" onClick={() => submitDraft(topic.id)}>
                          <Plus size={12} /> যোগ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
