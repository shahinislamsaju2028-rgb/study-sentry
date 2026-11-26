import { toDateKey } from './seedData';
import { sessionSecondsOnDay } from './stats';

/**
 * 5-Stage Flexible Daily Study Phase Engine (Asia/Dhaka)
 * - 5 Canonical Phases:
 *   1. dawn       — ভোর        (5:30 AM – 10:00 AM)
 *   2. morning    — সকাল       (10:01 AM – 2:00 PM)
 *   3. noon       — দুপুর       (2:01 PM – 6:00 PM) [slot alias: 'afternoon']
 *   4. night      — রাত        (6:01 PM – 10:00 PM)
 *   5. late_night — গভীর রাত   (10:01 PM – 2:00 AM)
 *
 * - User Phase Mode Selection (`profile.phaseMode`):
 *   - 'first4': ভোর, সকাল, দুপুর, রাত (default)
 *   - 'last4' : সকাল, দুপুর, রাত, গভীর রাত
 *   - 'all5'  : ভোর, সকাল, দুপুর, রাত, গভীর রাত
 */
export const PHASE_MIN_GOAL_MIN = 120; // 2h
export const PHASE_AVG_GOAL_MIN = 150; // 2.5h
export const PHASE_MAX_GOAL_MIN = 180; // 3h
export const PHASE_DURATION_PRESETS = [120, 150, 180];

export const HUMAN_MISSED_NUDGE_MESSAGE =
  'চলতি প্রহরের লক্ষ্য এখনো বাকি — মনোযোগ দিয়ে পড়া শুরু করুন।';

export const ORDER_BN_LABELS = ['১ম প্রহর', '২য় প্রহর', '৩য় প্রহর', '৪র্থ প্রহর', '৫ম প্রহর'];

export const ALL_STUDY_PHASES = [
  {
    id: 'dawn',
    slotId: 'dawn',
    index: 1,
    orderBn: '১ম প্রহর',
    label: 'ভোর',
    bnName: 'ভোর',
    enName: 'Dawn',
    shortTime: '5:30 AM – 10:00 AM',
    compactTime: '5:30–10:00',
    windowLabel: 'ভোর 5:30 – সকাল 10:00',
    bnWindow: 'ভোর 5:30 – সকাল 10:00',
    defaultStartTime: '05:30',
    startHour: 5.5,
    endHour: 10 + 1 / 60,
    minTargetMin: PHASE_MIN_GOAL_MIN,
    targetMin: PHASE_AVG_GOAL_MIN,
    maxTargetMin: PHASE_MAX_GOAL_MIN,
    accent: '#fb923c',
  },
  {
    id: 'morning',
    slotId: 'morning',
    index: 2,
    orderBn: '২য় প্রহর',
    label: 'সকাল',
    bnName: 'সকাল',
    enName: 'Morning',
    shortTime: '10:01 AM – 2:00 PM',
    compactTime: '10:01–2:00',
    windowLabel: 'সকাল 10:01 – দুপুর 2:00',
    bnWindow: 'সকাল 10:01 – দুপুর 2:00',
    defaultStartTime: '10:05',
    startHour: 10 + 1 / 60,
    endHour: 14 + 1 / 60,
    minTargetMin: PHASE_MIN_GOAL_MIN,
    targetMin: PHASE_AVG_GOAL_MIN,
    maxTargetMin: PHASE_MAX_GOAL_MIN,
    accent: '#fbbf24',
  },
  {
    id: 'noon',
    slotId: 'afternoon',
    index: 3,
    orderBn: '৩য় প্রহর',
    label: 'দুপুর',
    bnName: 'দুপুর',
    enName: 'Noon',
    shortTime: '2:01 PM – 6:00 PM',
    compactTime: '2:01–6:00',
    windowLabel: 'দুপুর 2:01 – সন্ধ্যা 6:00',
    bnWindow: 'দুপুর 2:01 – সন্ধ্যা 6:00',
    defaultStartTime: '14:05',
    startHour: 14 + 1 / 60,
    endHour: 18 + 1 / 60,
    minTargetMin: PHASE_MIN_GOAL_MIN,
    targetMin: PHASE_AVG_GOAL_MIN,
    maxTargetMin: PHASE_MAX_GOAL_MIN,
    accent: '#38bdf8',
  },
  {
    id: 'night',
    slotId: 'night',
    index: 4,
    orderBn: '৪র্থ প্রহর',
    label: 'রাত',
    bnName: 'রাত',
    enName: 'Night',
    shortTime: '6:01 PM – 10:00 PM',
    compactTime: '6:01–10:00',
    windowLabel: 'সন্ধ্যা 6:01 – রাত 10:00',
    bnWindow: 'সন্ধ্যা 6:01 – রাত 10:00',
    defaultStartTime: '18:30',
    startHour: 18 + 1 / 60,
    endHour: 22 + 1 / 60,
    minTargetMin: PHASE_MIN_GOAL_MIN,
    targetMin: PHASE_AVG_GOAL_MIN,
    maxTargetMin: PHASE_MAX_GOAL_MIN,
    accent: '#a78bfa',
  },
  {
    id: 'late_night',
    slotId: 'late_night',
    index: 5,
    orderBn: '৫ম প্রহর',
    label: 'গভীর রাত',
    bnName: 'গভীর রাত',
    enName: 'Deep Night',
    shortTime: '10:01 PM – 2:00 AM',
    compactTime: '10:01–2:00',
    windowLabel: 'রাত 10:01 – রাত 2:00',
    bnWindow: 'রাত 10:01 – রাত 2:00',
    defaultStartTime: '22:05',
    startHour: 22 + 1 / 60,
    endHour: 26 + 1 / 60,
    minTargetMin: PHASE_MIN_GOAL_MIN,
    targetMin: PHASE_AVG_GOAL_MIN,
    maxTargetMin: PHASE_MAX_GOAL_MIN,
    accent: '#4f46e5',
    isNew: true,
  },
];

