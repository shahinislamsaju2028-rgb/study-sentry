import React, { useEffect, useRef, useState } from 'react';
import { BellRing, Play, Sparkles, CheckCircle2, Plus, Check, X } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { studyAudio } from '../utils/audioEngine';
import BrandIcon from './BrandIcon';
import { bnSubject } from '../utils/bangla';
import { HUMAN_MISSED_NUDGE_MESSAGE } from '../utils/studyPhases';
import { desktopBridge } from '../bridge/desktopBridge';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseSlotTimeMinutes(str = '') {
  const m = String(str).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let hr = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = (m[3] || '').toUpperCase();
  if (ampm === 'PM' && hr < 12) hr += 12;
  if (ampm === 'AM' && hr === 12) hr = 0;
  return hr * 60 + min;
}

function triggerPushWithSound(title, body) {
  studyAudio.playNotificationAlert();
  desktopBridge.notifyRoutine(body, title).catch(() => {});
}

export default function RoutineReminders() {
  const {
    state,
    timer,
    startTimer,
    startPhaseFocus,
    phaseSnapshot,
    timelineSyncPrompt,
    acceptTimelineSyncTasks,
    dismissTimelineSyncPrompt,
    navigate,
  } = useStudy();

  const [banner, setBanner] = useState(null);
  const [selectedSyncIds, setSelectedSyncIds] = useState({});
  const [customSyncText, setCustomSyncText] = useState('');

  const firedRef = useRef(new Set());
  const prevDonePhasesRef = useRef(null);
  const nudgedPhasesRef = useRef(new Set());

  useEffect(() => {
    if (!timelineSyncPrompt) return;
    const init = {};
    (timelineSyncPrompt.candidates || []).forEach((c) => {
      init[c.id] = true;
    });
    setSelectedSyncIds(init);
    setCustomSyncText('');
  }, [timelineSyncPrompt?.id]);

  // 1. Watch 4-Stage Study Phases (ভোর, সকাল, দুপুর, রাত) for Completion & Mentor Nudge
  useEffect(() => {
    if (!phaseSnapshot?.phases) return undefined;
    const todayKey = phaseSnapshot.todayKey;

    if (!prevDonePhasesRef.current || prevDonePhasesRef.current.day !== todayKey) {
      const initSet = new Set(
        phaseSnapshot.phases.filter((p) => p.done).map((p) => p.id)
      );
      prevDonePhasesRef.current = { day: todayKey, doneIds: initSet };
    } else {
      for (const p of phaseSnapshot.phases) {
        if (p.done && !prevDonePhasesRef.current.doneIds.has(p.id)) {
          prevDonePhasesRef.current.doneIds.add(p.id);
          const msg = `আলহামদুলিল্লাহ! আজকের ${p.label} পর্যায়ের (${p.orderBn}) লক্ষ্য পূর্ণ হয়েছে।`;
          triggerPushWithSound('Study Sentry · ফেজ সম্পন্ন ✨', msg);
          setBanner({
            kind: 'phase-complete',
            phaseId: p.id,
            eyebrow: `${p.orderBn} সম্পন্ন`,
            title: msg,
            message: '',
          });
        }
      }
    }

    if (!timer && phaseSnapshot.shouldShowHumanNudge) {
      const targetPhase = phaseSnapshot.activeWindowPhase || phaseSnapshot.currentPhase;
      const nudgeKey = `${todayKey}::nudge::${targetPhase?.id || 'general'}`;
      if (targetPhase && !nudgedPhasesRef.current.has(nudgeKey)) {
        const tId = setTimeout(() => {
          nudgedPhasesRef.current.add(nudgeKey);
          triggerPushWithSound(
            `Study Sentry · ${targetPhase.label} পর্যায়`,
            HUMAN_MISSED_NUDGE_MESSAGE
          );
          setBanner({
            kind: 'phase-nudge',
            phaseId: targetPhase.id,
            eyebrow: `${targetPhase.label} পর্যায় (${targetPhase.windowLabel})`,
            title: HUMAN_MISSED_NUDGE_MESSAGE,
            message: 'একটানা অথবা স্প্লিট সেশনে (যেমন ৯০মি + ৯০মি) ২–৩ ঘণ্টার লক্ষ্য পূরণ করুন।',
          });
        }, 2200);
        return () => clearTimeout(tId);
      }
    }
    return undefined;
  }, [phaseSnapshot, timer]);

  useEffect(() => {
    if (timer && banner?.kind === 'phase-nudge') {
      setBanner(null);
    }
  }, [timer, banner?.kind]);

  // 2. Watch Routine Slots for exact-time reminders with Push + Sound Alert
  useEffect(() => {
    if (!state?.routine || timer) return undefined;
    const check = () => {
      const dhakaNow = new Date(Date.now() + 6 * 3600000);
      const dayName = DAY_NAMES[dhakaNow.getUTCDay()];
      const curMin = dhakaNow.getUTCHours() * 60 + dhakaNow.getUTCMinutes();
      const dateStamp = dhakaNow.toISOString().slice(0, 10);

      const dayObj = (state.routine || []).find((r) => r.day === dayName);
      const slots = Array.isArray(dayObj?.slots) ? dayObj.slots : [];
      for (const slot of slots) {
        const slotMin = parseSlotTimeMinutes(slot.time || '');
        if (slotMin == null) continue;
        const diff = slotMin - curMin;
        const key = `${dateStamp}::${slot.id || slot.time}::${slot.subject}`;
        if (diff >= -2 && diff <= 5 && !firedRef.current.has(key)) {
          firedRef.current.add(key);
          const msg = `${bnSubject(slot.subject)} পড়ার নির্ধারিত সময় শুরু হয়েছে।`;
          triggerPushWithSound(`রুটিন স্লট · ${slot.time}`, msg);
          setBanner({
            kind: 'routine-slot',
            subject: slot.subject,
            time: slot.time,
            eyebrow: `রুটিন স্লট · ${slot.time}`,
            title: msg,
            message: 'প্রস্তুত হলে ফোকাস সেশন শুরু করুন।',
          });
          break;
        }
      }
    };
    const id = setInterval(check, 25000);
    return () => clearInterval(id);
  }, [state?.routine, timer]);

  // Auto-Sync Timeline Push Notification Banner ("আজকে টাইমলাইনে কী কী টাস্ক অ্যাড করতে চান?")
  if (timelineSyncPrompt) {
    const candidates = timelineSyncPrompt.candidates || [];
    const chosenList = candidates.filter((c) => selectedSyncIds[c.id]);

    return (
      <div className="v9-autosync-push-card" role="dialog" aria-label="Timeline Auto Sync">
        <div className="v9-autosync-head">
          <div className="v9-autosync-title-wrap">
            <span className="v9-autosync-bell">
              <BrandIcon size={22} variant="clock-book-transparent" />
            </span>
            <div>
              <span className="v9-autosync-eyebrow">অটো-সিঙ্ক পুশ নোটিফিকেশন</span>
              <strong>{timelineSyncPrompt.question}</strong>
            </div>
          </div>
          <button
            type="button"
            className="v4-ai-mentor-close"
            onClick={dismissTimelineSyncPrompt}
            aria-label="বন্ধ করুন"
          >
            <X size={16} />
          </button>
        </div>

        {candidates.length > 0 && (
          <div className="v9-autosync-chips">
            {candidates.map((c) => {
              const checked = Boolean(selectedSyncIds[c.id]);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`v9-autosync-chip ${checked ? 'is-checked' : ''}`}
                  onClick={() =>
                    setSelectedSyncIds((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                  }
                >
                  <span className="v9-autosync-check">
                    {checked ? <Check size={12} /> : <Plus size={12} />}
                  </span>
                  <span>{c.title}</span>
                  <small>{c.sourceLabel}</small>
                </button>
              );
            })}
          </div>
        )}

        <div className="v9-autosync-form">
          <input
            type="text"
            className="v9-autosync-input"
            placeholder="নতুন টাস্ক লিখুন (যেমন: Physics অধ্যায় ৪ রিভিশন)..."
            value={customSyncText}
            onChange={(e) => setCustomSyncText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (chosenList.length > 0 || customSyncText.trim())) {
                acceptTimelineSyncTasks(chosenList, customSyncText);
              }
            }}
          />
          <button
            type="button"
            className="action-btn primary"
            disabled={chosenList.length === 0 && !customSyncText.trim()}
            onClick={() => acceptTimelineSyncTasks(chosenList, customSyncText)}
          >
            <Plus size={14} /> টাইমলাইনে অ্যাড করুন
          </button>
          <button
            type="button"
            className="action-btn ghost"
            onClick={() => {
              dismissTimelineSyncPrompt();
              navigate('todo');
            }}
          >
            টাইমলাইন খুলুন
          </button>
        </div>
      </div>
    );
  }

  if (!banner) return null;

  const isComplete = banner.kind === 'phase-complete';

  return (
    <div className={`v4-ai-mentor-banner ${isComplete ? 'is-complete' : 'is-nudge'}`} role="status">
      <div className="v4-ai-mentor-icon">
        {isComplete ? <CheckCircle2 size={20} /> : <Sparkles size={20} />}
      </div>
      <div className="v4-ai-mentor-body">
        <span className="v4-ai-mentor-eyebrow">{banner.eyebrow}</span>
        <strong className="v4-ai-mentor-title">{banner.title}</strong>
        {banner.message && <p className="v4-ai-mentor-msg">{banner.message}</p>}
      </div>
      <div className="v4-ai-mentor-actions">
        {!isComplete && (
          <button
            type="button"
            className="action-btn primary"
            onClick={() => {
              if (banner.kind === 'routine-slot') {
                const sub = state.subjects.find(
                  (s) => s.name.toLowerCase() === String(banner.subject || '').toLowerCase()
                );
                startTimer(sub?.id || state.subjects[0]?.id, { mode: 'pomodoro', minutes: 90 });
              } else {
                startPhaseFocus(banner.phaseId);
              }
              setBanner(null);
            }}
          >
            <Play size={14} /> এখনই পড়া শুরু করি
          </button>
        )}
        <button
          type="button"
          className="v4-ai-mentor-close"
          onClick={() => setBanner(null)}
          aria-label="বন্ধ করুন"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
