import { BanglaNumberInput } from './BanglaInputs';
import React, { useState } from 'react';
import { Minus, Plus, Check } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { bnNum } from '../utils/bangla';
import { uid } from '../utils/seedData';
import { STUDY_ICONS, iconKeyFor } from './PreviewSubjectIcon';

export function MinuteStepper({ value, onChange, label, min=1, max=720, step=1 }) {
  const clamp = v => Math.min(max, Math.max(min, Number(v) || min));
  return <div className="sp-stepper">
    <button type="button" aria-label={`Reduce ${label}`} onClick={()=>onChange(clamp(Number(value || min)-step))} disabled={Number(value)<=min}><Minus size={15}/></button>
    <BanglaNumberInput plain  inputMode="numeric" aria-label={label} min={min} max={max} value={value} onChange={e=>onChange(e.target.value === '' ? '' : Number(e.target.value))} onBlur={()=>onChange(clamp(value))}/>
    <span>min</span>
    <button type="button" aria-label={`Increase ${label}`} onClick={()=>onChange(clamp(Number(value || 0)+step))} disabled={Number(value)>=max}><Plus size={15}/></button>
  </div>;
}
export function StudyDurationModal({ Shell }) {
  const { state, setDuration, closeModal }=useStudy();
  const [minutes,setMinutes]=useState(Number(state.timerPrefs.focusMin)||50);
  const valid=Number(minutes)>=1 && Number(minutes)<=720;
  return <Shell title="Focus time" eyebrow="Timer settings" onClose={closeModal} className="study-preview-modal">
    <p className="modal-intro">Choose how long to focus.</p>
    <MinuteStepper label="Focus time" value={minutes} onChange={setMinutes}/>
    <div className="sp-preset-modal">{[25,50,90].map(v=><button type="button" key={v} className={Number(minutes)===v?'selected':''} onClick={()=>setMinutes(v)}>{bnNum(v)} min</button>)}</div>
    <button className="action-btn primary-amber full-btn" disabled={!valid} onClick={()=>{if(setDuration(Number(minutes),'custom'))closeModal();}}>fix the time</button>
    <p className="fineprint">Choose the time between 1 and 720 minutes.</p>
  </Shell>;
}
export function StudySubjectModal({ Shell, existing }) {
  const { state, putItem, closeModal, toast }=useStudy();
  const [name,setName]=useState(existing?.name||'');
  const [iconKey,setIconKey]=useState(iconKeyFor(existing));
  const [color,setColor]=useState(existing?.color||'#10b981');
  const [goal,setGoal]=useState(existing?.dailyGoalMin||60);
  const [error,setError]=useState('');
  const submit=e=>{
    e.preventDefault();const title=name.trim(); if(!title) { setError("Enter the subject name."); return; }
    if(state.subjects.some(s=>s.id!==existing?.id && s.name.trim().toLowerCase()===title.toLowerCase())) { setError("This topic already exists. Choose another name."); return; }
    const item=STUDY_ICONS.find(i=>i.key===iconKey)||STUDY_ICONS[7];
    putItem('subjects',{...(existing||{}),id:existing?.id||uid('subj'),name:title,icon:item.legacy,previewVectorIcon:iconKey,color,dailyGoalMin:Math.max(1,Math.min(720,Number(goal)||60))});
    toast(existing?"Subject has been updated.":"Topic added.");closeModal();
  };
  return <Shell title={existing?"change the subject":"Add topic"} eyebrow="reading matter" onClose={closeModal} className="study-preview-modal" wide>
    <form onSubmit={submit} onKeyDown={e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();submit(e);}}}>
      <label className="form-label form-group">subject name<input className="form-input" value={name} onChange={e=>{setName(e.target.value);setError('');}} placeholder="For example: history" maxLength="60" required autoFocus/></label>
      {error&&<p className="sp-form-error" role="alert">{error}</p>}
      <div className="form-label">Select the symbol</div><div className="sp-icon-choices">{STUDY_ICONS.map(item=>{const Icon=item.Icon;return <button type="button" key={item.key} className={iconKey===item.key?'selected':''} title="subject sign" aria-label="subject sign" aria-pressed={iconKey===item.key} onClick={()=>setIconKey(item.key)}><Icon size={18}/></button>})}</div>
      <div className="sp-modal-pair"><div><div className="form-label">daily goals</div><MinuteStepper label="daily goals" value={goal} onChange={setGoal} step={5}/></div><div><div className="form-label">the color</div><div className="sp-colors">{['#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#ef4444','#14b8a6'].map(c=><button type="button" key={c} aria-label={`Choose color ${c}`}  aria-pressed={color===c} className={color===c?'selected':''} style={{background:c}} onClick={()=>setColor(c)}/>)}</div></div></div>
      <button type="button" onClick={submit} className="action-btn primary-emerald full-btn"><Check size={15}/> {existing?"Save changes":"Add topic"}</button>
    </form>
  </Shell>;
}
