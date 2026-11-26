import React from 'react';

/**
 * A clear, framed LCD-style countdown display. The digits stay in their own
 * accessible timer region so the decorative bezel never changes screen-reader
 * output.
 */
export default function FocusDigitalReadout({
  remainingSec = 0,
  isAlarm = false,
  isPaused = false,
  isRunning = false,
  className = '',
}) {
  const remain = Math.max(0, Math.floor(Number(remainingSec) || 0));
  const mm = String(Math.floor(remain / 60)).padStart(2, '0');
  const ss = String(remain % 60).padStart(2, '0');
  return (
    <div
      className={`v35-digital-readout ${isAlarm ? 'is-alarm' : ''} ${isPaused ? 'is-paused' : ''} ${isRunning ? 'is-running' : ''} ${className}`.trim()}
      role="timer"
      aria-label={`ডিজিটাল টাইমার — অবশিষ্ট ${Math.floor(remain / 60)} মিনিট ${remain % 60} সেকেন্ড`}
      aria-live="off"
    >
      <span className="v61-digital-caption" aria-hidden="true">FOCUS · DIGITAL</span>
      <span className="v61-digital-value">{mm}</span>
      <i aria-hidden="true">:</i>
      <span className="v61-digital-value">{ss}</span>
    </div>
  );
}
