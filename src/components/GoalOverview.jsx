import React, { useEffect, useMemo, useState } from 'react';
import { compareSprintItems, sprintItemTitle } from '../utils/sprintSchedule';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  Clock3,
  Layers3,
  MoonStar,
  Pencil,
  Play,
  Plus,
  Rocket,
  Sparkles,
  Sun,
  SunMedium,
  Sunrise,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { deadlineFor } from '../utils/goalAnalytics';
import { dateFromKey } from '../utils/stats';
import { addDays, formatHM, toDateKey } from '../utils/seedData';
import { bnDate, bnNum, bnSample, bnSubject } from '../utils/bangla';
import { getTaskTimeSlots } from './TodoPreviewControls';
import { formatActivityLabel } from '../utils/subjectActivities';
import SprintEditMenu from './SprintEditMenu';
import SprintContextMenu from './SprintContextMenu';

const SLOT_ICON_MAP = {
  dawn: Sunrise,
  morning: Sun,
  afternoon: SunMedium,
  night: MoonStar,
  late_night: Sparkles,
};

const SUBJECT_ACCENTS = {
  Physics: '#f59e0b',
  Chemistry: '#38bdf8',
  Math: '#818cf8',
  'Higher Math': '#818cf8',
  Mathematics: '#818cf8',
  Biology: '#f472b6',
  ICT: '#60a5fa',
  Bangla: '#fbbf24',
  English: '#a78bfa',
};

