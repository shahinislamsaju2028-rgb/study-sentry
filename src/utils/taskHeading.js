import { bnSample, bnTask, bnActivity } from './bangla';
import { subjectName } from './premadeSubjects';

// Presentation only; canonical task and Sprint data stay untouched.
export function taskHeading(task, subjects, isDemo = false) {
  const subject = task?.presetSubject || subjectName(subjects, task?.subjectId) || '';
  const chapter = bnSample(task?.chapter, isDemo).trim();
  const raw = String(task?.title || '').trim();
  const remSuffix =
    task?.isRemainderTask && Number(task?.plannedMin) > 0
      ? ` · বাকি ${Number(task.plannedMin)} মিনিট`
      : '';

  if (task?.sprintLink) {
    const title = bnSample(raw, isDemo).trim();
    if (chapter && title.startsWith(`${chapter} · `)) {
      return `${chapter} ${title.slice(chapter.length + 3)}`;
    }
    return title || [chapter, task.sprintLabel].filter(Boolean).join(' ');
  }
  if (chapter) {
    const activity = bnActivity(task?.activity || '').trim();
    const base = activity && !chapter.includes(activity) ? `${chapter} · ${activity}` : chapter;
    return `${base}${remSuffix}`;
  }
  if (task?.isRemainderTask && raw) {
    return raw;
  }
  const generated =
    raw === subject ||
    raw === `${subject} · ${task?.activity || ''}` ||
    raw === `${subject} - ${task?.activity || ''}`;
  const title = generated
    ? bnActivity(task?.activity || '')
    : raw.replace(
        new RegExp(`^${subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[·—-]\\s*`),
        ''
      );
  return bnActivity(title) || bnTask(title, isDemo) || 'অধ্যয়ন';
}
