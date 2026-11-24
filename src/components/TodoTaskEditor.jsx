import { BanglaDateInput, BanglaTimeInput, BanglaNumberInput } from './BanglaInputs';
import { BookOpenCheck, ClipboardPenLine, Dumbbell, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ModalShell } from './Modals';
import { useStudy } from '../context/StudyContext';
import SubjectCards from './SubjectCards';
import CurriculumPicker from './CurriculumPicker';
import FocusMinutesPicker from './FocusMinutesPicker';
import { toDateKey } from '../utils/seedData';
import { PREMADE_SUBJECTS, findSubject, iconForSubject, subjectName } from '../utils/premadeSubjects';
import { SUBJECT_ACTIVITIES } from '../utils/subjectActivities';
import { bnActivity, bnSample, bnSubject, bnTask } from '../utils/bangla';
import { uid } from '../utils/seedData';
import {
  TASK_ICONS,
  TODO_CATEGORIES,
  TaskSlotPicker,
  canonicalCategory,
  inferSlotFromTime,
  slotMetaById,
  taskIconKey,
} from './TodoPreviewControls';

/* Each work type gets its own pictogram so the four tiles are readable at a
   glance instead of four identical text chips. */
const ACTIVITY_ICONS = {
  Class: BookOpenCheck,
  'Lecture Sheet Review': ClipboardPenLine,
  Practice: Dumbbell,
  Revision: RefreshCw,
};

