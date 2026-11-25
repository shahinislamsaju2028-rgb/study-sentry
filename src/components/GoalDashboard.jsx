import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, BookOpen, Check, CirclePlay, Clock3, ExternalLink, GraduationCap, LayoutGrid, NotebookPen, ShieldCheck, Target } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { ModalShell } from './Modals';
import { PreviewSubjectIcon } from './PreviewSubjectIcon';
import SubjectCards from './SubjectCards';
import JunkNotes from './JunkNotes';
import StrictGuardPanel from './StrictGuardPanel';
import { GOAL_SUBJECTS, DEEP_GOAL_SECONDS, deepGoalElapsed, formatClockMinutes } from '../utils/deepGoal';

const tabs=[{id:'today',name:'Today',Icon:LayoutGrid},{id:'tracking',name:'Subject Tracking',Icon:Target},{id:'notes',name:'Junk Notes',Icon:NotebookPen},{id:'guard',name:'Focus Guard',Icon:ShieldCheck}];
function SubjectPicker({slot,onClose}){
  const {state,startDeepGoal}=useStudy();
  useEffect(()=>{const key=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
  return createPortal(<ModalShell title={`Choose Study GOAL ${slot}`} eyebrow="FIXED SUBJECTS" className="dg-subject-modal" onClose={onClose} wide>
    <p className="dg-modal-intro">Choose a fixed subject. Each GOAL is 90 minutes of focus plus a 10-minute break.</p><SubjectCards compact label="Fixed Study GOAL subjects" subjects={state.subjects} onSelect={name=>{if(startDeepGoal(name,{slot}))onClose();}}/><p className="dg-fineprint">Class has its own three GOAL slots. Custom GOAL names cannot be typed in.</p>
  </ModalShell>,document.body);
}
function Slot({kind,index,goal,onChoose}){
  const {state,now,startDeepGoal,updatePip}=useStudy();const current=state.activeTimer;
  const isActive=!!goal&&current?.kind==='deep_goal'&&current.goalId===goal.id;
  const elapsed=goal?Math.min(DEEP_GOAL_SECONDS,Math.max(Number(goal.savedSec)||0,isActive?deepGoalElapsed(current,now):0)):0;
  const complete=elapsed>=DEEP_GOAL_SECONDS;
  const group=kind==='class'?'Class':'Study';
  const action=()=>{if(!goal){if(kind==='class')startDeepGoal('Class',{slot:index});else onChoose(index);return;}if(isActive){updatePip({open:true});return;}if(!complete)startDeepGoal(goal.subject,{goalId:goal.id});};
  return <button type="button" className={`dg-slot ${complete?'done':isActive?'running':goal?'partial':'empty'}`} aria-label={`${goal?(complete?'Completed':isActive?'View':`Resume ${goal.subject}`):'Start'} ${group} GOAL ${index}`} onClick={action} disabled={complete}>
    <span className="dg-slot-head"><span>{group.toUpperCase()} {String(index).padStart(2,'0')}</span>{complete?<Check size={14}/>:<CirclePlay size={15}/>}</span><strong>{goal?goal.subject:kind==='class'?'Class':'Choose subject'}</strong><small>{goal?complete?'90 min complete':`${formatClockMinutes(elapsed)} / 90:00`:'Ready for 90 min'}</small><i className="dg-slot-bar"><i style={{width:`${elapsed/DEEP_GOAL_SECONDS*100}%`}}/></i>
  </button>;
}
function Tracking(){
  const {state,now,startDeepGoal,updatePip}=useStudy();const current=state.activeTimer;
  const goals=[...(state.deepGoals||[])].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const partial=goals.filter(g=>Number(g.savedSec)<DEEP_GOAL_SECONDS);
  return <section className="dg-tracking" aria-label="Subject Tracking"><div className="dg-panel-head"><div><span className="dg-kicker">PICK UP WHERE YOU LEFT OFF</span><h3>Subject Tracking</h3><p>Every focused minute is saved when storage is available.</p></div></div>
    {partial.length?<div className="dg-tracking-list">{partial.map(goal=>{const active=current?.kind==='deep_goal'&&current.goalId===goal.id;const elapsed=Math.min(DEEP_GOAL_SECONDS,Math.max(Number(goal.savedSec)||0,active?deepGoalElapsed(current,now):0));return <article key={goal.id}><span className="dg-track-icon"><PreviewSubjectIcon subject={{name:goal.subject}} size={18}/></span><div><strong>{goal.subject}</strong><small>{goal.dateKey} · {goal.kind==='class'?'Class':'Study'} GOAL {goal.slot}</small>{goal.taskTitle&&<small>Linked task: {goal.taskTitle}</small>}<div className="dg-track-bar"><i style={{width:`${elapsed/DEEP_GOAL_SECONDS*100}%`}}/></div><small>{formatClockMinutes(elapsed)} saved · {formatClockMinutes(DEEP_GOAL_SECONDS-elapsed)} remaining</small></div><button type="button" onClick={()=>active?updatePip({open:true}):startDeepGoal(goal.subject,{goalId:goal.id})}>{active?'View timer':'Resume'} <ArrowRight size={14}/></button></article>;})}</div>:<div className="dg-empty"><Target size={20}/><strong>No unfinished GOALs</strong><span>Start a GOAL or return here after a Half-GOAL Exit.</span></div>}
    {!!goals.filter(g=>Number(g.savedSec)>=DEEP_GOAL_SECONDS).length&&<p className="dg-fineprint">{goals.filter(g=>Number(g.savedSec)>=DEEP_GOAL_SECONDS).length} completed GOAL(s) in your local history.</p>}
  </section>;
}
export default function GoalDashboard(){
  const {state,todayKey,updatePip}=useStudy();const [tab,setTab]=useState('today'),[slot,setSlot]=useState(null);
  const today=(state.deepGoals||[]).filter(g=>g.dateKey===todayKey);
  return <section className="card dg-dashboard" id="deep-goal-dashboard" aria-labelledby="dg-title"><div className="dg-dashboard-head"><div className="dg-head-title"><span className="dg-mark"><Target size={20}/></span><div><span className="dg-kicker">FOCUS, ONE BLOCK AT A TIME</span><h2 id="dg-title">Deep GOAL</h2><p>90 minutes of focus · 10-minute break · progress saved each minute</p></div></div><button type="button" className="dg-open-pip" onClick={()=>updatePip({open:true})}><ExternalLink size={15}/> Open floating timer</button></div>
    <div className="dg-preview-note"><ShieldCheck size={14}/><span>HTML preview: floats inside this page only. Right-click the timer or use its top-right menu; app and tab blocking are simulated.</span></div>
    <div className="dg-tabs" role="tablist" aria-label="Deep GOAL dashboard">{tabs.map(({id,name,Icon})=><button type="button" role="tab" aria-selected={tab===id} className={tab===id?'active':''} key={id} onClick={()=>setTab(id)}><Icon size={14}/>{name}</button>)}</div>
    {tab==='today'&&<div className="dg-today"><div className="dg-row-heading"><div><BookOpen size={16}/><strong>Study GOALs</strong><span>5 daily slots</span></div><small>{today.filter(g=>g.kind==='study'&&Number(g.savedSec)>=DEEP_GOAL_SECONDS).length} / 5 complete</small></div><div className="dg-slot-grid study">{Array.from({length:5},(_,i)=><Slot key={i} kind="study" index={i+1} goal={today.find(g=>g.kind==='study'&&Number(g.slot)===i+1)} onChoose={setSlot}/>)}</div><div className="dg-row-heading class"><div><GraduationCap size={16}/><strong>Class GOALs</strong><span>3 daily slots</span></div><small>{today.filter(g=>g.kind==='class'&&Number(g.savedSec)>=DEEP_GOAL_SECONDS).length} / 3 complete</small></div><div className="dg-slot-grid classes">{Array.from({length:3},(_,i)=><Slot key={i} kind="class" index={i+1} goal={today.find(g=>g.kind==='class'&&Number(g.slot)===i+1)} onChoose={setSlot}/>)}</div><div className="dg-rule-note"><Clock3 size={14}/><span>After 7 minutes, normal Stop / Reset / Exit lock until the GOAL ends. Half-GOAL Exit is available once daily after 45 minutes.</span></div><p className="dg-fineprint">Keep the preview open during a session. Storage and alarm sound depend on the browser and its settings.</p></div>}
    {tab==='tracking'&&<Tracking/>}{tab==='notes'&&<JunkNotes/>}{tab==='guard'&&<StrictGuardPanel/>}
    {slot!==null&&<SubjectPicker slot={slot} onClose={()=>setSlot(null)}/>}
  </section>;
}
