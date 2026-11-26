import { BanglaTimeInput } from '../components/BanglaInputs';
import React, { useRef, useState } from 'react';
import { Play, Pause, Square, Plus, Minus, Timer, Clock3, Pencil, Trash2, ListTodo, Check, BookOpen, Headphones, Calculator, Grid2X2, X, ChartNoAxesCombined, List, ChevronRight, Coffee } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { ModalShell } from '../components/Modals';
import { PreviewSubjectIcon } from '../components/PreviewSubjectIcon';
import SubjectCards from '../components/SubjectCards';
import { PREMADE_SUBJECTS,findSubject } from '../utils/premadeSubjects';
import { MinuteStepper } from '../components/StudyPreviewModals';
import { StudyIllustration, WeeklyBars } from '../components/SvgVisuals';
import { addDays, formatHM, uid } from '../utils/seedData';
import { sessionSecondsOnDay } from '../utils/stats';

function TimerDial({ seconds, total, mode, displayTime }) {
  const safe=Math.max(0,Number(seconds)||0), duration=Math.max(1,Number(total)||1);
  const fraction=mode==='stopwatch'?0:Math.max(0,Math.min(1,safe/duration));
  const r=102, circumference=2*Math.PI*r;
  const minuteAngle=((safe%3600)/3600)*360, secondAngle=(safe%60)*6;
  return <svg className="sp-analog" viewBox="0 0 260 260" role="img" aria-label={`Analog timer, ${displayTime} ${mode==='stopwatch'?'elapsed':'remaining'}`}>
    <defs><radialGradient id="sp-clock-glow"><stop stopColor="#2d2a1c"/><stop offset="1" stopColor="#111820"/></radialGradient></defs>
    <circle cx="130" cy="130" r="119" fill="url(#sp-clock-glow)" stroke="#f0b33d" strokeOpacity=".4" strokeWidth="1.5"/>
    <circle cx="130" cy="130" r={r} fill="none" stroke="#ffffff" strokeOpacity=".075" strokeWidth="5"/>
    {mode!=='stopwatch'&&<circle cx="130" cy="130" r={r} fill="none" stroke="#f2ae32" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference*(1-fraction)} transform="rotate(-90 130 130)"/>}
    {Array.from({length:60},(_,i)=>{const a=i*Math.PI/30,major=i%5===0, inner=major?83:88,outer=93;return <line key={i} x1={130+Math.sin(a)*inner} y1={130-Math.cos(a)*inner} x2={130+Math.sin(a)*outer} y2={130-Math.cos(a)*outer} stroke={major?'#d9e2e6':'#66737f'} strokeWidth={major?2:1}/>})}
    {[[60,130,65],[15,195,134],[30,130,202],[45,65,134]].map(([n,x,y])=><text key={n} x={x} y={y} textAnchor="middle" fontSize="11" fontWeight="700" fill="#95a5b2">{n}</text>)}
    <line x1="130" y1="137" x2="130" y2="69" transform={`rotate(${minuteAngle} 130 130)`} stroke="#eef5f4" strokeWidth="5" strokeLinecap="round"/>
    <line x1="130" y1="144" x2="130" y2="72" transform={`rotate(${secondAngle} 130 130)`} stroke="#f1b342" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="130" cy="130" r="7" fill="#f1b342"/><circle cx="130" cy="130" r="2.5" fill="#fff"/>
  </svg>;
}

function NewStudyTask({ onClose }) {
  const { state,todayKey,selectedSubject,putItem,toast }=useStudy();
  const [title,setTitle]=useState(PREMADE_SUBJECTS.includes(selectedSubject?.name)?selectedSubject.name:'');const [time,setTime]=useState('');const [minutes,setMinutes]=useState(30);const [error,setError]=useState('');
  const submit=e=>{e?.preventDefault();if(!PREMADE_SUBJECTS.includes(title)){setError('Choose a subject task.');return;}const selected=findSubject(state.subjects,title);putItem('todos',{id:uid('todo'),title,description:'',dateKey:todayKey,startTime:time,durationMin:Math.max(1,Math.min(720,Number(minutes)||30)),priority:'Medium',category:'Study',icon:selected?.icon||'',subjectId:selected?.id||'',presetSubject:title,notes:'',subtasks:[],done:false});toast('Subject task added.');onClose();};
  return <ModalShell title="Add a task" eyebrow="TODAY'S PLAN" onClose={onClose} className="study-preview-modal" wide><form onSubmit={submit}>
    <div className="form-label">Choose a subject task</div><SubjectCards compact label="Study task subject" subjects={state.subjects} value={title} onSelect={name=>{setTitle(name);setError('');}}/>{error&&<p className="tp-form-error" role="alert">{error}</p>}
    <div className="sp-modal-pair"><label className="form-label form-group">Time <span className="optional">(optional)</span><BanglaTimeInput className="form-input" value={time} onChange={e=>setTime(e.target.value)}/></label><div><div className="form-label">Estimated duration</div><MinuteStepper label="Task duration" value={minutes} onChange={setMinutes} step={5}/></div></div>
    <p className="fineprint">Added to today's timeline as a fixed subject task.</p><button type="button" onClick={submit} className="action-btn primary-emerald full-btn"><Plus size={15}/> Add task</button>
  </form></ModalShell>;
}

