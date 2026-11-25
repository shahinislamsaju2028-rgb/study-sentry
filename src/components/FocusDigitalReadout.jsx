import React from 'react';

/** Minimal digital timer: digits only, without a dial, ring, panel, or background. */
export default function FocusDigitalReadout({ remainingSec = 0, isAlarm = false, isPaused = false, isRunning = false }) {
  const remain = Math.max(0, Math.floor(Number(remainingSec) || 0));
  const mm = String(Math.floor(remain / 60)).padStart(2, '0');
  const ss = String(remain % 60).padStart(2, '0');
  return (
    <div
      className={`v35-digital-readout ${isAlarm ? 'is-alarm' : ''} ${isPaused ? 'is-paused' : ''} ${isRunning ? 'is-running' : ''}`}
      role="timer"
      aria-label={`ডিজিটাল টাইমার — অবশিষ্ট ${Math.floor(remain / 60)} মিনিট ${remain % 60} সেকেন্ড`}
      aria-live="off"
    >
      <span>{mm}</span><i aria-hidden="true">:</i><span>{ss}</span>
    </div>
  );
}
