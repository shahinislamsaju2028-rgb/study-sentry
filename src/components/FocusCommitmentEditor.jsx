import { BanglaNumberInput, BanglaDateInput, BanglaTimeInput } from './BanglaInputs';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Check, Minus, Plus } from 'lucide-react';
import { ModalShell } from './Modals';
import { useStudy } from '../context/StudyContext';
import { addDays, toDateKey, civilDateKey } from '../utils/seedData';
import { bnDate, bnNum, bnSample } from '../utils/bangla';
import { dateFromKey } from '../utils/stats';
import { dayCountInclusive, deadlineKeyFor } from '../utils/goalAnalytics';

function NumberControl({ label, unit, value, onChange, min, max, step }) {
  const clamp=v=>Math.round(Math.max(min,Math.min(max,Number(v)||min))*100)/100;
  return <div className="df-number-control">
    <button type="button" aria-label={`Decrease ${label}`} disabled={Number(value)<=min} onClick={()=>onChange(clamp(Number(value||min)-step))}><Minus size={15}/></button>
    <BanglaNumberInput plain inputMode="decimal" aria-label={label} min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value===''?'':e.target.value)} onBlur={()=>onChange(clamp(value))}/>
    <span>{unit}</span>
    <button type="button" aria-label={`Increase ${label}`} disabled={Number(value)>=max} onClick={()=>onChange(clamp(Number(value||0)+step))}><Plus size={15}/></button>
  </div>;
}

function CalendarPicker({value,onChange,open,setOpen,label='Start date'}) {
  const wrapper=useRef(null),trigger=useRef(null);
  const initial=dateFromKey(value); const [month,setMonth]=useState(()=>new Date(initial.getFullYear(),initial.getMonth(),1,12));
  const [focused,setFocused]=useState(value||toDateKey());
  useEffect(()=>{if(!open)return;const outside=e=>{if(wrapper.current&&!wrapper.current.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open,setOpen]);
  const toggle=()=>{if(!open){const d=dateFromKey(value);setMonth(new Date(d.getFullYear(),d.getMonth(),1,12));setFocused(value);}setOpen(!open);};
  const moveMonth=offset=>{const next=new Date(month.getFullYear(),month.getMonth()+offset,1,12);setMonth(next);setFocused(civilDateKey(next));};
  const pick=key=>{onChange(key);setFocused(key);setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());};
  const first=new Date(month.getFullYear(),month.getMonth(),1,12);const count=new Date(month.getFullYear(),month.getMonth()+1,0,12).getDate();
  const display=bnDate(dateFromKey(value),{day:'numeric',month:'short',year:'numeric'});
  const shiftFocus=(event,key)=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];const next=addDays(dateFromKey(key),delta);const nextKey=toDateKey(next);setFocused(nextKey);if(next.getMonth()!==month.getMonth()||next.getFullYear()!==month.getFullYear())setMonth(new Date(next.getFullYear(),next.getMonth(),1,12));requestAnimationFrame(()=>wrapper.current?.querySelector(`[data-date="${nextKey}"]`)?.focus());};
  return <div className="df-date-wrap" ref={wrapper}>
    <button ref={trigger} type="button" className="df-date-trigger" aria-label={`${label}, ${display}`} aria-haspopup="dialog" aria-expanded={open} onClick={toggle}><CalendarDays size={17}/><span>{display}</span><ChevronDown size={15}/></button>
    {open&&<div className="df-calendar" role="dialog" aria-label="Pick a date">
      <div className="df-calendar-head"><button type="button" aria-label="Previous month" onClick={()=>moveMonth(-1)}><ChevronLeft size={16}/></button><strong aria-live="polite">{bnDate(month,{month:'long',year:'numeric'})}</strong><button type="button" aria-label="Next month" onClick={()=>moveMonth(1)}><ChevronRight size={16}/></button></div>
      <div className="df-calendar-week">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d}>{d}</span>)}</div>
      <div className="df-calendar-grid">{Array.from({length:first.getDay()},(_,i)=><span key={`blank-${i}`}/>)}{Array.from({length:count},(_,i)=>{const d=new Date(month.getFullYear(),month.getMonth(),i+1,12),key=civilDateKey(d),active=key===value;return <button type="button" key={key} data-date={key} className={active?'selected':''} aria-label={bnDate(d,{weekday:'long',month:'long',day:'numeric',year:'numeric'})} aria-pressed={active} tabIndex={focused===key?0:-1} onKeyDown={e=>shiftFocus(e,key)} onClick={()=>pick(key)}>{i+1}</button>})}</div>
      <div className="df-calendar-foot"><button type="button" onClick={()=>pick(toDateKey())}>Today</button><button type="button" onClick={()=>{setOpen(false);trigger.current?.focus();}}>Done</button></div>
    </div>}
  </div>;
}

