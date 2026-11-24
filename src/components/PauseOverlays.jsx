import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  ShieldAlert,
  Lock,
  LogOut,
  StickyNote,
  Volume2,
  Check,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { studyAudio } from '../utils/audioEngine';
import { desktopBridge } from '../bridge/desktopBridge';
import { bnNum, bnSubject } from '../utils/bangla';

function formatCountdownStrictMMSS(sec) {
  const s = Math.max(0, Math.ceil(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function PauseOverlays() {
  const {
    state,
    pauseRequest,
    pauseLeft,
    cancelPause,
    confirmPauseAfterWait,
    resumeFromPauseScreen,
    saveJunkNote,
    halfWaitLeft,
    resumeHalfGoalWait,
    confirmHalfGoalExit,
    guardNotice,
    simulateGuardReturn,
    toast,
  } = useStudy();

  const [junkOpen, setJunkOpen] = useState(false);
  const [junkDraft, setJunkDraft] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const cardRef = useRef(null);
  const junkInputRef = useRef(null);

  const timer = state.activeTimer;
  const isPauseCountdownLive = Boolean(pauseRequest && pauseLeft > 0);
  const isPauseCountdownDone = Boolean(pauseRequest && pauseLeft <= 0);

  // Reset Junk Note drawer state whenever a fresh Pause Request opens/closes
  useEffect(() => {
    if (!pauseRequest) {
      setJunkOpen(false);
      setJunkDraft('');
      setSavedFlash(false);
    }
  }, [pauseRequest?.timerId, pauseRequest?.attempt, Boolean(pauseRequest)]);

  // Stop warning sound immediately once countdown reaches 00:00 or Pause Request closes
  useEffect(() => {
    if (!pauseRequest || pauseLeft <= 0) {
      studyAudio.stopAllTimerLoops();
      studyAudio.setBackgroundMuted(false);
    }
  }, [pauseRequest, pauseLeft]);

  // STRICT PAUSE GUARD:
  // 1. Clicking ANYWHERE outside .v12-pause-request-card -> cancelPause() immediately!
  // 2. Clicking Windows Start Button / Taskbar / any external window (blur / visibilitychange / Tauri Focused(false)) -> cancelPause() immediately!
  // 3. Pressing ANY key on the keyboard -> cancelPause() immediately! (Unless actively typing inside Junk Note textarea, where Escape / Meta / Alt still cancel immediately!)
  useEffect(() => {
    if (!pauseRequest) return undefined;

    let cancelled = false;
    const triggerInstantCancel = () => {
      if (cancelled) return;
      cancelled = true;
      cancelPause();
    };

    const onKeyDownCapture = (e) => {
      // Block any attempt to mute or lower volume via keyboard media keys while warning is live!
      if (
        e.key === 'AudioVolumeMute' ||
        e.key === 'AudioVolumeDown' ||
        e.code === 'AudioVolumeMute' ||
        e.code === 'AudioVolumeDown'
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (pauseLeft > 0) {
          desktopBridge.setAudioWarningLock(true).catch(() => {});
        }
        return;
      }

      const typingInJunkNote =
        junkInputRef.current && document.activeElement === junkInputRef.current;

      if (typingInJunkNote) {
        // Windows Start key (Meta), Escape, or Alt+Tab still immediately cancels Pause Request!
        if (e.key === 'Escape' || e.key === 'Meta' || e.key === 'OS' || e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          triggerInstantCancel();
        }
        return;
      }

      // ANY keyboard key press closes/cancels Pause Request immediately!
      e.preventDefault();
      e.stopPropagation();
      triggerInstantCancel();
    };

    const onPointerDownCapture = (e) => {
      const cardEl = cardRef.current;
      if (cardEl && !cardEl.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        triggerInstantCancel();
      }
    };

    const onWindowBlur = () => {
      // Fires the instant user clicks Windows Start button, Taskbar, Desktop, PiP, or another screen/app!
      triggerInstantCancel();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        triggerInstantCancel();
      }
    };

    const unsubNativeBlur = desktopBridge.onExternalFocusLost(() => {
      triggerInstantCancel();
    });

    // Slight 60ms guard after opening so the initial click on "Pause Request" button doesn't self-cancel
    const armTimer = setTimeout(() => {
      window.addEventListener('keydown', onKeyDownCapture, true);
      window.addEventListener('pointerdown', onPointerDownCapture, true);
      window.addEventListener('blur', onWindowBlur);
      document.addEventListener('visibilitychange', onVisibilityChange);
    }, 60);

    return () => {
      clearTimeout(armTimer);
      unsubNativeBlur?.();
      window.removeEventListener('keydown', onKeyDownCapture, true);
      window.removeEventListener('pointerdown', onPointerDownCapture, true);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pauseRequest, pauseLeft, cancelPause]);

  const handleSaveJunkNote = (andResume = false) => {
    const trimmed = String(junkDraft || '').trim();
    if (!trimmed) {
      toast?.('জাঙ্ক নোট সংরক্ষণের জন্য কিছু লিখুন।');
      junkInputRef.current?.focus();
      return;
    }
    const id = `jn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    saveJunkNote(id, trimmed);
    setJunkDraft('');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);

    if (andResume) {
      toast?.('জাঙ্ক নোট সংরক্ষিত হয়েছে · ফোকাস সেশন পুনরায় চলছে!');
      resumeFromPauseScreen();
    } else {
      toast?.('জাঙ্ক নোট সংরক্ষিত হয়েছে!');
    }
  };

  if (pauseRequest) {
    const totalWait = Math.max(1, pauseRequest.waitSeconds || 30);
    const pct = isPauseCountdownDone
      ? 100
      : Math.min(100, Math.max(0, ((totalWait - pauseLeft) / totalWait) * 100));
    const radius = 82;
    const circumference = 2 * Math.PI * radius;
    const strokeOffset = circumference * (1 - pct / 100);
    const mmss = formatCountdownStrictMMSS(pauseLeft);
    const junkNotesCount = Array.isArray(state.junkNotes) ? state.junkNotes.length : 0;

    const node = (
      <div
        className={`v9-minimal-pause-backdrop v12-spatial-pause-backdrop ${
          isPauseCountdownDone ? 'is-ready' : 'is-counting'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Pause Request"
      >
        <div
          ref={cardRef}
          className="v9-minimal-pause-card v12-pause-request-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Status Row: Subject + Unmutable Max Volume Warning Indicator + Quick Cancel */}
          <div className="v12-pause-top-row">
            <div className="v9-minimal-pause-chip">
              <span className="v9-minimal-dot" />
              <span>{bnSubject(timer?.subjectName || 'Focus Session')}</span>
            </div>

            {isPauseCountdownLive && (
              <span
                className="v12-max-vol-pill"
                title="ওয়ার্নিং সাউন্ড ১০০% সর্বোচ্চ ভলিউমে লক করা আছে (মিউট করা যাবে না)"
              >
                <Volume2 size={13} />
                <span>MAX 100% LOCK</span>
              </span>
            )}

            <button
              type="button"
              className="v12-pause-instant-close"
              onClick={() => cancelPause()}
              title="পজ রিকোয়েস্ট বাতিল করে সাথে সাথে পড়ায় ফিরুন"
            >
              <X size={15} />
            </button>
          </div>

          {/* Clean Circular Bodoni Countdown Dial (No Unnecessary Extra Orbitals) */}
          <div className="v9-minimal-ring-wrap">
            <svg className="v9-minimal-ring-svg" viewBox="0 0 196 196">
              <circle cx="98" cy="98" r={radius} className="v9-minimal-ring-track" />
              <circle
                cx="98"
                cy="98"
                r={radius}
                className={`v9-minimal-ring-fill ${isPauseCountdownDone ? 'is-done' : ''}`}
                style={{
                  strokeDasharray: `${circumference}`,
                  strokeDashoffset: `${strokeOffset}`,
                }}
              />
            </svg>
            <div className="v9-minimal-ring-center">
              <strong className="v9-minimal-clock">{mmss}</strong>
              <small className="v9-minimal-sublabel">
                {isPauseCountdownLive ? 'PAUSE REQUEST' : 'READY'}
              </small>
            </div>
          </div>

          {/* BUILT-IN JUNK NOTE QUICK CAPTURE RIGHT INSIDE PAUSE REQUEST */}
          <div className="v12-pause-junk-section">
            <button
              type="button"
              className={`v12-junk-toggle-btn ${junkOpen ? 'is-open' : ''}`}
              onClick={() => {
                const next = !junkOpen;
                setJunkOpen(next);
                if (next) {
                  setTimeout(() => junkInputRef.current?.focus(), 40);
                }
              }}
            >
              <StickyNote size={15} />
              <span>হঠাৎ মাথায় আসা চিন্তা? জাঙ্ক নোটে লিখে রাখুন</span>
              {junkNotesCount > 0 && <b>{bnNum(junkNotesCount)}</b>}
            </button>

            {junkOpen && (
              <div className="v12-pause-junk-drawer">
                <textarea
                  ref={junkInputRef}
                  rows={2}
                  value={junkDraft}
                  onChange={(e) => setJunkDraft(e.target.value)}
                  placeholder="অপ্রয়োজনীয় চিন্তা বা কাজের কথা এখানে লিখে দ্রুত ফোকাসে ফিরে যান..."
                  className="v12-pause-junk-textarea"
                />
                <div className="v12-pause-junk-actions">
                  <button
                    type="button"
                    className="v12-junk-save-resume-btn"
                    onClick={() => handleSaveJunkNote(true)}
                  >
                    <Check size={14} />
                    <span>সেভ করে ফোকাসে ফিরুন</span>
                  </button>
                  <button
                    type="button"
                    className="v12-junk-save-only-btn"
                    onClick={() => handleSaveJunkNote(false)}
                  >
                    <span>{savedFlash ? 'সেভ হয়েছে ✓' : 'শুধু সেভ'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="v9-minimal-actions">
            <button
              type="button"
              className="v9-minimal-btn primary is-unlocked"
              onClick={resumeFromPauseScreen}
            >
              <Play size={16} />
              <span>ফোকাসে ফিরুন (Resume Now)</span>
            </button>

            <button
              type="button"
              className={`v9-minimal-btn secondary ${
                isPauseCountdownDone ? 'is-unlocked' : 'is-locked'
              }`}
              disabled={!isPauseCountdownDone}
              onClick={confirmPauseAfterWait}
            >
              {isPauseCountdownDone ? <Pause size={15} /> : <Lock size={14} />}
              <span>পজ রাখুন (Stay Paused)</span>
            </button>
          </div>

          <small className="v12-pause-rule-hint">
            এই কার্ডের বাইরে ক্লিক, Start বাটন বা কিবোর্ডের যেকোনো কী চাপলেই পজ রিকোয়েস্ট সাথে সাথে বন্ধ হবে
          </small>
        </div>
      </div>
    );

    return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
  }

  if (timer?.status === 'half_wait') {
    const mmss = formatCountdownStrictMMSS(halfWaitLeft);
    const node = (
      <div className="v9-minimal-pause-backdrop is-counting" role="dialog" aria-modal="true">
        <div className="v9-minimal-pause-card">
          <div className="v9-minimal-pause-chip">
            <span className="v9-minimal-dot" />
            <span>{timer?.subjectName || 'Deep Goal'}</span>
          </div>

          <div className="v9-minimal-ring-wrap">
            <div className="v9-minimal-ring-center standalone">
              <strong className="v9-minimal-clock">{mmss}</strong>
              <small className="v9-minimal-sublabel">HALF GOAL EXIT</small>
            </div>
          </div>

          <div className="v9-minimal-actions">
            <button
              type="button"
              className="v9-minimal-btn primary is-unlocked"
              onClick={resumeHalfGoalWait}
            >
              <Play size={16} />
              <span>ফোকাসে ফিরুন (Resume)</span>
            </button>

            <button
              type="button"
              className={`v9-minimal-btn secondary ${
                halfWaitLeft <= 0 ? 'is-unlocked' : 'is-locked'
              }`}
              disabled={halfWaitLeft > 0}
              onClick={confirmHalfGoalExit}
            >
              <LogOut size={15} />
              <span>সংরক্ষণ করে বের হন</span>
            </button>
          </div>
        </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
  }

  if (guardNotice?.active) {
    return (
      <div className="guard-toast" role="status" aria-live="assertive">
        <ShieldAlert size={18} />
        <div>
          <strong>
            {guardNotice.type === 'domain' || guardNotice.type === 'edge'
              ? `অনুমোদনহীন ওয়েবসাইট "${guardNotice.windowTitle || guardNotice.appName}" ৩ সেকেন্ডে বন্ধ হচ্ছে`
              : `"${guardNotice.appName || 'অনুমোদনহীন অ্যাপ'}" ৩ সেকেন্ডে বন্ধ হচ্ছে`}
          </strong>
          <span>টাইমার অটো-পজ হয়েছে · অনুমোদিত স্টাডি সফটওয়্যারে ফিরলে আবার চালু হবে।</span>
        </div>
        <button className="mini-btn" onClick={simulateGuardReturn}>
          ফোকাসে ফিরুন
        </button>
      </div>
    );
  }

  return null;
}

export default PauseOverlays;
