import React from 'react';
import ChapterPicker from './ChapterPicker';

/**
 * Backwards-compatible single-chapter adapter for older sprint call sites.
 * The shared ChapterPicker owns the visual design and selection behavior so
 * sprint, task, Focus, routine, and syllabus surfaces cannot drift apart.
 */
export default function SprintChapterPicker({ subject, value = {}, onChange }) {
  return (
    <ChapterPicker
      subject={subject}
      paper={value.paper || ''}
      chapter={value.chapter || ''}
      type={value.curriculumType || ''}
      topic={value.curriculumTopic || ''}
      compact
      onChange={(next) =>
        onChange?.({
          ...value,
          paper: next.paper,
          chapter: next.chapter,
          curriculumType: next.type,
          curriculumTopic: next.topic,
        })
      }
    />
  );
}
