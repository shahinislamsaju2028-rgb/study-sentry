import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MoonStar,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  SunMedium,
  Sunrise,
  Trash2,
  X,
} from 'lucide-react';
import { ModalShell } from './Modals';
import { BanglaDateInput, BanglaTimeInput } from './BanglaInputs';
import { useStudy } from '../context/StudyContext';
import { addDays, toDateKey, uid } from '../utils/seedData';
import { dateFromKey } from '../utils/stats';
import { bnDate, bnDay, bnNum } from '../utils/bangla';
import { sprintTasksForViews, mutateSprintProjection } from '../utils/sprintProjection';
import { desktopBridge } from '../bridge/desktopBridge';

const BASE_ITEMS = [
  ['dawn', 'fajr', 'ফজরের নামাজ'],
  ['dawn', 'yasin', 'সূরা ইয়াসিন তেলাওয়াত'],
  ['dawn', 'breakfast', 'সকালের নাস্তা'],
  ['dawn', 'class', 'ক্লাস'],
  ['dawn', 'dev1', 'Software Development'],
  ['dawn', 'sheet', 'লেকচার শিট রিভিউ'],
  ['dawn', 'practice', 'প্র্যাকটিস'],
  ['morning', 'class', 'ক্লাস'],
  ['morning', 'sheet', 'লেকচার শিট রিভিউ'],
  ['morning', 'practice', 'প্র্যাকটিস'],
  ['morning', 'meal', 'খাওয়া (ঐচ্ছিক)'],
  ['afternoon', 'dhuhr', 'যোহর নামাজ'],
  ['afternoon', 'meal', 'খাওয়া (ঐচ্ছিক)'],
  ['afternoon', 'dev2', 'Software Development'],
  ['afternoon', 'class', 'ক্লাস'],
  ['afternoon', 'sheet', 'লেকচার শিট রিভিউ'],
  ['afternoon', 'practice', 'প্র্যাকটিস'],
  ['afternoon', 'asr', 'আসর নামাজ'],
  ['afternoon', 'revision', 'রিভিশন'],
  ['night', 'maghrib', 'মাগরিব নামাজ'],
  ['night', 'waqiah', 'সূরা ওয়াকিয়াহ তেলাওয়াত'],
  ['night', 'class', 'ক্লাস'],
  ['night', 'isha', 'এশা নামাজ'],
  ['night', 'sheet', 'লেকচার শিট রিভিউ'],
  ['night', 'practice', 'প্র্যাকটিস'],
  ['late_night', 'class', 'ক্লাস'],
  ['late_night', 'sheet', 'লেকচার শিট রিভিউ'],
  ['late_night', 'practice', 'প্র্যাকটিস'],
  ['late_night', 'revision', 'রিভিশন'],
].map(([phase, id, name]) => {
  const defaults = {
    'dawn-fajr':'05:30','dawn-yasin':'05:55','dawn-breakfast':'06:20','dawn-class':'06:30','dawn-sheet':'08:00','dawn-practice':'08:30','dawn-dev1':'09:45',
    'morning-class':'10:00','morning-sheet':'11:30','morning-practice':'12:00','morning-meal':'11:30',
    'afternoon-dhuhr':'13:15','afternoon-meal':'13:00','afternoon-dev2':'13:42','afternoon-class':'14:00','afternoon-sheet':'15:30','afternoon-practice':'16:10','afternoon-asr':'15:55','afternoon-revision':'17:40',
    'night-maghrib':'17:10','night-waqiah':'17:30','night-isha':'19:10','night-class':'19:45','night-sheet':'19:45','night-practice':'20:30',
    'late_night-revision':'20:30'
  };
  const key = `${phase}-${id}`;
  return { id: key, phase, name, description: '', reminderTime: defaults[key] || '' };
});

const LATE_NIGHT_DEFAULTS = BASE_ITEMS.filter((x) => x.phase === 'late_night');

/**
 * Every phase owns a DIFFERENT colour. The tracker never paints one orange
 * across the whole day:
 *   ভোর → কমলা · সকাল → হলুদ/অ্যাম্বার · দুপুর → নীল · রাত → বেগুনি
 *   গভীর রাত → গাঢ় ইন্ডিগো
 */