export default function TodoTaskEditor({
  task,
  initialBoardStatus = 'todo',
  initialSlotKey,
  dateKey,
  onClose,
  onSaved,
  saveItem,
}) {
  const { state, putItem, toast } = useStudy();
  const initialSubject = PREMADE_SUBJECTS.includes(task?.presetSubject)
    ? task.presetSubject
    : PREMADE_SUBJECTS.includes(subjectName(state.subjects, task?.subjectId))
    ? subjectName(state.subjects, task?.subjectId)
    : PREMADE_SUBJECTS.includes(task?.title)
    ? task.title
    : 'Physics';

  const initialSlotId =
    task?.timeSlot || (task?.startTime ? inferSlotFromTime(task.startTime) : initialSlotKey || (dateKey === toDateKey() ? inferSlotFromTime(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date())) : null) || 'dawn');
  const initialSlot = slotMetaById(initialSlotId) || slotMetaById('dawn');

  const sampleTitle = task ? bnTask(task.title, state.isDemo) : '';
  const sampleNote = task ? bnSample(task.note, state.isDemo) : '';
  const sampleChapter = task ? bnSample(task.chapter, state.isDemo) : '';
  const sampleCycle = task ? bnSample(task.cycle, state.isDemo) : '';
  const sampleClass = task ? bnSample(task.className, state.isDemo) : '';
  const sampleQ = task ? bnSample(task.questionTarget, state.isDemo) : '';

  const [form, setForm] = useState(() => ({
    presetSubject: initialSubject,
    activity: SUBJECT_ACTIVITIES.includes(task?.activity) ? task.activity : SUBJECT_ACTIVITIES[0],
    title: sampleTitle || `${initialSubject} · ${SUBJECT_ACTIVITIES[0]}`,
    customTitle: Boolean(
      task?.title &&
        !PREMADE_SUBJECTS.some((s) => task.title === s || task.title.startsWith(`${s} · `))
    ),
    dateKey: task?.dateKey || dateKey,
    timeSlot: initialSlot.id,
    startTime: task?.startTime || (dateKey===toDateKey() && !initialSlotKey && !task && inferSlotFromTime(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date())) ? new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()) : initialSlot.time),
    paper: task?.paper || '', curriculumType: task?.curriculumType || '', curriculumTopic: task?.curriculumTopic || '',
    plannedMin: Math.max(5, Number(task?.plannedMin) || 50),
    priority: ['Low', 'Medium', 'High'].includes(task?.priority) ? task.priority : 'Medium',
    category: canonicalCategory(task?.category) || 'Study',
    previewTaskIcon: task ? taskIconKey(task) : iconForSubject(initialSubject),
    cycle: sampleCycle,
    chapter: sampleChapter,
    className: sampleClass,
    videoPosition: task?.videoPosition || '',
    questionTarget: sampleQ,
    note: sampleNote,
  }));

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const chooseSubject = (name) =>
    setForm((prev) => ({
      ...prev,
      presetSubject: name,
      previewTaskIcon: iconForSubject(name),
      paper:'', chapter:'', curriculumType:'', curriculumTopic:'', activity: SUBJECT_ACTIVITIES[0], plannedMin:50,
      title: prev.customTitle ? prev.title : `${name} · ${SUBJECT_ACTIVITIES[0]}`,
    }));

  const chooseActivity = (activity) =>
    setForm((prev) => ({
      ...prev,
      activity,
      title: prev.customTitle ? prev.title : `${prev.presetSubject} · ${activity}`,
    }));

  const save = (e) => {
    e.preventDefault();
    const subject = findSubject(state.subjects, form.presetSubject);
    const titleInput = (form.title || `${form.presetSubject} · ${form.activity}`).trim();
    const title = task && titleInput === sampleTitle ? task.title : titleInput;
    const icon = TASK_ICONS.find((i) => i.key === form.previewTaskIcon) || TASK_ICONS[0];
    const pickedSlot = slotMetaById(form.timeSlot) || slotMetaById('dawn');

    const payload = {
      ...(task || {}),
      id: task?.id || uid('todo'),
      title,
      presetSubject: form.presetSubject,
      subjectId: subject?.id || task?.subjectId || '',
      activity: form.activity,
      dateKey: form.dateKey || dateKey,
      timeSlot: pickedSlot.id,
      startTime: form.startTime || pickedSlot.time,
      paper: form.paper, curriculumType:form.curriculumType, curriculumTopic:form.curriculumTopic,
      plannedMin: Math.max(5, Math.min(1440, Number(form.plannedMin) || 50)),
      priority: form.priority || 'Medium',
      category: form.category,
      workType: 'Study',
      cycle: form.cycle.trim() === sampleCycle ? task?.cycle || '' : form.cycle.trim(),
      chapter: form.chapter.trim() === sampleChapter ? task?.chapter || '' : form.chapter.trim(),
      className: form.className.trim() === sampleClass ? task?.className || '' : form.className.trim(),
      videoPosition: form.videoPosition.trim(),
      questionTarget:
        form.questionTarget.trim() === sampleQ
          ? task?.questionTarget || ''
          : form.questionTarget.trim(),
      previewTaskIcon: icon.key,
      icon: icon.legacy,
      note: form.note.trim() === sampleNote ? task?.note || '' : form.note.trim(),
      done: !!task?.done,
      boardStatus: task?.done
        ? 'done'
        : ['todo', 'doing'].includes(task?.boardStatus)
        ? task.boardStatus
        : initialBoardStatus === 'doing'
        ? 'doing'
        : 'todo',
      status: task?.done
        ? 'done'
        : ['todo', 'doing'].includes(task?.boardStatus)
        ? task.boardStatus
        : initialBoardStatus === 'doing'
        ? 'doing'
        : 'todo',
      createdAt: task?.createdAt || new Date().toISOString(),
    };

    if(saveItem)saveItem(payload);else putItem('todos', payload);
    toast(task ? 'টাস্ক আপডেট হয়েছে।' : 'নতুন টাস্ক যুক্ত হয়েছে।');
    onSaved(payload.dateKey);
  };

  return createPortal(
    <ModalShell title={task ? 'টাস্ক সম্পাদনা' : 'নতুন টাস্ক'} onClose={onClose} wide className="v37-todo-task-modal">
      <form className="tp-form" onSubmit={save}>
        <div className="tp-field">
          <span>বিষয়</span>
          <SubjectCards
            compact
            label="Task subject"
            subjects={state.subjects}
            value={form.presetSubject}
            onSelect={chooseSubject}
          />
        </div>

        <CurriculumPicker shortSprintChapter={!!task?.sprintLink} subject={form.presetSubject} paper={form.paper} chapter={form.chapter} type={form.curriculumType} topic={form.curriculumTopic} onChange={v=>setForm(prev=>({...prev,paper:v.paper,chapter:v.chapter,curriculumType:v.type,curriculumTopic:v.topic}))}/>
        <div className="tp-field">
          <span>কাজের ধরন</span>
          <div className="tp-chip-row" role="radiogroup" aria-label="Task activity">
            {SUBJECT_ACTIVITIES.map((item) => {
              const Icon = ACTIVITY_ICONS[item] || BookOpenCheck;
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.activity === item}
                  key={item}
                  className={form.activity === item ? 'selected' : ''}
                  onClick={() => chooseActivity(item)}
                >
                  <span className="tp-chip-icon">
                    <Icon size={16} strokeWidth={2.1} />
                  </span>
                  {bnActivity(item)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clickable Pre-made Study Phase Slots (4 or 5 phases including গভীর রাত) */}
        <div className="tp-field">
          <span>সময়ের স্লট (প্রহর)</span>
          <TaskSlotPicker
            phaseMode={state?.profile?.phaseMode || state?.timerPrefs?.phaseMode || 'first4'}
            value={form.timeSlot}
            onChange={(slot) => {
              set('timeSlot', slot.id);
              set('startTime', slot.time);
            }}
          />
        </div>

        <label className="tp-field">
          <span>শুরুর সময় (ঢাকা)</span>
          <BanglaTimeInput
            value={form.startTime}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                startTime: e.target.value,
                timeSlot: inferSlotFromTime(e.target.value) || prev.timeSlot,
              }))
            }
          />
          <small>ভোর 5:30 থেকে গভীর রাত 2:00 পর্যন্ত সময় অনুযায়ী প্রহর স্বয়ংক্রিয়ভাবে নির্ধারিত হয়।</small>
        </label>
        <div className="tp-two">
          <label className="tp-field">
            <span>তারিখ</span>
            <BanglaDateInput
              value={form.dateKey}
              onChange={(e) => set('dateKey', e.target.value)}
              required
            />
          </label>

          <FocusMinutesPicker value={form.plannedMin} onChange={value=>set('plannedMin',value)}/>
        </div>

        <label className="tp-field">
          <span>শিরোনাম</span>
          <input
            type="text"
            maxLength="140"
            value={form.title}
            onChange={(e) => {
              set('customTitle', true);
              set('title', e.target.value);
            }}
            placeholder={`${bnSubject(form.presetSubject)} · ${bnActivity(form.activity)}`}
          />
        </label>

        <div className="tp-two">
          <label className="tp-field">
            <span>অগ্রাধিকার</span>
            <div className="tp-chip-row compact-cats" role="radiogroup" aria-label="Task priority">
              {[
                ['Low', 'কম'],
                ['Medium', 'মাঝারি'],
                ['High', 'জরুরি'],
              ].map(([pId, pLabel]) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.priority === pId}
                  key={pId}
                  className={form.priority === pId ? 'selected' : ''}
                  onClick={() => set('priority', pId)}
                >
                  {pLabel}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="tp-field">
          <span>বিভাগ</span>
          <div className="tp-chip-row compact-cats" role="radiogroup" aria-label="Task category">
            {TODO_CATEGORIES.map((category) => (
              <button
                type="button"
                role="radio"
                aria-checked={form.category === category}
                key={category}
                className={form.category === category ? 'selected' : ''}
                onClick={() => set('category', category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="tp-modal-actions">
          <button type="button" className="action-btn" onClick={onClose}>
            বাতিল
          </button>
          <button type="submit" className="action-btn primary-emerald">
            {task ? 'সংরক্ষণ' : 'টাস্ক যোগ করুন'}
          </button>
        </div>
      </form>
    </ModalShell>,
    document.body
  );
}
