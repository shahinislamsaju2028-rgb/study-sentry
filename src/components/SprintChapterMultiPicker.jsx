import React from 'react';
import { Atom, BookOpen, Briefcase, FlaskConical, Languages, Landmark, Leaf, Monitor, Sigma } from 'lucide-react';
import ChapterPicker from './ChapterPicker';

/**
 * ══════════════════════════════════════════════════════════════════════════
 * SprintChapterMultiPicker — adapter over the shared <ChapterPicker/>.
 *
 * This used to be a 210-line picker with its own amber card grid, its own
 * measuring logic and its own hover/selected styles, which is why the sprint
 * planner's chapter grid looked nothing like the focus config's chapter grid.
 *
 * It now renders the ONE chapter picker in multi-select mode, so the sprint
 * planner, the focus config, the task editor, the syllabus and the week
 * routine all speak the same visual language.
 * ══════════════════════════════════════════════════════════════════════════
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
  return (
    <ChapterPicker
      subject={subject}
      paper={paper}
      chapters={selected}
      chapter={selected[selected.length - 1] || ''}
      multi
      /* 6.txt · ⓶⓪ — the sprint composer uses the focus-config chapter grid,
         and that grid has no "অধ্যায় খুঁজুন" search box and no "নিজে লিখুন"
         escape hatch. Same components, same options, everywhere. */
      hideTools
      onChange={(next) => {
        // The sprint planner drives selection through onToggle / onSetAll so
        // that its per-chapter class counts stay in sync. Translate the
        // picker's full-selection payload into those two imperative calls.
        const prevSet = new Set(selected);
        const nextSet = new Set(next.chapters || []);

        if (next.paper !== paper) {
          onPaperChange?.(next.paper);
          return;
        }

        // Paper unchanged → work out the diff (add or remove one chapter).
        const added = [...nextSet].filter((n) => !prevSet.has(n));
        const removed = [...prevSet].filter((n) => !nextSet.has(n));

        if (added.length === 1 && removed.length === 0) {
          onToggle?.(added[0]);
        } else if (removed.length === 1 && added.length === 0) {
          onToggle?.(removed[0]);
        } else if (!nextSet.size && prevSet.size) {
          onSetAll?.(selected, false);
        } else if (nextSet.size && !prevSet.size) {
          onSetAll?.([...nextSet], true);
        } else if (added.length) {
          onSetAll?.([...nextSet], true);
        } else {
          onSetAll?.(selected, false);
        }

        onMetrics?.(0); // legacy prop — the picker now sizes its own tracks
      }}
    />
  );
}

/* ── subject colour map (kept: other modules import these) ─────────────── */

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
