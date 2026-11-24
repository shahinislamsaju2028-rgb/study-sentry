import React from 'react';
import { LayoutDashboard, Timer, Zap, ListTodo, ChartNoAxesCombined, GraduationCap, Settings2, PanelLeftClose, PanelLeftOpen, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { PreviewSubjectIcon } from './PreviewSubjectIcon';
import ProfileAvatar from './ProfileAvatar';

const groups = [
  { label:'WORKSPACE', links:[
    {id:'home',label:'Study Center',icon:LayoutDashboard,accent:'emerald'},
    {id:'study',label:'Study Mode',icon:Timer,accent:'amber'},
    {id:'focus',label:'Deep Focus',icon:Zap,accent:'violet'},
    {id:'todo',label:'To-do Timeline',icon:ListTodo,accent:'emerald'},
    {id:'insights',label:'Study Insights',icon:ChartNoAxesCombined,accent:'amber'},
  ]},
  { label:'YOUR STUDY KIT', links:[
    {id:'suite',label:'Student Suite',icon:GraduationCap,accent:'emerald'},
    {id:'settings',label:'Local Data & Setup',icon:Settings2,accent:'emerald'},
  ]},
];

export default function Sidebar() {
  const { state, view, navigate, collapsed, setCollapsed, timer, displayTime, selectedSubject, rank } = useStudy();
  return <aside className="sidebar">
    <div className="brand-row">
      <div className="brand-left"><div className="brand-shield"><ShieldCheck size={20} color="#29d998"/></div><div className="brand-text-wrap"><div className="brand-wordmark"><span className="pink">Study</span> Sentry</div><span className="brand-sub">YOUR PERSONAL STUDY SPACE</span></div></div>
      {!collapsed && <button className="icon-btn" title="Collapse sidebar" aria-label="Collapse sidebar" onClick={()=>setCollapsed(true)}><PanelLeftClose size={15}/></button>}
    </div>
    {collapsed && <button className="icon-btn collapsed-toggle" title="Expand sidebar" aria-label="Expand sidebar" onClick={()=>setCollapsed(false)}><PanelLeftOpen size={15}/></button>}
    {groups.map((group)=><div key={group.label} className="sidebar-section"><div className="nav-section-title">{collapsed?'• • •':group.label}</div><nav className="nav-list" aria-label={group.label}>
      {group.links.map((item)=>{const Icon=item.icon; const active=view===item.id;return <button title={item.label} key={item.id} className={`nav-item ${active?'active':''}`} data-accent={item.accent} onClick={()=>navigate(item.id)}><span className="nav-item-left"><Icon size={18} strokeWidth={active?2.3:1.8}/><span className="nav-label">{item.label}</span></span>{active&&<span className="nav-kbd">●</span>}</button>})}
    </nav></div>)}
    {timer && <button className="sidebar-live-timer" onClick={()=>navigate('study')} title="Return to active timer" aria-label="Return to active timer">
      <div className="live-timer-head"><span>{collapsed?<Timer size={14}/>:timer.phase==='break'?'ON A BREAK':<><PreviewSubjectIcon subject={selectedSubject} size={14}/>{timer.subjectName}</>}</span><span>{collapsed?'':timer.status==='running'?'LIVE':'PAUSED'}</span></div>
      {!collapsed && <div className="live-timer-time">{displayTime}</div>}
    </button>}
    {!timer && <div className="sidebar-spacer"/>}
    <div className="sidebar-footer"><div className="rank-mini-chip"><ProfileAvatar size={34} className="rank-avatar" name={state.profile.name} /><div className="sidebar-footer-details"><strong className="profile-name">{state.profile.name || 'Student'}</strong><div className="profile-rank">{rank?.name} · {state.profile.xp || 0} XP</div></div></div>{!collapsed&&<button className="plain-icon" title="Profile settings" aria-label="Profile settings" onClick={()=>navigate('settings')}><ArrowUpRight size={16}/></button>}</div>
  </aside>;
}
