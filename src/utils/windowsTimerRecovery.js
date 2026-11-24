import { timerElapsedMs, timerIntervals } from './stats.js';
import { toDateKey, uid } from './seedData.js';
import { focusTypeName } from './focusDetails.js';
import { formatActivityLabel } from './subjectActivities.js';

export const CHECKPOINT_KEY = 'study-sentry-windows-timer-checkpoint-v1';

export function checkpointTimer(timer, at = Date.now()) {
  if (!timer || (timer.status !== 'running' && timer.status !== 'paused')) return null;
  const elapsedMs =
    timer.status === 'running'
      ? timerElapsedMs(timer, at)
      : Math.max(0, Number(timer.accumulatedMs) || 0);
  const segs =
    timer.status === 'running'
      ? timerIntervals(timer, at)
      : Array.isArray(timer.segments)
      ? timer.segments
      : [];
  return {
    id: timer.id,
    at,
    accumulatedMs: elapsedMs,
    segments: segs,
  };
}

/**
 * Legacy helper preserved for unit tests: converts a running timer after exit into
 * a stopped snapshot strictly bounded by the last live background checkpoint.
 */
export function recoverStoppedTimer(timer, checkpoint) {
  if (!timer || timer.status !== 'running') return timer;
  const heartbeatAt = Number(timer.lastHeartbeatAt || 0);
  const cpValid =
    checkpoint &&
    checkpoint.id === timer.id &&
    Number.isFinite(checkpoint.at) &&
    Number.isFinite(checkpoint.accumulatedMs) &&
    checkpoint.at >= Number(timer.lastResumedAt || 0);

  let accumulatedMs = Math.max(0, Number(timer.accumulatedMs) || 0);
  let segments = Array.isArray(timer.segments) ? timer.segments : [];

  if (cpValid) {
    accumulatedMs = Math.max(accumulatedMs, checkpoint.accumulatedMs);
    if (Array.isArray(checkpoint.segments)) segments = checkpoint.segments;
  } else if (heartbeatAt > Number(timer.lastResumedAt || 0)) {
    accumulatedMs = timerElapsedMs(timer, heartbeatAt);
    segments = timerIntervals(timer, heartbeatAt);
  }

  return {
    ...timer,
    status: 'paused',
    pausedByGuard: false,
    accumulatedMs,
    segments,
    lastResumedAt: null,
    recoveredAfterExit: true,
  };
}

/**
 * Finalizes an interrupted/exited focus session so:
 * 1. Timer NEVER runs while the application is exited (activeTimer -> null).
 * 2. Exact completed focus duration (e.g. 40m of a 90m session) is saved immediately
 *    into `state.sessions` (and XP updated) so zero study data is ever lost.
 * 3. Remaining duration (e.g. 50m left) is saved into `state.pendingSessionRecovery`
 *    so the next time the user opens Study Sentry, a reminder toast prompts them to
 *    resume the remaining 50m immediately — or automatically adds it to Task Board & Timeline!
 */
