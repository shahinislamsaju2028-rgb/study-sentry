import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Play,
  GripVertical,
  Calendar,
  Clock3,
  Trash2,
  Pencil,
  CheckCircle2,
  Circle,
  LoaderCircle,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import TodoTaskEditor from './TodoTaskEditor';
import { dateFromKey } from '../utils/stats';
import { taskDraft } from '../utils/focusDetails';
import { taskHeading } from '../utils/taskHeading';
import {sprintTasksForViews,mutateSprintProjection,projectionPatch} from '../utils/sprintProjection';
import { PreviewSubjectIcon } from './PreviewSubjectIcon';
import { phaseForInstant } from '../utils/studyPhases';
import { PREMADE_SUBJECTS, findSubject, subjectName } from '../utils/premadeSubjects';
import {
  slotForTask,
  getTaskTimeSlots,
  compareTimelineTasksDawnFirst,
  slotMetaById,
} from './TodoPreviewControls';
import { bnActivity, bnDate, bnNum, bnSubject, bnTask } from '../utils/bangla';

const COLUMNS = [
  { id: 'todo', title: 'To Do', bnTitle: 'করতে হবে', tone: 'sky', Icon: Circle },
  { id: 'doing', title: 'In Progress', bnTitle: 'চলমান', tone: 'yellow', Icon: LoaderCircle },
  { id: 'done', title: 'Completed', bnTitle: 'সম্পন্ন', tone: 'blue', Icon: CheckCircle2 },
];

const PRIORITIES = ['Low', 'Medium', 'High'];
const PRIORITY_LABELS = { Low: 'কম', Medium: 'মাঝারি', High: 'জরুরি' };
const DRAG_THRESHOLD_PX = 6;

export function boardStatusFor(task) {
  if (task?.done || task?.boardStatus === 'done' || task?.status === 'done') return 'done';
  if (task?.boardStatus === 'doing' || task?.status === 'doing') return 'doing';
  return 'todo';
}

function statusPatch(status) {
  return { boardStatus: status, status, done: status === 'done' };
}

