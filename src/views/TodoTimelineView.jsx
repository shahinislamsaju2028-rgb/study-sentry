import { PreviewSubjectIcon } from '../components/PreviewSubjectIcon';
import { findSubject, subjectName } from '../utils/premadeSubjects';
import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  Clock3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { addDays, toDateKey } from '../utils/seedData';
import { dateFromKey } from '../utils/stats';
import { phaseForInstant } from '../utils/studyPhases';
import TodoTaskEditor from '../components/TodoTaskEditor';
import {
  ALL_TASK_TIME_SLOTS,
  getTaskTimeSlots,
  TODO_CATEGORIES,
  canonicalCategory,
  compareTimelineTasksDawnFirst,
  slotForTask,
  slotMetaById,
} from '../components/TodoPreviewControls';
import { taskDraft } from '../utils/focusDetails';
import { taskHeading } from '../utils/taskHeading';
import {
  sprintTasksForViews,
  mutateSprintProjection,
  projectionPatch,
} from '../utils/sprintProjection';
import { bnCategory, bnDate, bnNum, bnSubject, bnTask } from '../utils/bangla';

const FILTERS = ['All', ...TODO_CATEGORIES];

export default function TodoTimelineView({ embedded = false }) {
  const {
    state,
    now,
    todayKey,
    phaseMode,
    deleteItem,
    openModal,
    toast,
    prepareFocus,
    commit,
  } = useStudy();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [filter, setFilter] = useState('All');
  const [slotFilter, setSlotFilter] = useState('all');
  const [editor, setEditor] = useState(null);

  const effectivePhaseMode =
    phaseMode || state?.profile?.phaseMode || state?.timerPrefs?.phaseMode || 'first4';

  // Detect the currently running study phase in live Dhaka time (mapped to slotId)
  const currentActiveSlotId = useMemo(() => {
    if (selectedDate !== todayKey) return null;
    const pid = phaseForInstant(now || Date.now(), effectivePhaseMode);
    if (!pid) return null;
    return pid === 'noon' ? 'afternoon' : pid;
  }, [selectedDate, todayKey, now, effectivePhaseMode]);

  const studyTasks = useMemo(
    () =>
      [...(state.todos || []), ...sprintTasksForViews(state.sprintData, state.subjects)].filter(
        (task) => canonicalCategory(task.category) && (task.workType || 'Study') !== 'Work'
      ),
    [state.todos, state.sprintData, state.subjects]
  );

  const week = useMemo(() => {
    const center = dateFromKey(selectedDate);
    const sunday = addDays(center, -center.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(sunday, i);
      const key = toDateKey(date);
      const dayTasks = studyTasks.filter(
        (task) =>
          task.dateKey === key || (!task.sprintLink && task.focusDates?.includes(key))
      );
      // A short, colour-coded chip per study phase that has work that day.
      const bySlot = new Map();
      for (const task of dayTasks) {
        const slot = slotForTask(task) || slotMetaById('dawn');
        const tone = slot?.tone || '#f6c969';
        const entry = bySlot.get(slot.id) || {
          id: slot.id,
          label: slot.bnLabel || slot.label || '',
          tone,
          count: 0,
        };
        entry.count += 1;
        bySlot.set(slot.id, entry);
      }
      return { date, key, count: dayTasks.length, slots: [...bySlot.values()] };
    });
  }, [selectedDate, studyTasks]);

  const shiftWeek = (daysDelta) => {
    const next = addDays(dateFromKey(selectedDate), daysDelta);
    setSelectedDate(toDateKey(next));
  };

  const allDayTasksSorted = useMemo(
    () =>
      studyTasks
        .filter(
          (task) =>
            task.dateKey === selectedDate ||
            (!task.sprintLink && task.focusDates?.includes(selectedDate))
        )
        .filter((task) => filter === 'All' || canonicalCategory(task.category) === filter)
        .sort(compareTimelineTasksDawnFirst),
    [studyTasks, selectedDate, filter]
  );

  const activeTimeSlots = useMemo(
    () => getTaskTimeSlots(effectivePhaseMode),
    [effectivePhaseMode]
  );

  const slotCounts = useMemo(() => {
    const map = { dawn: 0, morning: 0, afternoon: 0, night: 0, late_night: 0 };
    for (const t of allDayTasksSorted) {
      const sid = slotForTask(t)?.id || activeTimeSlots[0]?.id || 'dawn';
      if (map[sid] !== undefined) map[sid] += 1;
    }
    return map;
  }, [allDayTasksSorted, activeTimeSlots]);

  const tasksForDay = useMemo(
    () =>
      slotFilter === 'all'
        ? allDayTasksSorted
        : allDayTasksSorted.filter((t) => (slotForTask(t)?.id || 'dawn') === slotFilter),
    [allDayTasksSorted, slotFilter]
  );

  // Group visible tasks chronologically by study phase so the currently running phase
  // receives a full glowing gradient-border highlight box and other phases gently dim!
  const phaseGroups = useMemo(() => {
    if (!tasksForDay.length) return [];
    const bySlot = new Map();
    for (const task of tasksForDay) {
      const sid = slotForTask(task)?.id || activeTimeSlots[0]?.id || 'dawn';
      if (!bySlot.has(sid)) bySlot.set(sid, []);
      bySlot.get(sid).push(task);
    }

    const orderedIds = ALL_TASK_TIME_SLOTS.map((s) => s.id).filter((id) => bySlot.has(id));
    for (const key of bySlot.keys()) {
      if (!orderedIds.includes(key)) orderedIds.push(key);
    }

    return orderedIds.map((sid) => {
      const slot =
        activeTimeSlots.find((s) => s.id === sid) ||
        slotMetaById(sid) ||
        ALL_TASK_TIME_SLOTS[0];
      const items = bySlot.get(sid) || [];
      const doneInGroup = items.filter((t) => t.done).length;
      const isCurrent = Boolean(currentActiveSlotId && sid === currentActiveSlotId);
      const isMuted = Boolean(
        selectedDate === todayKey &&
          slotFilter === 'all' &&
          currentActiveSlotId &&
          !isCurrent
      );
      return {
        sid,
        slot,
        items,
        doneInGroup,
        isCurrent,
        isMuted,
      };
    });
  }, [tasksForDay, activeTimeSlots, currentActiveSlotId, selectedDate, todayKey, slotFilter]);

  const completedCount = allDayTasksSorted.filter((t) => t.done).length;
  const pct = allDayTasksSorted.length
    ? Math.round((completedCount / allDayTasksSorted.length) * 100)
    : 0;

  const remove = (task) =>
    openModal('confirm', {
      title: 'টাস্ক মুছবেন?',
      description: task.sprintLink
        ? 'এটি সংশ্লিষ্ট Sprint থেকেও মুছে যাবে।'
        : `"${bnTask(task.title, state.isDemo)}" মুছে ফেলা হবে।`,
      confirmLabel: 'মুছুন',
      danger: true,
      onConfirm: () => {
        if (task.sprintLink) {
          commit((prev) => mutateSprintProjection(prev, task.sprintLink, {}, true));
        } else {
          deleteItem('todos', task.id);
        }
        toast('টাস্ক মুছে ফেলা হয়েছে।');
      },
    });

  return (
    <div className={`${embedded ? '' : 'view-page '}tl-v3-page`}>
      {/* 7-Day Week Strip Card */}
      <section className="tl-week-glass">
        <div className="tl-week-top">
          <div className="tl42-calendar-heading">
            <span className="tl42-calendar-icon"><CalendarDays size={20} /></span>
            <div><span className="tl42-kicker">সাপ্তাহিক ক্যালেন্ডার</span><h3>{bnDate(dateFromKey(selectedDate), { month: 'long', year: 'numeric' })}</h3>
              <small>{bnDate(week[0].date, { day: 'numeric', month: 'short' })} — {bnDate(week[6].date, { day: 'numeric', month: 'short' })}</small>
            </div>
          </div>

          <div className="tl-week-nav-btns">
            <button
              type="button"
              className="tl-step-btn"
              onClick={() => shiftWeek(-7)}
              aria-label="আগের সপ্তাহ"
            >
              <ChevronLeft size={15} />
            </button>
            {selectedDate !== todayKey && (
              <button
                type="button"
                className="tl-today-pill"
                onClick={() => setSelectedDate(todayKey)}
              >
                আজ
              </button>
            )}
            <button
              type="button"
              className="tl-step-btn"
              onClick={() => shiftWeek(7)}
              aria-label="পরের সপ্তাহ"
            >
              <ChevronRight size={15} />
            </button>
            {!embedded && (
              <button
                type="button"
                className="tasks-v3-create-btn"
                onClick={() =>
                  setEditor({
                    mode: 'create',
                    slotKey: currentActiveSlotId || activeTimeSlots[0]?.id || 'dawn',
                  })
                }
              >
                <Plus size={15} /> নতুন টাস্ক
              </button>
            )}
          </div>
        </div>

        <div className="tl-week-days-grid">
          {week.map((d) => (
            <button
              type="button"
              key={d.key}
              className={`tl-day-btn ${d.key === selectedDate ? 'selected' : ''} ${
                d.key === todayKey ? 'is-today' : ''
              } ${d.count ? 'has-tasks' : 'is-empty'}`}
              onClick={() => setSelectedDate(d.key)}
              aria-pressed={d.key === selectedDate}
              aria-label={`${bnDate(d.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${d.count ? `${bnNum(d.count)}টি টাস্ক` : 'কোনো টাস্ক নেই'}${d.key === todayKey ? ', আজ' : ''}`}
            >
              <span className="tl42-weekday">{bnDate(d.date, { weekday: 'short' })}</span>
              <strong className="tl42-date">{bnNum(d.date.getDate())}</strong>
              {d.count ? (
                <span className="tl42-chip-row">
                  {(d.slots || []).slice(0, 3).map((slot) => (
                    <span
                      key={slot.id}
                      className="tl42-chip"
                      style={{ '--chip-tone': slot.tone }}
                      title={`${slot.label} · ${bnNum(slot.count)} টাস্ক`}
                    >
                      {slot.label} {bnNum(slot.count)}
                    </span>
                  ))}
                  {!d.slots?.length && (
                    <span className="tl42-chip" style={{ '--chip-tone': '#f6c969' }}>
                      {bnNum(d.count)} টাস্ক
                    </span>
                  )}
                </span>
              ) : (
                <span className="tl42-empty-dot" aria-hidden="true" />
              )}
              {d.key === todayKey && <span className="tl42-today-mark">আজ</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Daily Timeline Schedule Card — Active Phase Highlighted in Gradient Border Box */}
      <section className="tl-schedule-glass">
        <div className="v10-tl-stage-strip" role="tablist" aria-label="প্রহর অনুযায়ী টাইমলাইন">
          <button
            type="button"
            role="tab"
            aria-selected={slotFilter === 'all'}
            className={`v10-tl-stage-pill ${slotFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setSlotFilter('all')}
          >
            <span>সব প্রহর</span>
            <b>{bnNum(allDayTasksSorted.length)}</b>
          </button>

          {activeTimeSlots.map((slot) => {
            const SlotIcon = slot.Icon;
            const active = slotFilter === slot.id;
            const isNow = currentActiveSlotId === slot.id;
            return (
              <button
                type="button"
                key={slot.id}
                role="tab"
                aria-selected={active}
                className={`v10-tl-stage-pill ${active ? 'is-active' : ''} ${
                  isNow ? 'is-now-phase' : ''
                }`}
                style={{ '--stage-tone': slot.tone }}
                onClick={() => setSlotFilter(active ? 'all' : slot.id)}
              >
                {isNow && <i className="v29-tl-live-dot" aria-hidden="true" />}
                <SlotIcon size={13.5} style={{ color: slot.tone }} />
                <span>{slot.bnLabel}</span>
                <b>{bnNum(slotCounts[slot.id] || 0)}</b>
              </button>
            );
          })}
        </div>

        <div className="tl-filter-bar">
          <div className="tl-chips-row">
            {FILTERS.map((c) => (
              <button
                type="button"
                key={c}
                className={`tl-filter-pill ${filter === c ? 'active' : ''}`}
                onClick={() => setFilter(c)}
              >
                {bnCategory(c)}
              </button>
            ))}
          </div>

          <div className="tl-progress-inline">
            <strong>
              {bnNum(completedCount)}/{bnNum(allDayTasksSorted.length)} সম্পন্ন
            </strong>
            <div className="tl-prog-track">
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {phaseGroups.length > 0 ? (
          <div className="v29-tl-groups-stack">
            {phaseGroups.map(({ sid, slot, items, doneInGroup, isCurrent, isMuted }) => {
              const GroupIcon = slot.Icon || Clock3;
              return (
                <section
                  key={sid}
                  className={`v29-tl-phase-box ${
                    isCurrent
                      ? 'is-current-phase'
                      : isMuted
                      ? 'is-muted-phase'
                      : 'is-neutral-phase'
                  }`}
                  style={{ '--phase-tone': slot.tone || '#fbbf24' }}
                  aria-label={`${slot.bnLabel} প্রহরের টাস্ক`}
                >
                  <header className="v29-tl-phase-head">
                    <div className="v29-tl-phase-title">
                      <span className="v29-tl-phase-icon" aria-hidden="true">
                        <GroupIcon size={15} />
                      </span>
                      <div>
                        <strong>{slot.bnLabel}</strong>
                        <small>{slot.timeRange}</small>
                      </div>
                    </div>

                    <span className="v29-tl-phase-count">
                      {bnNum(doneInGroup)}/{bnNum(items.length)} সম্পন্ন
                    </span>
                  </header>

                  <div className="tl-rows-stack v29-tl-group-rows">
                    {items.map((task) => {
                      const category = canonicalCategory(task.category) || 'Study';
                      const taskTitle = taskHeading(task, state.subjects, state.isDemo);
                      const subjLabel =
                        task.presetSubject || subjectName(state.subjects, task.subjectId) || '';
                      const iconSubject =
                        findSubject(state.subjects, subjLabel) ||
                        state.subjects.find((s) => s.id === task.subjectId) || {
                          name: subjLabel || 'Study',
                        };
                      const slotMeta = slotForTask(task) || slot;
                      const SlotIcon = slotMeta?.Icon || Clock3;

                      return (
                        <div
                          className={`tl-item-row ${task.done ? 'is-done' : ''} ${
                            isCurrent ? 'is-active-phase-row' : ''
                          }`}
                          key={task.id}
                        >
                          <div className="tl-slot-col">
                            <span
                              className="tl-slot-badge"
                              style={{ '--slot-tone': slotMeta.tone }}
                            >
                              <SlotIcon size={13} /> {slotMeta.bnLabel}
                            </span>
                          </div>

                          <div className="tl-rail-col" aria-hidden="true">
                            <span
                              className={`tl-rail-node ${task.done ? 'done' : ''} ${
                                isCurrent ? 'live-phase' : ''
                              }`}
                            />
                          </div>

                          <article
                            className={`tl-task-card ${
                              isCurrent ? 'v29-tl-card-highlighted' : ''
                            }`}
                          >
                            <div className="tl-task-icon-box" aria-hidden="true">
                              <PreviewSubjectIcon subject={iconSubject} size={19} />
                            </div>

                            <div className="tl-task-body">
                              <div className="tl-task-title-row">
                                <strong>{taskTitle}</strong>
                              </div>
                              <div className="tl-task-tags">
                                {subjLabel && (
                                  <span className="kb-chip kb-subject-tag">
                                    {bnSubject(subjLabel)}
                                  </span>
                                )}
                                <span className="kb-chip sky">{bnCategory(category)}</span>
                                {task.startTime && (
                                  <span className="kb-chip">
                                    <Clock3 size={11} /> {bnNum(task.startTime)}
                                  </span>
                                )}
                                <span className="kb-chip">
                                  {bnNum(
                                    Math.max(1, Number(task.plannedMin || task.durationMin) || 50)
                                  )}
                                  m
                                </span>
                              </div>
                            </div>

                            <div className="tl-task-actions">
                              {task.done ? (
                                <span className="kb-done-tag">
                                  <Check size={13} /> সম্পন্ন
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="kb-focus-btn"
                                  onClick={() => prepareFocus(taskDraft(task))}
                                >
                                  <Play size={12} fill="currentColor" /> Focus
                                </button>
                              )}
                              <button
                                type="button"
                                className="kb-icon-btn"
                                title="সম্পাদনা"
                                aria-label={`Edit ${taskTitle}`}
                                onClick={() => setEditor({ mode: 'edit', task })}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="kb-icon-btn danger"
                                title="মুছুন"
                                aria-label={`Delete ${taskTitle}`}
                                onClick={() => remove(task)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </article>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="tl-empty-state">
            <CalendarDays size={26} />
            <strong>এই তারিখে কোনো টাস্ক নেই</strong>
            <button
              type="button"
              className="tasks-v3-create-btn"
              onClick={() =>
                setEditor({
                  mode: 'create',
                  slotKey:
                    slotFilter !== 'all'
                      ? slotFilter
                      : currentActiveSlotId || activeTimeSlots[0]?.id || 'dawn',
                })
              }
            >
              <Plus size={15} /> নতুন টাস্ক যোগ করুন
            </button>
          </div>
        )}
      </section>

      {editor && (
        <TodoTaskEditor
          task={editor.task}
          initialSlotKey={editor.slotKey || undefined}
          dateKey={selectedDate}
          saveItem={
            editor.task?.sprintLink
              ? (payload) =>
                  commit((prev) =>
                    mutateSprintProjection(
                      prev,
                      editor.task.sprintLink,
                      projectionPatch(payload)
                    )
                  )
              : undefined
          }
          onClose={() => setEditor(null)}
          onSaved={(savedDate) => {
            setSelectedDate(savedDate);
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}
