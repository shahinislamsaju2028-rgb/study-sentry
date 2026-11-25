import { addDays, toDateKey } from './seedData';

export function dateFromKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!match) return dateFromKey(toDateKey());
  const date = new Date(+match[1], +match[2] - 1, +match[3], 12);
  date.__civilDate = true;
  return date;
}

export function dayBounds(key) {
  const start = Date.parse(`${key}T00:00:00+06:00`);
  return [start, start + 86400000];
}

export function sessionIntervals(session) {
  const segments =
    Array.isArray(session?.segments) && session.segments.length
      ? session.segments
      : [{ start: session?.startedAt, end: session?.endedAt }];
  return segments
    .map((v) => ({ start: new Date(v.start).getTime(), end: new Date(v.end).getTime() }))
    .filter((v) => Number.isFinite(v.start) && Number.isFinite(v.end) && v.end > v.start);
}

export function timerElapsedMs(timer, now = Date.now()) {
  if (!timer) return 0;
  const accumulated = Math.max(0, Number(timer.accumulatedMs) || 0);
  const running =
    timer.status === 'running' && Number.isFinite(Number(timer.lastResumedAt))
      ? Math.max(0, now - Number(timer.lastResumedAt))
      : 0;
  const total = accumulated + running;
  return timer.mode === 'pomodoro'
    ? Math.min(total, Math.max(0, Number(timer.durationSec) || 0) * 1000)
    : total;
}

/**
 * Returns negative overtime seconds (1, 2, 3...) once a countdown timer hits 00:00
 * and enters `status === 'alarm'`.
 */
export function timerOvertimeSec(timer, now = Date.now()) {
  if (!timer || timer.status !== 'alarm') return 0;
  const alarmOrigin = Number(timer.alarmStartedAt) || now;
  return Math.max(1, Math.floor(Math.max(0, now - alarmOrigin) / 1000) + 1);
}

export function timerIntervals(timer, now = Date.now()) {
  if (!timer) return [];
  const past = Array.isArray(timer.segments) ? timer.segments.slice() : [];
  if (timer.status === 'running' && timer.lastResumedAt) {
    const start = Number(timer.lastResumedAt);
    const available =
      timer.mode === 'pomodoro'
        ? Math.max(0, (Number(timer.durationSec) || 0) * 1000 - (Number(timer.accumulatedMs) || 0))
        : Math.max(0, now - start);
    const end = Math.min(now, start + available);
    if (end > start) {
      past.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    }
  }
  return past;
}

export function sessionSecondsOnDay(session, key) {
  const [start, end] = dayBounds(key);
  const intervals = sessionIntervals(session);
  if (!intervals.length) return session?.dateKey === key ? Number(session.durationSec) || 0 : 0;
  return (
    intervals.reduce(
      (sum, block) => sum + Math.max(0, Math.min(end, block.end) - Math.max(start, block.start)),
      0
    ) / 1000
  );
}

export function totalOnDay(sessions, key, subjectId) {
  return (sessions || []).reduce(
    (sum, s) => (!subjectId || s.subjectId === subjectId ? sum + sessionSecondsOnDay(s, key) : sum),
    0
  );
}

export function activeSecondsOnDay(timer, key, now = Date.now(), subjectId) {
  if (!timer || timer.phase === 'break' || (subjectId && timer.subjectId !== subjectId)) return 0;
  return sessionSecondsOnDay({ segments: timerIntervals(timer, now) }, key);
}

export function currentStreak(sessions, timer, now = Date.now()) {
  const today = new Date(now);
  let cursor =
    totalOnDay(sessions, toDateKey(today)) + activeSecondsOnDay(timer, toDateKey(today), now) >= 60
      ? today
      : addDays(today, -1);
  let count = 0;
  while (count < 3660) {
    const key = toDateKey(cursor);
    if (totalOnDay(sessions, key) + activeSecondsOnDay(timer, key, now) < 60) break;
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function getWeeklyDates(base = new Date()) {
  const d = dateFromKey(toDateKey(base));
  const offsetFromSaturday = (d.getDay() + 1) % 7;
  const saturday = addDays(d, -offsetFromSaturday);
  return Array.from({ length: 7 }, (_, i) => addDays(saturday, i));
}

export function dateTitle(key, opts = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return dateFromKey(key).toLocaleDateString(undefined, opts);
}

export function daysUntil(key) {
  const today = dateFromKey(toDateKey());
  const target = dateFromKey(key);
  return Math.round(
    (Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000
  );
}

export function nextReviewDate(intervalDays) {
  return toDateKey(addDays(new Date(), intervalDays));
}
