import React, { useState } from 'react';
import { Check, Clock3, Copy, Plus, StickyNote, Trash2 } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { uid } from '../utils/seedData';
import { bnDate, bnNum, bnSample } from '../utils/bangla';

export default function JunkNotes() {
  const { state, saveJunkNote, toast } = useStudy();
  const [draft, setDraft] = useState('');

  const notes = [...(state.junkNotes || [])].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  );

  const add = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    saveJunkNote(uid('junk'), draft.trim());
    setDraft('');
    toast('নোট সেভ হয়েছে');
  };

  return (
    <section className="v30-jn-shell" aria-label="Junk Notes">
      <header className="v30-jn-head">
        <div className="v30-jn-title">
          <span className="v30-jn-icon">
            <StickyNote size={18} />
          </span>
          <h3>Junk Notes</h3>
        </div>
        {notes.length > 0 && <span className="v30-jn-count">{bnNum(notes.length)}</span>}
      </header>

      <form className="v30-jn-composer" onSubmit={add}>
        <textarea
          aria-label="New note"
          rows={3}
          placeholder="দ্রুত নোট লিখুন…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') add(e);
          }}
        />
        <div className="v30-jn-composer-foot">
          <span className="v30-jn-kbd">Ctrl + Enter</span>
          <button type="submit" className="v30-glow-btn" disabled={!draft.trim()}>
            <Plus size={15} /> সেভ
          </button>
        </div>
      </form>

      {notes.length > 0 ? (
        <div className="jn-notes-grid v30-jn-grid">
          {notes.map((note) => (
            <NoteGlassCard
              key={note.id}
              note={note}
              isDemo={state.isDemo}
              onSave={saveJunkNote}
              toast={toast}
            />
          ))}
        </div>
      ) : (
        <div className="v30-jn-empty">
          <StickyNote size={22} />
          <span>কোনো নোট নেই</span>
        </div>
      )}
    </section>
  );
}

function NoteGlassCard({ note, isDemo, onSave, toast }) {
  const shown = bnSample(note.text, isDemo);
  const [text, setText] = useState(shown);
  const [saved, setSaved] = useState(false);

  const commitText = () => {
    const clean = text.trim();
    if (!clean) {
      setText(shown);
      return;
    }
    const out = clean === shown ? note.text : clean;
    if (out !== note.text) {
      onSave(note.id, out);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }
  };

  const copyNote = async () => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch (_) {}
    toast('কপি হয়েছে');
  };

  return (
    <article className="jn-note-card v30-jn-card">
      <textarea
        className="jn-card-editor"
        aria-label="Edit note"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
      />

      <footer className="jn-card-footer">
        <span className="jn-time-pill">
          <Clock3 size={11} />
          {bnDate(new Date(note.updatedAt || note.createdAt || Date.now()), {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>

        <div className="jn-card-actions">
          {saved && (
            <span className="jn-saved-badge">
              <Check size={12} />
            </span>
          )}
          <button type="button" className="jn-icon-btn" title="Copy" onClick={copyNote}>
            <Copy size={13} />
          </button>
          <button
            type="button"
            className="jn-icon-btn danger"
            title="Delete"
            aria-label="Delete note"
            onClick={() => onSave(note.id, '')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </footer>
    </article>
  );
}