export default function FocusCommitmentEditor({ commitment, onClose, linkedSprint }) {
  const { state, updateCommitment, toast, t }=useStudy();
  const shownTitle=bnSample(commitment.title,state.isDemo);
  const [picker,setPicker]=useState(''),[error,setError]=useState('');
  const [form,setForm]=useState(()=>{
    const start=commitment.startedDateKey||toDateKey(), end=deadlineKeyFor(commitment);
    return {title:shownTitle, targetHoursPerDay:commitment.targetHoursPerDay??5, dailyBreakMinutes:commitment.dailyBreakMinutes??0, totalDays:dayCountInclusive(start,end)||30, pledge:commitment.pledge||'', startedDateKey:start, deadlineDateKey:end, deadlineTime:commitment.deadlineTime||'23:59', category:commitment.category||'Study', weekdayHours:{...(commitment.weekdayHours||{})}, dateRows:Object.entries(commitment.dateHours||{}).map(([date,hours])=>({date,hours})), windowStart:commitment.windowStart||'', windowEnd:commitment.windowEnd||''};
  });
  const set=(key,value)=>setForm(prev=>({...prev,[key]:value}));
  const setDays=value=>setForm(prev=>{const n=Math.max(1,Math.min(3650,Math.round(Number(value)||1)));return {...prev,totalDays:value,deadlineDateKey:toDateKey(addDays(dateFromKey(prev.startedDateKey),n-1))};});
  const setStart=value=>setForm(prev=>({...prev,startedDateKey:value,deadlineDateKey:linkedSprint?linkedSprint.end:toDateKey(addDays(dateFromKey(value),Math.max(1,Math.min(3650,Math.round(Number(prev.totalDays)||1)))-1))}));
  const setDeadline=value=>setForm(prev=>({...prev,deadlineDateKey:value,totalDays:dayCountInclusive(prev.startedDateKey,value)||1}));
  useEffect(()=>{const key=e=>{if(e.key==='Escape'){e.stopPropagation();if(picker)setPicker('');else onClose();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[picker,onClose]);
  const save=e=>{
    e?.preventDefault();const shown=form.title.trim(), title=shown===shownTitle?(commitment.title||shown):shown, count=dayCountInclusive(form.startedDateKey,form.deadlineDateKey), target=Number(form.targetHoursPerDay);
    if(!title){setError("লক্ষ্যের নাম লিখুন।");return;}
    if(!Number.isFinite(target)||target<.25||target>24){setError("দৈনিক লক্ষ্য ০.২৫ থেকে ২৪ ঘণ্টার মধ্যে হতে হবে।");return;}
    const breakMinutes=Number(form.dailyBreakMinutes);
    if(!Number.isFinite(breakMinutes)||breakMinutes<0||breakMinutes>1440){setError(t('Daily break must be between 0 and 1,440 minutes.',"দৈনিক বিরতি ০ থেকে ১,৪৪০ মিনিটের মধ্যে রাখুন।"));return;}
    if(!count||count>3650){setError("শেষ তারিখ শুরুর দিন বা তার পরে এবং ৩,৬৫০ দিনের মধ্যে হতে হবে।");return;}
    if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.deadlineTime)){setError("শেষ সময় নির্ধারণ করুন।");return;}
    if((form.windowStart||form.windowEnd)&&(!form.windowStart||!form.windowEnd||form.windowEnd<=form.windowStart)){setError("Give both the start and end times; The deadline will be later.");return;}
    const weekdayHours={};
    for(const [day,value] of Object.entries(form.weekdayHours)){if(value===''||value==null)continue;const n=Number(value);if(!Number.isFinite(n)||n<0||n>24){setError("দৈনিক লক্ষ্য ০ থেকে ২৪ ঘণ্টার মধ্যে হতে হবে।");return;}weekdayHours[day]=n;}
    const dateHours={};
    for(const row of form.dateRows){if(!row.date||row.hours===''){setError("Enter the date and time of each special day, or remove the row.");return;}const n=Number(row.hours);if(!Number.isFinite(n)||n<0||n>24){setError("Special day targets should be between 0 and 24 hours.");return;}if(Object.prototype.hasOwnProperty.call(dateHours,row.date)){setError("একই বিশেষ তারিখ একবারই যোগ করা যাবে।");return;}dateHours[row.date]=n;}
    updateCommitment({active:true,title,targetHoursPerDay:target,dailyBreakMinutes:breakMinutes,totalDays:count,pledge:form.pledge.trim(),startedDateKey:form.startedDateKey,deadlineDateKey:form.deadlineDateKey,deadlineTime:form.deadlineTime,category:form.category,weekdayHours,dateHours,windowStart:form.windowStart,windowEnd:form.windowEnd});
    toast("আপনার লক্ষ্য সংরক্ষিত হয়েছে।");onClose();
  };
  const breakHours=(Number(form.dailyBreakMinutes)||0)/60;
  const tooLong=[form.targetHoursPerDay,...Object.values(form.weekdayHours),...form.dateRows.map(r=>r.hours)].some(v=>v!==''&&v!=null&&Number(v)+breakHours>24);
  const days=[['0','Sun'],['1','Mon'],['2','Tue'],['3','Wed'],['4','Thu'],['5','Fri'],['6','Sat']];
  return createPortal(<ModalShell title={commitment.active?t('Edit goal setup',"Change the target"):t('Create goal setup',"setting goals")} eyebrow={t('YOUR GOAL',"your goal")} onClose={onClose} className="focus-edit-modal" wide>
    <form onSubmit={save} onKeyDown={e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&!e.target.closest('.df-custom-days')){e.preventDefault();save(e);}}}>
      <label className="form-label form-group">{t('Project name',"Project name")}<input aria-label={t('Project name',"Project name")} className="form-input" value={form.title} onChange={e=>{set('title',e.target.value);setError('');}} placeholder={t('e.g. Exam preparation',"Eg: Exam preparation")} required maxLength="100" autoFocus/></label>
      <div className="form-group"><div className="form-label">{t('Work type',"type of work")}</div><div className="df-category" role="group" aria-label={t('Goal category',"type of work")}>{['Study','Work','Both'].map(c=><button key={c} type="button" className={form.category===c?'selected':''} aria-pressed={form.category===c} onClick={()=>set('category',c)}>{t(c,{Study:"to read",Work:"work",Both:"both"}[c])}</button>)}</div></div>
      <div className="df-number-grid"><div><div className="form-label">{t('Focus hours / day',"Daily focus hours")}</div><NumberControl label={t('Target hours per day',"Daily target hours")} unit={t('hrs',"hours")} value={form.targetHoursPerDay} onChange={v=>set('targetHoursPerDay',v)} min={.25} max={24} step={.25}/></div><div><div className="form-label">{t('Break minutes / day',"Daily Interval (Minutes)")}</div><NumberControl label={t('Daily break minutes',"Daily Interval Minutes")} unit={t('min',"min")} value={form.dailyBreakMinutes} onChange={v=>set('dailyBreakMinutes',v)} min={0} max={1440} step={5}/></div></div>
      {tooLong&&<p className="goal-overday-warning" role="alert">{t('Warning: a daily focus target plus its break exceeds 24 hours. Adjust the target, break or custom days.',"সতর্কতা: দৈনিক Focus ও বিরতির মোট সময় ২৪ ঘণ্টার বেশি। লক্ষ্য, বিরতি বা বিশেষ দিনের সময় কমান।")}</p>}
      <div className="df-date-grid"><div className="form-group df-date-group"><div className="form-label">{t('Start date',"start date")}</div><CalendarPicker value={form.startedDateKey} onChange={setStart} open={picker==='start'} setOpen={v=>setPicker(v?'start':'')}/></div>{linkedSprint?<div className="df-linked-deadline" role="note"><span>Sprint deadlines</span><strong>{linkedSprint.end} · {linkedSprint.endTime||'23:59'}</strong><small>নির্বাচিত Sprint থেকে স্বয়ংক্রিয়ভাবে নির্ধারিত।</small></div>:<><div className="form-group df-date-group"><div className="form-label">{t('Deadline date',"Last date")}</div><CalendarPicker label="Deadline date" value={form.deadlineDateKey} onChange={setDeadline} open={picker==='deadline'} setOpen={v=>setPicker(v?'deadline':'')}/></div><label className="form-label form-group df-time-label">{t('Deadline time',"last time")} <small>(24-hour)</small><BanglaTimeInput className="form-input" aria-label={t('Deadline time',"last time")} value={form.deadlineTime} onChange={e=>set('deadlineTime',e.target.value)}/></label></>}</div>
      <details className="df-custom-days"><summary>{t('Holidays & availability',"Holidays and times")} <ChevronDown size={15}/></summary><div className="df-custom-inner"><p>{t('Leave a day blank to use the daily target. Use 0 for a rest day.',"দৈনিক লক্ষ্য ব্যবহার করতে ঘর ফাঁকা রাখুন। ছুটির দিনে ০ লিখুন।")}</p><div className="df-week-hours">{days.map(([key,label])=><label key={key}><span>{label}</span><BanglaNumberInput plain inputMode="decimal" min="0" max="24" step=".25" aria-label={`${label} target hours of the day`} placeholder="common goal" value={form.weekdayHours[key]??''} onChange={e=>set('weekdayHours',{...form.weekdayHours,[key]:e.target.value})}/></label>)}</div><div className="df-special-head"><strong>{t('Specific dates / holidays',"বিশেষ তারিখ / ছুটির দিন")}</strong><button type="button" onClick={()=>set('dateRows',[...form.dateRows,{date:'',hours:''}])}><Plus size={13}/> {t('Add day',"add days")}</button></div>{form.dateRows.map((row,i)=><div className="df-special-row" key={i}><BanglaDateInput  aria-label={`Special date ${i+1}`} value={row.date} onChange={e=>set('dateRows',form.dateRows.map((r,j)=>j===i?{...r,date:e.target.value}:r))}/><BanglaNumberInput  aria-label={`Special date ${i+1} hours`} placeholder="hours" min="0" max="24" step=".25" value={row.hours} onChange={e=>set('dateRows',form.dateRows.map((r,j)=>j===i?{...r,hours:e.target.value}:r))}/><button type="button" aria-label={`Remove special date ${i+1}`} onClick={()=>set('dateRows',form.dateRows.filter((_,j)=>j!==i))}>×</button></div>)}<p>{t('Optional daily availability window. Leave both empty to use the entire day.',"সময় নির্ধারণ করা ঐচ্ছিক। পুরো দিন ধরতে দুটিই খালি রাখুন।")}</p><div className="df-window-grid"><label>Start time<BanglaTimeInput className="form-input"  aria-label="Start time" value={form.windowStart} onChange={e=>set('windowStart',e.target.value)}/></label><label>End time<BanglaTimeInput className="form-input"  aria-label="End time" value={form.windowEnd} onChange={e=>set('windowEnd',e.target.value)}/></label></div></div></details>
      {error&&<p className="wr-form-error" role="alert">{error}</p>}
      <div className="df-modal-actions"><button type="button" className="action-btn" onClick={onClose}>{t('Cancel',"canceled")}</button><button type="button" onClick={save} className="action-btn primary-emerald"><Check size={15}/> লক্ষ্য সংরক্ষণ</button></div>
    </form>
  </ModalShell>, document.body);
}