export const PHASE_MODE_OPTIONS = [
  {
    id: 'first4',
    title: 'প্রথম ৪টি প্রহর',
    subtitle: 'ভোর · সকাল · দুপুর · রাত',
    desc: 'যারা ভোরবেলা উঠে রাত 10টার মধ্যে পড়া শেষ করতে চান',
    phaseIds: ['dawn', 'morning', 'noon', 'night'],
    slotIds: ['dawn', 'morning', 'afternoon', 'night'],
  },
  {
    id: 'last4',
    title: 'পরের ৪টি প্রহর',
    subtitle: 'সকাল · দুপুর · রাত · গভীর রাত',
    desc: 'যারা সকাল থেকে শুরু করে রাত 10:01 – 2:00 পর্যন্ত পড়তে পছন্দ করেন',
    phaseIds: ['morning', 'noon', 'night', 'late_night'],
    slotIds: ['morning', 'afternoon', 'night', 'late_night'],
  },
  {
    id: 'all5',
    title: 'সবগুলো ৫টি প্রহর',
    subtitle: 'ভোর · সকাল · দুপুর · রাত · গভীর রাত',
    desc: 'ভোর 5:30 থেকে গভীর রাত 2:00 পর্যন্ত পূর্ণ ৫ প্রহরের রুটিন',
    phaseIds: ['dawn', 'morning', 'noon', 'night', 'late_night'],
    slotIds: ['dawn', 'morning', 'afternoon', 'night', 'late_night'],
  },
];

export function normalizePhaseMode(raw) {
  if (raw === 'last4' || raw === 'all5' || raw === 'first4') return raw;
  return 'first4';
}

export function getPhaseModeFromState(state) {
  return normalizePhaseMode(state?.profile?.phaseMode || state?.timerPrefs?.phaseMode);
}

export function getStudyPhases(mode = 'first4') {
  const normalized = normalizePhaseMode(mode);
  const spec = PHASE_MODE_OPTIONS.find((m) => m.id === normalized) || PHASE_MODE_OPTIONS[0];
  return spec.phaseIds.map((pid, idx) => {
    const base = ALL_STUDY_PHASES.find((p) => p.id === pid);
    return {
      ...base,
      index: idx + 1,
      orderBn: ORDER_BN_LABELS[idx] || `${idx + 1}ম প্রহর`,
    };
  });
}

