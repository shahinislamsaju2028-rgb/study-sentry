import React from 'react';
import ChapterPicker from './ChapterPicker';
import {
  COMMON_HSC_SUBJECTS,
  getAcademicGroup,
  groupCatalogKeys,
} from '../utils/groupSubjects';

/**
 * ══════════════════════════════════════════════════════════════════════════
 * CurriculumPicker — backwards-compatible adapter.
 *
 * This used to be a 320-line picker of its own with a step rail, numbered
 * cards, its own grid maths and its own visual language. That made it the
 * FOURTH different way to pick a chapter inside one product.
 *
 * Every one of its call sites (Focus config, Task editor, Syllabus, Week
 * routine) now renders the single shared <ChapterPicker/>:
 *
 *     ChapterPicker      ← the one real component
 *          ↑
 *     CurriculumPicker   ← thin adapter that keeps the old prop names
 *
 * Old props map 1:1 so no call site had to change:
 *     paper / chapter / chapters / type / topic          → same
 *     onChange({paper, chapter, chapters, type, topic})  → same
 *     multi / shortSprintChapter / subject               → same
 * ══════════════════════════════════════════════════════════════════════════
 */
export default function CurriculumPicker({
  subject = '',
  paper = '',
  chapter = '',
  type = '',
  topic = '',
  onChange,
  shortSprintChapter = false,
  multi = false,
  chapters = [],
  compact = false,
  stepIndex = '',
  hideTools = true,
}) {
  return (
    <ChapterPicker
      subject={subject}
      paper={paper}
      chapter={chapter}
      type={type}
      topic={topic}
      chapters={chapters}
      multi={multi}
      compact={compact}
      stepIndex={stepIndex}
      hideTools={hideTools}
      shortSprintChapter={shortSprintChapter}
      onChange={onChange}
    />
  );
}

/* ── catalogue loader (unchanged behaviour, unchanged export) ──────────── */

let catalogPromise;
let catalogGroup = null;

/**
 * Pre-made chapter catalog for ONE academic group.
 *
 * The old build merged science + humanities + business into a single flat
 * object, so a ব্যবসায় শিক্ষা student still saw the Physics / Chemistry /
 * Biology chapter lists. The catalog is scoped to the selected group: the
 * group's own subjects plus the three common ones (বাংলা · ইংলিশ · আইসিটি).
 */
export function loadCurriculum(group = 'science') {
  const key = getAcademicGroup({ academicGroup: group });
  if (catalogPromise && catalogGroup === key) return catalogPromise;
  catalogGroup = key;
  catalogPromise = Promise.all([
    import('../data/hscCatalog.json'),
    import('../data/hscGroupCatalog.json'),
  ])
    .then(([science, groups]) => {
      const year = groups.default?.['2028'] || {};
      const pool = {};
      if (key === 'science') {
        for (const name of groupCatalogKeys('science')) {
          if (science.default?.[name]) pool[name] = science.default[name];
        }
      } else {
        for (const name of groupCatalogKeys(key)) {
          const own = year[key]?.[name];
          // Economics + Geography & Environment are shared by মানবিক and
          // ব্যবসায় — business reuses the humanities list for those two.
          pool[name] = own || year.humanities?.[name] || {};
        }
      }
      // বাংলা · ইংলিশ · আইসিটি stay available for every group.
      for (const name of COMMON_HSC_SUBJECTS) {
        if (science.default?.[name]) pool[name] = science.default[name];
      }
      return pool;
    })
    .catch((e) => {
      catalogPromise = null;
      catalogGroup = null;
      throw e;
    });
  return catalogPromise;
}