export function finalizeTimerOnAppExit(state, checkpoint = null, exactStopMs = null) {
  const timer = state?.activeTimer;
  if (!timer) return state;

  // Break timers just stop cleanly when exiting the app completely.
  if (timer.phase === 'break') {
    return { ...state, activeTimer: null };
  }

  // Determine the exact last alive timestamp — NEVER count time while app was closed!
  let effectiveMs = Math.max(0, Number(timer.accumulatedMs) || 0);
  let effectiveEndMs = Number(timer.lastHeartbeatAt) || Number(timer.lastResumedAt) || Date.now();
  let segments = Array.isArray(timer.segments) ? timer.segments : [];

  if (timer.status === 'running') {
    if (Number.isFinite(exactStopMs) && exactStopMs > 0) {
      effectiveEndMs = exactStopMs;
      effectiveMs = timerElapsedMs(timer, exactStopMs);
      segments = timerIntervals(timer, exactStopMs);
    } else {
      const stopped = recoverStoppedTimer(timer, checkpoint);
      effectiveMs = Math.max(0, Number(stopped.accumulatedMs) || 0);
      segments = Array.isArray(stopped.segments) ? stopped.segments : [];
      if (checkpoint && checkpoint.id === timer.id && Number.isFinite(checkpoint.at)) {
        effectiveEndMs = checkpoint.at;
      }
    }
  } else if (timer.status === 'alarm') {
    effectiveMs = Math.max(effectiveMs, (Number(timer.durationSec) || 0) * 1000);
    effectiveEndMs = Number(timer.alarmStartedAt) || effectiveEndMs;
  }

  const plannedSec =
    timer.mode === 'pomodoro' && Number(timer.durationSec) > 0
      ? Math.round(Number(timer.durationSec))
      : 0;
  const rawElapsedSec = Math.max(0, Math.floor(effectiveMs / 1000));
  const completedSec = plannedSec > 0 ? Math.min(plannedSec, rawElapsedSec) : rawElapsedSec;
  const remainingSec = plannedSec > 0 ? Math.max(0, plannedSec - completedSec) : 0;

  const endDate = new Date(effectiveEndMs);
  const startIso =
    timer.startedAt || new Date(Math.max(0, effectiveEndMs - completedSec * 1000)).toISOString();

  // Save the completed session whenever the user studied at least 30 seconds
  const existingSessions = Array.isArray(state.sessions) ? state.sessions : [];
  const alreadySaved = existingSessions.some((s) => s.sourceTimerId === timer.id);
  let nextSessions = existingSessions;
  let xpGain = 0;

  if (completedSec >= 30 && !alreadySaved) {
    const savedSession = {
      id: uid('sess'),
      sourceTimerId: timer.id,
      subjectId: timer.subjectId || '',
      subjectName: timer.subjectName || 'Focus',
      taskId: timer.taskId || '',
      taskTitle: timer.taskTitle || '',
      mode: timer.mode || 'pomodoro',
      workType: timer.workType || 'Study',
      goalId: timer.goalId || undefined,
      startedAt: startIso,
      endedAt: endDate.toISOString(),
      durationSec: completedSec,
      dateKey: toDateKey(endDate),
      notes:
        remainingSec >= 60
          ? `আংশিক সম্পন্ন (${Math.max(1, Math.round(completedSec / 60))} মিনিট সেভ হয়েছে)`
          : '',
      segments: segments.length
        ? segments
        : [{ start: startIso, end: endDate.toISOString() }],
      focusMeta: timer.focusMeta || null,
      focusReport: {
        pauseRequests: timer.pauseRequests || 0,
        savedOnAppExit: true,
        originalPlannedSec: plannedSec || completedSec,
        remainingSec,
      },
    };
    nextSessions = [savedSession, ...existingSessions];
    xpGain = Math.max(1, Math.floor(completedSec / 60)) * 2;
  }

  // Create remaining-session recovery prompt if there's >= 1 minute left in a planned focus session
  let nextRecovery = state.pendingSessionRecovery || null;
  if (plannedSec > 0 && remainingSec >= 60 && completedSec >= 30) {
    const originalMin = Math.max(1, Math.round(plannedSec / 60));
    const completedMin = Math.max(1, Math.floor(completedSec / 60));
    const remainingMin = Math.max(1, originalMin - completedMin);
    const meta = timer.focusMeta || {};
    nextRecovery = {
      id: uid('recover'),
      sourceTimerId: timer.id,
      subjectId: timer.subjectId || '',
      subjectName: timer.subjectName || 'Physics',
      taskId: timer.taskId || meta.taskId || '',
      parentTaskId: meta.parentTaskId || timer.taskId || meta.taskId || '',
      taskTitle: timer.taskTitle || meta.title || '',
      chapter: meta.chapter || '',
      paper: meta.paper || '',
      curriculumType: meta.curriculumType || '',
      curriculumTopic: meta.curriculumTopic || '',
      activityType: timer.activityType || meta.activityType || 'recorded',
      phaseId: meta.phaseId || '',
      workType: timer.workType || 'Study',
      sprintLink:
        meta.sprintLink ||
        (meta.sprintId && (meta.classId || meta.sprintTaskId)
          ? {
              sprintId: meta.sprintId,
              kind: meta.classId ? 'class' : 'task',
              itemId: meta.classId || meta.sprintTaskId,
            }
          : null),
      originalMin,
      completedMin,
      remainingMin,
      completedSec,
      remainingSec,
      savedAt: endDate.toISOString(),
      dateKey: toDateKey(endDate),
    };
  }

  // Also update deepGoals partial progress if applicable
  let nextDeepGoals = state.deepGoals;
  if (timer.kind === 'deep_goal' && timer.goalId && Array.isArray(state.deepGoals) && completedSec > 0) {
    nextDeepGoals = state.deepGoals.map((g) => {
      if (g.id !== timer.goalId) return g;
      const totalDone = Math.min(
        Number(timer.durationSec) || 5400,
        (Number(timer.goalBaseSec) || 0) + completedSec
      );
      const isDone = remainingSec < 60;
      return {
        ...g,
        completedSec: totalDone,
        status: isDone ? 'completed' : 'partial',
        updatedAt: endDate.toISOString(),
      };
    });
  }

  return {
    ...state,
    profile: {
      ...(state.profile || {}),
      xp: Math.max(0, (Number(state.profile?.xp) || 0) + xpGain),
    },
    sessions: nextSessions,
    deepGoals: nextDeepGoals,
    activeTimer: null,
    pendingSessionRecovery: nextRecovery,
  };
}