// Default 4-phase list preserved for backward compatibility
export const STUDY_PHASES = getStudyPhases('first4');

export function getDhakaHour(dateOrMs = Date.now()) {
  const d = new Date(new Date(dateOrMs).getTime() + 6 * 3600000);
  return d.getUTCHours();
}

export function resolvePhaseIdByDhakaMinute(minutes, mode = 'all5') {
  const m = Number(minutes);
  if (!Number.isFinite(m)) return null;
  const normalizedMode = normalizePhaseMode(mode);
  const hasDawn = normalizedMode !== 'last4';
  const hasLateNight = normalizedMode === 'last4' || normalizedMode === 'all5';

  if (m >= 330 && m <= 600) return hasDawn ? 'dawn' : null;
  if (m >= 601 && m <= 840) return 'morning';
  if (m >= 841 && m <= 1080) return 'noon';
  if (m >= 1081 && m <= 1320) return 'night';
  if (m >= 1321 || (m >= 0 && m <= 120)) return hasLateNight ? 'late_night' : null;
  return null;
}

export function resolvePhaseIdByDhakaHour(hour, mode = 'all5') {
  return resolvePhaseIdByDhakaMinute(Number(hour) * 60, mode);
}

export function phaseForInstant(dateOrMs = Date.now(), mode = 'all5') {
  const d = new Date(new Date(dateOrMs).getTime() + 6 * 3600000);
  return resolvePhaseIdByDhakaMinute(d.getUTCHours() * 60 + d.getUTCMinutes(), mode);
}

export function canonicalPhaseId(id) {
  if (!id) return null;
  const s = String(id).trim().toLowerCase();
  if (s === 'afternoon' || s === 'noon') return 'noon';
  if (s === 'late_night' || s === 'latenight' || s === 'midnight' || s === 'deep_night') {
    return 'late_night';
  }
  if (s === 'evening') return 'night';
  if (s === 'dawn' || s === 'morning' || s === 'night') return s;
  return null;
}

