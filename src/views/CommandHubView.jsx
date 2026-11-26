import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Flame,
  GraduationCap,
  ListTodo,
  Lock,
  MoonStar,
  Palette,
  Play,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Sun,
  SunMedium,
  Sunrise,
  Target,
  Timer,
  Trophy,
  Unlock,
  UsersRound,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { PreviewSubjectIcon } from '../components/PreviewSubjectIcon';
import JourneyBadge from '../components/JourneyBadge';
import { RANK_DETAILS } from '../components/JourneyPanel';
import { SentryChronoCore3D, SpatialTiltCard } from '../components/SpatialMotionEngine';
import { slotForTask } from '../components/TodoPreviewControls';
import { boardStatusFor } from '../components/TaskBoard';
import { DARK_THEMES, resolveThemeId } from '../utils/themes';
import { addDays, formatHM, toDateKey } from '../utils/seedData';
import { bnDate, bnDay, bnNum, bnSample, bnSubject, bnTask } from '../utils/bangla';
import { dailyTargetHours, deadlineFor } from '../utils/goalAnalytics';
import { dateFromKey, daysUntil, sessionSecondsOnDay } from '../utils/stats';
import { SUBJECT_ACTIVITIES } from '../utils/subjectActivities';
import { getTaskTimeSlots } from '../components/TodoPreviewControls';

const TRACKER_SUBJECTS = [
  { id: 'Physics', short: 'পদার্থ' },
  { id: 'Chemistry', short: 'রসায়ন' },
  { id: 'Math', short: 'গণিত' },
  { id: 'Biology', short: 'জীব' },
  { id: 'ICT', short: 'ICT' },
  { id: 'Bangla', short: 'বাংলা' },
  { id: 'English', short: 'ইংরেজি' },
];