function getSprintEndMs(sp) {
  if (!sp?.end) return null;
  const ms = new Date(`${sp.end}T${sp.endTime || '23:59'}:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function buildDayDotArray(startKey, endKey, todayKey, allItems = []) {
  const sDate = dateFromKey(startKey || todayKey);
  const eDate = dateFromKey(endKey || todayKey);
  const rawDays = Math.round((eDate.getTime() - sDate.getTime()) / 86400000) + 1;
  const totalDays = Math.max(1, Math.min(366, Number.isFinite(rawDays) ? rawDays : 30));

  const countByDate = new Map();
  for (const it of allItems) {
    if (!it.date) continue;
    countByDate.set(it.date, (countByDate.get(it.date) || 0) + 1);
  }

  const dots = [];
  let passedCount = 0;
  let remainingCount = 0;
  let todayIndex = null;

  for (let i = 0; i < totalDays; i++) {
    const dObj = addDays(sDate, i);
    const key = toDateKey(dObj);
    let status = 'remaining';
    if (key < todayKey) {
      status = 'passed';
      passedCount += 1;
    } else if (key === todayKey) {
      status = 'today';
      todayIndex = i + 1;
    } else {
      status = 'remaining';
      remainingCount += 1;
    }

    dots.push({
      dayNum: i + 1,
      dateKey: key,
      labelDate: bnDate(dObj, { day: 'numeric', month: 'short' }),
      status,
      taskCount: countByDate.get(key) || 0,
    });
  }

  return {
    dots,
    totalDays,
    passedCount,
    remainingCount,
    todayIndex,
  };
}

function SprintDayDotTrackerPanel({ startKey, endKey, todayKey, allItems, titleLabel }) {
  const dotData = useMemo(
    () => buildDayDotArray(startKey, endKey, todayKey, allItems),
    [startKey, endKey, todayKey, allItems]
  );

  return (
    <section className="card v5-dot-tracker-card" aria-label="দিনভিত্তিক ডট ট্র্যাকার">
      <div className="v5-dot-tracker-head">
        {/* Always show a label: an untitled strip of dots reads as a glitch,
            not as a calendar. */}
        <h3 className="v5-dot-tracker-title">
          {titleLabel || 'স্প্রিন্টের দিনগুলো'}
        </h3>

        <div className="v5-dot-kpi-pills">
          <span className="v5-dot-stat">
            মোট <strong>{bnNum(dotData.totalDays)} দিন</strong>
          </span>
          <span className="v5-dot-stat passed">
            <i className="v5-day-dot sample is-passed" aria-hidden="true" />
            অতিক্রান্ত <strong>{bnNum(dotData.passedCount)}</strong>
          </span>
          {dotData.todayIndex && (
            <span className="v5-dot-stat today">
              <i className="v5-day-dot sample is-today" aria-hidden="true" />
              আজ <strong>{bnNum(dotData.todayIndex)}তম দিন</strong>
            </span>
          )}
          <span className="v5-dot-stat remaining">
            <i className="v5-day-dot sample is-remaining" aria-hidden="true" />
            ভবিষ্যৎ <strong>{bnNum(dotData.remainingCount)}</strong>
          </span>
        </div>
      </div>

      {/* ── DAY TIMELINE ─────────────────────────────────────────────────────
          The old strip was a row of 4px dots floating inside a pill with two
          thirds of the width empty — it looked like a loading skeleton, not a
          calendar. It is now a connected timeline: every day is a station on a
          rail, labelled with its number, and grouped by what it is (passed ·
          today · ahead). The rail between stations fills up to today, so the
          sprint's elapsed share is legible without reading a single number. */}
      <div className="v5-dot-rail" role="list" aria-label="দিনভিত্তিক অগ্রগতি">
        <div className="v5-dot-rail-line" aria-hidden="true">
          <span
            className="v5-dot-rail-fill"
            style={{
              width: `${
                dotData.totalDays > 1
                  ? Math.min(100, Math.max(0, ((dotData.passedCount + 0.5) / dotData.totalDays) * 100))
                  : 0
              }%`,
            }}
          />
        </div>
        {dotData.dots.map((d) => {
          const stateText =
            d.status === 'passed'
              ? 'অতিক্রান্ত দিন'
              : d.status === 'today'
              ? 'আজ (চলমান দিন)'
              : 'ভবিষ্যৎ দিন';
          const taskNote = d.taskCount > 0 ? ` · ${bnNum(d.taskCount)}টি কাজ` : '';
          return (
            <span
              key={d.dateKey}
              role="listitem"
              className={`v5-day-station is-${d.status}`}
              title={`দিন ${bnNum(d.dayNum)} (${d.labelDate}) — ${stateText}${taskNote}`}
              aria-label={`দিন ${bnNum(d.dayNum)}: ${stateText}`}
            >
              <b className="v5-station-node">
                {d.status === 'today' && <i className="v5-today-dot-ring" aria-hidden="true" />}
                {d.status === 'passed' ? <Check size={10} strokeWidth={3} /> : bnNum(d.dayNum)}
              </b>
              {d.taskCount > 0 && <em className="v5-station-task" aria-hidden="true" />}
            </span>
          );
        })}
      </div>

    </section>
  );
}

export default function GoalOverview({ onOpenSprint, onEditSprint }) {
  const {
    state,
    now,
    todayKey,
    todaySec,
    goalTodaySec,
    timer,
    prepareFocus,
    openModal,
    commit,
    toast,
    phaseMode,
    phaseSnapshot,
  } = useStudy();

  const activeSlots = useMemo(() => getTaskTimeSlots(phaseMode), [phaseMode]);
  const phaseKey = (item) =>
    item.phaseId === 'noon' ? 'afternoon' : item.phaseId || activeSlots[0]?.id || 'dawn';
  const currentSlotId = useMemo(() => {
    const curPid = phaseSnapshot?.currentPhaseId;
    if (!curPid) return activeSlots[0]?.id || 'dawn';
    const mapped = curPid === 'noon' ? 'afternoon' : curPid;
    return activeSlots.some((s) => s.id === mapped) ? mapped : activeSlots[0]?.id || 'dawn';
  }, [phaseSnapshot?.currentPhaseId, activeSlots]);
  const [selectedPhase, setSelectedPhase] = useState(currentSlotId);

  // Right-click menu on a sprint tab (same amber menu as the planner).
  const [ctxMenu, setCtxMenu] = useState(null);

  useEffect(() => {
    if (!activeSlots.some((s) => s.id === selectedPhase)) {
      setSelectedPhase(activeSlots[0]?.id || 'dawn');
    }
  }, [activeSlots, selectedPhase]);
  const sprintData =
    state.sprintData && Array.isArray(state.sprintData.sprints)
      ? state.sprintData
      : { sprints: [], selectedSprintId: null };
  const sprints = sprintData.sprints;
  const sprint =
    sprints.find((s) => s.id === sprintData.selectedSprintId) || sprints.at(-1) || null;
  const commitment = state.commitment || {};

  // Live Sprint Analytics
  const analytics = useMemo(() => {
    if (!sprint) return null;
    const classes = (sprint.classes || []).map((c) => ({
      ...c,
      _itemType: 'class',
      title: c.title || `Class ${c.index || 1}`,
    }));
    const tasks = (sprint.tasks || []).map((t) => ({
      ...t,
      _itemType: 'task',
      title: t.title || t.name || t.kind || 'Practice Step',
    }));
    const allItems = [...classes, ...tasks];
    const doneCount = allItems.filter((x) => x.done).length;
    const totalCount = allItems.length;
    const overallPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

    const endMs = getSprintEndMs(sprint);
    const remSec = endMs ? Math.max(0, Math.floor((endMs - now) / 1000)) : 0;
    const daysLeft = Math.floor(remSec / 86400);
    const hoursLeft = Math.floor((remSec % 86400) / 3600);
    const minsLeft = Math.floor((remSec % 3600) / 60);

    const todayPlan = allItems.filter(it=>it.date===todayKey).sort(compareSprintItems);

    const upcomingPlan = allItems
      .filter((it) => !it.done && it.date && it.date > todayKey)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 4);

    const subjectMap = new Map();
    for (const it of allItems) {
      const sub = it.subject || 'General';
      if (!subjectMap.has(sub)) {
        subjectMap.set(sub, {
          subject: sub,
          total: 0,
          done: 0,
          classesTotal: 0,
          classesDone: 0,
          tasksTotal: 0,
          tasksDone: 0,
          plannedMin: 0,
          doneMin: 0,
        });
      }
      const row = subjectMap.get(sub);
      const mins = Math.max(15, Number(it.duration) || 45);
      row.total += 1;
      row.plannedMin += mins;
      if (it.done) {
        row.done += 1;
        row.doneMin += mins;
      }
      if (it._itemType === 'class') {
        row.classesTotal += 1;
        if (it.done) row.classesDone += 1;
      } else {
        row.tasksTotal += 1;
        if (it.done) row.tasksDone += 1;
      }
    }

    const subjectRows = Array.from(subjectMap.values()).map((r) => ({
      ...r,
      pct: r.total ? Math.round((r.done / r.total) * 100) : 0,
      color:
        state.subjects?.find((s) => s.name.toLowerCase() === r.subject.toLowerCase())?.color ||
        SUBJECT_ACCENTS[r.subject] ||
        '#f59e0b',
    }));

    const startKey = sprint.start || todayKey;
    const endKey = sprint.end || todayKey;
    const loggedSprintSec = (state.sessions || [])
      .filter((s) => s.dateKey >= startKey && s.dateKey <= endKey)
      .reduce((acc, s) => acc + (Number(s.durationSec) || 0), 0);

    const plannedTotalSec =
      allItems.reduce((acc, it) => acc + Math.max(15, Number(it.duration) || 45), 0) * 60;

    return {
      classes,
      tasks,
      allItems,
      doneCount,
      totalCount,
      overallPct,
      remSec,
      daysLeft,
      hoursLeft,
      minsLeft,
      todayPlan,
      upcomingPlan,
      subjectRows,
      loggedSprintSec,
      plannedTotalSec,
      startKey,
      endKey,
    };
  }, [sprint, now, todayKey, state.sessions, state.subjects]);

  const handleStartSprintItem = (item) => {
    if (!sprint || item.done) return;
    if (timer) {
      toast('চলমান ফোকাস সেশন শেষ করে নতুন কাজ শুরু করুন।');
      return;
    }
    const isClass = item._itemType === 'class';
    prepareFocus({
      source: isClass ? 'sprint-class' : 'sprint-task',
      sprintId: sprint.id,
      ...(isClass ? { classId: item.id } : { sprintTaskId: item.id }),
      subjectName: item.subject,
      activityType: isClass
        ? 'recorded'
        : item.step === 0
        ? 'sheet'
        : item.step === 1
        ? 'bank'
        : item.step === 3 ? 'revision' : 'practice',
      phaseId:item.phaseId==='afternoon'?'noon':item.phaseId,
      cycle: item.cycle || '',
      chapter: item.chapter || '',
      className: isClass ? item.title : item.fromClass || '',
      workLabel: sprintItemTitle(item,isClass),
      title: item.title,
      videoPosition: item.videoPosition || '',
      questionTarget: item.questionTarget || '',
      requiredMinutes: Math.max(1, Number(item.duration) || 45),
      minutes: Math.max(1, Number(item.duration) || 45),
    });
  };

  const selectSprint = (sprintId) => {
    commit((prev) => ({
      ...prev,
      sprintData: {
        ...(prev.sprintData || { sprints: [] }),
        selectedSprintId: sprintId,
      },
    }));
  };

  // EMPTY SPRINT STATE: Still displays Commitment / 30-Day Preview Dot Tracker + Sprint Setup CTA
  if (!sprint) {
    const fallbackDeadline = commitment.active ? deadlineFor(commitment) : null;
    const fbRem = fallbackDeadline
      ? Math.max(0, Math.floor((fallbackDeadline.getTime() - now) / 1000))
      : 0;
    const previewStart =
      commitment.startDateKey || toDateKey(addDays(dateFromKey(todayKey), -7));
    const previewEnd =
      commitment.deadlineDateKey || toDateKey(addDays(dateFromKey(todayKey), 22));

    return (
      <div className="v4-overview-deck">
        <SprintDayDotTrackerPanel
          startKey={previewStart}
          endKey={previewEnd}
          todayKey={todayKey}
          allItems={[]}
          titleLabel={commitment.active && commitment.title ? commitment.title : ''}
        />

        <section className="card v4-ov-empty-hero">
          <h2>আপনার স্প্রিন্ট প্রজেক্ট সেটআপ করুন</h2>
          <p>
            স্প্রিন্ট প্ল্যানারে ক্লাস ও ডেডলাইন যুক্ত করলে উপরের ডট ট্র্যাকারটি আপনার প্রজেক্টের মোট দিনসংখ্যার সাথে সিঙ্ক হবে এবং আজ কী পড়তে হবে তা এখানে দেখাবে।
          </p>
          <div className="v4-ov-empty-actions">
            <button type="button" className="action-btn primary" onClick={onOpenSprint}>
              <Rocket size={16} /> স্প্রিন্ট প্ল্যানার শুরু করুন
            </button>
            <button type="button" className="action-btn" onClick={() => openModal('goal')}>
              <Target size={15} /> দৈনিক লক্ষ্য নির্ধারণ
            </button>
          </div>

          {commitment.active && (
            <div className="v4-ov-fallback-strip">
              <span>চলমান লক্ষ্য: <strong>{commitment.title || 'স্টাডি গোল'}</strong></span>
              <span>বাকি: <strong>{bnNum(Math.floor(fbRem / 86400))} দিন</strong></span>
              <span>আজ ফোকাস: <strong>{formatHM(goalTodaySec)}</strong></span>
            </div>
          )}
        </section>
      </div>
    );
  }

  const {
    classes,
    tasks,
    allItems,
    doneCount,
    totalCount,
    overallPct,
    remSec,
    daysLeft,
    hoursLeft,
    minsLeft,
    todayPlan,
    upcomingPlan,
    subjectRows,
    loggedSprintSec,
    plannedTotalSec,
    startKey,
    endKey,
  } = analytics;

  const visiblePlan=todayPlan.filter(item=>phaseKey(item)===selectedPhase);
  const todayDone = visiblePlan.filter((x) => x.done).length;
  const overdueCount = allItems.filter((x) => !x.done && x.date && x.date < todayKey).length;

  return (
    <div className="v4-overview-deck">
      {/* 1. EXECUTIVE DARK-GLASS SPRINT PROJECT HERO & LIVE COUNTDOWN */}
      <section className="card v4-ov-hero-card v57-overview-card">
        <header className="v28-ov-sprint-banner v57-sprint-hero" aria-label="সক্রিয় স্প্রিন্ট প্রজেক্ট">
          <div className="v28-ov-sprint-main">
            <div className="v28-ov-sprint-emblem" aria-hidden="true">
              <Rocket size={22} />
            </div>

            <div className="v28-ov-sprint-copy v57-sprint-copy">
              <div className="v57-project-title-row">
                <h2 className="v28-ov-sprint-title v57-project-title">
                  {bnSample(sprint.name, state.isDemo) || 'স্টাডি স্প্রিন্ট প্রজেক্ট'}
                </h2>
                <div className="v28-ov-sprint-kicker-row v57-project-meta">
                  <span className="v28-ov-live-badge">
                    <i /> সক্রিয় স্প্রিন্ট প্রজেক্ট
                  </span>
                  <span className="v28-ov-stat-chip">
                    {bnNum(overallPct)}% সম্পন্ন · {bnNum(subjectRows.length)}টি বিষয়
                  </span>
                  {remSec > 0 && (
                    <span className="v28-ov-stat-chip sky">
                      <Clock3 size={12} /> {bnNum(daysLeft)} দিন বাকি
                    </span>
                  )}
                </div>
              </div>

              <div className="v28-ov-sprint-dates">
                <span>
                  <CalendarDays size={13} />
                  {sprint.start
                    ? bnDate(dateFromKey(sprint.start), { day: 'numeric', month: 'short' })
                    : 'শুরু'}{' '}
                  →{' '}
                  {sprint.end
                    ? bnDate(dateFromKey(sprint.end), {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'নির্ধারিত নয়'}
                </span>
                <span>·</span>
                <span>
                  মোট {bnNum(classes.length)}টি ক্লাস ও {bnNum(tasks.length)}টি অনুশীলন ধাপ
                </span>
              </div>

              <span className="v33-ov-sprint-rail" aria-hidden="true">
                <i style={{ width: `${Math.max(2, Math.min(100, overallPct))}%` }} />
              </span>
            </div>
          </div>

          <div className="v28-ov-sprint-actions">
            <button
              type="button"
              className="v28-ov-planner-cta"
              onClick={onOpenSprint}
            >
              <Rocket size={14} />
              <span>স্প্রিন্ট প্ল্যানার</span>
              <ArrowUpRight size={14} />
            </button>
            <SprintEditMenu
              sprint={sprint}
              align="right"
              label="স্প্রিন্ট প্রজেক্ট সম্পাদনা"
              onNavigateToPlanner={onOpenSprint}
            />
          </div>
        </header>

        {/* Sprint switcher — same segmented control as every other tab row in
            the product, so the Overview no longer invents its own pill style
            for what is, functionally, the same widget. */}
        {sprints.length > 0 && (
          <div className="v33-seg v33-seg--wrap v57-project-selector" role="tablist" aria-label="সকল স্প্রিন্ট প্রজেক্ট">
            <span className="v33-seg-lead">প্রজেক্ট</span>
            {sprints.map((sp) => {
              const isCurrent = sp.id === sprint.id;
              return (
                <button
                  key={sp.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  className={`v33-seg-tab v57-project-tab ${isCurrent ? 'is-active' : ''}`}
                  onClick={() => selectSprint(sp.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCtxMenu({ sprint: sp, x: e.clientX, y: e.clientY });
                  }}
                  title="এডিট করতে ডান-ক্লিক করুন"
                >
                  <Rocket size={14} className="v57-project-tab-icon" aria-hidden="true" />
                  <span>{bnSample(sp.name, state.isDemo)}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="v29-ov-telemetry-layout">
          {/* A. Sculpted Countdown & Overall Progress Card */}
          <div className="v29-ov-countdown-box v57-countdown-box">
            <div className="v29-ov-box-head v57-countdown-head">
              <span className="v29-ov-kicker">
                <Clock3 size={13.5} /> ডেডলাইন কাউন্টডাউন
              </span>
              <small>রাত ১২:০০ পর্যন্ত</small>
            </div>

            {remSec === 0 ? (
              <div className="v29-ov-expired-pill">নির্ধারিত সময়সীমা সম্পন্ন হয়েছে</div>
            ) : (
              <div className="v29-ov-time-tiles v57-countdown-tiles">
                <div className="v29-ov-time-tile gold v57-countdown-tile">
                  <strong className="v57-countdown-value">{bnNum(daysLeft)}</strong>
                  <span>দিন</span>
                </div>
                <div className="v29-ov-time-tile sky v57-countdown-tile">
                  <strong className="v57-countdown-value">{bnNum(String(hoursLeft).padStart(2, '0'))}</strong>
                  <span>ঘণ্টা</span>
                </div>
                <div className="v29-ov-time-tile violet v57-countdown-tile">
                  <strong className="v57-countdown-value">{bnNum(String(minsLeft).padStart(2, '0'))}</strong>
                  <span>মিনিট</span>
                </div>
              </div>
            )}

            <div className="v29-ov-master-bar v57-step-progress">
              <div className="v29-ov-mb-top v57-step-progress-head">
                <span>সামগ্রিক ধাপ অগ্রগতি</span>
                <strong>
                  {bnNum(doneCount)} <i>/</i> {bnNum(totalCount)} <small>ধাপ</small>
                </strong>
              </div>
              <div
                className="v57-step-segments"
                role="img"
                aria-label={`${bnNum(doneCount)} / ${bnNum(totalCount)} ধাপ সম্পন্ন · ${bnNum(overallPct)} শতাংশ`}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <span
                    key={i}
                    className={i < Math.ceil((overallPct / 100) * 12) && overallPct > 0 ? 'is-complete' : ''}
                  />
                ))}
              </div>
              <div className="v57-step-progress-foot">
                <span>{bnNum(overallPct)}% সম্পন্ন</span>
                <span>{bnNum(Math.max(0, totalCount - doneCount))} ধাপ বাকি</span>
              </div>
            </div>
          </div>

          {/* B. Center Luminous Curved Progress Ring */}
          <div className="v29-ov-ring-showcase v57-radial-showcase">
            <div
              className="v29-ov-ring-wrap v57-radial-wrap"
              role="img"
              aria-label={`${bnNum(overallPct)} শতাংশ সামগ্রিক অগ্রগতি`}
            >
              <svg viewBox="0 0 120 120" className="v29-ov-ring-svg v57-radial-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="v57OvDonutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--vd-accent, #FBBF24)" />
                    <stop offset="52%" stopColor="#ead9b9" />
                    <stop offset="100%" stopColor="var(--vd-accent-2, #38BDF8)" />
                  </linearGradient>
                  <filter id="v57OvDonutGlow" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <circle cx="60" cy="60" r="50" className="v29-ov-ring-track v57-radial-track" />
                {Array.from({ length: 40 }, (_, i) => {
                  const angle = (i / 40) * Math.PI * 2 - Math.PI / 2;
                  const inner = i % 5 === 0 ? 54 : 56.5;
                  const outer = 59;
                  return (
                    <line
                      key={`tick-${i}`}
                      x1={60 + Math.cos(angle) * inner}
                      y1={60 + Math.sin(angle) * inner}
                      x2={60 + Math.cos(angle) * outer}
                      y2={60 + Math.sin(angle) * outer}
                      className={`v57-radial-tick ${i % 5 === 0 ? 'major' : ''}`}
                    />
                  );
                })}
                <circle
                  cx="60"
                  cy="60"
                  r="41"
                  fill="none"
                  className="v57-radial-inner-ring"
                />
                {overallPct > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    className="v29-ov-ring-fill v57-radial-fill"
                    stroke="url(#v57OvDonutGrad)"
                    pathLength="100"
                    strokeDasharray="100"
                    strokeDashoffset={100 - overallPct}
                    filter={`url(#v57OvDonutGlow)`}
                  />
                )}
                <circle cx="60" cy="60" r="32" className="v57-radial-core" />
              </svg>
              <div className="v29-ov-ring-center v57-radial-center">
                <strong>
                  {bnNum(overallPct)}
                  <em>%</em>
                </strong>
                <span>ধাপ সম্পন্ন</span>
              </div>
            </div>
          </div>

          {/* C. 4 Visual Icon-Accented Telemetry Cards */}
          <div className="v29-ov-kpi-matrix">
            {(() => {
              const cDone = classes.filter((c) => c.done).length;
              const cPct = classes.length ? Math.round((cDone / classes.length) * 100) : 0;
              const tDone = tasks.filter((t) => t.done).length;
              const tPct = tasks.length ? Math.round((tDone / tasks.length) * 100) : 0;
              const timePct = plannedTotalSec
                ? Math.min(100, Math.round((loggedSprintSec / plannedTotalSec) * 100))
                : 0;
              return (
                <>
                  <div className="v29-ov-stat-card gold">
                    <div className="v29-ov-sc-head">
                      <BookOpen size={14} />
                      <span>ক্লাস সম্পন্ন</span>
                    </div>
                    <strong>
                      {bnNum(cDone)} <small>/ {bnNum(classes.length)}</small>
                    </strong>
                    <div className="v29-ov-sc-bar">
                      <i style={{ width: `${cPct}%` }} />
                    </div>
                  </div>

                  <div className="v29-ov-stat-card sky">
                    <div className="v29-ov-sc-head">
                      <Layers3 size={14} />
                      <span>অনুশীলন ও রিভিশন</span>
                    </div>
                    <strong>
                      {bnNum(tDone)} <small>/ {bnNum(tasks.length)}</small>
                    </strong>
                    <div className="v29-ov-sc-bar">
                      <i style={{ width: `${tPct}%` }} />
                    </div>
                  </div>

                  <div className="v29-ov-stat-card emerald">
                    <div className="v29-ov-sc-head">
                      <Sparkles size={14} />
                      <span>আজকের ফোকাস</span>
                    </div>
                    <strong>{formatHM(todaySec)}</strong>
                    <span className="v29-ov-sc-sub">
                      আজকের কাজ: {bnNum(todayPlan.filter((x) => x.done).length)}/
                      {bnNum(todayPlan.length)}
                    </span>
                  </div>

                  <div className="v29-ov-stat-card violet">
                    <div className="v29-ov-sc-head">
                      <Target size={14} />
                      <span>মোট স্প্রিন্ট সময়</span>
                    </div>
                    <strong>{formatHM(loggedSprintSec)}</strong>
                    <div className="v29-ov-sc-bar">
                      <i style={{ width: `${timePct}%` }} />
                    </div>
                    <span className="v29-ov-sc-sub">লক্ষ্য {formatHM(plannedTotalSec)}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      {/* 2. DYNAMIC SPRINT DAY PROGRESS DOT TRACKER GLASS BOX */}
      <SprintDayDotTrackerPanel
        startKey={startKey}
        endKey={endKey}
        todayKey={todayKey}
        allItems={allItems}
        titleLabel=""
      />

      {/* 3. TODAY'S SPRINT ACTION PLAN + SUBJECT PROGRESS MATRIX */}
      <div className="v4-ov-two-col">
        <section className="card v4-ov-today-card">
          <div className="v4-ov-sec-head">
            <div>
              <h3>আজকের নির্ধারিত ক্লাস ও অনুশীলন</h3>
            </div>
            <div className="v4-ov-sec-badges">
              {overdueCount > 0 && (
                <span className="v4-ov-pill warn">
                  <AlertTriangle size={12} /> বকেয়া {bnNum(overdueCount)}টি
                </span>
              )}
              <span className="v4-ov-pill">
                {bnNum(todayDone)} / {bnNum(visiblePlan.length)} সম্পন্ন
              </span>
            </div>
          </div>

          <div
            className="v28-ov-phase-pills"
            style={{ '--ov-phase-cols': activeSlots.length || 4 }}
            role="tablist"
            aria-label="আজকের প্রহর"
          >
            {activeSlots.map((slot) => {
              const Icon = slot.Icon || SLOT_ICON_MAP[slot.id] || Sun;
              const isSelected = selectedPhase === slot.id;
              const count = todayPlan.filter((item) => phaseKey(item) === slot.id).length;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`v28-ov-phase-pill ${isSelected ? 'active' : ''}`}
                  style={{ '--slot-color': slot.tone || '#fbbf24' }}
                  key={slot.id}
                  onClick={() => setSelectedPhase(slot.id)}
                >
                  <span className="v28-ov-phase-ico" aria-hidden="true">
                    <Icon size={14} />
                  </span>
                  <span className="v28-ov-phase-name">{slot.bnLabel}</span>
                  <small>{bnNum(count)}</small>
                </button>
              );
            })}
          </div>
          {visiblePlan.length > 0 ? (
            <div className="v4-ov-task-list">
              {visiblePlan.map((item) => {
                const isOverdue = !item.done && item.date && item.date < todayKey;
                const accent =
                  state.subjects?.find(
                    (s) => s.name.toLowerCase() === String(item.subject || '').toLowerCase()
                  )?.color ||
                  SUBJECT_ACCENTS[item.subject] ||
                  '#f59e0b';

                return (
                  <div
                    key={`${item._itemType}-${item.id}`}
                    className={`v4-ov-task-row ${item.done ? 'is-done' : ''} ${
                      isOverdue ? 'is-overdue' : ''
                    }`}
                  >
                    <span className="v4-ov-task-bar" style={{ background: accent }} />
                    <div className="v4-ov-task-info">
                      <div className="v4-ov-task-tags">
                        <span className="sub-tag" style={{ color: accent }}>
                          {bnSubject(item.subject)}
                        </span>
                        <span className="type-tag">
                          {item._itemType === 'class'
                            ? 'ক্লাস'
                            : item.step === 0
                            ? 'লেকচার শিট রিভিউ'
                            : item.step === 3
                            ? 'রিভিশন'
                            : formatActivityLabel(item.kind || 'Practice')}
                        </span>
                        {isOverdue && <span className="overdue-tag">বকেয়া · {item.date}</span>}
                      </div>
                      <strong>
                        {sprintItemTitle(item,item._itemType==='class')}
                      </strong>
                      <small>
                        নির্ধারিত সময়: {bnNum(Math.max(15, Number(item.duration) || 45))} মিনিট
                        {item.cycle ? ` · ${item.cycle}` : ''}
                      </small>
                    </div>

                    <div className="v4-ov-task-cta">
                      {item.done ? (
                        <span className="v4-ov-done-chip">
                          <CheckCircle2 size={14} /> সম্পন্ন
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="v4-ov-focus-btn"
                          onClick={() => handleStartSprintItem(item)}
                        >
                          <Play size={13} fill="currentColor" /> ফোকাস শুরু
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="v4-ov-all-clear"><CheckCircle2 size={24}/><strong>এই প্রহরে আজ কোনো নির্ধারিত কাজ নেই।</strong></div>
          )}
        </section>

        <section className="card v4-ov-subjects-card">
          <div className="v4-ov-sec-head">
            <div>
              <h3>বিষয়ভিত্তিক অগ্রগতি</h3>
            </div>
            <TrendingUp size={18} className="v4-ov-trend-icon" />
          </div>

          <div className="v4-ov-subject-list">
            {subjectRows.map((row) => (
              <div key={row.subject} className="v4-ov-subject-item">
                <div className="v4-ov-sub-top">
                  <div className="v4-ov-sub-name">
                    <i style={{ background: row.color }} />
                    <strong>{bnSubject(row.subject)}</strong>
                  </div>
                  <span className="v4-ov-sub-pct">{bnNum(row.pct)}%</span>
                </div>
                <div className="v4-ov-sub-track">
                  <span style={{ width: `${row.pct}%`, background: row.color }} />
                </div>
                <div className="v4-ov-sub-meta">
                  <span>
                    <BookOpen size={11} /> ক্লাস {bnNum(row.classesDone)}/{bnNum(row.classesTotal)}
                  </span>
                  <span>
                    <Layers3 size={11} /> অনুশীলন {bnNum(row.tasksDone)}/{bnNum(row.tasksTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="v4-ov-open-planner-full" onClick={onOpenSprint}>
            <Plus size={14} /> স্প্রিন্ট প্ল্যানারে নতুন ক্লাস বা অধ্যায় যোগ করুন
          </button>
        </section>
      </div>

      {/* Right-clicking a sprint tab opens the same amber menu as the planner. */}
      {ctxMenu && (
        <SprintContextMenu
          sprint={ctxMenu.sprint}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          onEdit={() => {
            const target = ctxMenu.sprint;
            setCtxMenu(null);
            selectSprint(target.id);
            onEditSprint?.(target);
          }}
          onOpenPlanner={() => {
            const target = ctxMenu.sprint;
            setCtxMenu(null);
            selectSprint(target.id);
            onOpenSprint?.();
          }}
        />
      )}
    </div>
  );
}
