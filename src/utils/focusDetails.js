export const FOCUS_TYPES = [
  ['recorded', 'ক্লাস'],
  ['sheet', 'লেকচার শিট রিভিউ'],
  ['practice', 'প্র্যাকটিস'],
  ['revision', 'রিভিশন'],
];

export const focusTypeName = (type) => {
  if (type === 'bank' || type === 'book' || type === 'cycle' || type === 'practice') {
    return 'প্র্যাকটিস';
  }
  if (type === 'sheet' || type === 'lecture_sheet') {
    return 'লেকচার শিট রিভিউ';
  }
  if (type === 'recorded' || type === 'class') {
    return 'ক্লাস';
  }
  return FOCUS_TYPES.find((x) => x[0] === type)?.[1] || 'ক্লাস';
};

export function typeForActivity(activity) {
  const a = String(activity || '').toLowerCase();
  if (a.includes('sheet') || a.includes('লেকচার শিট')) return 'sheet';
  if (
    a.includes('question') ||
    a.includes('bank') ||
    a.includes('practice') ||
    a.includes('cycle') ||
    a.includes('book') ||
    a.includes('প্র্যাকটিস') ||
    a.includes('প্রশ্নব্যাংক') ||
    a.includes('অনুশীলন')
  ) {
    return 'practice';
  }
  if (a.includes('revision') || a.includes('রিভিশন')) return 'revision';
  return 'recorded';
}

export function taskDraft(task) {
  if (task.sprintLink) {
    const link = task.sprintLink;
    return {
      source: link.kind === 'class' ? 'sprint-class' : 'sprint-task',
      sprintId: link.sprintId,
      ...(link.kind === 'class' ? { classId: link.itemId } : { sprintTaskId: link.itemId }),
      subjectId: task.subjectId || '',
      subjectName: task.presetSubject || '',
      title: task.title || '',
      chapter: task.chapter || '',
      paper: task.paper || '',
      curriculumType: task.curriculumType || '',
      curriculumTopic: task.curriculumTopic || '',
      activityType: typeForActivity(task.activity),
      phaseId: task.timeSlot === 'afternoon' ? 'noon' : task.timeSlot,
      workLabel: focusTypeName(typeForActivity(task.activity)),
      minutes: Number(task.plannedMin) || 45,
      requiredMinutes: Number(task.plannedMin) || 45,
    };
  }
  const mins = Math.max(
    1,
    Math.min(
      1440,
      Number(task.plannedMin) ||
        Number(task.durationMin) ||
        Math.round(Number(task.estimatedHours) * 60) ||
        50
    )
  );
  return {
    source: 'todo',
    taskId: task.id,
    parentTaskId: task.parentTaskId || '',
    sprintLink: task.linkedSprintItem || null,
    isRemainderTask: Boolean(task.isRemainderTask),
    workType: task.workType || 'Study',
    subjectId: task.subjectId || '',
    subjectName: task.presetSubject || '',
    title: task.title || '',
    chapter: task.chapter || '',
    paper: task.paper || '',
    curriculumType: task.curriculumType || '',
    curriculumTopic: task.curriculumTopic || '',
    cycle: task.cycle || '',
    className: task.className || '',
    activityType: typeForActivity(task.activity),
    phaseId: task.timeSlot === 'afternoon' ? 'noon' : task.timeSlot || '',
    workLabel: task.activity ? focusTypeName(typeForActivity(task.activity)) : 'কাজ',
    minutes: mins,
    requiredMinutes: task.isRemainderTask ? mins : undefined,
    questionTarget: task.questionTarget || '',
    videoPosition: task.videoPosition || '',
  };
}
