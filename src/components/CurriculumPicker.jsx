import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
  PencilLine,
  LibraryBig,
  Search,
  Check,
  X,
  Layers,
  BookOpen,
  ListTree,
  Layers3,
} from 'lucide-react';
import {sprintChapterName} from '../utils/sprintSchedule';
import { bnNum, bnSubject } from '../utils/bangla';
import { COMMON_HSC_SUBJECTS, getAcademicGroup, groupCatalogKeys } from '../utils/groupSubjects';
import { useOptionalStudy } from '../context/StudyContext';

let catalogPromise;
let catalogGroup = null;

/**
 * Pre-made chapter catalog for ONE academic group.
 *
 * The old build merged science + humanities + business into a single flat
 * object, so a ব্যবসায় শিক্ষা student still saw the Physics / Chemistry /
 * Biology chapter lists. The catalog is now scoped to the selected group:
 * the group's own subjects plus the three common ones (বাংলা · ইংলিশ · আইসিটি).
 */
export function loadCurriculum(group = 'science'){
  const key = getAcademicGroup({ academicGroup: group });
  if (catalogPromise && catalogGroup === key) return catalogPromise;
  catalogGroup = key;
  catalogPromise = Promise.all([import('../data/hscCatalog.json'),import('../data/hscGroupCatalog.json')]).then(([science,groups])=>{
    const year = groups.default?.['2028'] || {};
    const pool = {};
    if (key === 'science') {
      for (const name of groupCatalogKeys('science')) {
        if (science.default?.[name]) pool[name] = science.default[name];
      }
    } else {
      for (const name of groupCatalogKeys(key)) {
        const own = year[key]?.[name];
        // Economics + Geography & Environment are shared by মানবিক and
        // ব্যবসায় — business reuses the humanities chapter list for those.
        pool[name] = own || year.humanities?.[name] || {};
      }
    }
    // বাংলা · ইংলিশ · আইসিটি stay available for every group.
    for (const name of COMMON_HSC_SUBJECTS) {
      if (science.default?.[name]) pool[name] = science.default[name];
    }
    return pool;
  }).catch(e=>{catalogPromise=null;catalogGroup=null;throw e});
  return catalogPromise;
}

const PAPERS = [['1','প্রথম পত্র','1st Paper'],['2','দ্বিতীয় পত্র','2nd Paper']];

