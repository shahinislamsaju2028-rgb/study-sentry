import { sprintChapterName, sprintItemTitle, ALL_SPRINT_PHASES } from './sprintSchedule';
import { ALL_TASK_TIME_SLOTS } from '../components/TodoPreviewControls';

const activityFor = (item, isClass) =>
  isClass
    ? 'Class'
    : item.step === 0
    ? 'Lecture Sheet Review'
    : item.step === 3
    ? 'Revision'
    : 'Practice';

export function sprintTasksForViews(sprintData, subjects = []) {
  const out = [];
  for (const sprint of sprintData?.sprints || []) {
    for (const [kind, items] of [
      ['class', sprint.classes || []],
      ['task', sprint.tasks || []],
    ]) {
      for (const item of items) {
        const isClass = kind === 'class';
        const phase = item.phaseId === 'noon' ? 'afternoon' : item.phaseId || 'dawn';
        const activity = activityFor(item, isClass);
        const number = isClass
          ? item.index
          : item.step === 0
          ? item.lectureIndex || (sprint.classes || []).find((c) => c.id === item.fromClassId)?.index
          : item.practiceIndex || item.revisionIndex || null;
        const bnKind = isClass
          ? 'ক্লাস'
          : item.step === 0
          ? 'লেকচার শিট রিভিউ'
          : item.step === 3
          ? 'রিভিশন'
          : 'প্র্যাকটিস';
        out.push({
          id: `sprint:${sprint.id}:${kind}:${item.id}`,
          sprintLink: { sprintId: sprint.id, kind, itemId: item.id },
          presetSubject: item.subject,
          subjectId:
            subjects.find((s) => s.name?.toLowerCase() === item.subject?.toLowerCase())?.id || '',
          chapter: sprintChapterName(item.chapter || ''),
          paper: item.paper || '',
          curriculumType: item.curriculumType || '',
          curriculumTopic: item.curriculumTopic || '',
          title: sprintItemTitle({ ...item, lectureIndex: item.lectureIndex || number }, isClass) || bnKind,
          activity,
          sprintLabel: `${bnKind}${number ? ' ' + number : ''}`,
          dateKey: item.date || sprint.start,
          timeSlot: phase,
          startTime: ALL_TASK_TIME_SLOTS.find((x) => x.id === phase)?.time || '05:30',
          plannedMin: item.duration || 45,
          priority: 'Medium',
          category: 'Study',
          workType: 'Study',
          done: !!item.done,
          boardStatus: item.done ? 'done' : item.boardStatus || 'todo',
          status: item.done ? 'done' : item.boardStatus || 'todo',
          focusDates: item.focusDates || [],
          scheduleOrder: item.scheduleOrder,
        });
      }
    }
  }
  return out.sort(
    (a, b) =>
      String(a.dateKey).localeCompare(String(b.dateKey)) ||
      ALL_SPRINT_PHASES.indexOf(a.timeSlot) - ALL_SPRINT_PHASES.indexOf(b.timeSlot) ||
      Number(a.scheduleOrder ?? 999999) - Number(b.scheduleOrder ?? 999999)
  );
}

export function mutateSprintProjection(state, link, patch, remove = false) {
  return {
    ...state,
    sprintData: {
      ...state.sprintData,
      sprints: (state.sprintData?.sprints || []).map((sp) => {
        if (sp.id !== link.sprintId) return sp;
        const key = link.kind === 'class' ? 'classes' : 'tasks';
        return {
          ...sp,
          [key]: (sp[key] || []).flatMap((item) => {
            if (item.id !== link.itemId) return [item];
            if (remove) return [];
            const adjusted =
              patch.chapter &&
              patch.chapter !== item.chapter &&
              patch.title === item.title &&
              item.title?.startsWith(item.chapter)
                ? { ...patch, title: patch.chapter + item.title.slice(item.chapter.length) }
                : patch;
            return [{ ...item, ...adjusted }];
          }),
        };
      }),
    },
  };
}

export function projectionPatch(task) {
  return {
    subject: task.presetSubject,
    chapter: task.chapter,
    paper: task.paper,
    curriculumType: task.curriculumType,
    curriculumTopic: task.curriculumTopic,
    date: task.dateKey,
    phaseId: task.timeSlot,
    duration: task.plannedMin,
    title: task.title,
  };
}