export default function StudyModeView(){
  const { state, timer, todaySec, todayKey, now, elapsedSec, remainingSec, displayTime, selectedSubject, dayTotal, navigate, setMode, setDuration, selectSubject, updatePrefs, openModal, startTimer, toggleTimer, endWithPrompt, sessionLocked, patchItem, commit, toast, saveStatus }=useStudy();
  const [manage,setManage]=useState(false),[taskEditor,setTaskEditor]=useState(false),[tools,setTools]=useState(false);
  const noteRef=useRef(null);const prefs=state.timerPrefs;const mode=timer?.mode||prefs.mode;
  const dates=Array.from({length:7},(_,i)=>addDays(new Date(now),i-6));
  const tasks=state.todos.filter(t=>t.dateKey===todayKey).slice().sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||''));
  const logs=state.sessions.filter(s=>sessionSecondsOnDay(s,todayKey)>0).slice().reverse();
  const goal=(Number(state.profile.dailyGoalMin)||300)*60;
  const removeSubject=s=>{
    if(timer?.subjectId===s.id){toast('Finish the current timer before removing this subject.');return;}
    openModal('confirm',{title:`Remove ${s.name}?`,description:'The subject will be removed from your list. Existing session history will be kept.',confirmLabel:'Remove subject',danger:true,onConfirm:()=>commit(prev=>{const subjects=prev.subjects.filter(x=>x.id!==s.id);return {...prev,subjects,timerPrefs:{...prev.timerPrefs,selectedSubjectId:prev.timerPrefs.selectedSubjectId===s.id?(subjects[0]?.id||''):prev.timerPrefs.selectedSubjectId}};})});
  };
  const addBullet=()=>{const box=noteRef.current;const text=prefs.scratchpad||'';const start=box?.selectionStart??text.length,end=box?.selectionEnd??start;const prefix=start>0&&text[start-1]!=='\n'?'\n':'';const add=prefix+'• ';updatePrefs({scratchpad:text.slice(0,start)+add+text.slice(end)});requestAnimationFrame(()=>{box?.focus();box?.setSelectionRange(start+add.length,start+add.length);});};
  return <div className="view-page study-page sp-page">
    <div className="sp-stack">
      <section className="card sp-subjects premium-subject-section">
        <div className="sp-section-head"><div><h2>Choose what to study</h2><p>Seven built-in subjects · select a card to focus.</p></div></div>
        <SubjectCards label="Focus subject cards" subjects={state.subjects} value={selectedSubject?.name} sessions={state.sessions} showStats onSelect={(name,sub)=>sub&&selectSubject(sub.id)}/>
        <details className="legacy-subjects"><summary>Manage additional / legacy subjects</summary><div className="sp-head-actions"><button className="action-btn" onClick={()=>setManage(!manage)}>{manage?'Done':'Manage'}</button><button className="action-btn" onClick={()=>openModal('subject')}><Plus size={15}/> Add subject</button></div><div className="legacy-subject-list">{state.subjects.filter(s=>!PREMADE_SUBJECTS.includes(s.name)).map(s=><div className="legacy-subject-row" key={s.id}><button type="button" onClick={()=>selectSubject(s.id)}><PreviewSubjectIcon subject={s} size={16}/> {s.name}</button>{manage&&<><button aria-label={`Edit ${s.name}`} onClick={()=>openModal('subject',s)}><Pencil size={14}/></button><button aria-label={`Remove ${s.name}`} onClick={()=>removeSubject(s)}><Trash2 size={14}/></button></>}</div>)}</div><p className="fineprint">Additional subjects and history are preserved.</p></details>
      </section>
      <section className="focus-stage-card sp-session">
        <div className="sp-session-top"><div><span className="card-kicker">FOCUS SESSION</span><h2 className="sp-session-subject">{timer?.phase==='break'?<><Coffee size={22}/> Break time</>:selectedSubject?<><span className="sp-title-icon" style={{color:selectedSubject.color}}><PreviewSubjectIcon subject={selectedSubject} size={22}/></span>{selectedSubject.name}</>:'Choose a subject'}</h2></div><div className="stage-actions"><button className="action-btn" onClick={()=>updatePrefs({focusViewStyle:prefs.focusViewStyle==='illustrated'?'analog':'illustrated'})}><Clock3 size={15}/><span>{prefs.focusViewStyle==='illustrated'?'Analog view':'Illustrated view'}</span></button><button className="icon-btn" aria-label="Open quick tools" title="Quick tools" onClick={()=>setTools(!tools)}><Grid2X2 size={16}/></button></div></div>
        {tools&&<div className="tools-popover"><div className="card-header"><span className="card-kicker">QUICK TOOLS</span><button className="plain-icon" aria-label="Close quick tools" onClick={()=>setTools(false)}><X size={15}/></button></div><div className="tools-grid-2col"><button className="tool-mini-btn" onClick={()=>{openModal('calculator');setTools(false);}}><Calculator size={16}/> Calculator</button><button className="tool-mini-btn" onClick={()=>{openModal('sounds');setTools(false);}}><Headphones size={16}/> Soundscapes</button><button className="tool-mini-btn" onClick={()=>{navigate('todo');setTools(false);}}><ListTodo size={16}/> Timeline</button><button className="tool-mini-btn" onClick={()=>{navigate('insights');setTools(false);}}><ChartNoAxesCombined size={16}/> Insights</button></div></div>}
        <div className="sp-session-type" role="group" aria-label="Focus session category"><span>SESSION TYPE</span>{['Study','Work'].map(kind=><button type="button" key={kind} disabled={!!timer} aria-pressed={(prefs.focusCategory || 'Study')===kind} className={(prefs.focusCategory || 'Study')===kind?'selected':''} onClick={()=>updatePrefs({focusCategory:kind})}>{kind}</button>)}</div>
        <div className="sp-settings"><div className="segmented small-segmented"><button className={mode==='pomodoro'?'selected':''} onClick={()=>setMode('pomodoro')}><Timer size={14}/> Pomodoro</button><button className={mode==='stopwatch'?'selected':''} onClick={()=>setMode('stopwatch')}><Clock3 size={14}/> Stopwatch</button></div>
          {mode==='pomodoro'&&<div className="sp-duration"><button aria-label="Decrease focus duration" disabled={!!timer||Number(prefs.focusMin)<=1} onClick={()=>setDuration(Math.max(1,Number(prefs.focusMin)-1),'custom')}><Minus size={15}/></button><strong>{prefs.focusMin} min</strong><button aria-label="Increase focus duration" disabled={!!timer||Number(prefs.focusMin)>=720} onClick={()=>setDuration(Math.min(720,Number(prefs.focusMin)+1),'custom')}><Plus size={15}/></button><button className="sp-duration-custom" onClick={()=>timer?toast('Finish the current session to change its duration.'):openModal('duration')}>Custom</button></div>}
        </div>
        <div className="sp-timer-center">
          {prefs.focusViewStyle==='analog'?<TimerDial seconds={remainingSec} total={timer?.durationSec||(Number(prefs.focusMin)||50)*60} mode={mode} displayTime={displayTime}/>:<StudyIllustration width={210}/>}
          <div className={`focus-status ${timer?.status==='running'?'active':''}`}><span/>{timer?(timer.phase==='break'?(timer.status==='running'?'On a break':'Break paused'):(timer.status==='running'?'Focusing':'Paused')):'Ready to focus'}</div>
          <div className="sp-timer-digits">{displayTime}</div><div className="sp-timer-caption">{mode==='stopwatch'?'ELAPSED TIME':'TIME REMAINING'}</div>
          <div className="sp-controls"><button className="round-ctrl-btn secondary" title="Soundscapes" aria-label="Open soundscapes" onClick={()=>openModal('sounds')}><Headphones size={18}/></button><button className="round-ctrl-btn" aria-label={timer?.status==='running'?'Pause timer':timer?'Resume timer':'Start timer'} onClick={toggleTimer}>{timer?.status==='running'?<Pause size={22} fill="currentColor"/>:<Play size={22} fill="currentColor"/>}</button><button className="round-ctrl-btn secondary" title={sessionLocked && timer?.status !== 'alarm' ? '7 মিনিট ফোকাস পূর্ণ — সেশন লকড' : 'Finish session'} aria-label="Finish session" disabled={!timer || (sessionLocked && timer?.phase !== 'break' && timer?.status !== 'alarm')} onClick={endWithPrompt}><Square size={16} fill="currentColor"/></button></div>
          {!timer&&<div className="dg-quick-breaks"><span>TAKE A BREAK</span><button type="button" onClick={()=>startTimer(null,{phase:'break',mode:'pomodoro',minutes:prefs.breakMin})}>Short · {prefs.breakMin}m</button><button type="button" onClick={()=>startTimer(null,{phase:'break',mode:'pomodoro',minutes:prefs.longBreakMin||15})}>Long · {prefs.longBreakMin||15}m</button></div>}
          <div className="sp-session-stats"><span>{selectedSubject?.name||'Subject'} today <strong>{formatHM(selectedSubject?dayTotal(todayKey,selectedSubject.id):0)}</strong></span><span>Today total <strong>{formatHM(todaySec)}</strong></span></div>
        </div>
      </section>
      <section className="card sp-notes"><div className="sp-section-head"><div className="sp-heading-icon"><span><BookOpen size={18}/></span><div><h2>Session scratchpad</h2></div></div><span className="sp-save-label">{saveStatus==='memory'?'PREVIEW ONLY':saveStatus==='error'?'SAVE ISSUE':saveStatus==='saving'?'SAVING…':'AUTO-SAVED'}</span></div>
        <textarea ref={noteRef} aria-label="Session scratchpad" value={prefs.scratchpad||''} onChange={e=>updatePrefs({scratchpad:e.target.value})} placeholder="Write a quick note, key idea or reminder..." rows="5"/><div className="sp-notes-foot"><span>Notes stay with your study space.</span><button onClick={addBullet}><List size={15}/> Add bullet</button></div>
      </section>
      <section className="card sp-tasks"><div className="sp-section-head"><div className="sp-heading-icon"><span><ListTodo size={18}/></span><div><h2>Today's tasks</h2></div></div><button className="action-btn primary-emerald" onClick={()=>setTaskEditor(true)}><Plus size={15}/> Add task</button></div>
        {tasks.length?<div className="sp-task-list">{tasks.slice(0,5).map(t=><label className="sp-task" key={t.id}><input type="checkbox" checked={!!t.done} onChange={e=>patchItem('todos',t.id,{done:e.target.checked})}/><span className={t.done?'strike':''}>{t.title}</span><small>{t.startTime||'Any time'}</small></label>)}</div>:<p className="sp-empty">No tasks for today. Add one when you're ready.</p>}
        <button className="text-button sp-open-planner" onClick={()=>navigate('todo')}>Open planner <ChevronRight size={14}/></button>
      </section>
      <section className="card sp-progress"><div className="sp-section-head"><div><h2>Study overview</h2></div></div><div className="study-top-pair"><div className="study-stat-tile"><span className="card-kicker">TODAY</span><strong>{formatHM(todaySec)}</strong><span className="amber-text">{Math.min(100,Math.round(todaySec/goal*100))}% of {formatHM(goal)} goal</span></div><div className="study-stat-tile"><div className="card-kicker">WEEKLY LOG</div><WeeklyBars dates={dates} dayTotal={dayTotal}/></div></div>
        <details className="sp-details"><summary>Today's subject goals</summary><div className="goal-list">{state.subjects.map(s=>{const value=dayTotal(todayKey,s.id),g=(s.dailyGoalMin||60)*60;return <div className="goal-item" key={s.id}><div><strong><PreviewSubjectIcon subject={s} size={15}/> {s.name}</strong><span>{formatHM(value)} / {formatHM(g)}</span></div><div className="progress-track"><span style={{width:`${Math.min(100,value/g*100)}%`,background:s.color}}/></div></div>})}</div><button className="text-button" onClick={()=>navigate('settings')}>Edit daily goal <ChevronRight size={14}/></button></details>
        <details className="sp-details"><summary>Today's session log <span>{logs.length}</span></summary>{logs.length?logs.map(s=><div className="log-row" key={s.id}><div className="log-dot" style={{background:state.subjects.find(x=>x.id===s.subjectId)?.color||'#f59e0b'}}/><div><strong>{s.subjectName}</strong><small>{new Date(s.startedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Dhaka'})} · {s.mode}</small></div><b>{formatHM(sessionSecondsOnDay(s,todayKey))}</b></div>):<p className="sp-empty">Your completed sessions will appear here.</p>}</details>
      </section>
    </div>
    {taskEditor&&<NewStudyTask onClose={()=>setTaskEditor(false)}/>}
  </div>;
}
