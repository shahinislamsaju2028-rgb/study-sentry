import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Columns3, CalendarClock, Plus } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import TaskBoard, { boardStatusFor } from '../components/TaskBoard';
import TodoTimelineView from './TodoTimelineView';
import TodoTaskEditor from '../components/TodoTaskEditor';
import { bnNum } from '../utils/bangla';

/**
 * TASK VIEWS — Board ⇄ Timeline.
 *
 * The old implementation swapped the whole subtree inside <AnimatePresence mode="popLayout">.
 * `popLayout` forces a synchronous layout measurement of the outgoing tree while the incoming
 * tree mounts, which produced a visible stall (the "hanging" feeling).
 *
 * New approach: both panels live in ONE grid cell and are cross-faded with pure CSS
 * (opacity + transform only, GPU friendly). A panel is mounted lazily on first visit and then
 * stays mounted, so repeat switches cost nothing but a compositor transition — no remount,
 * no layout thrash, no lag.
 */
export default function TasksView() {
  const { state, todayKey } = useStudy();
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('ss_task_view_mode') === 'timeline' ? 'timeline' : 'board'; } catch { return 'board'; }
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [visited, setVisited] = useState(() => ({ board: true, timeline: mode === 'timeline' }));
  const shellRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('ss_task_view_mode', mode);
    } catch {}
  }, [mode]);

  const counts = useMemo(() => {
    const list = (state.todos || []).filter(
      (t) => (t.workType || 'Study') !== 'Work' && String(t.category || '').toLowerCase() !== 'work'
    );
    return {
      todo: list.filter((t) => boardStatusFor(t) === 'todo').length,
      doing: list.filter((t) => boardStatusFor(t) === 'doing').length,
      done: list.filter((t) => boardStatusFor(t) === 'done').length,
    };
  }, [state.todos]);

  const switchTo = (next) => {
    if (next === mode) return;
    setVisited((v) => (v[next] ? v : { ...v, [next]: true }));
    setMode(next);
  };

  return (
    <div className="view-page tasks-v3-page">
      <header className="tasks-v3-topbar">
        <div className="v33-seg" role="tablist" aria-label="Task views">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'board'}
            className={`v33-seg-tab ${mode === 'board' ? 'is-active' : ''}`}
            onClick={() => switchTo('board')}
          >
            <span className="v33-seg-ico">
              <Columns3 size={16} />
            </span>
            <span>টাস্ক বোর্ড</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'timeline'}
            className={`v33-seg-tab ${mode === 'timeline' ? 'is-active' : ''}`}
            onClick={() => switchTo('timeline')}
          >
            <span className="v33-seg-ico">
              <CalendarClock size={16} />
            </span>
            <span>টাইমলাইন</span>
          </button>
        </div>

        <div className="tasks-v3-right">
          <div className="tasks-v3-kpis">
            <span className="tk-pill sky">বাকি {bnNum(counts.todo)}</span>
            <span className="tk-pill yellow">চলমান {bnNum(counts.doing)}</span>
            <span className="tk-pill done">সম্পন্ন {bnNum(counts.done)}</span>
          </div>

          <button
            type="button"
            className="tasks-v3-create-btn"
            onClick={() => setCreatingTask(true)}
          >
            <Plus size={16} /> নতুন টাস্ক
          </button>
        </div>
      </header>

      {/* Shared grid cell -> both panels share one box, cross-faded smoothly */}
      <div className="v34-task-stage" ref={shellRef}>
        <div
          className={`v34-task-panel v34-task-panel-board ${mode === 'board' ? 'is-active' : 'is-hidden'}`}
          role="tabpanel"
          aria-hidden={mode !== 'board'}
          inert={mode !== 'board'}
        >
          {visited.board && <TaskBoard embedded />}
        </div>

        <div
          className={`v34-task-panel v34-task-panel-timeline ${mode === 'timeline' ? 'is-active' : 'is-hidden'}`}
          role="tabpanel"
          aria-hidden={mode !== 'timeline'}
          inert={mode !== 'timeline'}
        >
          {visited.timeline && <TodoTimelineView embedded />}
        </div>
      </div>

      {creatingTask && (
        <TodoTaskEditor
          dateKey={todayKey}
          onClose={() => setCreatingTask(false)}
          onSaved={() => setCreatingTask(false)}
        />
      )}
    </div>
  );
}
