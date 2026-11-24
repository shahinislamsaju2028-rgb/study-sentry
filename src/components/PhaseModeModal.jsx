import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock3, MoonStar, Sparkles, Sun, SunMedium, Sunrise } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { ALL_STUDY_PHASES, PHASE_MODE_OPTIONS } from '../utils/studyPhases';
import { circleClient } from '../utils/studyCircle';
import { desktopBridge } from '../bridge/desktopBridge';

export const PHASE_ICON_BY_ID = {
  dawn: Sunrise,
  morning: Sun,
  noon: SunMedium,
  afternoon: SunMedium,
  night: MoonStar,
  late_night: Sparkles,
};

export function PhaseModeCards({ value, onSelect, compact = false }) {
  return (
    <div className={`ss-phase-mode-grid ${compact ? 'is-compact' : ''}`} role="radiogroup" aria-label="অধ্যয়ন প্রহর মোড নির্বাচন">
      {PHASE_MODE_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        const phases = opt.phaseIds
          .map((pid) => ALL_STUDY_PHASES.find((p) => p.id === pid))
          .filter(Boolean);
        return (
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            key={opt.id}
            className={`ss-phase-mode-card ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect(opt.id)}
          >
            <div className="ss-pmc-head">
              <div>
                <strong>{opt.title}</strong>
                {!compact && <p>{opt.desc}</p>}
              </div>
              <span className={`ss-pmc-check ${selected ? 'on' : ''}`}>
                {selected && <Check size={14} strokeWidth={2.8} />}
              </span>
            </div>

            <div className="ss-pmc-pills">
              {phases.map((p) => {
                const Icon = PHASE_ICON_BY_ID[p.id] || Clock3;
                return (
                  <span
                    key={p.id}
                    className={`ss-pmc-pill ${p.isNew ? 'is-new' : ''}`}
                    style={{ '--p-tone': p.accent }}
                  >
                    <Icon size={13} />
                    <b>{p.label}</b>
                    <small>{p.compactTime}</small>
                  </span>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Shown automatically when a user signs in (and when explicitly opened from Settings / Profile),
 * allowing them to pick their preferred study phases:
 * - First 4 (ভোর, সকাল, দুপুর, রাত)
 * - Shifted 4 (সকাল, দুপুর, রাত, গভীর রাত [10:01 PM – 2:00 AM])
 * - All 5 (ভোর, সকাল, দুপুর, রাত, গভীর রাত)
 */
export default function PhaseModeModal() {
  const { state, loaded, phaseMode, setPhaseMode, phaseModalOpen, setPhaseModalOpen } = useStudy();
  const [draft, setDraft] = useState(phaseMode || 'first4');

  useEffect(() => {
    setDraft(phaseMode || 'first4');
  }, [phaseMode, phaseModalOpen]);

  // Prompt automatically whenever a user logs in and hasn't chosen their study phases yet
  useEffect(() => {
    if (!loaded) return undefined;
    const maybeOpenForUser = (user) => {
      if (!user?.id) return;
      const key = `sentry-phase-mode-chosen-${user.id}`;
      const alreadyChosen =
        Boolean(state?.profile?.phaseModeSelected) || localStorage.getItem(key) === '1';
      if (!alreadyChosen) {
        setPhaseModalOpen(true);
      }
    };

    if (desktopBridge.isDesktop && !state?.profile?.phaseModeSelected) {
      const localInit = localStorage.getItem('sentry-phase-mode-desktop-chosen');
      if (localInit !== '1') {
        setPhaseModalOpen(true);
      }
    }

    circleClient.auth.getSession().then(({ data }) => {
      if (data?.session?.user) maybeOpenForUser(data.session.user);
    }).catch(() => {});

    const { data: listener } = circleClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        maybeOpenForUser(session.user);
      }
    });
    return () => listener?.subscription?.unsubscribe();
  }, [loaded, state?.profile?.phaseModeSelected, setPhaseModalOpen]);

  if (!phaseModalOpen) return null;

  const confirmChoice = async () => {
    setPhaseMode(draft);
    try {
      localStorage.setItem('sentry-phase-mode-desktop-chosen', '1');
      const { data } = await circleClient.auth.getSession();
      if (data?.session?.user?.id) {
        localStorage.setItem(`sentry-phase-mode-chosen-${data.session.user.id}`, '1');
      }
    } catch (_) {}
  };

  return createPortal(
    <div className="ss-phase-modal-backdrop" role="dialog" aria-modal="true" aria-label="আপনার অধ্যয়ন প্রহর বেছে নিন">
      <div className="ss-phase-modal-card">
        <div className="ss-phase-modal-top">
          <span className="ss-phase-eyebrow">
            <Sparkles size={13} /> নতুন ৫ম প্রহর যুক্ত · গভীর রাত (রাত 10:01 – 2:00)
          </span>
          <h2>আপনি প্রতিদিন কোন প্রহরগুলোতে পড়বেন?</h2>
          <p>
            আপনার পড়ার অভ্যাস অনুযায়ী ৪টি অথবা ৫টি প্রহর বেছে নিন। ইনসাইটস, রুটিন, স্প্রিন্ট ও
            টাস্ক টাইমলাইন সব জায়গায় এটি স্বয়ংক্রিয়ভাবে সেট হবে (সেটিংস থেকে যেকোনো সময় বদলানো যাবে)।
          </p>
        </div>

        <PhaseModeCards value={draft} onSelect={setDraft} />

        <div className="ss-phase-modal-foot">
          <button
            type="button"
            className="action-btn primary ss-phase-confirm-btn"
            onClick={confirmChoice}
          >
            <Check size={16} /> প্রহর নিশ্চিত করুন
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