export function inferPhaseIdFromTimeStr(rawTime, mode = 'all5') {
  const txt = String(rawTime || '').trim();
  if (!txt) return 'morning';
  const lower = txt.toLowerCase();
  if (lower.includes('গভীর রাত') || lower.includes('নিশীথ') || lower.includes('late')) {
    return 'late_night';
  }
  if (lower.includes('ভোর') || lower.includes('dawn')) return 'dawn';
  if (lower.includes('সকাল') || lower.includes('morning')) return 'morning';
  if (lower.includes('দুপুর') || lower.includes('বিকেল') || lower.includes('noon') || lower.includes('afternoon')) {
    return 'noon';
  }
  if (lower.includes('রাত') || lower.includes('সন্ধ্যা') || lower.includes('night')) {
    return 'night';
  }

  const normalized = txt.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
  const m = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return 'morning';
  let h = parseInt(m[1], 10);
  const mer = (m[3] || '').toLowerCase();
  if (mer === 'pm' && h < 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  return resolvePhaseIdByDhakaMinute(h * 60 + Number(m[2] || 0), mode) || 'night';
}

/**
 * Computes live progress for the user's selected study phases (first4 / last4 / all5) for `todayKey`.
 */
export function computeTodayPhasesSnapshot(state, nowMs = Date.now(), activeElapsedSec = 0) {
  const today = toDateKey(new Date(nowMs));
  const phaseMode = getPhaseModeFromState(state);
  const activePhases = getStudyPhases(phaseMode);
  const currentPhaseId = phaseForInstant(nowMs, phaseMode);

  const rawPrefMin = Number(state?.timerPrefs?.phaseDurationMin) || PHASE_AVG_GOAL_MIN;
  const globalTargetMin = Math.max(
    PHASE_MIN_GOAL_MIN,
    Math.min(PHASE_MAX_GOAL_MIN, Math.round(rawPrefMin))
  );

  const phaseSettings = state?.phaseGoals || {};
  const secByPhase = {};
  const splitSessionsByPhase = {};
  for (const p of activePhases) {
    secByPhase[p.id] = 0;
    splitSessionsByPhase[p.id] = [];
  }

  const sessions = Array.isArray(state?.sessions) ? state.sessions : [];
  for (const s of sessions) {
    const daySec = sessionSecondsOnDay(s, today);
    if (daySec <= 0) continue;
    const explicitPhase = canonicalPhaseId(s?.focusMeta?.phaseId);
    let pid =
      explicitPhase && secByPhase[explicitPhase] !== undefined
        ? explicitPhase
        : phaseForInstant(s.startedAt || nowMs, phaseMode);
    if (!pid && explicitPhase === 'late_night' && secByPhase.night !== undefined) {
      pid = 'night';
    }
    if (!pid || secByPhase[pid] === undefined) continue;
    secByPhase[pid] = (secByPhase[pid] || 0) + daySec;
    splitSessionsByPhase[pid].push({
      id: s.id,
      subjectName: s.subjectName || 'Focus',
      durationMin: Math.max(1, Math.round(daySec / 60)),
    });
  }

  const active = state?.activeTimer;
  let runningPid = null;
  if (active && active.phase !== 'break' && activeElapsedSec > 0) {
    const explicitPhase = canonicalPhaseId(active?.focusMeta?.phaseId);
    runningPid =
      explicitPhase && secByPhase[explicitPhase] !== undefined
        ? explicitPhase
        : currentPhaseId;
    if (runningPid && secByPhase[runningPid] !== undefined) {
      secByPhase[runningPid] = (secByPhase[runningPid] || 0) + activeElapsedSec;
    }
  }

  const phases = activePhases.map((p) => {
    const rawCustom = Number(phaseSettings[p.id]);
    const customTargetMin =
      Number.isFinite(rawCustom) && rawCustom >= PHASE_MIN_GOAL_MIN && rawCustom <= PHASE_MAX_GOAL_MIN
        ? Math.round(rawCustom)
        : globalTargetMin;

    const targetSec = customTargetMin * 60;
    const minTargetSec = p.minTargetMin * 60;
    const maxTargetSec = p.maxTargetMin * 60;
    const studiedSec = Math.max(0, Math.round(secByPhase[p.id] || 0));
    const remainingSec = Math.max(0, targetSec - studiedSec);
    const pct = Math.min(100, Math.round((studiedSec / targetSec) * 100));
    const minGoalMet = studiedSec >= minTargetSec;
    const completed = studiedSec >= targetSec;
    const maxGoalMet = studiedSec >= maxTargetSec;
    const splitList = splitSessionsByPhase[p.id] || [];
    const sessionCount = splitList.length + (runningPid === p.id ? 1 : 0);
    const isWindowActive = p.id === currentPhaseId;
    const isRunningNow = runningPid === p.id && active?.status === 'running';

    return {
      ...p,
      targetMin: customTargetMin,
      targetSec,
      minTargetSec,
      maxTargetSec,
      studiedSec,
      studiedMin: Math.floor(studiedSec / 60),
      remainingSec,
      remainingMin: Math.ceil(remainingSec / 60),
      pct,
      minGoalMet,
      done: completed,
      completed,
      maxGoalMet,
      sessionCount,
      splitSessions: splitList,
      isCurrent: isWindowActive,
      isWindowActive,
      isRunningNow,
    };
  });

  const currentPhase = phases.find((p) => p.id === currentPhaseId) || null;
  const completedCount = phases.filter((p) => p.done || p.minGoalMet).length;
  const shouldShowHumanNudge = Boolean(
    !active && currentPhase && !currentPhase.done && currentPhase.studiedSec < 600
  );

  return {
    todayKey: today,
    phaseMode,
    currentPhaseId,
    currentPhase,
    activeWindowPhase: currentPhase,
    phases,
    completedCount,
    totalPhases: phases.length,
    shouldShowHumanNudge,
  };
}

export const computeDailyPhaseSnapshot = computeTodayPhasesSnapshot;
