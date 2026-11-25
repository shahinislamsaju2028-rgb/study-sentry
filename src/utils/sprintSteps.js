import { toDateKey, addDays, uid } from './seedData';
import { dateFromKey } from './stats';

const dateAdd = (key, n) => toDateKey(addDays(dateFromKey(key), n));

const stages = [
  { id: 'sheet', name: 'লেকচার শিট রিভিউ', part: 0.3 },
  { id: 'practice', name: 'প্র্যাকটিস', part: 0.5 },
  { id: 'revision', name: 'রিভিশন', part: 0.2 },
];

export function makeSteps(sprint, cl, actualKey) {
  const start = actualKey < sprint.start ? sprint.start : actualKey;
  const end = sprint.end;
  const cap = Number(sprint.practiceHours) * 60;
  const existing = sprint.tasks || [];
  const out = [];
  for (const stage of stages) {
    const duration = Math.max(1, Math.round(Number(cl.practiceMin) * stage.part));
    let due = null;
    if (stage.id === 'sheet') {
      due = start;
    } else if (!out.some((x) => x.date === null)) {
      let day = dateAdd(start, 1);
      const last = out.filter((x) => x.stage !== 'sheet' && x.date).at(-1)?.date;
      if (last && last > day) day = last;
      for (let guard = 0; day <= end && guard < 90; guard++, day = dateAdd(day, 1)) {
        const used = [...existing, ...out]
          .filter((t) => t.date === day)
          .reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
        if (used + duration <= cap) {
          due = day;
          break;
        }
      }
    }
    out.push({
      id: uid('swork'),
      classId: cl.id,
      subject: cl.subject,
      chapter: cl.chapter,
      stage: stage.id,
      name: stage.name,
      date: due,
      duration,
      done: false,
    });
  }
  return out;
}