function buildMiniCurve(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    cp1y = Math.max(minY, Math.min(maxY, cp1y));
    cp2y = Math.max(minY, Math.min(maxY, cp2y));
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function CommandHubView() {
  const {
    state,
    now,
    todayKey,
    todaySec,
    dayTotal,
    getTrackerCellInfo,
    streak,
    rank,
    xpPercent,
    navigate,
    timer,
    isAlarm,
    displayTime,
  } = useStudy();

  // 1. Focus & Daily Goal Telemetry
  const targetSec = Math.max(
    1,
    dailyTargetHours(state.commitment, todayKey) * 3600 ||
      (Number(state.profile.dailyGoalMin) || 240) * 60
  );
  const progress = Math.min(100, Math.round((todaySec / targetSec) * 100));
  const todaySessionsCount = (state.sessions || []).filter(
    (s) => sessionSecondsOnDay(s, todayKey) > 0
  ).length;

  const todaySubjects = state.subjects
    .map((s) => ({ ...s, seconds: dayTotal(todayKey, s.id) }))
    .filter((s) => s.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);

  // 2. Insights 7-Day Mini Sparkline Telemetry
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(dateFromKey(todayKey), i - 6)),
    [todayKey]
  );
  const weekValues = weekDays.map((d) => dayTotal(toDateKey(d)));
  const weekSec = weekValues.reduce((a, b) => a + b, 0);
  const sparkMax = Math.max(3600, ...weekValues);
  const sparkCoords = weekValues.map((v, i) => ({
    x: 8 + (i * 204) / 6,
    y: 50 - Math.min(1, v / sparkMax) * 38,
    v,
  }));
  const sparkLine = buildMiniCurve(sparkCoords);
  const sparkArea = `${sparkLine} L ${sparkCoords[6].x.toFixed(1)} 54 L ${sparkCoords[0].x.toFixed(1)} 54 Z`;

  // 3. Tasks & Kanban Summary
  const allStudyTasks = (state.todos || []).filter(
    (t) => (t.workType || 'Study') !== 'Work' && String(t.category || '').toLowerCase() !== 'work'
  );
  const todoCount = allStudyTasks.filter((t) => boardStatusFor(t) === 'todo').length;
  const doingCount = allStudyTasks.filter((t) => boardStatusFor(t) === 'doing').length;
  const doneCount = allStudyTasks.filter((t) => boardStatusFor(t) === 'done').length;
  const totalBoardTasks = Math.max(1, todoCount + doingCount + doneCount);

  const nextTask = allStudyTasks
    .filter((t) => !t.done && (!t.dateKey || t.dateKey >= todayKey))
    .sort(
      (a, b) =>
        String(a.dateKey || '').localeCompare(String(b.dateKey || '')) ||
        String(a.startTime || '99:99').localeCompare(String(b.startTime || '99:99'))
    )[0];
  const nextTaskSlot = nextTask ? slotForTask(nextTask) : null;

  // 4. Weekly Routine Summary — the FULL day, ভোর থেকে গভীর রাত, always.
  const activeRoutineSlots = getTaskTimeSlots('all5');
  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    dateFromKey(todayKey).getDay()
  ];
  const routineRow = (state.routine || []).find((r) => r.day === todayName) || {};
  const routineSlotsWithData = activeRoutineSlots.map((s) => {
    const raw =
      s.id === 'night'
        ? routineRow.night ?? routineRow.evening ?? ''
        : routineRow[s.id] ?? '';
    const text = String(bnSample(raw, state.isDemo) || '').trim();
    return { key: s.id, label: s.bnLabel, tone: s.tone, Icon: s.Icon, text, active: text.length > 0 };
  });
  const routineCount = routineSlotsWithData.filter((s) => s.active).length;
  const featuredRoutine = routineSlotsWithData.find((s) => s.active);

  // 5. Sprint Planner & Overview Summary
  const sprints = state.sprintData?.sprints || [];
  const sprint =
    sprints.find((s) => s.id === state.sprintData?.selectedSprintId) || sprints.at(-1) || null;
  const commitment = sprint
    ? {
        ...state.commitment,
        active: true,
        deadlineDateKey: sprint.end,
        deadlineTime: sprint.endTime || '23:59',
      }
    : state.commitment;
  const deadline = deadlineFor(commitment);
  const remaining = deadline ? Math.max(0, Math.floor((deadline.getTime() - now) / 1000)) : null;
  const daysLeft = remaining === null ? null : Math.floor(remaining / 86400);
  const hoursLeft = remaining === null ? null : Math.floor((remaining % 86400) / 3600);

  const sprintClasses = sprint?.classes || [];
  const sprintTasks = sprint?.tasks || [];
  const doneClasses = sprintClasses.filter((c) => c.done).length;
  const doneSteps = sprintTasks.filter((t) => t.done).length;
  const classPct = sprintClasses.length ? Math.round((doneClasses / sprintClasses.length) * 100) : 0;
  const stepPct = sprintTasks.length ? Math.round((doneSteps / sprintTasks.length) * 100) : 0;

  // 6. Daily Tracker Matrix Summary
  let trackerDone = 0;
  const trackerMatrix = TRACKER_SUBJECTS.map((sub) => {
    const dots = SUBJECT_ACTIVITIES.map((act) => {
      const ok = getTrackerCellInfo(todayKey, sub.id, act).status === 'done';
      if (ok) trackerDone += 1;
      return ok;
    });
    return { ...sub, dots };
  });
  const trackerTotal = TRACKER_SUBJECTS.length * SUBJECT_ACTIVITIES.length;

  // 7. Student Suite (Syllabus + Exams) Summary
  const chapters = state.syllabus || [];
  const stages = ['theory', 'notes', 'practice', 'revised'];
  const finishedStages = chapters.reduce((n, ch) => n + stages.filter((k) => ch[k]).length, 0);
  const syllabusPct = chapters.length
    ? Math.round((100 * finishedStages) / (chapters.length * 4))
    : 0;
  const nextExam = (state.exams || [])
    .filter((e) => e.dateKey >= todayKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))[0];
  const examDays = nextExam ? daysUntil(nextExam.dateKey) : null;

  // 8. Settings Quick Controls (Focus Guard + Junk Note + Theme)
  const isGuardRunning = Boolean(
    state.strictGuard?.enabled !== false &&
      timer &&
      timer.phase !== 'break' &&
      timer.status === 'running'
  );
  const junkNotes = state.junkNotes || [];
  const latestNote = [...junkNotes].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  )[0];
  const activeThemeId = resolveThemeId(state?.timerPrefs?.theme);
  const activeTheme = DARK_THEMES.find((t) => t.id === activeThemeId) || DARK_THEMES[0];

  const rankInfo = RANK_DETAILS[rank?.tier || 1] || RANK_DETAILS[1];
  const studentName =
    state.profile.name === 'শিক্ষার্থী' ||
    (state.isDemo && state.profile.name === 'Personal Student')
      ? 'শিক্ষার্থী'
      : state.profile.name || 'শিক্ষার্থী';

  const ringRadius = 21;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc * (1 - progress / 100);

  /* ── v48 NAV DIRECTORY ─────────────────────────────────────────────────
     Every software destination, in one matrix.  The eight detailed tiles
     carry live numbers; the dock below covers Settings / tools.  Each entry
     shows a count so the Home page is a true summary, not just a menu.     */
  const navEntries = [
    {
      id: 'focus',
      route: () => navigate('focus'),
      title: 'Focus Session',
      bn: 'পমোডোরো ও স্টপওয়াচ',
      Icon: Timer,
      tone: 'amber',
      stat: timer ? displayTime : formatHM(todaySec),
      statLabel: timer ? 'চলমান সেশন' : 'আজকের ফোকাস',
      pct: progress,
      badge: timer ? 'লাইভ' : `${bnNum(todaySessionsCount)} সেশন`,
      live: Boolean(timer),
    },
    {
      id: 'insights',
      route: () => navigate('insights'),
      title: 'Insights & Rank',
      bn: 'সপ্তাহের অগ্রগতি',
      Icon: ChartNoAxesCombined,
      tone: 'violet',
      stat: rankInfo.bnTitle,
      statLabel: `${bnNum(Math.min(99, Math.round(weekSec / 3600)))} ঘণ্টা · ৭ দিন`,
      pct: xpPercent,
      badge: `Tier ${bnNum(rank?.tier || 1)}`,
    },
    {
      id: 'todo',
      route: () => navigate('todo'),
      title: 'Tasks & Kanban',
      bn: 'কাজের বোর্ড',
      Icon: ListTodo,
      tone: 'sky',
      stat: `${bnNum(doneCount)}/${bnNum(totalBoardTasks)} সম্পন্ন`,
      statLabel: `${bnNum(doingCount)} চলছে · ${bnNum(todoCount)} বাকি`,
      pct: Math.round((doneCount / totalBoardTasks) * 100),
      // `nextTaskSlot` is a whole slot descriptor object ({id, bnLabel, tone, Icon, …}).
      // Rendering it directly throws "Objects are not valid as a React child"
      // and blanked the whole Home view. Show its Bangla label instead.
      badge: nextTaskSlot?.bnLabel || nextTaskSlot?.label || 'খালি',
    },
    {
      id: 'routine',
      route: () => navigate('todo', 'routine'),
      title: 'Weekly Routine',
      bn: 'সাপ্তাহিক রুটিন',
      Icon: CalendarDays,
      tone: 'orange',
      stat: `${bnNum(routineCount)}/${bnNum(routineSlotsWithData.length)} স্লট`,
      statLabel: featuredRoutine ? featuredRoutine.label : `${bnDay(todayName)} · ফাঁকা`,
      pct: Math.round((routineCount / Math.max(1, routineSlotsWithData.length)) * 100),
      badge: bnDay(todayName),
    },
    {
      id: 'sprint',
      route: () => navigate('motivation', 'sprint'),
      title: 'Sprint Planner',
      bn: 'স্প্রিন্ট অগ্রগতি',
      Icon: Rocket,
      tone: 'gold',
      stat: sprint ? `${bnNum(classPct)}%` : '—',
      statLabel: sprint ? bnSample(sprint.name, state.isDemo) : 'স্প্রিন্ট নেই',
      pct: classPct,
      badge: remaining !== null && remaining > 0 ? `${bnNum(daysLeft)}দি বাকি` : 'নতুন',
    },
    {
      id: 'tracker',
      route: () => navigate('tracker'),
      title: 'Daily Tracker',
      bn: '৭ বিষয় ম্যাট্রিক্স',
      Icon: CalendarCheck2,
      tone: 'teal',
      stat: `${bnNum(trackerDone)}/${bnNum(trackerTotal)}`,
      statLabel: 'আজকের ঘর পূরণ',
      pct: Math.round((trackerDone / Math.max(1, trackerTotal)) * 100),
      badge: `${bnNum(Math.round((trackerDone / Math.max(1, trackerTotal)) * 100))}%`,
    },
    {
      id: 'suite',
      route: () => navigate('suite'),
      title: 'Student Suite',
      bn: 'সিলেবাস ও পরীক্ষা',
      Icon: GraduationCap,
      tone: 'rose',
      stat: `${bnNum(syllabusPct)}%`,
      statLabel: examDays !== null ? `পরীক্ষা ${bnNum(examDays)} দিন পরে` : 'সিলেবাস অগ্রগতি',
      pct: syllabusPct,
      badge: `${bnNum(chapters.length)} অধ্যায়`,
    },
    {
      id: 'circle',
      route: () => navigate('circle'),
      title: 'Study Lounge',
      bn: 'লাইভ ও লিডারবোর্ড',
      Icon: UsersRound,
      tone: 'emerald',
      stat: 'লাইভ',
      statLabel: 'বন্ধুদের রুম দেখুন',
      pct: 100,
      badge: 'HSC 28',
      live: true,
    },
    {
      id: 'overview',
      route: () => navigate('motivation'),
      title: 'Overview',
      bn: 'মোটিভেশন ও লক্ষ্য',
      Icon: Sparkles,
      tone: 'plum',
      stat: `${bnNum(streak)} দিন`,
      statLabel: 'স্ট্রিক চলছে',
      pct: Math.min(100, Math.round((streak / 30) * 100)),
      badge: `${bnNum(Math.round(xpPercent))}% XP`,
    },
  ];

  /* the quick-dock tools, in the same chip language */
  const toolEntries = [
    { id: 'guard', label: 'Focus Guard', Icon: ShieldCheck, tone: 'blue', note: isGuardRunning ? 'সক্রিয়' : 'ফ্রি' },
    { id: 'notes', label: 'Junk Note', Icon: StickyNote, tone: 'amber', note: `${bnNum(junkNotes.length)}টি` },
    { id: 'theme', label: 'Theme', Icon: Palette, tone: 'violet', note: activeTheme.name },
  ];

  return (
    <div className="view-page bento-home-shell v48-home">
      {/* ══ 1. HERO ═══════════════════════════════════════════════════════ */}
      <SpatialTiltCard
        maxTilt={3.5}
        delayIndex={0}
        className="bento-hero-banner v12-spatial-hero-banner v48-hero"
        ariaLabel="Student Command Header"
      >
        <div className="bento-hero-identity">
          <button
            type="button"
            className="bento-rank-orb"
            onClick={() => navigate('insights')}
            title="র‍্যাংক ও ইনসাইটস দেখুন"
          >
            <JourneyBadge tier={rank?.tier || 1} size={50} />
          </button>

          <div className="bento-hero-copy">
            <h2>স্বাগতম, {studentName}</h2>
            <div className="bento-hero-pills">
              <span className="bh-pill accent">
                <Sparkles size={12} /> {rankInfo.bnTitle}
              </span>
              <span className="bh-pill flame">
                <Flame size={12} /> {bnNum(streak)} দিন স্ট্রিক
              </span>
              {remaining !== null && remaining > 0 && (
                <span className="bh-pill sky">
                  <Clock3 size={12} /> {bnNum(daysLeft)}d {bnNum(hoursLeft)}h বাকি
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bento-hero-actions v12-hero-3d-cluster v13-hero-orbital-showcase">
          <div className="v13-hero-orbital-meta">
            <span className="v13-orbital-kicker">আজকের অগ্রগতি</span>
            <strong>{formatHM(todaySec)}</strong>
            <small>লক্ষ্য {formatHM(targetSec)}</small>
            <span className="v33-hero-rail" aria-hidden="true">
              <i style={{ width: `${Math.max(3, Math.min(100, progress))}%` }} />
            </span>
          </div>

          <SentryChronoCore3D
            progressPct={progress}
            isLive={Boolean(timer && timer.status === 'running')}
            size={150}
            label="লক্ষ্য সম্পন্ন"
            sublabel={formatHM(todaySec)}
            onClick={() => navigate('insights')}
          />

          <button type="button" className="bento-focus-cta v13-magnetic-cta" onClick={() => navigate('focus')}>
            <Play size={16} fill="currentColor" />
            <span>{timer ? 'সেশনে ফিরুন' : 'ফোকাস শুরু'}</span>
            <ArrowUpRight size={15} />
          </button>
        </div>
      </SpatialTiltCard>

      {/* 2. High-UI/UX 3D Spatial Bento Navigation Summary Grid */}
      <div className="bento-nav-grid v12-bento-3d-grid" aria-label="All Navigation Summaries">
        {/* BENTO 1: FOCUS SESSION (Span 6) */}
        <SpatialTiltCard
          maxTilt={5.5}
          delayIndex={1}
          className="bento-card span-6 tone-amber"
          role="button"
          tabIndex={0}
          onClick={() => navigate('focus')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('focus')}
        >
          <header className="bento-card-head">
            <span className="bento-icon-box amber">
              <Timer size={18} />
            </span>
            <div className="bento-title-group">
              <h3>Focus Session</h3>
              <small>পমোডোরো ও স্টপওয়াচ</small>
            </div>
            <span className={`bento-live-pill ${timer ? 'live' : ''}`}>
              <i />
              {timer
                ? isAlarm
                  ? `ওভারটাইম ${displayTime}`
                  : `${displayTime}`
                : `${bnNum(todaySessionsCount)} সেশন`}
            </span>
            <ArrowUpRight size={16} className="bento-go-arrow" />
          </header>

          <div className="bento-focus-body">
            <div className="bento-big-stat">
              <strong>{formatHM(todaySec)}</strong>
              <span>আজকের মোট ফোকাস · লক্ষ্যের {bnNum(progress)}%</span>
            </div>

            <div className="bento-meter-track">
              <i style={{ width: `${Math.max(todaySec > 0 ? 4 : 0, progress)}%` }} />
            </div>

            <div className="bento-subject-mini-row">
              {todaySubjects.length > 0 ? (
                todaySubjects.slice(0, 4).map((s) => (
                  <span key={s.id} className="bento-subj-pill">
                    <b style={{ color: s.color || 'var(--accent)' }}>
                      <PreviewSubjectIcon subject={s} size={13} />
                    </b>
                    {bnSubject(s.name)} · {bnNum(Math.max(1, Math.round(s.seconds / 60)))}m
                  </span>
                ))
              ) : (
                <span className="bento-muted-hint">আজ এখনো কোনো সেশন রেকর্ড হয়নি</span>
              )}
            </div>
          </div>
        </SpatialTiltCard>

        {/* BENTO 2: INSIGHTS & RANKS WITH LIVE CURVED SPARKLINE (Span 6) */}
        <SpatialTiltCard
          maxTilt={5.5}
          delayIndex={2}
          className="bento-card span-6 tone-violet"
          role="button"
          tabIndex={0}
          onClick={() => navigate('insights')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('insights')}
        >
          <header className="bento-card-head">
            <span className="bento-icon-box violet">
              <ChartNoAxesCombined size={18} />
            </span>
            <div className="bento-title-group">
              <h3>Insights & Ranks</h3>
              <small>৭ দিনের পারফরম্যান্স কার্ভ</small>
            </div>
            <span className="bento-metric-pill">{formatHM(weekSec)}</span>
            <ArrowUpRight size={16} className="bento-go-arrow" />
          </header>

          <div className="bento-sparkline-box">
            <svg viewBox="0 0 220 58" className="bento-spark-svg" aria-hidden="true">
              <defs>
                <linearGradient id="homeSparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent, #fbbf24)" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="var(--accent, #fbbf24)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="homeSparkStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="color-mix(in srgb, var(--accent, #f59e0b) 68%, #000)" />
                  <stop offset="100%" stopColor="color-mix(in srgb, var(--accent, #fbbf24) 80%, #fff)" />
                </linearGradient>
              </defs>
              <path d={sparkArea} fill="url(#homeSparkGrad)" />
              <path
                d={sparkLine}
                fill="none"
                stroke="url(#homeSparkStroke)"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              {sparkCoords.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={idx === 6 ? 3.8 : 2.5}
                  fill={idx === 6 ? '#ffffff' : '#0d1018'}
                  stroke="var(--accent, #fbbf24)"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>

          <div className="bento-xp-strip">
            <span>
              Tier {String(rank?.tier || 1).padStart(2, '0')} · <b>{rankInfo.bnTitle}</b>
            </span>
            <div className="bento-xp-mini-bar">
              <i style={{ width: `${Math.round(xpPercent || 0)}%` }} />
            </div>
            <strong>{bnNum(Math.round(xpPercent || 0))}%</strong>
          </div>
        </SpatialTiltCard>

        {/* BENTO 3: TASKS & KANBAN BOARD (Span 4) */}
        <SpatialTiltCard
          maxTilt={6}
          delayIndex={3}
          className="bento-card span-4 tone-sky"
          role="button"
          tabIndex={0}
          onClick={() => navigate('todo')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('todo')}
        >
          <header className="bento-card-head">
            <span className="bento-icon-box sky">
              <ListTodo size={18} />
            </span>
            <div className="bento-title-group">
              <h3>Tasks & Board</h3>
              <small>কানবান ও টাইমলাইন</small>
            </div>
            <ArrowUpRight size={16} className="bento-go-arrow" />
          </header>

          <div className="bento-kanban-pills">
            <div className="bk-stat">
              <span>করতে হবে</span>
              <strong>{bnNum(todoCount)}</strong>
            </div>
            <div className="bk-stat doing">
              <span>চলমান</span>
              <strong>{bnNum(doingCount)}</strong>
            </div>
            <div className="bk-stat done">
              <span>সম্পন্ন</span>
              <strong>{bnNum(doneCount)}</strong>
            </div>
          </div>

          <div className="bento-segmented-bar" aria-hidden="true">
            <i className="seg-done" style={{ width: `${(doneCount / totalBoardTasks) * 100}%` }} />
            <i className="seg-doing" style={{ width: `${(doingCount / totalBoardTasks) * 100}%` }} />
          </div>

          <div className="bento-next-item">
            {nextTask ? (
              <>
                {nextTaskSlot && (
                  <span
                    className="bento-slot-tag"
                    style={{ '--slot-tone': nextTaskSlot.tone }}
                  >
                    {nextTaskSlot.bnLabel}
                  </span>
                )}
                <strong title={bnTask(nextTask.title, state.isDemo)}>
                  {bnTask(nextTask.title, state.isDemo)}
                </strong>
              </>
            ) : (
              <span className="bento-muted-hint">নতুন টাস্ক যুক্ত করতে ক্লিক করুন</span>
            )}
          </div>
        </SpatialTiltCard>

        {/* BENTO 4: WEEKLY ROUTINE — 4 PRE-MADE SLOTS (Span 4) */}
        <SpatialTiltCard
          maxTilt={6}
          delayIndex={4}
          className="bento-card span-4 tone-orange"
          role="button"
          tabIndex={0}
          onClick={() => navigate('suite', 'routine')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('suite', 'routine')}
        >
          <header className="bento-card-head">
            <span className="bento-icon-box orange">
              <CalendarDays size={18} />
            </span>
            <div className="bento-title-group">
              <h3>Weekly Routine</h3>
              <small>
                {bnDay(todayName)} · {bnNum(routineSlotsWithData.length)} প্রহর
              </small>
            </div>
            <span className="bento-metric-pill">
              {bnNum(routineCount)}/{bnNum(routineSlotsWithData.length)}
            </span>
            <ArrowUpRight size={16} className="bento-go-arrow" />
          </header>

          <div className="bento-routine-slots">
            {routineSlotsWithData.map(({ key, label, tone, Icon, active }) => (
              <div
                key={key}
                className={`bento-slot-tile ${active ? 'active' : ''}`}
                data-slot={key}
                style={{ '--slot-tone': tone }}
              >
                <Icon size={14} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="bento-next-item">
            {featuredRoutine ? (
              <>
                <span className="bento-slot-tag" style={{ '--slot-tone': featuredRoutine.tone }}>
                  {featuredRoutine.label}
                </span>
                <strong title={featuredRoutine.text}>{featuredRoutine.text}</strong>
              </>
            ) : (
              <span className="bento-muted-hint">আজকের ৪ প্রহরের রুটিন সাজান</span>
            )}
          </div>
        </SpatialTiltCard>

        {/* BENTO 5: SPRINT PLANNER — YELLOW + BLUE GLOW (Span 4) */}
        <SpatialTiltCard
          maxTilt={6}
          delayIndex={5}
          className="bento-card span-4 tone-sprint-yb"
          role="button"
          tabIndex={0}
          onClick={() => navigate('motivation', 'sprint')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('motivation', 'sprint')}
        >
          <header className="bento-card-head">
            <span className="bento-icon-box sprint-yb">
              <Rocket size={18} />
            </span>
            <div className="bento-title-group">
              <h3>Sprint Planner</h3>
              <small>
                {sprint ? bnSample(sprint.name, state.isDemo) : 'ক্লাস ও অনুশীলন স্প্রিন্ট'}
              </small>
            </div>
            <ArrowUpRight size={16} className="bento-go-arrow" />
          </header>

          <div className="bento-sprint-bars">
            <div className="bs-row">
              <div className="bs-label">
                <span>ক্লাস</span>
                <b className="txt-blue">
                  {bnNum(doneClasses)}/{bnNum(sprintClasses.length)}
                </b>
              </div>
              <div className="bs-track">
                <i className="fill-blue" style={{ width: `${classPct}%` }} />
              </div>
            </div>

            <div className="bs-row">
              <div className="bs-label">
                <span>অনুশীলন ধাপ</span>
                <b className="txt-yellow">
                  {bnNum(doneSteps)}/{bnNum(sprintTasks.length)}
                </b>
              </div>
              <div className="bs-track">
                <i className="fill-yellow" style={{ width: `${stepPct}%` }} />
              </div>
            </div>
          </div>

          <div className="bento-next-item">
            <span className="bento-muted-hint">
              {sprint && remaining !== null && remaining > 0
                ? `সময় বাকি: ${bnNum(daysLeft)} দিন ${bnNum(hoursLeft)} ঘণ্টা`
                : 'নতুন স্প্রিন্ট পরিকল্পনা খুলুন'}
            </span>
          </div>
        </SpatialTiltCard>

        {/* BENTO 6: DAILY TRACKER — 7 SUBJECT MATRIX (Span 4) */}
        <SpatialTiltCard
          maxTilt={5.5}
          delayIndex={6}
          className="bento-card span-4 tone-sky"
          role="button"
          tabIndex={0}
          onClick={() => navigate('tracker')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('tracker')}
        >
          <header className="bento-card-head">
            <span className="bento-icon-box sky">
              <CalendarCheck2 size={18} />
            </span>
            <div className="bento-title-group">
              <h3>Daily Tracker</h3>
              <small>৭ বিষয় ম্যাট্রিক্স</small>
            </div>
            <span className="bento-metric-pill">
              {bnNum(trackerDone)}/{bnNum(trackerTotal)}
            </span>
            <ArrowUpRight size={16} className="bento-go-arrow" />
          </header>

          <div className="bento-tracker-matrix">
            {trackerMatrix.map((sub) => (
              <div className="btm-col" key={sub.id}>
                <span>{sub.short}</span>
                <div className="btm-dots">
                  {sub.dots.map((ok, idx) => (
                    <i key={idx} className={ok ? 'done' : ''} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SpatialTiltCard>

        {/* BENTO 7: STUDENT SUITE — SYLLABUS & EXAMS (Span 4) */}
        <SpatialTiltCard
          maxTilt={5.5}
          delayIndex={7}
          className="bento-card span-4 tone-purple"
          role="button"
          tabIndex={0}
          onClick={() => navigate('suite', nextExam ? 'exams' : 'syllabus')}
          onKeyDown={(e) =>
            e.key === 'Enter' && navigate('suite', nextExam ? 'exams' : 'syllabus')
          }
        >
          <header className="bento-card-head">
            <span className="bento-icon-box violet">
              <GraduationCap size={18} />
            </span>
            <div className="bento-title-group">
              <h3>Student Suite</h3>
              <small>সিলেবাস ও পরীক্ষা · {bnNum(chapters.length)} অধ্যায়</small>
            </div>
            <span className="bento-metric-pill">{bnNum(syllabusPct)}%</span>
            <ArrowUpRight size={16} className="bento-go-arrow" />
          </header>

          <div className="bento-suite-split v29-suite-compact">
            <div className="bento-syllabus-box">
              <div className="bs-label">
                <span>সিলেবাস অগ্রগতি</span>
                <b>{bnNum(syllabusPct)}%</b>
              </div>
              <div className="bento-meter-track violet">
                <i style={{ width: `${syllabusPct}%` }} />
              </div>
            </div>

            <div
              className="bento-exam-tile"
              onClick={(e) => {
                e.stopPropagation();
                navigate('suite', 'exams');
              }}
            >
              <Target size={16} className="clean-head-icon" />
              {nextExam ? (
                <div>
                  <strong>{bnSample(nextExam.title, state.isDemo)}</strong>
                  <small>
                    {examDays === 0
                      ? 'আজ পরীক্ষা'
                      : `${bnNum(Math.max(0, examDays || 0))} দিন বাকি · ${bnDate(
                          dateFromKey(nextExam.dateKey),
                          { day: 'numeric', month: 'short' }
                        )}`}
                  </small>
                </div>
              ) : (
                <div>
                  <strong>পরীক্ষা ট্র্যাকার</strong>
                  <small>পরবর্তী পরীক্ষা যোগ করুন</small>
                </div>
              )}
            </div>
          </div>
        </SpatialTiltCard>

        {/* BENTO 8: STUDY CIRCLE — HSC 28 LIVE ROOM & LEADERBOARD (Span 4) */}
        <SpatialTiltCard
          maxTilt={5.5}
          delayIndex={8}
          className="bento-card span-4 tone-emerald v29-circle-bento"
          role="button"
          tabIndex={0}
          onClick={() => navigate('circle')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('circle')}
        >
          <header className="bento-card-head">
            <span className="bento-icon-box v29-emerald-ico">
              <UsersRound size={18} />
            </span>
            <div className="bento-title-group">
              <h3>Study Lounge</h3>
              <small>এইচএসসি 28 · লাইভ ও লিডারবোর্ড</small>
            </div>
            <span className="bento-live-pill live">
              <i /> Live
            </span>
            <ArrowUpRight size={16} className="bento-go-arrow" />
          </header>

          <div className="v29-circle-bento-body">
            <div className="v29-circle-mini-pills">
              <span className="v29-cb-chip gold">
                <Trophy size={13} /> লিডারবোর্ড
              </span>
              <span className="v29-cb-chip sky">
                <Sparkles size={13} /> ডেইলি কোয়েস্ট
              </span>
            </div>
            <div className="bento-next-item">
              <span className="bento-muted-hint">
                {timer && timer.status === 'running'
                  ? `আপনি এখন লাইভ ফোকাসে আছেন · ${formatHM(todaySec)}`
                  : `আজকের ফোকাস ${formatHM(todaySec)} · বন্ধুদের লাইভ রুম দেখুন`}
              </span>
            </div>
          </div>
        </SpatialTiltCard>
      </div>

      {/* 3. Quick Control Dock -> Direct Settings Control Panels */}
      <section className="bento-quick-dock" aria-label="Quick Settings Control Panels">
        <div className="bento-dock-label">
          <Settings2 size={15} />
          <span>কুইক কন্ট্রোল প্যানেল</span>
        </div>

        <div className="bento-dock-buttons">
          <button
            type="button"
            className={`bento-sub-action guard ${isGuardRunning ? 'enforcing' : ''}`}
            onClick={() => navigate('settings', 'guard')}
          >
            <span className="bsa-icon blue">
              <ShieldCheck size={17} />
            </span>
            <span className="bsa-copy">
              <strong>Focus Guard</strong>
              <small>
                {isGuardRunning
                  ? 'টাইমার চলমান · গার্ড লক'
                  : 'Brave · SumatraPDF · PotPlayer'}
              </small>
            </span>
            <span className={`hqn-badge ${isGuardRunning ? 'locked' : 'free'}`}>
              {isGuardRunning ? (
                <>
                  <Lock size={11} /> সক্রিয়
                </>
              ) : (
                <>
                  <Unlock size={11} /> Free
                </>
              )}
            </span>
            <ArrowUpRight size={14} className="hqn-arrow" />
          </button>

          <button
            type="button"
            className="bento-sub-action junk"
            onClick={() => navigate('settings', 'junk')}
          >
            <span className="bsa-icon amber">
              <StickyNote size={17} />
            </span>
            <span className="bsa-copy">
              <strong>Junk Note</strong>
              <small>
                {latestNote
                  ? bnSample(latestNote.text, state.isDemo).slice(0, 34)
                  : 'চিন্তা বা দ্রুত নোট সংরক্ষণ'}
              </small>
            </span>
            <span className="hqn-badge">{bnNum(junkNotes.length)}টি</span>
            <ArrowUpRight size={14} className="hqn-arrow" />
          </button>

          <button
            type="button"
            className="bento-sub-action theme"
            onClick={() => navigate('settings', 'general')}
          >
            <span className="bsa-icon violet">
              <Palette size={17} />
            </span>
            <span className="bsa-copy">
              <strong>Settings & Theme</strong>
              <small>{activeTheme.name} · ব্যাকআপ</small>
            </span>
            <ArrowUpRight size={14} className="hqn-arrow" />
          </button>
        </div>
      </section>
    </div>
  );
}

/* small inline glyph so the header needs no extra import */
function LayoutGridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
