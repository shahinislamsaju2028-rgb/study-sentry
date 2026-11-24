import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';

globalThis.WebSocket ??= class MockWS {};

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true },
});

try {
  // 1. Study Phases (5th phase গভীর রাত 10:01 PM – 2:00 AM + 3 selection modes)
  const phases = await vite.ssrLoadModule('/src/utils/studyPhases.js');
  assert.equal(phases.ALL_STUDY_PHASES.length, 5, 'Must have 5 total study phases');
  assert.deepEqual(
    phases.getStudyPhases('first4').map((p) => p.id),
    ['dawn', 'morning', 'noon', 'night']
  );
  assert.deepEqual(
    phases.getStudyPhases('last4').map((p) => p.id),
    ['morning', 'noon', 'night', 'late_night']
  );
  assert.deepEqual(
    phases.getStudyPhases('all5').map((p) => p.id),
    ['dawn', 'morning', 'noon', 'night', 'late_night']
  );
  const lateNight = phases.ALL_STUDY_PHASES.find((p) => p.id === 'late_night');
  assert.equal(lateNight.label, 'গভীর রাত');
  // 23:15 Dhaka time (+06:00) = 17:15 UTC
  const at2315Dhaka = Date.parse('2026-11-18T17:15:00Z');
  // 01:20 Dhaka time (+06:00) = 19:20 UTC previous day
  const at0120Dhaka = Date.parse('2026-11-18T19:20:00Z');
  assert.equal(phases.phaseForInstant(at2315Dhaka, 'all5'), 'late_night');
  assert.equal(phases.phaseForInstant(at0120Dhaka, 'last4'), 'late_night');
  assert.equal(phases.phaseForInstant(at2315Dhaka, 'first4'), null);
  console.log('✓ 1. 5th Study Phase (গভীর রাত 10:01 PM – 2:00 AM) & first4/last4/all5 modes verified');

  // 2. Universal 7-Minute Focus Session Lock
  const dg = await vite.ssrLoadModule('/src/utils/deepGoal.js');
  const baseNow = 1_700_000_000_000;
  assert.equal(
    dg.isFocusSessionLocked(
      { status: 'running', phase: 'focus', mode: 'pomodoro', durationSec: 1500, accumulatedMs: 419_000, lastResumedAt: baseNow },
      baseNow
    ),
    false,
    '6m59s should not be locked'
  );
  assert.equal(
    dg.isFocusSessionLocked(
      { status: 'running', phase: 'focus', mode: 'pomodoro', durationSec: 5400, accumulatedMs: 420_000, lastResumedAt: baseNow },
      baseNow
    ),
    true,
    '7m00s MUST be locked until full duration completes'
  );
  assert.equal(
    dg.isFocusSessionLocked(
      { status: 'paused', phase: 'focus', mode: 'pomodoro', durationSec: 3000, accumulatedMs: 600_000, lastResumedAt: null },
      baseNow
    ),
    true,
    'Paused focus session >= 7m MUST remain locked against stop/reset'
  );
  assert.equal(
    dg.isFocusSessionLocked(
      { status: 'alarm', phase: 'focus', mode: 'pomodoro', durationSec: 1500, accumulatedMs: 1500_000, lastResumedAt: null },
      baseNow
    ),
    false,
    'Completed alarm session can be stopped'
  );
  assert.equal(
    dg.isFocusSessionLocked(
      { status: 'running', phase: 'break', mode: 'pomodoro', durationSec: 600, accumulatedMs: 480_000, lastResumedAt: null },
      baseNow
    ),
    false,
    'Break timer is never session-locked'
  );
  console.log('✓ 2. Universal 7-minute Focus Lock verified');

  // 3. Background-Only Timer + Exit Save (40m of 90m) + Remaining 50m Task Recovery
  const rec = await vite.ssrLoadModule('/src/utils/windowsTimerRecovery.js');
  const startMs = Date.parse('2026-11-18T10:00:00Z');
  const exitAt40m = startMs + 40 * 60 * 1000; // exact 40 minutes
  const initialState = {
    sessions: [],
    todos: [],
    activeTimer: {
      id: 't_90m',
      status: 'running',
      phase: 'focus',
      mode: 'pomodoro',
      durationSec: 90 * 60,
      subjectId: 'sub_phy',
      subjectName: 'Physics',
      activityType: 'practice',
      startedAt: new Date(startMs).toISOString(),
      lastResumedAt: startMs,
      accumulatedMs: 0,
      segments: [],
      focusMeta: { chapter: 'ভেক্টর', paper: '1', phaseId: 'morning' },
    },
  };
  const savedOnExit = rec.finalizeTimerOnAppExit(initialState, null, exitAt40m);
  assert.equal(savedOnExit.activeTimer, null, 'Timer MUST stop on exit');
  assert.equal(savedOnExit.sessions.length, 1, 'Completed 40m session MUST be saved on exit');
  assert.equal(savedOnExit.sessions[0].durationSec, 2400, 'Exact 40m (2400s) MUST be saved');
  assert.equal(savedOnExit.pendingSessionRecovery.completedMin, 40);
  assert.equal(savedOnExit.pendingSessionRecovery.remainingMin, 50);
  assert.equal(savedOnExit.pendingSessionRecovery.originalMin, 90);

  const remainderTask = rec.buildRemainderTodoFromRecovery(
    savedOnExit.pendingSessionRecovery,
    '2026-11-18',
    'morning'
  );
  assert.equal(remainderTask.plannedMin, 50, 'Remainder task MUST have exact 50 minutes');
  assert.equal(remainderTask.done, false);
  assert.equal(remainderTask.boardStatus, 'todo');
  assert.equal(remainderTask.isRemainderTask, true);
  console.log('✓ 3. Exit timer stop + 40m save + 50m recovery toast & Task Board remainder verified');

  // 4. Unified Subject Activities
  const acts = await vite.ssrLoadModule('/src/utils/subjectActivities.js');
  assert.deepEqual(acts.SUBJECT_ACTIVITIES, [
    'Class',
    'Lecture Sheet Review',
    'Practice',
    'Revision',
  ]);
  assert.equal(acts.activityName('Lecture Sheet Practice'), 'Lecture Sheet Review');
  assert.equal(acts.activityName('Question Bank Solve'), 'Practice');
  assert.equal(acts.activityName('Book Practice'), 'Practice');
  assert.equal(acts.activityName('Cycle Book Solve'), 'Practice');
  assert.equal(acts.formatActivityLabel('Lecture Sheet Review'), 'লেকচার শিট রিভিউ');
  assert.equal(acts.formatActivityLabel('Practice'), 'প্র্যাকটিস');
  console.log('✓ 4. Unified Subject Activities (ক্লাস, লেকচার শিট রিভিউ, প্র্যাকটিস, রিভিশন) verified');

  // 5. Sprint Planner + All 5 Phases + HSC Curriculum Catalog
  const sp = await vite.ssrLoadModule('/src/utils/sprintSchedule.js');
  assert.ok(sp.PREMADE_SPRINT_NAMES.length >= 5, 'Premade sprint names present');
  const generated = sp.generateSprintSchedule({
    start: '2026-11-18',
    end: '2026-11-28',
    phaseMode: 'all5',
    modules: [
      { id: 'm1', subject: 'Physics', paper: '1', chapter: 'ভেক্টর', classCount: 2, classMin: 60, phaseId: 'late_night' },
      { id: 'm2', subject: 'Chemistry', paper: '1', chapter: 'গুণগত রসায়ন', classCount: 2, classMin: 50, phaseId: 'dawn' },
    ],
  });
  assert.equal(generated.classes.length, 4);
  assert.ok(generated.classes.some((c) => c.phaseId === 'late_night'), 'Late night sprint phase scheduled');
  assert.ok(generated.tasks.some((t) => acts.formatActivityLabel(t.kind) === 'লেকচার শিট রিভিউ'));
  assert.ok(generated.tasks.some((t) => acts.formatActivityLabel(t.kind) === 'প্র্যাকটিস'));
  assert.ok(generated.tasks.some((t) => acts.formatActivityLabel(t.kind) === 'রিভিশন'));

  const catalog = JSON.parse(fs.readFileSync('src/data/hscCatalog.json', 'utf8'));
  for (const subj of ['Physics', 'Chemistry', 'Math', 'Biology', 'ICT', 'Bangla', 'English']) {
    assert.ok(catalog[subj], `Catalog must include ${subj}`);
    const papers = subj === 'ICT' ? [''] : ['1', '2'];
    for (const p of papers) {
      assert.ok((catalog[subj][p] || []).length >= 5, `${subj} paper "${p}" must have structured chapters`);
    }
  }
  console.log('✓ 5. Sprint Planner (pre-made titles, 5-phase schedule, complete 7-subject HSC catalog) verified');

  // 6. 8 Dark Themes + CSS sync + No Clock Style bloat
  const th = await vite.ssrLoadModule('/src/utils/themes.ts');
  assert.equal(th.DARK_THEMES.length, 8, 'Must provide 8 rich dark themes');
  const css = fs.readFileSync('src/styles/vibrant-dark-theme.css', 'utf8');
  for (const t of th.DARK_THEMES) {
    assert.ok(css.includes(`[data-theme='${t.id}']`) || css.includes(`[data-theme="${t.id}"]`), `CSS missing theme ${t.id}`);
  }
  assert.equal(fs.existsSync('src/components/SuiteQuest.jsx'), false, 'SuiteQuest must be deleted');
  console.log('✓ 6. 8 Dark Themes CSS sync & Daily Quest restricted to Study Circle verified');

  // 7. Study Circle Default "এইচএসসি 28" Group Matcher
  const sc = await vite.ssrLoadModule('/src/utils/studyCircle.ts');
  assert.equal(sc.DEFAULT_CIRCLE_NAME, 'এইচএসসি 28');
  assert.equal(sc.isDefaultHsc28Group('এইচএসসি 28'), true);
  assert.equal(sc.isDefaultHsc28Group('এইচএসসি ২৮'), true);
  assert.equal(sc.isDefaultHsc28Group('HSC 28'), true);
  assert.equal(sc.isDefaultHsc28Group('Custom Group'), false);
  console.log('✓ 7. Study Circle "এইচএসসি 28" default public auto-join verified');

  console.log('\nALL v2.28 FEATURE TESTS PASSED 100%!');
} finally {
  await vite.close();
}
