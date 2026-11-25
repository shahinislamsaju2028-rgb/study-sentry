// Calendar-based, local-time goal arithmetic. No external services or UTC-day assumptions.
import { addDays, toDateKey } from './seedData';
import { dateFromKey, dayBounds } from './stats';

const HOUR = 3600;
const validDay = key => /^\d{4}-\d{2}-\d{2}$/.test(String(key || '')) && toDateKey(dateFromKey(key)) === key;
const civilIndex = key => {
  if (!validDay(key)) return NaN;
  const [y,m,d]=key.split('-').map(Number);
  return Math.floor(Date.UTC(y,m-1,d)/86400000);
};
export function dayCountInclusive(startKey,endKey) {
  const a=civilIndex(startKey),b=civilIndex(endKey);
  return Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,b-a+1):0;
}
export function deadlineKeyFor(commitment) {
  if (validDay(commitment?.deadlineDateKey)) return commitment.deadlineDateKey;
  const start = validDay(commitment?.startedDateKey) ? commitment.startedDateKey : toDateKey();
  const days=Math.max(1,Math.min(3650,Math.round(Number(commitment?.totalDays)||30)));
  return toDateKey(addDays(dateFromKey(start),days-1));
}
export function deadlineFor(commitment) {
  if (!commitment?.active) return null;
  const key=deadlineKeyFor(commitment), time=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(commitment?.deadlineTime||'')?commitment.deadlineTime:'23:59';
  const [y,m,d]=key.split('-').map(Number), [h,min]=time.split(':').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d,h-6,min,0,0));
  return Number.isFinite(dt.getTime())?dt:null;
}
export function dailyTargetHours(commitment,key) {
  const specific=commitment?.dateHours && Object.prototype.hasOwnProperty.call(commitment.dateHours,key) ? commitment.dateHours[key] : null;
  const weekday=dateFromKey(key).getDay();
  const week=commitment?.weekdayHours && Object.prototype.hasOwnProperty.call(commitment.weekdayHours,String(weekday)) ? commitment.weekdayHours[String(weekday)] : null;
  const chosen=specific !== null && specific !== '' ? specific : week !== null && week !== '' ? week : commitment?.targetHoursPerDay;
  const value=Number(chosen);
  return Math.max(0,Math.min(24,Number.isFinite(value)?value:0));
}
function parseWindow(v, fallback) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(v||''))) return fallback;
  const [h,m]=String(v).split(':').map(Number);return h*60+m;
}
function dateAtMinute(day, minute) {
  return dayBounds(toDateKey(day))[0]+minute*60000;
}
/**
 * Upper bound, not a guaranteed schedule: on every local day the unused target
 * is capped by the overlap of the selected availability window with [now, deadline].
 * Today already-completed focus is deducted. Weekday and date overrides allow 0h.
 */
export function focusCapacitySeconds(commitment, nowMs, completedTodaySeconds=0) {
  const deadline=deadlineFor(commitment); if (!deadline||deadline.getTime()<=nowMs) return 0;
  const startKey=validDay(commitment.startedDateKey)?commitment.startedDateKey:toDateKey(new Date(nowMs));
  const todayKey=toDateKey(new Date(nowMs)), finalKey=deadlineKeyFor(commitment);
  const firstKey=startKey>todayKey?startKey:todayKey;
  if(firstKey>finalKey)return 0;
  const fromMinute=parseWindow(commitment.windowStart,0), toMinute=parseWindow(commitment.windowEnd,1440);
  if(toMinute<=fromMinute)return 0;
  let cursor=dateFromKey(firstKey), sum=0, loops=0;
  // Match the editor's stated 10-year maximum and protect imported broken data.
  while(toDateKey(cursor)<=finalKey && loops++<3660) {
    const key=toDateKey(cursor), dailySeconds=dailyTargetHours(commitment,key)*HOUR;
    const targetLeft=Math.max(0,dailySeconds-(key===todayKey?Math.max(0,Number(completedTodaySeconds)||0):0));
    const from=Math.max(nowMs,dateAtMinute(cursor,fromMinute));
    const until=Math.min(deadline.getTime(),dateAtMinute(cursor,toMinute));
    const available=Math.max(0,(until-from)/1000);
    // No break history is available: conservatively reserve the full configured
    // daily break for each remaining day that still has a focus target.
    const dailyBreak=Math.max(0,Math.min(1440,Number(commitment.dailyBreakMinutes)||0))*60;
    const afterBreak=Math.max(0,available-(targetLeft>0?dailyBreak:0));
    sum+=Math.min(targetLeft,afterBreak);
    cursor=addDays(cursor,1);
  }
  return Math.max(0,Math.floor(sum));
}
export function splitSeconds(seconds) {
  let n=Math.max(0,Math.floor(Number(seconds)||0));
  const days=Math.floor(n/86400);n%=86400;
  const hours=Math.floor(n/3600);n%=3600;
  const minutes=Math.floor(n/60);return {days,hours,minutes,seconds:n%60};
}
export function hoursText(seconds) {
  const h=Math.max(0,Number(seconds)||0)/3600;
  return `${h.toLocaleString(undefined,{maximumFractionDigits:2,minimumFractionDigits:h%1?2:0})}h`;
}
export function taskStatus(task) {
  if(task?.done||task?.status==='done'||task?.boardStatus==='done')return 'done';
  return task?.boardStatus==='doing'||task?.status==='doing'?'doing':'todo';
}
export function taskPlannedSeconds(task) {
  const estimated=Number(task?.estimatedHours);
  if(task?.estimatedHours!=null && task?.estimatedHours!=='' && Number.isFinite(estimated))return Math.max(0,estimated*3600);
  return Math.max(0,(Number(task?.durationMin)||0)*60);
}
export function plannedTaskSeconds(tasks,commitment) {
  const category=commitment?.category||'Study';
  return (tasks||[]).reduce((sum,t)=>{
    if(taskStatus(t)==='done'||t.includeInPlan===false)return sum;
    const legacy=String(t.category||'').toLowerCase();
    // Existing hidden non-study tasks remain saved, but do not count against focus.
    if(!t.boardManaged && !['','study','revision','exam prep','exam preparation'].includes(legacy))return sum;
    const kind=t.workType==='Work'?'Work':'Study';
    if(category!=='Both' && category!==kind)return sum;
    return sum+taskPlannedSeconds(t);
  },0);
}
export function goalAnalytics(commitment,tasks,nowMs,completedTodaySeconds) {
  const deadline=deadlineFor(commitment);
  const realSeconds=deadline?Math.max(0,Math.floor((deadline.getTime()-nowMs)/1000)):0;
  const focusSeconds=focusCapacitySeconds(commitment,nowMs,completedTodaySeconds);
  const plannedSeconds=plannedTaskSeconds(tasks,commitment);
  return {deadline,realSeconds,focusSeconds,plannedSeconds,shortfallSeconds:Math.max(0,plannedSeconds-focusSeconds)};
}
