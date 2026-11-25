import React from 'react';
import { useStudy } from '../context/StudyContext';
import { SUBJECT_ACTIVITIES,activityName,activityBangla } from '../utils/subjectActivities';
import { uid } from '../utils/seedData';
export default function PresetSubtasks({items=[],onChange}){
 const {t}=useStudy();
 const safe=Array.isArray(items)?items:[];
 return <div className="preset-subtasks" role="group" aria-label={t('Preset subtasks',"Created sub-tasks")}>
  {SUBJECT_ACTIVITIES.map(name=>{const selected=safe.some(x=>activityName(x.text)===name);return <label key={name}><input type="checkbox" checked={selected} onChange={e=>onChange(e.target.checked?[...safe,{id:uid('subtask'),text:name,done:false}]:safe.filter(x=>activityName(x.text)!==name))}/><span>{t(name,activityBangla[name])}</span></label>;})}
 </div>;
}
