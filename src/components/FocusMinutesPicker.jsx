import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import { Clock3 } from 'lucide-react';
import { BanglaNumberInput } from './BanglaInputs';
import { bnNum } from '../utils/bangla';
export default function FocusMinutesPicker({value,onChange}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({});const root=useRef(null),menu=useRef(null);
 useLayoutEffect(()=>{if(!open)return;const place=()=>{const r=root.current?.getBoundingClientRect();if(!r)return;const width=Math.min(310,window.innerWidth-20);const up=window.innerHeight-r.bottom<215&&r.top>220;setPosition({left:Math.max(10,Math.min(r.left,window.innerWidth-width-10)),width,...(up?{bottom:window.innerHeight-r.top+8}:{top:r.bottom+8})})};place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}},[open]);
 useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target)&&!menu.current?.contains(e.target))setOpen(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open]);
 const esc=e=>{if(open&&e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false)}};
 return <div className="minute-picker" ref={root} onKeyDown={esc}><span className="minute-picker-label">ফোকাস সময় (মিনিট)</span><div onFocus={()=>setOpen(true)} onClick={()=>setOpen(true)}><BanglaNumberInput aria-label="ফোকাস সময় (মিনিট)" min="5" max="1440" step="5" value={value} onChange={e=>onChange(e.target.value)} required/></div>{open&&createPortal(<div ref={menu} className="minute-popover" style={position} onKeyDown={esc} role="dialog" aria-label="ফোকাস সময়ের বিকল্প"><div className="minute-popover-title"><Clock3 size={14}/> ফোকাস মিনিট বেছে নিন</div><div className="minute-grid">{[30,40,50,60,70,80,90,100].map(n=><button type="button" key={n} aria-pressed={Number(value)===n} className={Number(value)===n?'is-selected':''} onClick={()=>{onChange(n);setOpen(false)}}>{bnNum(n)} <small>মিনিট</small></button>)}</div><small>নিজের সময়ও লিখতে পারবেন</small></div>,document.body)}</div>;
}