// Step-by-step, tap-friendly curriculum selector:
// পত্র → অধ্যায় → টাইপ → টপিক. Every step is a big touch target, never a dense dropdown.
//
// `multi` enables the multi-chapter flow the student asked for: pick a chapter,
// then Ctrl/Cmd + click further chapters to add them instead of swapping the
// previous selection away.
export default function CurriculumPicker({subject,paper='',chapter='',type='',topic='',onChange,shortSprintChapter=false,multi=false,chapters=[]}) {
 const study = useOptionalStudy();
 const academicGroup = getAcademicGroup(study?.state?.profile || {});
 const [catalog,setCatalog]=useState(null),[loadError,setLoadError]=useState(false),[manual,setManual]=useState(false),[q,setQ]=useState('');
 const [multiSel,setMultiSel]=useState(()=>(Array.isArray(chapters)&&chapters.length?chapters:chapter?[chapter]:[]));
 useEffect(()=>{let alive=true;setCatalog(null);loadCurriculum(academicGroup).then(c=>{if(alive)setCatalog(c)}).catch(()=>{if(alive)setLoadError(true)});return()=>{alive=false}},[academicGroup]);
 useEffect(()=>{setManual(false);setQ('')},[subject]);
 useEffect(()=>{
   if(!multi) return;
   setMultiSel(prev=>{
     const incoming=Array.isArray(chapters)&&chapters.length?chapters:(chapter?[chapter]:[]);
     const a=prev.join('|'), b=incoming.join('|');
     return a===b?prev:incoming;
   });
 },[multi,chapters,chapter]);

 const papers=catalog?.[subject], chosenPaper=subject==='ICT'?'':paper;
 const chaptersList=papers?.[chosenPaper]||[];
 const selected=chaptersList.find(x=>x.name===chapter||(shortSprintChapter&&sprintChapterName(x.name)===chapter));
 const types=selected?.types||[],selectedType=types.find(x=>x.name===type);
 const topics=selectedType?.topics||[];
 const hasPapers=!!papers&&subject!=='ICT';
 const needsPaper=hasPapers&&!chosenPaper;

 const filtered=useMemo(()=>{
  const needle=q.trim().toLowerCase();
  return needle?chaptersList.filter(c=>String(c.name||'').toLowerCase().includes(needle)):chaptersList;
 },[chaptersList,q]);

 // ── v48: every chapter column is exactly as wide as the longest chapter name
 // in the list — 2–3 columns per row, no clipped text, no oversized boxes.
 const [chpCol,setChpCol]=useState(196);
 const probeRef=useRef(null);
 useEffect(()=>{
   let alive=true;
   const measure=()=>{
     if(!alive)return;
     const nodes=probeRef.current?.querySelectorAll('[data-cp-probe]');
     if(!nodes?.length)return;
     let widest=0;
     // the probe is a real card clone with width:max-content, so its measured
     // width is exactly what the label needs — no padding guesswork.
     nodes.forEach(n=>{widest=Math.max(widest,n.getBoundingClientRect().width);});
     if(widest>0){
       const next=Math.ceil(Math.min(360,Math.max(132,widest+2)));
       setChpCol(prev=>Math.abs(prev-next)>1?next:prev);
     }
   };
   measure();
   const raf=typeof window.requestAnimationFrame==='function'?window.requestAnimationFrame(measure):window.setTimeout(measure,16);
   return ()=>{alive=false;
     if(typeof window.cancelAnimationFrame==='function')window.cancelAnimationFrame(raf); else window.clearTimeout(raf);};
 },[filtered.length]);

 const isChapterPicked = (name) => multi
   ? multiSel.includes(name)
   : (chapter===name || (shortSprintChapter && sprintChapterName(name)===chapter));

 // In multi mode a plain click starts a fresh selection, Ctrl/Cmd+click adds
 // (or removes) the chapter so several can be chosen in one go.
 const pickChapter = (name, ev) => {
  if(!multi){
   onChange({paper:chosenPaper,chapter:name,chapters:[name],type:'',topic:''});
   return;
  }
  const additive=Boolean(ev && (ev.ctrlKey||ev.metaKey||ev.shiftKey));
  let next;
  if(additive){
   next=multiSel.includes(name)?multiSel.filter(n=>n!==name):[...multiSel,name];
  }else{
   next=multiSel.length===1&&multiSel[0]===name?[]:[name];
  }
  setMultiSel(next);
  const primary=next[next.length-1]||'';
  onChange({paper:chosenPaper,chapter:primary,chapters:next,type:'',topic:''});
 };

 const removeMulti = (name) => {
  const next=multiSel.filter(n=>n!==name);
  setMultiSel(next);
  const primary=next[next.length-1]||'';
  onChange({paper:chosenPaper,chapter:primary,chapters:next,type:'',topic:''});
 };

 // Step rail — shows exactly where the student is in the flow
 const steps=[];
 if(hasPapers) steps.push({key:'paper',label:'পত্র',value:chosenPaper?(chosenPaper==='1'?'প্রথম পত্র':'দ্বিতীয় পত্র'):''});
 steps.push({key:'chapter',label:'অধ্যায়',value:multi?`${bnNum(multiSel.length)}টি বাছাই`:(chapter||'')});
 if(types.length) steps.push({key:'type',label:'টাইপ',value:type||''});
 if(topics.length) steps.push({key:'topic',label:'টপিক',value:topic||''});
 const firstPending=steps.findIndex(s=>!s.value);

 return <div className="curriculum-picker v31-cp">

  <div className="v31-cp-head">
    <span className="v31-cp-head-icon"><LibraryBig size={18}/></span>
    <div className="v31-cp-head-copy">
      <strong>অধ্যায় নির্বাচন</strong>
      <small>ধাপে ধাপে বেছে নিন — কোনো ঝামেলা নেই</small>
    </div>
    {subject && <span className="v31-cp-subject-chip">{bnSubject(subject)}</span>}
  </div>

  {/* STEP RAIL */}
  <ol className="v31-cp-rail">
    {steps.map((st,i)=>(
      <li key={st.key} className={`v31-cp-rail-item ${st.value?'is-done':''} ${i===firstPending?'is-active':''}`}>
        <span className="v31-cp-rail-num">{st.value?<Check size={11} strokeWidth={3.2}/>:bnNum(i+1)}</span>
        <span className="v31-cp-rail-copy">
          <b>{st.label}</b>
          <em>{st.value||'বাকি'}</em>
        </span>
      </li>
    ))}
  </ol>

  {!catalog&&!loadError&&<p className="v31-cp-note">তালিকা প্রস্তুত হচ্ছে…</p>}
  {loadError&&<p className="v31-cp-note is-warn" role="alert">তালিকা খোলা যায়নি — নিচে নিজের অধ্যায় লিখতে পারবেন।</p>}

  {/* STEP 1 — PAPER */}
  {hasPapers&&(
    <div className="v31-cp-block">
      <div className="v31-cp-label"><Layers size={13}/> পত্র বেছে নিন</div>
      <div className="v31-cp-paper-grid">
        {PAPERS.map(([id,label,en])=>(
          <button type="button" key={id}
            className={`v31-cp-paper ${chosenPaper===id?'is-active':''}`}
            aria-pressed={chosenPaper===id}
            onClick={()=>{setManual(false);setQ('');setMultiSel([]);onChange({paper:id,chapter:'',chapters:[],type:'',topic:''})}}>
            <span className="v31-cp-paper-num">{bnNum(id)}</span>
            <span className="v31-cp-paper-copy">
              <strong>{label}</strong>
              <small>{en}</small>
            </span>
            <span className="v31-cp-paper-count">{bnNum((papers?.[id]||[]).length)}টি অধ্যায়</span>
            <span className="v31-cp-tick"><Check size={13} strokeWidth={3}/></span>
          </button>
        ))}
      </div>
    </div>
  )}

  {/* STEP 2 — CHAPTER */}
  {!needsPaper&&(
    <div className="v31-cp-block">
      <div className="v31-cp-label"><BookOpen size={13}/> অধ্যায় বা ইউনিট বেছে নিন</div>

      {manual||!papers||loadError ? (
        <div className="v31-cp-manual">
          <input type="text" maxLength={150} aria-label="নিজের অধ্যায়"
            value={chapter}
            placeholder="যেমন: অধ্যায় ৩ — গতিবিদ্যা"
            onChange={e=>{pickChapter(e.target.value,null)}}/>
          {papers&&<button type="button" className="v31-cp-link" onClick={()=>setManual(false)}><ListTree size={13}/> তালিকা থেকে বাছুন</button>}
        </div>
      ) : (
        <>
          <label className="v31-cp-search">
            <Search size={14}/>
            <input value={q} onChange={e=>setQ(e.target.value)}
              placeholder="অধ্যায় খুঁজুন…" aria-label="অধ্যায় খুঁজুন"/>
            {q&&<button type="button" onClick={()=>setQ('')} aria-label="খোঁজা বাতিল"><X size={13}/></button>}
          </label>

          {multi&&(
            <div className="v31-cp-multi">
              <div className="v31-cp-multi-head">
                <Layers3 size={13}/>
                <span>
                  <b>{bnNum(multiSel.length)}টি অধ্যায় বাছাই হয়েছে</b>
                  <em>Ctrl + ক্লিক করে আরও অধ্যায় যোগ করুন — আগেরটা বাদ দেবে না</em>
                </span>
              </div>
              {multiSel.length>0&&(
                <div className="v31-cp-multi-chips">
                  {multiSel.map((name)=>(
                    <span key={name} className="v31-cp-multi-chip">
                      {name}
                      <button type="button" onClick={()=>removeMulti(name)} aria-label={`${name} সরান`}>
                        <X size={11} strokeWidth={2.6}/>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="v31-cp-chapter-grid" style={{'--cp-col':`${chpCol}px`}}>
            <div className="v48-cp-probe" ref={probeRef} aria-hidden="true">
              {filtered.map((item,i)=>(
                <button type="button" tabIndex={-1} key={i} className="v31-cp-chapter is-probe" data-cp-probe>
                  <span className="v31-cp-ch-num">{bnNum(i+1)}</span>
                  <span className="v31-cp-ch-name">{item.name}</span>
                  <span className="v31-cp-ch-count">{(item.types?.length)||0} ধাপ</span>
                  <span className="v31-cp-tick"><Check size={12} strokeWidth={3}/></span>
                </button>
              ))}
            </div>
            {filtered.map((item,i)=>{
              const isSel=isChapterPicked(item.name);
              return (
                <button type="button" key={i}
                  className={`v31-cp-chapter ${isSel?'is-active':''}`}
                  aria-pressed={isSel}
                  onClick={(e)=>pickChapter(item.name,e)}>
                  <span className="v31-cp-ch-num">{bnNum(i+1)}</span>
                  <span className="v31-cp-ch-name">{item.name}</span>
                  <span className="v31-cp-ch-count">{(item.types?.length)||0} ধাপ</span>
                  <span className="v31-cp-tick"><Check size={12} strokeWidth={3}/></span>
                </button>
              );
            })}
            {filtered.length===0&&<p className="v31-cp-empty">“{q}” নামে কোনো অধ্যায় পাওয়া যায়নি।</p>}
          </div>

          <button type="button" className="v31-cp-link" onClick={()=>setManual(true)}>
            <PencilLine size={13}/> তালিকায় নেই — নিজে লিখুন
          </button>
        </>
      )}
    </div>
  )}

  {/* STEP 3 — TYPE */}
  {types.length>0&&(
    <div className="v31-cp-block">
      <div className="v31-cp-label">ধাপ / টাইপ</div>
      <div className="v31-cp-chip-row">
        {types.map((t,i)=>(
          <button type="button" key={i}
            className={`v31-cp-chip ${type===t.name?'is-active':''}`}
            aria-pressed={type===t.name}
            onClick={()=>onChange({paper:chosenPaper,chapter,chapters:multiSel,type:t.name,topic:''})}>
            <Check size={12} strokeWidth={3}/> {t.name}
          </button>
        ))}
      </div>
    </div>
  )}

  {/* STEP 4 — TOPIC */}
  {topics.length>0&&(
    <div className="v31-cp-block">
      <div className="v31-cp-label">টপিক / সাব-টাইপ</div>
      <div className="v31-cp-chip-row">
        {topics.map((t,i)=>(
          <button type="button" key={i}
            className={`v31-cp-chip is-soft ${topic===t?'is-active':''}`}
            aria-pressed={topic===t}
            onClick={()=>onChange({paper:chosenPaper,chapter,chapters:multiSel,type,topic:t})}>
            <Check size={12} strokeWidth={3}/> {t}
          </button>
        ))}
      </div>
    </div>
  )}
 </div>;
}
