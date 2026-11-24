import assert from 'node:assert/strict';
import {checkpointTimer,recoverStoppedTimer} from '../src/utils/windowsTimerRecovery.js';
const t={id:'t',status:'running',mode:'pomodoro',durationSec:5400,accumulatedMs:0,lastResumedAt:1000000,segments:[]};
const c=checkpointTimer(t,3400000);const r=recoverStoppedTimer(t,c);
assert.equal(r.status,'paused');assert.equal(r.accumulatedMs,2400000);assert.equal(r.lastResumedAt,null);assert.equal(r.segments.length,1);
assert.equal(recoverStoppedTimer(t,{...c,id:'different'}).accumulatedMs,0);
assert.equal(recoverStoppedTimer({...t,status:'paused'},c).status,'paused');
console.log('PASS Windows timer checkpoint and offline freeze');
