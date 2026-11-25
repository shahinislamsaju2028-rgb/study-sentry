import React from 'react';
// Purpose-drawn, stroke-based subject pictograms; all are self-contained vector paths.
export default function PremiumSubjectIcon({name,size=20}){
 const n=String(name||'').toLowerCase();
 let shape;
 if(n==='physics')shape=<><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/></>;
 else if(n==='chemistry')shape=<><path d="M9 3h6M10 3v6L5.1 17.6A2.1 2.1 0 0 0 7 21h10a2.1 2.1 0 0 0 1.9-3.4L14 9V3"/><path d="M7.6 16h8.8M10 13.6l1.2.5 1.1-.5 1.3.5"/><circle cx="12.3" cy="11.2" r=".7" fill="currentColor" stroke="none"/></>;
 else if(n==='math')shape=<><path d="M18 4H6l6.2 8L6 20h12M6 4h12M6 20h12"/><path d="M18 4v3M18 17v3"/></>;
 else if(n==='biology')shape=<><path d="M7 3c0 7 10 7 10 18M17 3C17 10 7 10 7 21"/><path d="M8 6h8M9 10h6M9 14h6M8 18h8"/></>;
 else if(n==='english')shape=<><path d="m2.8 17 4-11 4 11M4.1 13.5h5.4M14 11.5c.5-1 1.4-1.4 2.5-1.4 1.5 0 2.4.8 2.4 2.2V17m0-2.1c-.4 1.5-1.4 2.2-2.8 2.2-1.3 0-2.1-.7-2.1-1.8 0-1.4 1.4-2.1 4.9-2.1"/></>;
 else if(n==='bangla')shape=<><path d="M12 6.3C9.8 4.5 6.5 4.3 3.5 5v12.5c3.4-.7 6.3-.3 8.5 1.4 2.2-1.7 5.1-2.1 8.5-1.4V5c-3-.7-6.3-.5-8.5 1.3ZM12 6.3v12.4"/><path d="M6 8h3.5M14.5 8H18"/></>;
 else if(n==='ict')shape=<><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-1-13-2 2 2 2m3-4 2 2-2 2"/></>;
 else if(n==='class')shape=<><path d="m3 9 9-6 9 6M4 10h16M5 20h14M7 10v8m5-8v8m5-8v8M3 20h18"/><circle cx="12" cy="7.7" r=".8" fill="currentColor" stroke="none"/></>;
 else return null;
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shape}</svg>;
}