export default function TaskBoard({ embedded = false }) {
  const { state, now, todayKey, patchItem, deleteItem, prepareFocus, openModal, toast, commit } =
    useStudy();
  const [phaseFilter,setPhaseFilter]=useState('all');
  const [editorState, setEditorState] = useState(null); // { task?: obj, initialStatus?: string }
  const [draggingId, setDraggingId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const [pointerGhost, setPointerGhost] = useState(null);
  const [contextMenu,setContextMenu]=useState(null);
  const contextRef=useRef(null);

  const columnRefs = useRef({});
  const dragSessionRef = useRef(null);

  // Serial phase order (ভোর → সকাল → দুপুর → রাত → গভীর রাত) used for the tab strip
  const phaseSlots = useMemo(
    () => getTaskTimeSlots(state?.profile?.phaseMode || state?.timerPrefs?.phaseMode || 'first4'),
    [state?.profile?.phaseMode, state?.timerPrefs?.phaseMode]
  );

  // The phase that is running right now (Dhaka time). Tasks belonging to it get
  // the same luminous treatment the Timeline already gives its running phase.
  const effectivePhaseMode =
    state?.profile?.phaseMode || state?.timerPrefs?.phaseMode || 'first4';
  const currentActiveSlotId = useMemo(() => {
    const pid = phaseForInstant(now || Date.now(), effectivePhaseMode);
    if (!pid) return null;
    return pid === 'noon' ? 'afternoon' : pid;
  }, [now, effectivePhaseMode]);

  // Each column lists its tasks serially by phase — earlier phase always stays on top.
  const itemsForColumn = (colId) =>
    tasks
      .filter(
        (t) =>
          boardStatusFor(t) === colId &&
          (phaseFilter === 'all' || (slotForTask(t)?.id || 'dawn') === phaseFilter)
      )
      .sort(compareTimelineTasksDawnFirst);

  const tasks = useMemo(
    () =>
      [...(state.todos || []),...sprintTasksForViews(state.sprintData,state.subjects).filter(task=>task.dateKey===todayKey)].filter(
        (task) =>
          (task.workType || 'Study') !== 'Work' &&
          String(task.category || '').toLowerCase() !== 'work'
      ),
    [state.todos,state.sprintData,state.subjects,todayKey]
  );

  useEffect(()=>{
    if(!contextMenu)return;
    const outside=e=>{if(!contextRef.current?.contains(e.target))setContextMenu(null)};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();setContextMenu(null);contextMenu.anchor?.focus()}};
    const dismiss=()=>setContextMenu(null);
    document.addEventListener('pointerdown',outside);window.addEventListener('keydown',key);window.addEventListener('blur',dismiss);window.addEventListener('resize',dismiss);window.addEventListener('scroll',dismiss,true);
    return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('keydown',key);window.removeEventListener('blur',dismiss);window.removeEventListener('resize',dismiss);window.removeEventListener('scroll',dismiss,true)};
  },[contextMenu]);
  const showContext=(task,x,y,anchor)=>setContextMenu({task,anchor,x:Math.max(8,Math.min(x,window.innerWidth-186)),y:Math.max(8,Math.min(y,window.innerHeight-110))});

  const move = (taskId, status) => {
    if (!taskId) return;
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const currentStatus = boardStatusFor(target);
    if (currentStatus === status) return;

    if (status === 'done') {
      toast('ফোকাস সেশন সম্পন্ন করলে টাস্ক স্বয়ংক্রিয়ভাবে সম্পন্ন কলামে যাবে।');
      return;
    }
    if(target.sprintLink)commit(prev=>mutateSprintProjection(prev,target.sprintLink,{boardStatus:status}));else patchItem('todos', taskId, statusPatch(status));
  };

  const detectColumnAtPoint = (clientX, clientY) => {
    for (const col of COLUMNS) {
      const el = columnRefs.current[col.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return col.id;
      }
    }
    return null;
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      const session = dragSessionRef.current;
      if (!session) return;

      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;

      if (!session.active) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        session.active = true;
        setDraggingId(session.task.id);
        document.body.classList.add('kanban-pointer-dragging');
      }

      e.preventDefault();
      const colId = detectColumnAtPoint(e.clientX, e.clientY);
      session.hoveredCol = colId;
      setOverColumn(colId);
      setPointerGhost({
        title: session.title,
        subjectName: session.subjectLabel,
        x: e.clientX,
        y: e.clientY,
        width: session.width,
      });
    };

    const finishPointerDrag = () => {
      const session = dragSessionRef.current;
      if (!session) return;
      dragSessionRef.current = null;
      document.body.classList.remove('kanban-pointer-dragging');

      if (session.active) {
        const targetCol = session.hoveredCol;
        setDraggingId(null);
        setOverColumn(null);
        setPointerGhost(null);
        if (targetCol) {
          move(session.task.id, targetCol);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', finishPointerDrag);
    window.addEventListener('pointercancel', finishPointerDrag);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishPointerDrag);
      window.removeEventListener('pointercancel', finishPointerDrag);
      document.body.classList.remove('kanban-pointer-dragging');
    };
  });

  const handleCardPointerDown = (e, task, displayTitle, subjectLabel) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, select, textarea, a, label')) return;

    const cardEl = e.currentTarget;
    const rect = cardEl.getBoundingClientRect();

    dragSessionRef.current = {
      task,
      title: displayTitle,
      subjectLabel,
      startX: e.clientX,
      startY: e.clientY,
      width: Math.min(300, Math.max(210, rect.width)),
      active: false,
      hoveredCol: boardStatusFor(task),
    };
  };

  const remove = (task) =>
    openModal('confirm', {
      title: 'টাস্ক মুছবেন?',
      description: task.sprintLink?'এটি সংশ্লিষ্ট Sprint থেকেও মুছে যাবে।':`"${bnTask(task.title, state.isDemo)}" বোর্ড থেকে মুছে যাবে।`,
      confirmLabel: 'মুছুন',
      danger: true,
      onConfirm: () => {
        if(task.sprintLink)commit(prev=>mutateSprintProjection(prev,task.sprintLink,{},true));else deleteItem('todos', task.id);
        toast('টাস্ক মুছে ফেলা হয়েছে।');
      },
    });

  const renderTask = (task) => {
    const status = boardStatusFor(task);
    const subjectTitle =
      task.presetSubject ||
      subjectName(state.subjects, task.subjectId) ||
      (PREMADE_SUBJECTS.includes(task.title) ? task.title : '');
    const subject =
      findSubject(state.subjects, subjectTitle) ||
      state.subjects.find((s) => s.id === task.subjectId) || { name: subjectTitle || 'Study' };
    const priority = PRIORITIES.includes(task.priority) ? task.priority : 'Medium';
    const displayTitle = taskHeading(task,state.subjects,state.isDemo);
    const subjLabel = subjectTitle ? bnSubject(subjectTitle) : '';
    const slotMeta = slotForTask(task);
    const SlotIcon = slotMeta?.Icon || Clock3;
    // Is this task part of the phase that is running right now?
    const isRunningPhase = Boolean(
      currentActiveSlotId && (slotMeta?.id || 'dawn') === currentActiveSlotId
    );

    return (
      <article
        key={task.id}
        className={`kb-card ${status} ${draggingId === task.id ? 'dragging' : ''} ${
          isRunningPhase && status !== 'done' ? 'kb-card-running' : ''
        }`}
        style={isRunningPhase ? { '--phase-tone': slotMeta?.tone || '#fbbf24' } : undefined}
        onPointerDown={(e) => handleCardPointerDown(e, task, displayTitle, subjLabel)}
        onContextMenu={e=>{e.preventDefault();showContext(task,e.clientX,e.clientY,e.currentTarget)}}
        tabIndex={0}
        aria-label={`${displayTitle} · Shift+F10: টাস্ক মেনু`}
        onKeyDown={e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const r=e.currentTarget.getBoundingClientRect();showContext(task,r.left+10,r.top+10,e.currentTarget)}else if(e.target===e.currentTarget&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&status!=='done'){e.preventDefault();move(task.id,e.key==='ArrowRight'?'doing':'todo')}}}
      >
        <div className="kb-card-top">
          <div className="kb-card-top-left">
            <span className="kb-grip" title="টেনে কলাম পরিবর্তন করুন" aria-hidden="true">
              <GripVertical size={14} />
            </span>
            <span className="kb-subject-mark" aria-hidden="true"><PreviewSubjectIcon subject={subject} size={18} /></span><h4 className="kb-card-title" title={displayTitle}>{displayTitle}</h4>
          </div>

          <div className="kb-top-actions"><span className={`kb-prio-pill ${priority.toLowerCase()}`}>{PRIORITY_LABELS[priority] || priority}</span>{status!=='done'&&<button type="button" className="kb-focus-icon" title="Focus শুরু" aria-label={`${displayTitle} ফোকাস শুরু`} onClick={()=>prepareFocus(taskDraft(task))}><Play size={14} fill="currentColor"/></button>}</div>
        </div>

        <div className="kb-meta-chips">
          {subjLabel && <span className="kb-chip kb-subject-tag">{subjLabel}</span>}
          {slotMeta && (
            <span className="kb-slot-chip" style={{ '--slot-tone': slotMeta.tone }}>
              <SlotIcon size={12} /> {slotMeta.bnLabel} {task.startTime?`· ${bnNum(task.startTime)}`:''}
            </span>
          )}
          {task.dateKey && (
            <span className="kb-chip">
              <Calendar size={11} />{' '}
              {bnDate(dateFromKey(task.dateKey), { day: 'numeric', month: 'short' })}
            </span>
          )}
          <span className="kb-chip">{bnNum(Math.max(1, Number(task.plannedMin) || 50))}m</span>
        </div>

      </article>
    );
  };

  return (
    <section className={`kb-board-shell ${embedded ? 'embedded' : ''}`} aria-label="Task Board">
      <div className="sprint-phase-tabs kb-phase-tabs" role="tablist" aria-label="টাস্ক বোর্ডের প্রহর">
        {[['all', 'সব'], ...phaseSlots.map((s) => [s.id, s.bnLabel])].map(
          ([id, label]) => (
            <button
              type="button"
              role="tab"
              aria-selected={phaseFilter === id}
              className={phaseFilter === id ? 'active' : ''}
              key={id}
              onClick={() => setPhaseFilter(id)}
            >
              {label}
            </button>
          )
        )}
      </div>
      <div className="kb-columns-grid">
        {COLUMNS.map((col) => {
          const items = itemsForColumn(col.id);
          const Icon = col.Icon;
          const isDropBlocked = overColumn === col.id && col.id === 'done' && draggingId;

          return (
            <section
              key={col.id}
              ref={(el) => {
                columnRefs.current[col.id] = el;
              }}
              className={`kb-column tone-${col.tone} ${overColumn === col.id ? 'is-over' : ''} ${
                isDropBlocked ? 'drop-locked' : ''
              }`}
            >
              <header className="kb-col-header">
                <div className="kb-col-title">
                  <span className={`kb-col-icon ${col.tone}`}>
                    <Icon size={15} />
                  </span>
                  <h3>{col.bnTitle}</h3>
                </div>

                <div className="kb-col-actions">
                  <span className="kb-col-count">{bnNum(items.length)}</span>
                  {col.id !== 'done' && (
                    <button
                      type="button"
                      className="kb-col-add"
                      title={`${col.bnTitle}-এ নতুন টাস্ক`}
                      aria-label={`Add task to ${col.title}`}
                      onClick={() => setEditorState({ initialStatus: col.id })}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              </header>

              <div className="kb-col-cards">
                {items.length ? (
                  items.map(renderTask)
                ) : (
                  <div className="kb-col-empty">এই কলামে কোনো টাস্ক নেই</div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {contextMenu&&createPortal(<div ref={contextRef} className="kb-context-menu" role="menu" aria-label="টাস্ক অ্যাকশন" style={{left:contextMenu.x,top:contextMenu.y}}><button type="button" role="menuitem" autoFocus onClick={()=>{const task=contextMenu.task;setContextMenu(null);setEditorState({task})}}><Pencil size={15}/> সম্পাদনা</button><button type="button" role="menuitem" className="danger" onClick={()=>{const task=contextMenu.task;setContextMenu(null);remove(task)}}><Trash2 size={15}/> মুছুন</button></div>,document.body)}

      {pointerGhost &&
        createPortal(
          <div
            className="kb-drag-ghost"
            style={{
              width: `${pointerGhost.width}px`,
              transform: `translate3d(${pointerGhost.x - pointerGhost.width / 2}px, ${
                pointerGhost.y - 26
              }px, 0)`,
            }}
            aria-hidden="true"
          >
            {pointerGhost.subjectName && <small>{pointerGhost.subjectName}</small>}
            <strong>{pointerGhost.title}</strong>
          </div>,
          document.body
        )}

      {editorState && (
        <TodoTaskEditor
          task={editorState.task}
          initialBoardStatus={editorState.initialStatus || 'todo'}
          dateKey={editorState.task?.dateKey || todayKey}
          saveItem={editorState.task?.sprintLink ? payload=>commit(prev=>mutateSprintProjection(prev,editorState.task.sprintLink,projectionPatch(payload))) : undefined}
          onClose={() => setEditorState(null)}
          onSaved={() => setEditorState(null)}
        />
      )}
    </section>
  );
}
