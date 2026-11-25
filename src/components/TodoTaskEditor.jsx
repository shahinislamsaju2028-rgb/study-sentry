import { BanglaDateInput, BanglaTimeInput } from './BanglaInputs';
import { RefreshCw, Flag, BookMarked, GraduationCap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ModalShell } from './Modals';
import { useStudy } from '../context/StudyContext';
import SubjectCards from './SubjectCards';
import CurriculumPicker from './CurriculumPicker';
import { ActivityChips } from './ActivityChips';
import FocusMinutesPicker from './FocusMinutesPicker';
import { toDateKey } from '../utils/seedData';
import { PREMADE_SUBJECTS, findSubject, iconForSubject, subjectName } from '../utils/premadeSubjects';
import { SUBJECT_ACTIVITIES } from '../utils/subjectActivities';
import { bnSample } from '../utils/bangla';
import { uid } from '../utils/seedData';
import {
  TASK_ICONS,
  TaskSlotPicker,
  canonicalCategory,
  inferSlotFromTime,
  slotMetaById,
  taskIconKey,
} from './TodoPreviewControls';

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

  const sampleNote = task ? bnSample(task.note, state.isDemo) : '';
  const sampleChapter = task ? bnSample(task.chapter, state.isDemo) : '';
  const sampleCycle = task ? bnSample(task.cycle, state.isDemo) : '';
  const sampleClass = task ? bnSample(task.className, state.isDemo) : '';
  const sampleQ = task ? bnSample(task.questionTarget, state.isDemo) : '';

  const [form, setForm] = useState(() => ({
    presetSubject: initialSubject,
    activity: SUBJECT_ACTIVITIES.includes(task?.activity) ? task.activity : SUBJECT_ACTIVITIES[0],
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
      paper: '',
      chapter: '',
      curriculumType: '',
      curriculumTopic: '',
      activity: SUBJECT_ACTIVITIES[0],
      plannedMin: 50,
    }));

  const chooseActivity = (activity) =>
    setForm((prev) => ({
      ...prev,
      activity,
    }));

  const save = (e) => {
    e.preventDefault();
    const subject = findSubject(state.subjects, form.presetSubject);
    // The New Task sheet no longer asks for a second, redundant title: the
    // subject + activity are the task's generated title. Editing keeps the
    // existing title intact so removing that field never rewrites saved data.
    const title = task ? task.title : `${form.presetSubject} · ${form.activity}`;
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
    <ModalShell title={task ? 'টাস্ক সম্পাদনা' : 'নতুন টাস্ক'} onClose={onClose} fullScreen className="v37-todo-task-modal v54-task-modal">
      <form className="tp-form v54-task-screen" onSubmit={save}>
        <div className="v54-task-layout">
          <section className="v54-task-panel v54-task-main" aria-label="বিষয় ও পড়ার ধরন">
            <header className="v54-section-heading">
              <span className="v54-step-index">১</span>
              <div>
                <strong>বিষয় নির্বাচন</strong>
                <small>বিষয় বেছে নিন, তারপর অধ্যায়</small>
              </div>
            </header>

            <SubjectCards
              compact
              label="Task subject"
              subjects={state.subjects}
              value={form.presetSubject}
              onSelect={chooseSubject}
            />

            <CurriculumPicker
              stepIndex="২"
              hideTools
              shortSprintChapter={!!task?.sprintLink}
              subject={form.presetSubject}
              paper={form.paper}
              chapter={form.chapter}
              type={form.curriculumType}
              topic={form.curriculumTopic}
              onChange={(v) => setForm((prev) => ({
                ...prev,
                paper: v.paper,
                chapter: v.chapter,
                curriculumType: v.type,
                curriculumTopic: v.topic,
              }))}
            />

            <section className="v54-task-subsection">
              <header className="v54-section-heading is-subheading">
                <span className="v54-step-index">৩</span>
                <div><strong>কাজের ধরন</strong></div>
              </header>
              <ActivityChips
                compact
                value={form.activity}
                onChange={chooseActivity}
                label="কাজের ধরন"
              />
            </section>
          </section>

          <section className="v54-task-panel v54-task-plan" aria-label="সময় ও পরিকল্পনা">
            <header className="v54-section-heading">
              <span className="v54-step-index">৪</span>
              <div>
                <strong>সময় ও পরিকল্পনা</strong>
                <small>কখন শুরু করবেন এবং কতক্ষণ পড়বেন</small>
              </div>
            </header>

            <label className="v54-task-field v54-task-slots-field">
              <span>সময়ের স্লট</span>
              <div className="v54-slot-picker">
                <TaskSlotPicker
                  phaseMode={state?.profile?.phaseMode || state?.timerPrefs?.phaseMode || 'first4'}
                  value={form.timeSlot}
                  onChange={(slot) => {
                    set('timeSlot', slot.id);
                    set('startTime', slot.time);
                  }}
                />
              </div>
            </label>

            <div className="v54-task-datetime-grid">
              <label className="v54-task-field v54-task-start-field">
                <span>শুরুর সময়</span>
                <BanglaTimeInput
                  value={form.startTime}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                    timeSlot: inferSlotFromTime(e.target.value) || prev.timeSlot,
                  }))}
                />
              </label>
              <label className="v54-task-field v54-task-date-field">
                <span>তারিখ</span>
                <BanglaDateInput
                  value={form.dateKey}
                  onChange={(e) => set('dateKey', e.target.value)}
                  required
                />
              </label>
              <div className="v54-task-field v54-task-minutes-field">
                <FocusMinutesPicker value={form.plannedMin} onChange={(value) => set('plannedMin', value)} />
              </div>
            </div>

            <section className="v54-task-subsection v54-task-classification">
              <header className="v54-section-heading is-subheading">
                <span className="v54-step-index">৫</span>
                <div><strong>অগ্রাধিকার ও বিভাগ</strong></div>
              </header>
              <div className="v54-task-choice-grid">
                <div className="v54-task-choice-field">
                  <span>অগ্রাধিকার</span>
                  <div className="v54-choice-track" role="radiogroup" aria-label="Task priority">
                    {[
                      ['Low', 'কম', '#38d39f'],
                      ['Medium', 'মাঝারি', '#f6bd45'],
                      ['High', 'জরুরি', '#fb7185'],
                    ].map(([id, label, tone]) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={form.priority === id}
                        key={id}
                        style={{ '--choice-tone': tone }}
                        className={`v54-choice-pill ${form.priority === id ? 'is-active' : ''}`}
                        onClick={() => set('priority', id)}
                      >
                        <Flag size={14} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="v54-task-choice-field">
                  <span>বিভাগ</span>
                  <div className="v54-choice-track" role="radiogroup" aria-label="Task category">
                    {[
                      ['Study', 'স্টাডি', BookMarked, '#60c8ef'],
                      ['Revision', 'রিভিশন', RefreshCw, '#a78bfa'],
                      ['Exam Preparation', 'পরীক্ষা', GraduationCap, '#f5bd45'],
                    ].map(([id, label, Icon, tone]) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={form.category === id}
                        key={id}
                        style={{ '--choice-tone': tone }}
                        className={`v54-choice-pill ${form.category === id ? 'is-active' : ''}`}
                        onClick={() => set('category', id)}
                      >
                        <Icon size={14} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </section>
        </div>

        <div className="tp-modal-actions v54-task-actions">
          <button type="button" className="action-btn" onClick={onClose}>বাতিল</button>
          <button type="submit" className="action-btn primary-emerald">
            {task ? 'সংরক্ষণ' : 'টাস্ক যোগ করুন'}
          </button>
        </div>
      </form>
    </ModalShell>,
    document.body
  );
}
