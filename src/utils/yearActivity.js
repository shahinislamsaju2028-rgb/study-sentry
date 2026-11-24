import {addDays,toDateKey} from './seedData';
import {dayBounds,sessionIntervals} from './stats';
// Visit each interval only for days it overlaps, not 365 times per session.
export function buildYearActivity(sessions,now=new Date()){
 const days=Array.from({length:365},(_,i)=>{const key=toDateKey(addDays(now,i-364));return {key,sec:0}});
 const first=dayBounds(days[0].key)[0],last=first+days.length*86400000,indices=new Map(days.map((d,i)=>[d.key,i]));
 for(const session of sessions||[]){
  const blocks=sessionIntervals(session);
  if(!blocks.length){const i=indices.get(session.dateKey);if(i!==undefined)days[i].sec+=Number(session.durationSec)||0;continue}
  for(const block of blocks){const begin=Math.max(first,block.start),end=Math.min(last,block.end);if(end<=begin)continue;let index=Math.floor((begin-first)/86400000);while(index<days.length&&first+index*86400000<end){const a=first+index*86400000,b=a+86400000;days[index].sec+=Math.max(0,Math.min(end,b)-Math.max(begin,a))/1000;index++}}
 }
 return days;
}
