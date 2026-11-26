import React, { useId, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import { addDays, formatHM, toDateKey } from '../utils/seedData';
import { dateFromKey, dayBounds, sessionIntervals, timerIntervals } from '../utils/stats';

export function RadarPowerRing({ active = false, running = false, onClick }) {
  return <div className={`radar-button-wrap ${active ? 'active-focus' : ''}`}>
    <svg className="radar-svg" viewBox="0 0 214 214" aria-hidden="true">
      <defs><radialGradient id="powerGlow"><stop stopColor="var(--accent-primary, #ff9808)" stopOpacity=".26"/><stop offset="1" stopColor="var(--accent-primary, #ff9808)" stopOpacity="0"/></radialGradient></defs>
      <circle cx="107" cy="107" r="107" fill="url(#powerGlow)" />
      <circle cx="107" cy="107" r="103" fill="none" stroke="var(--accent-primary-bright, #ffd369)" strokeOpacity=".13" />
      <circle cx="107" cy="107" r="88" fill="none" stroke="var(--accent-primary-bright, #ffd369)" strokeOpacity=".26" strokeWidth="1.5" />
      <circle cx="107" cy="107" r="72" fill="none" stroke="var(--accent-secondary, #818cf8)" strokeOpacity=".22" strokeWidth="1" />
      <circle className="radar-ring-spin" cx="107" cy="107" r="88" fill="none" stroke="var(--accent-primary-bright, #ffd369)" strokeOpacity=".52" strokeWidth="2" strokeDasharray="8 15" />
      <circle className="radar-ring-spin" cx="107" cy="107" r="58" fill="none" stroke="var(--accent-secondary-bright, #a5b4fc)" strokeOpacity=".6" strokeWidth="2.4" strokeDasharray="38 20 16 23" style={{animationDirection:'reverse'}} />
      <circle cx="107" cy="19" r="3" fill="var(--accent-primary-bright, #ffd369)"/><circle cx="30" cy="148" r="2" fill="var(--accent-secondary-bright, #a5b4fc)" opacity=".75"/>
    </svg>
    <button className="radar-core-btn" onClick={onClick} aria-label={active ? (running ? 'Pause focus timer' : 'Resume focus timer') : 'Start focus timer'}>
      {active && running ? <Pause size={27} fill="currentColor"/> : <Play size={27} fill="currentColor" style={{marginLeft:3}}/>}
      <span style={{fontSize:10, fontWeight:900, letterSpacing:'.08em', marginTop:3}}>{active ? (running ? 'PAUSE' : 'RESUME') : 'START'}</span>
    </button>
  </div>;
}

export function StudyIllustration({ width = 260, studying = false, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className={`v5-dynamic-student-svg ${studying ? 'is-studying' : 'is-idle'} ${className}`}
      width={width}
      viewBox="0 0 320 190"
      role="img"
      aria-label={
        studying
          ? 'স্টুডেন্ট টেবিলের দিকে ঝুঁকে গভীর মনোযোগে পড়াশোনা করছে'
          : 'স্টুডেন্ট টেবিলের সামনে সোজা হয়ে শান্তভাবে বসে আছে'
      }
    >
      <defs>
        <radialGradient id={`${id}glow`}>
          <stop stopColor="#ff9808" stopOpacity={studying ? '0.34' : '0.14'} />
          <stop offset="0.6" stopColor="#3b82f6" stopOpacity={studying ? '0.12' : '0.06'} />
          <stop offset="1" stopColor="#090d16" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}lampCone`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ffd369" stopOpacity={studying ? '0.38' : '0.10'} />
          <stop offset="1" stopColor="#ffd369" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id={`${id}hoodie`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>

      {/* Ambient Aurora Aura */}
      <ellipse cx="162" cy="100" rx="142" ry="84" fill={`url(#${id}glow)`} className="v5-stu-aura" />

      {/* Chair Backrest (visible behind student when upright or leaning) */}
      <rect x="108" y="88" width="76" height="58" rx="14" fill="#131927" stroke="#28344d" strokeWidth="2" />

      {/* DYNAMIC STUDENT BODY (Upright when idle/paused -> Leans forward & bows head when studying!) */}
      <g className="v5-stu-torso-group">
        {/* Shoulders & Study Hoodie */}
        <path
          d="M110 146 L114 114 Q117 92 140 89 L158 89 Q181 92 184 114 L188 146 Z"
          fill={`url(#${id}hoodie)`}
        />
        {/* Collar highlight */}
        <path d="M135 90 Q149 101 163 90" fill="none" stroke="#93c5fd" strokeWidth="2" opacity="0.65" />
        {/* Neck */}
        <rect x="142" y="78" width="14" height="15" rx="6" fill="#d9a17c" />

        {/* DYNAMIC HEAD GROUP (Straight & level when idle -> Bowed down toward book when studying!) */}
        <g className="v5-stu-head-group">
          {/* Head shape */}
          <ellipse cx="149" cy="58" rx="23" ry="25" fill="#eab693" />
          {/* Hair */}
          <path
            d="M125 58 Q123 29 149 28 Q175 29 173 57 Q166 44 155 43 Q139 45 125 58 Z"
            fill="#181e29"
          />
          <path d="M133 38 Q149 29 165 39" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" />

          {/* Glasses & Eyes (shift gaze downward when studying) */}
          <g className="v5-stu-face-details">
            <circle cx="140" cy="60" r="6.3" fill="rgba(255,255,255,0.08)" stroke="#1e293b" strokeWidth="2" />
            <circle cx="158" cy="60" r="6.3" fill="rgba(255,255,255,0.08)" stroke="#1e293b" strokeWidth="2" />
            <path d="M146.3 60 H151.7" stroke="#1e293b" strokeWidth="2" />
            {/* Pupils */}
            <circle cx="140" cy={studying ? '62.2' : '59.8'} r="2" fill="#0f172a" className="v5-stu-eye" />
            <circle cx="158" cy={studying ? '62.2' : '59.8'} r="2" fill="#0f172a" className="v5-stu-eye" />
            {/* Calm focused expression */}
            <path
              d={studying ? 'M145 72 Q149 73.5 153 72' : 'M144 71 Q149 75 154 71'}
              stroke="#9a5b4a"
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* Left Arm */}
        <path
          className="v5-stu-arm-left"
          d={studying ? 'M116 112 Q108 130 129 142' : 'M115 112 Q109 132 122 144'}
          stroke="#e2ac89"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />

        {/* Right Arm + Pen (writes smoothly when studying, rests calmly when idle!) */}
        <g className="v5-stu-arm-right">
          <path
            d={studying ? 'M182 112 Q190 130 166 142' : 'M183 112 Q189 132 176 144'}
            stroke="#e2ac89"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {studying && (
            <line
              x1="165"
              y1="142"
              x2="156"
              y2="130"
              stroke="#ffd369"
              strokeWidth="2.8"
              strokeLinecap="round"
              className="v5-stu-pen"
            />
          )}
        </g>
      </g>

      {/* Desk Lamp Light Cone (over desk & book) */}
      <path d="M236 48 L272 148 L122 148 Z" fill={`url(#${id}lampCone)`} className="v5-stu-lamp-beam" />

      {/* Open Study Book on Desk */}
      <g className="v5-stu-book">
        <path d="M118 145 Q134 136 150 144 Q166 136 182 145 L184 148 L116 148 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="150" y1="143" x2="150" y2="148" stroke="#94a3b8" strokeWidth="1.5" />
      </g>

      {/* Stacked Reference Books (Left) */}
      <rect x="68" y="139" width="34" height="8" rx="2.5" fill="#ff9808" />
      <rect x="72" y="131" width="28" height="8" rx="2.5" fill="#3b82f6" />
      <line x1="75" y1="135" x2="96" y2="135" stroke="#dbeafe" strokeWidth="1.4" opacity="0.7" />

      {/* Small Desk Plant (Left) */}
      <path d="M46 136 H62 L59 148 H49 Z" fill="#ff9808" />
      <path
        d="M54 136 C53 125 46 120 44 116 C50 118 54 123 54 136 M54 136 C55 124 62 119 65 116 C61 123 58 128 54 136"
        stroke="#38bdf8"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Architect Desk Lamp (Right) */}
      <rect x="206" y="144" width="32" height="4" rx="2" fill="#64748b" />
      <path d="M224 144 L244 62 L231 50" stroke="#94a3b8" strokeWidth="3.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M223 43 Q236 34 246 47 L232 58 Q222 51 223 43 Z" fill="#ff9808" />
      <circle cx="235" cy="52" r="3.5" fill={studying ? '#ffd369' : '#ffd369'} opacity={studying ? '1' : '0.45'} />

      {/* Warm Coffee Mug */}
      <rect x="252" y="132" width="14" height="16" rx="3" fill="#e2e8f0" />
      <path d="M266 135 Q272 135 271 141 Q270 144 266 144" fill="none" stroke="#e2e8f0" strokeWidth="2" />

      {/* Study Desk Surface & Legs */}
      <line x1="30" y1="149" x2="290" y2="149" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
      <line x1="32" y1="147" x2="288" y2="147" stroke="#ff9808" strokeWidth="1.4" strokeOpacity={studying ? '0.55' : '0.2'} />
      <path d="M56 152 L50 176 M264 152 L270 176" stroke="#334155" strokeWidth="4" strokeLinecap="round" />

      {/* Subtle Floating Focus Sparkles when Actively Studying */}
      {studying && (
        <g className="v5-stu-sparkles">
          <circle cx="104" cy="64" r="2" fill="#ffd369" />
          <circle cx="196" cy="56" r="1.8" fill="#60a5fa" />
          <path d="M90 84 v6 m-3 -3 h6 M206 78 v6 m-3 -3 h6" stroke="#ffd369" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

export function AnalogClock({ now = Date.now(), size = 170 }) {
  const d = new Date(now+6*3600000);
  const sec = d.getUTCSeconds(); const min = d.getUTCMinutes() + sec / 60; const hour = (d.getUTCHours() % 12) + min / 60;
  return <svg width={size} height={size} viewBox="0 0 180 180" aria-label={`Dhaka time ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`} role="img">
    <circle cx="90" cy="90" r="84" fill="#111820" stroke="#ff9808" strokeOpacity=".35" strokeWidth="2"/>
    <circle cx="90" cy="90" r="75" fill="none" stroke="#fff" strokeOpacity=".06"/>
    {Array.from({length:60}, (_,i) => { const angle=i*6*Math.PI/180; const r1=i%5===0?65:69; const r2=73; return <line key={i} x1={90+Math.sin(angle)*r1} y1={90-Math.cos(angle)*r1} x2={90+Math.sin(angle)*r2} y2={90-Math.cos(angle)*r2} stroke={i%5===0?'#e5edf5':'#66717f'} strokeWidth={i%5===0?2:1}/>; })}
    {[12,3,6,9].map((v,i) => <text key={v} x={[90,148,90,32][i]} y={[34,95,151,95][i]} fill="#aeb9c7" fontSize="10" fontWeight="700" textAnchor="middle">{v}</text>)}
    <line x1="90" y1="90" x2="90" y2="52" transform={`rotate(${hour*30} 90 90)`} stroke="#eef2f6" strokeWidth="5" strokeLinecap="round"/>
    <line x1="90" y1="90" x2="90" y2="39" transform={`rotate(${min*6} 90 90)`} stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    <line x1="90" y1="100" x2="90" y2="32" transform={`rotate(${sec*6} 90 90)`} stroke="#ff9808" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="90" cy="90" r="5" fill="#ff9808"/><circle cx="90" cy="90" r="2" fill="#fff"/>
  </svg>;
}

export function WeeklyBars({ dates, dayTotal, large = false }) {
  const values = dates.map(d => dayTotal(toDateKey(d)));
  const max = Math.max(3600, ...values);
  return <div className={`weekly-bars ${large ? 'large' : ''}`} aria-label="Study time over seven days">
    {dates.map((d,i) => <div className="weekly-bar-col" key={toDateKey(d)} title={`${d.toLocaleDateString()}: ${formatHM(values[i])}`}>
      {large && <span className="bar-value">{values[i] ? formatHM(values[i]) : '—'}</span>}
      <div className="weekly-bar-track"><div className="weekly-bar-fill" style={{height:`${values[i] ? Math.max(5,values[i]/max*100) : 0}%`}}/></div>
      <span className="weekly-bar-label">{d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,large?3:1)}</span>
    </div>)}
  </div>;
}

export function SubjectRadar({ subjects, sessions }) {
  const entries = useMemo(() => {
    const top = subjects.slice(0,5);
    while (top.length < 5) top.push({ id:`empty-${top.length}`, name:'—' });
    const secs = top.map(subject => sessions.filter(s => s.subjectId === subject.id).reduce((n,s) => n+(Number(s.durationSec)||0),0));
    const max = Math.max(1, ...secs);
    return top.map((subject,i) => ({ ...subject, value: secs[i]/max, seconds:secs[i] }));
  }, [subjects, sessions]);
  const cx=250, cy=165, radius=112;
  const point=(i,r)=>{ const a=(-90+i*72)*Math.PI/180; return [cx+Math.cos(a)*r,cy+Math.sin(a)*r]; };
  const poly=(r)=>Array.from({length:5},(_,i)=>point(i,r).join(',')).join(' ');
  const valuePoints=entries.map((e,i)=>point(i,e.value*radius).join(',')).join(' ');
  const wrap=(text) => { const words=String(text).split(/\s+/).flatMap(word => word.match(/.{1,18}/gu) || ['']); const lines=['']; for (const word of words) { const j=lines.length-1; if ((lines[j]+' '+word).trim().length > 20 && lines[j]) lines.push(word); else lines[j]=(lines[j]+' '+word).trim(); } return lines; };
  return <svg viewBox="0 0 500 350" style={{width:'100%',maxHeight:350,display:'block'}} role="img" aria-label="Subject study balance radar">
    {[.25,.5,.75,1].map(r=><polygon key={r} points={poly(radius*r)} fill="none" stroke="#ffffff" strokeOpacity=".10"/>)}
    {entries.map((e,i)=><line key={e.id} x1={cx} y1={cy} x2={point(i,radius)[0]} y2={point(i,radius)[1]} stroke="#fff" strokeOpacity=".09"/>)}
    <polygon points={valuePoints} fill="var(--accent-primary, #ff9808)" fillOpacity=".22" stroke="var(--accent-primary-bright, #ffd369)" strokeWidth="2.5"/>
    {entries.map((e,i)=>{const [x,y]=point(i,e.value*radius); const [lx,ly]=point(i,radius+24); const anchor = i===0?'middle':i<3?'start':'end'; return <g key={e.id}><circle cx={x} cy={y} r="3.5" fill="var(--accent-secondary-bright, #a5b4fc)"/><text x={lx} y={ly - (i===0?3:0)} textAnchor={anchor} fill="#cad4de" fontSize="11" fontWeight="650">{wrap(e.name).map((line,j)=><tspan x={lx} dy={j?13:0} key={j}>{line}</tspan>)}</text><title>{`${e.name}: ${formatHM(e.seconds)}`}</title></g>;})}
  </svg>;
}

export function DayTimeline({ dateKey, sessions, subjects, timer, now }) {
  const blocks = useMemo(() => {
    const all = sessions.map(s => ({ subjectId:s.subjectId, name:s.subjectName, intervals:sessionIntervals(s) }));
    if (timer && timer.phase !== 'break') all.push({subjectId:timer.subjectId,name:timer.subjectName,intervals:sessionIntervals({segments:timerIntervals(timer,now)})});
    return all;
  }, [sessions, timer, now]);
  return <div className="hour-grid-table" aria-label="24 hour study timeline with ten minute blocks">
    {Array.from({length:24},(_,hour)=><div className="hour-grid-row" key={hour}>
      <div className="hour-label">{String(hour).padStart(2,'0')}:00</div>
      {Array.from({length:6},(_,col)=>{
        const start=dayBounds(dateKey)[0]+(hour*60+col*10)*60000, end=start+600000;
        let best=null, overlap=0;
        blocks.forEach(b => { const ms=b.intervals.reduce((sum,seg)=>sum+Math.max(0,Math.min(end,seg.end)-Math.max(start,seg.start)),0); if(ms>overlap){best=b;overlap=ms;} });
        const subject=subjects.find(s=>s.id===best?.subjectId); const color=subject?.color || '#ff9808';
        const label=`${String(hour).padStart(2,'0')}:${String(col*10).padStart(2,'0')}`;
        return <div key={col} className={`ten-min-cell ${best?'filled':''}`} style={best?{backgroundColor:color,opacity:.4+.6*Math.min(1,overlap/600000)}:{}} title={best ? `${label} — ${best.name}: ${Math.max(1,Math.round(overlap/60000))} min` : `${label} — no study`}/>;
      })}
    </div>)}
  </div>;
}

export function ConsistencyGrid({ dayTotal, now = Date.now() }) {
  const dates=Array.from({length:140},(_,i)=>addDays(new Date(now),i-139));
  return <div>
    <div className="gh-heatmap" aria-label="Last twenty weeks of study activity">
      {Array.from({length:20},(_,w)=><div className="gh-week-col" key={w}>{dates.slice(w*7,w*7+7).map(d=>{const key=toDateKey(d);const sec=dayTotal(key);const lv=sec>=14400?4:sec>=7200?3:sec>=3600?2:sec>0?1:0;return <div key={key} className={`gh-cell ${lv?'gh-lv'+lv:''}`} title={`${key}: ${formatHM(sec)}`}/>;})}</div>)}
    </div>
    <div className="heat-legend"><span>Less</span>{[0,1,2,3,4].map(i=><span key={i} className={`legend-cell gh-cell ${i?'gh-lv'+i:''}`}/>)}<span>More</span></div>
  </div>;
}
