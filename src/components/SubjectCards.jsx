import React from 'react';
import { Check } from 'lucide-react';
import { PREMADE_SUBJECTS, SUBJECT_PALETTES, findSubject } from '../utils/premadeSubjects';
import { bnNum, bnSubject } from '../utils/bangla';
import PremiumSubjectIcon from './PremiumSubjectIcon';

export default function SubjectCards({subjects=[],value='',onSelect,label="Choose a topic",compact=false,sessions=[],showStats=false,disabled=false,includeClass=false}){
 const names=includeClass?[...PREMADE_SUBJECTS,'Class']:PREMADE_SUBJECTS;
 const maxSeconds=Math.max(1,...names.map(name=>{const sub=findSubject(subjects,name);return sessions.filter(s=>sub&&s.subjectId===sub.id).reduce((n,s)=>n+(Number(s.durationSec)||0),0);}));
 return <div className={`premium-subject-grid v48-subject-chips ${compact?'compact':''}`} role="group" aria-label={label}>{names.map(name=>{
  const info=SUBJECT_PALETTES[name],sub=findSubject(subjects,name),selected=value===name;
  const logs=sessions.filter(s=>sub&&s.subjectId===sub.id),sec=logs.reduce((n,s)=>n+(Number(s.durationSec)||0),0);
  return <button type="button" key={name} className={`premium-subject-card ${selected?'selected':''}`} style={{'--sc-color':info.color,'--sc-bg':info.bg,'--sc-edge':info.edge}} aria-pressed={selected} disabled={disabled} onClick={()=>onSelect(name,sub)}>
    <span className="premium-subject-icon"><PremiumSubjectIcon name={name} size={18}/></span><span className="premium-subject-copy"><strong>{bnSubject(name)}</strong>{showStats&&<small>{bnNum(logs.length)} session · {bnNum(Math.floor(sec/60))} min</small>}</span>{selected&&<Check className="premium-subject-check" size={14}/>} {showStats&&<i className="premium-subject-track" title="Time compared to most read topics"><i style={{width:`${Math.min(100,sec/maxSeconds*100)}%`}}/></i>}
  </button>;
 })}</div>;
}