/**
 * Converts a declined/ignored `pendingSessionRecovery` into a real Todo task
 * visible on both Task Board and Task Timeline for the remaining minutes.
 */
export function buildRemainderTodoFromRecovery(recovery, todayKey, defaultSlot = 'morning') {
  if (!recovery) return null;
  const actMap = {
    recorded: 'Class',
    sheet: 'Lecture Sheet Review',
    practice: 'Practice',
    bank: 'Practice',
    revision: 'Revision',
  };
  const activity = actMap[recovery.activityType] || 'Practice';
  const bnAct = focusTypeName(recovery.activityType || 'practice') || formatActivityLabel(activity);
  const slot =
    recovery.phaseId === 'noon'
      ? 'afternoon'
      : ['dawn', 'morning', 'afternoon', 'night', 'late_night'].includes(recovery.phaseId)
      ? recovery.phaseId
      : defaultSlot;
  const slotTimeMap = {
    dawn: '05:30',
    morning: '10:05',
    afternoon: '14:05',
    night: '18:30',
    late_night: '22:05',
  };

  const baseLabel =
    recovery.taskTitle ||
    (recovery.chapter ? `${recovery.chapter} · ${bnAct}` : `${recovery.subjectName} · ${bnAct}`);
  const cleanBase = String(baseLabel).replace(/\s*\(বাকি\s*\d+\s*মিনিট\)\s*$/u, '').trim();

  return {
    id: uid('todo_rem'),
    title: `${cleanBase} (বাকি ${recovery.remainingMin} মিনিট)`,
    description: `পূর্বের ${recovery.originalMin} মিনিট সেশনের ${recovery.completedMin} মিনিট সম্পন্ন হয়েছে — বাকি ${recovery.remainingMin} মিনিট পূর্ণ করলে টাস্কটি সম্পন্ন হবে।`,
    presetSubject: recovery.subjectName || 'Physics',
    subjectId: recovery.subjectId || '',
    chapter: recovery.chapter || '',
    paper: recovery.paper || '',
    curriculumType: recovery.curriculumType || '',
    curriculumTopic: recovery.curriculumTopic || '',
    activity,
    dateKey: todayKey || toDateKey(new Date()),
    timeSlot: slot,
    startTime: slotTimeMap[slot] || '10:05',
    plannedMin: recovery.remainingMin,
    durationMin: recovery.remainingMin,
    priority: 'High',
    category: 'Study',
    workType: 'Study',
    boardStatus: 'todo',
    status: 'todo',
    done: false,
    isRemainderTask: true,
    originalPlannedMin: recovery.originalMin,
    priorCompletedMin: recovery.completedMin,
    parentTaskId: recovery.parentTaskId || recovery.taskId || '',
    linkedSprintItem: recovery.sprintLink || null,
    subtasks: [],
    notes: `পূর্বের ফোকাস: ${recovery.completedMin} মিনিট সেভ করা আছে · বাকি: ${recovery.remainingMin} মিনিট`,
  };
}