const PHASE_VISUALS = {
  dawn: { Icon: Sunrise, accent: '#ff9808' },
  morning: { Icon: Sun, accent: '#ffd369' },
  afternoon: { Icon: SunMedium, accent: '#38bdf8' },
  noon: { Icon: SunMedium, accent: '#38bdf8' },
  night: { Icon: MoonStar, accent: '#a78bfa' },
  late_night: { Icon: Sparkles, accent: '#4f46e5' },
};

const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PhorTracker() {
  const { state, commit, todayKey, activePhases } = useStudy();
  const [selected, setSelected] = useState(todayKey);
  const [edit, setEdit] = useState(null);
  const [addingPhase, setAddingPhase] = useState(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [menu, setMenu] = useState(null);
  const [drag, setDrag] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const menuRef = useRef(null);
  const prevToday = useRef(todayKey);
  const firedReminders = useRef(new Set());

  useEffect(() => {
    if (prevToday.current !== todayKey) {
      const wasToday = selected === prevToday.current;
      prevToday.current = todayKey;
      if (wasToday) setSelected(todayKey);
    }
  }, [todayKey, selected]);

  const phases = useMemo(
    () =>
      (activePhases || []).map((p) => ({
        id: p.slotId,
        label: p.label,
        windowLabel: p.windowLabel,
        accent: p.accent || PHASE_VISUALS[p.slotId]?.accent || '#ffd369',
        Icon: PHASE_VISUALS[p.slotId]?.Icon || Sparkles,
      })),
    [activePhases]
  );

  const rawStored = Array.isArray(state.phorTracker?.items) ? state.phorTracker.items : BASE_ITEMS;
  const storedItems = useMemo(() => {
    const merged = rawStored.map((item) => {
      const fallback = BASE_ITEMS.find((base) => base.id === item.id);
      return item.reminderTime || !fallback ? item : { ...item, reminderTime: fallback.reminderTime };
    });
    const hasLate = merged.some((x) => x.phase === 'late_night');
    return hasLate ? merged : [...merged, ...LATE_NIGHT_DEFAULTS];
  }, [rawStored]);

  const data = state.phorTracker || {};
  const marks = data.marks || {};

  const currentSprint =
    (state.sprintData?.sprints || []).find((x) => x.id === state.sprintData?.selectedSprintId) ||
    (state.sprintData?.sprints || []).at(-1);

  // Anchor a clean Saturday–Friday 7-day week around `selected` so today stays unmistakably highlighted
  const days = useMemo(() => {
    const anchor = dateFromKey(selected);
    const satOffset = -((anchor.getDay() + 1) % 7);
    const weekStart = addDays(anchor, satOffset);
    return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(weekStart, i)));
  }, [selected]);

  const allSpecific = useMemo(
    () =>
      currentSprint
        ? sprintTasksForViews({ sprints: [currentSprint] }, state.subjects || [])
            .filter((x) => days.includes(x.dateKey))
            .map((x) => ({
              id: x.id,
              phase: x.timeSlot,
              name: `${x.chapter} · ${x.sprintLabel}`,
              description: x.presetSubject,
              date: x.dateKey,
              sprintDone: x.done,
              sprintLink: x.sprintLink,
              reminderTime: data.overrides?.[x.id]?.reminderTime || ({ dawn:'06:30', morning:'10:00', afternoon:'14:00', noon:'14:00', night:'19:45', late_night:'20:30' }[x.timeSlot] || ''),
              ...(data.overrides?.[x.id] || {}),
            }))
        : [],
    [currentSprint, state.subjects, days, data.overrides]
  );

  const specific = allSpecific.filter((x) => x.date === selected);

  // Minute-based reminder checks continue while the Tauri app is running/minimized.
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = toDateKey(now);
      for (const item of [...storedItems, ...allSpecific]) {
        if (!item.reminderTime || item.reminderTime !== hhmm || (item.date && item.date !== today)) continue;
        const key = `${today}/${item.id}/${hhmm}`;
        if (firedReminders.current.has(key)) continue;
        firedReminders.current.add(key);
        desktopBridge.notifyRoutine(item.name, 'Study Sentry · নির্ধারিত কাজ');
      }
      if (firedReminders.current.size > 500) firedReminders.current.clear();
    };
    check();
    const timer = window.setInterval(check, 15000);
    return () => window.clearInterval(timer);
  }, [storedItems, allSpecific]);
  const baseItems = currentSprint
    ? storedItems.filter((x) => {
        const original = BASE_ITEMS.find((b) => b.id === x.id);
        return !(
          ['class', 'sheet', 'practice'].includes(x.id.split('-').at(-1)) &&
          original &&
          x.name === original.name &&
          !x.description
        );
      })
    : storedItems;

  const items = [...baseItems, ...specific];
  const applicable = (item, day) => !item.date || item.date === day;
  const markOf = (item, day) => {
    const explicit = marks?.[day]?.[item.id];
    return explicit !== undefined ? explicit : null;
  };

  const mutate = (fn) =>
    commit((prev) => {
      const existing = prev.phorTracker || {};
      const old = {
        ...existing,
        items: Array.isArray(existing.items) ? existing.items : BASE_ITEMS,
        marks: existing.marks || {},
      };
      return { ...prev, phorTracker: fn(old) };
    });

  const setMark = (id, day, value) => {
    if (day !== todayKey) return;
    mutate((d) => ({
      ...d,
      marks: { ...d.marks, [day]: { ...(d.marks[day] || {}), [id]: value } },
    }));
  };

  // Effortless 1-click toggle: empty -> done -> missed -> empty (right-click -> missed, middle -> clear)
  const cycleMark = (id, day, current) => {
    if (day !== todayKey) return;
    const next = current === 'done' ? 'missed' : current === 'missed' ? 'none' : 'done';
    setMark(id, day, next);
  };

  const move = (id, target, phase) => {
    const virtual = specific.find((x) => x.id === id);
    if (virtual) {
      commit((prev) => mutateSprintProjection(prev, virtual.sprintLink, { phaseId: phase }));
      return;
    }
    mutate((d) => {
      const list = [...d.items];
      const from = list.findIndex((x) => x.id === id);
      if (from < 0) return d;
      const [oldItem] = list.splice(from, 1);
      const item = { ...oldItem, phase };
      const at = target ? list.findIndex((x) => x.id === target) : -1;
      if (at < 0) list.push(item);
      else list.splice(at, 0, item);
      return { ...d, items: list };
    });
  };

  const handleQuickAdd = (e, phaseId) => {
    e.preventDefault();
    const clean = newTaskName.trim();
    if (!clean) return;
    mutate((d) => ({
      ...d,
      items: [...d.items, { id: uid('phor'), phase: phaseId, name: clean, description: '' }],
    }));
    setNewTaskName('');
    setAddingPhase(null);
  };

  const deleteCustomItem = (item) => {
    if (item.sprintLink) return;
    mutate((d) => ({
      ...d,
      items: d.items.filter((x) => x.id !== item.id),
    }));
  };

  useEffect(() => {
    if (!menu) return undefined;
    const out = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenu(null);
    };
    const key = (e) => {
      if (e.key === 'Escape') setMenu(null);
    };
    document.addEventListener('pointerdown', out);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', out);
      window.removeEventListener('keydown', key);
    };
  }, [menu]);

  const showMenu = (e, item) => {
    e.preventDefault();
    setMenu({
      item,
      x: Math.max(8, Math.min(e.clientX, window.innerWidth - 190)),
      y: Math.max(8, Math.min(e.clientY, window.innerHeight - 96)),
    });
  };

  const dayStats = (day) => {
    const activeSet = new Set(phases.map((p) => p.id));
    const valid = [...baseItems, ...allSpecific.filter((x) => x.date === day)].filter(
      (x) => activeSet.has(x.phase) && applicable(x, day)
    );
    const done = valid.filter((x) => markOf(x, day) === 'done').length;
    const missed = valid.filter((x) => markOf(x, day) === 'missed').length;
    const total = valid.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { done, missed, total, pct };
  };

  const activeDay = days.includes(todayKey) && selected === todayKey ? todayKey : selected;
  const focusStats = dayStats(activeDay);
  const weekRangeLabel = `${bnDate(dateFromKey(days[0]), { day: 'numeric', month: 'short' })} – ${bnDate(
    dateFromKey(days[6]),
    { day: 'numeric', month: 'short', year: 'numeric' }
  )}`;
  const isCurrentWeek = days.includes(todayKey);

  return (
    <section className="v30-phor-card" aria-label="Daily Tracker">
      {/* SCULPTED LUXURY HEADER & DATE BAR */}
      <header className="v30-dt-hero">
        <div className="v30-dt-hero-left">
          <div className="v30-dt-title-copy">
            <div className="v30-dt-title-line">
              <h2>দৈনিক প্রহর ট্র্যাকার</h2>
              {activeDay === todayKey && <span className="v30-dt-live-badge">আজ সক্রিয়</span>}
            </div>
            <div className="v30-dt-meta-chips">
              <span className="is-done">
                <Check size={12} strokeWidth={2.8} /> {bnNum(focusStats.done)}/{bnNum(focusStats.total)} সম্পন্ন
              </span>
              <span className="is-date">
                {bnDate(dateFromKey(activeDay), {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* REFINED SCULPTED DATE & WEEK NAVIGATOR */}
        <div className="v30-dt-nav-cluster">
          <div className="v30-dt-week-capsule" role="group" aria-label="সপ্তাহ ও তারিখ নির্বাচন">
            <button
              type="button"
              className="v30-dt-arrow"
              aria-label="আগের সপ্তাহ"
              onClick={() => setSelected(toDateKey(addDays(dateFromKey(selected), -7)))}
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              className={`v30-dt-date-trigger ${pickerOpen ? 'is-open' : ''}`}
              onClick={() => setPickerOpen((v) => !v)}
              title="তারিখ নির্বাচন করুন"
            >
              <Calendar size={14} />
              <strong>{weekRangeLabel}</strong>
            </button>

            <button
              type="button"
              className="v30-dt-arrow"
              aria-label="পরের সপ্তাহ"
              onClick={() => setSelected(toDateKey(addDays(dateFromKey(selected), 7)))}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {(!isCurrentWeek || selected !== todayKey) && (
            <button
              type="button"
              className="v30-dt-today-pill"
              onClick={() => {
                setSelected(todayKey);
                setPickerOpen(false);
              }}
            >
              আজ
            </button>
          )}

          {pickerOpen && (
            <div className="v30-dt-date-popover">
              <div className="v30-dt-pop-head">
                <span>নির্দিষ্ট তারিখে যান</span>
                <button type="button" onClick={() => setPickerOpen(false)} aria-label="বন্ধ">
                  <X size={13} />
                </button>
              </div>
              <BanglaDateInput
                aria-label="ট্র্যাকার তারিখ"
                value={selected}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelected(e.target.value);
                    setPickerOpen(false);
                  }
                }}
              />
              <div className="v30-dt-pop-shortcuts">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(toDateKey(addDays(dateFromKey(todayKey), -1)));
                    setPickerOpen(false);
                  }}
                >
                  গতকাল
                </button>
                <button
                  type="button"
                  className="is-primary"
                  onClick={() => {
                    setSelected(todayKey);
                    setPickerOpen(false);
                  }}
                >
                  আজ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(toDateKey(addDays(dateFromKey(todayKey), 1)));
                    setPickerOpen(false);
                  }}
                >
                  আগামীকাল
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* LUXURY 7-DAY MATRIX — TODAY PROMINENTLY HIGHLIGHTED, OTHER DAYS SOFTLY MUTED */}
      <div className="v30-dt-table-wrap">
        <table className="v30-dt-table">
          <thead>
            <tr>
              <th scope="col" className="v30-dt-col-task">
                প্রহর ও দৈনিক কাজ
              </th>
              {days.map((day) => {
                const d = dateFromKey(day);
                const isToday = day === todayKey;
                const isPicked = day === selected && !isToday;
                const st = dayStats(day);
                const dayName = bnDay(WEEKDAY_EN[d.getDay()]).slice(0, 4);
                return (
                  <th
                    scope="col"
                    key={day}
                    className={`v30-dt-day-th ${
                      isToday ? 'is-today-col' : 'is-muted-col'
                    } ${isPicked ? 'is-picked-col' : ''}`}
                  >
                    <button
                      type="button"
                      className="v30-dt-day-btn"
                      onClick={() => setSelected(day)}
                    >
                      <span className="v30-dt-day-wk">
                        {isToday ? 'আজ' : dayName}
                      </span>
                      <strong className="v30-dt-day-num">
                        {bnDate(d, { day: 'numeric' })}
                      </strong>
                      <small className="v30-dt-day-mo">
                        {bnDate(d, { month: 'short' })}
                      </small>
                      <i className="v30-dt-day-bar">
                        <b style={{ width: `${st.pct}%` }} />
                      </i>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {phases.map(({ id: phaseId, label, windowLabel, accent, Icon }) => {
              const rows = items.filter((x) => x.phase === phaseId);
              const applicableRows = rows.filter((x) => applicable(x, activeDay));
              const done = applicableRows.filter((x) => markOf(x, activeDay) === 'done').length;
              const pct = applicableRows.length
                ? Math.round((done / applicableRows.length) * 100)
                : 0;

              return (
                <React.Fragment key={phaseId}>
                  <tr
                    className="v30-dt-phase-row"
                    data-phase={phaseId}
                    style={{ '--ph-accent': accent }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (drag) move(drag, null, phaseId);
                      setDrag(null);
                    }}
                  >
                    <td colSpan={8}>
                      <div className="v30-dt-phase-bar">
                        <div className="v30-dt-phase-left">
                          <span className="v30-dt-phase-icon">
                            <Icon size={15} />
                          </span>
                          <strong>{label}</strong>
                          {windowLabel && <small>সময়-নির্ভর কাজ</small>}
                        </div>

                        <div className="v30-dt-phase-right">
                          <div className="v30-dt-phase-meter">
                            <i style={{ width: `${pct}%` }} />
                          </div>
                          <span className="v30-dt-phase-pct">{bnNum(pct)}%</span>
                          <button
                            type="button"
                            className="v30-dt-add-btn"
                            title={`${label}-এ নতুন কাজ যোগ করুন`}
                            onClick={() => {
                              setAddingPhase((cur) => (cur === phaseId ? null : phaseId));
                              setNewTaskName('');
                            }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>

                      {addingPhase === phaseId && (
                        <form
                          className="v30-dt-inline-add"
                          onSubmit={(e) => handleQuickAdd(e, phaseId)}
                        >
                          <input
                            autoFocus
                            maxLength={100}
                            placeholder={`${label}-এর নতুন কাজের নাম…`}
                            value={newTaskName}
                            onChange={(e) => setNewTaskName(e.target.value)}
                          />
                          <button type="submit" className="is-save" disabled={!newTaskName.trim()}>
                            যোগ করুন
                          </button>
                          <button
                            type="button"
                            className="is-cancel"
                            onClick={() => setAddingPhase(null)}
                          >
                            <X size={13} />
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>

                  {rows.map((item) => {
                    const todayMark = markOf(item, activeDay);
                    return (
                      <tr
                        key={item.id}
                        className={`v30-dt-item-row ${todayMark === 'done' ? 'is-row-done' : ''}`}
                        data-phase={phaseId}
                        style={{ '--ph-accent': accent }}
                        draggable
                        onDragStart={(e) => {
                          setDrag(item.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDrag(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (drag && drag !== item.id) move(drag, item.id, phaseId);
                          setDrag(null);
                        }}
                      >
                        <th
                          scope="row"
                          className="v30-dt-task-cell"
                          onContextMenu={(e) => showMenu(e, item)}
                        >
                          <span className="v30-dt-grip" aria-hidden="true">
                            <GripVertical size={13} />
                          </span>
                          <div className="v30-dt-task-text">
                            <strong>{item.name}</strong>
                            {item.description && <small>{item.description}</small>}
                          </div>
                          <button
                            type="button"
                            className="v30-dt-row-edit"
                            aria-label={`${item.name} সম্পাদনা`}
                            onClick={() => setEdit({ ...item })}
                          >
                            <Pencil size={12} />
                          </button>
                        </th>

                        {days.map((day) => {
                          const mark = markOf(item, day);
                          const valid = applicable(item, day);
                          const isToday = day === todayKey;
                          const isPicked = day === selected && !isToday;

                          return (
                            <td
                              key={day}
                              className={`v30-dt-mark-td ${
                                isToday ? 'is-today-col' : 'is-muted-col'
                              } ${isPicked ? 'is-picked-col' : ''}`}
                            >
                              {valid ? (
                                <button
                                  type="button"
                                  className={`v30-dt-check ${
                                    mark === 'done'
                                      ? 'is-done'
                                      : mark === 'missed'
                                      ? 'is-missed'
                                      : 'is-empty'
                                  } ${!isToday ? 'is-locked' : ''}`}
                                  disabled={!isToday}
                                  title={isToday ? 'আজকের কাজ চিহ্নিত করুন' : 'শুধু আজকের কাজ চিহ্নিত করা যাবে'}
                                  onClick={() => cycleMark(item.id, day, mark)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setMark(item.id, day, mark === 'missed' ? 'none' : 'missed');
                                  }}
                                  onMouseDown={(e) => {
                                    if (e.button === 1) e.preventDefault();
                                  }}
                                  onAuxClick={(e) => {
                                    if (e.button === 1) {
                                      e.preventDefault();
                                      setMark(item.id, day, 'none');
                                    }
                                  }}
                                  aria-label={`${item.name} (${day})${isToday ? '' : ' — শুধু আজ চিহ্নিত করা যাবে'}`}
                                >
                                  {mark === 'done' ? (
                                    <Check size={15} strokeWidth={2.9} />
                                  ) : mark === 'missed' ? (
                                    <X size={14} strokeWidth={2.6} />
                                  ) : (
                                    <i />
                                  )}
                                </button>
                              ) : (
                                <span className="v30-dt-na">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* CLEAN SUMMARY FOOTER ROW */}
            <tr className="v30-dt-foot-row">
              <th scope="row">দৈনিক সাফল্য</th>
              {days.map((day) => {
                const st = dayStats(day);
                const isToday = day === todayKey;
                const isPicked = day === selected && !isToday;
                return (
                  <td
                    key={day}
                    className={`${isToday ? 'is-today-col' : 'is-muted-col'} ${
                      isPicked ? 'is-picked-col' : ''
                    }`}
                  >
                    <span className={`v30-dt-foot-pill ${st.pct === 100 ? 'is-perfect' : ''}`}>
                      {bnNum(st.pct)}%
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {menu &&
        createPortal(
          <div
            className="v30-dt-ctx-menu"
            ref={menuRef}
            role="menu"
            aria-label="কাজের অপশন"
            style={{ left: menu.x, top: menu.y }}
          >
            {/* knowing which row you opened matters more than a menu heading
                usually does — the table is dense and rows are easy to confuse */}
            <div className="v30-dt-ctx-head">
              <b>{menu.item.name}</b>
              <small>কাজের অপশন</small>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setEdit({ ...menu.item });
                setMenu(null);
              }}
            >
              <Pencil size={14} /> সম্পাদনা
            </button>
            {!menu.item.sprintLink && (
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  deleteCustomItem(menu.item);
                  setMenu(null);
                }}
              >
                <Trash2 size={14} /> মুছে ফেলুন
              </button>
            )}
          </div>,
          document.body
        )}

      {edit &&
        createPortal(
          <ModalShell title="কাজ সম্পাদনা" onClose={() => setEdit(null)} className="v30-dt-edit-modal">
            <form
              className="phor-edit v30-dt-edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!edit.name.trim()) return;
                mutate((d) =>
                  edit.sprintLink
                    ? {
                        ...d,
                        overrides: {
                          ...(d.overrides || {}),
                          [edit.id]: {
                            name: edit.name.trim(),
                            description: (edit.description || '').trim(),
                            reminderTime: edit.reminderTime || '',
                          },
                        },
                      }
                    : {
                        ...d,
                        items: d.items.map((x) =>
                          x.id === edit.id
                            ? {
                                ...x,
                                name: edit.name.trim(),
                                description: (edit.description || '').trim(),
                                reminderTime: edit.reminderTime || '',
                              }
                            : x
                        ),
                      }
                );
                setEdit(null);
              }}
            >
              <label className="v30-dt-edit-field">
                <span>কাজের নাম</span>
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </label>
              <label className="v30-dt-edit-field">
                <span>সংক্ষিপ্ত নোট (ঐচ্ছিক)</span>
                <textarea
                  rows={2}
                  maxLength={240}
                  value={edit.description || ''}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                />
              </label>
              <label className="v30-dt-edit-field">
                <span>রিমাইন্ডারের সময় (টেবিলে দেখানো হবে না)</span>
                <BanglaTimeInput aria-label="রিমাইন্ডারের সময়" value={edit.reminderTime || ''} onChange={(e) => setEdit({ ...edit, reminderTime: e.target.value })} />
              </label>
              <div className="v30-dt-edit-actions">
                {!edit.sprintLink && (
                  <button
                    type="button"
                    className="action-btn ghost-danger is-danger"
                    onClick={() => {
                      deleteCustomItem(edit);
                      setEdit(null);
                    }}
                  >
                    <Trash2 size={14} /> মুছুন
                  </button>
                )}
                <button type="submit" className="action-btn primary-emerald">
                  সংরক্ষণ
                </button>
              </div>
            </form>
          </ModalShell>,
          document.body
        )}
    </section>
  );
}
