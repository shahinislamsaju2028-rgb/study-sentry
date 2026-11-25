import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock3, MoonStar, Sparkles, Sun, SunMedium, Sunrise } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { ALL_STUDY_PHASES, PHASE_MODE_OPTIONS } from '../utils/studyPhases';
import { bnNum } from '../utils/bangla';
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
  /* 4-2.txt ⑧ — the old control was three stacked radio cards, each with a
     title, a subtitle, a sentence of description, and four or five small
     pills. Choosing a schedule meant reading ~40 words and comparing two
     nearly identical pill rows. This is the same choice, told as a day.

     One 24-hour ruler at the top shows every phase window at its real
     position; each option below is a row that lights up its own slice of that
     ruler. You pick by seeing where the studying lands, not by parsing prose. */
  const START = 5.5;   // 5:30 AM — first phase opens
  const SPAN = 22.5;   // through 4:00 AM, rounded past গভীর রাত
  const posOf = (h) => Math.max(0, Math.min(100, ((h - START) / SPAN) * 100));

  return (
    <div className={`v51-slot-nav ${compact ? 'is-compact' : ''}`} role="radiogroup" aria-label="অধ্যয়ন প্রহর মোড নির্বাচন">
      {/* the day ruler: hour ticks every four hours, phase blocks underneath */}
      <div className="v51-slot-ruler" aria-hidden="true">
        <div className="v51-slot-ruler-hours">
          {[6, 10, 14, 18, 22, 2].map((h, i) => (
            <span key={i} style={{ left: `${posOf(h + (h === 2 ? 24 : 0))}%` }}>
              {bnNum(h === 2 ? 2 : h)}টা
            </span>
          ))}
        </div>
        <div className="v51-slot-ruler-track">
          {ALL_STUDY_PHASES.map((p) => (
            <span
              key={p.id}
              className="v51-slot-block"
              style={{
                left: `${posOf(p.startHour)}%`,
                width: `${Math.max(2, posOf(p.endHour) - posOf(p.startHour))}%`,
                '--p-tone': p.accent,
              }}
              title={`${p.label} · ${p.windowLabel}`}
            />
          ))}
        </div>
      </div>

      <div className="v51-slot-options">
        {PHASE_MODE_OPTIONS.map((opt) => {
          const selected = value === opt.id;
          const phases = opt.phaseIds
            .map((pid) => ALL_STUDY_PHASES.find((p) => p.id === pid))
            .filter(Boolean);
          const first = phases[0];
          const last = phases[phases.length - 1];
          const hours = phases.reduce(
            (n, p) => n + Math.max(0, (p.endHour || 0) - (p.startHour || 0)),
            0
          );
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              key={opt.id}
              className={`v51-slot-option ${selected ? 'is-selected' : ''}`}
              onClick={() => onSelect(opt.id)}
            >
              <span className="v51-slot-check">
                {selected ? <Check size={14} strokeWidth={3} /> : null}
              </span>

              <span className="v51-slot-copy">
                <strong>{opt.title}</strong>
                <small>
                  {first && last
                    ? `${first.compactTime.split('–')[0]} → ${last.compactTime.split('–')[1]}`
                    : opt.subtitle}
                </small>
              </span>

              <span className="v51-slot-emblems" aria-hidden="true">
                {phases.map((p) => {
                  const Icon = PHASE_ICON_BY_ID[p.id] || Clock3;
                  return (
                    <span
                      key={p.id}
                      className={`v51-slot-emblem ${p.isNew ? 'is-new' : ''}`}
                      style={{ '--p-tone': p.accent }}
                    >
                      <Icon size={13} />
                    </span>
                  );
                })}
              </span>

              <span className="v51-slot-hours">
                <b>{bnNum(Math.round(hours))}</b>
                <em>ঘণ্টা</em>
              </span>

              {/* a mini ruler on the row itself: where this option studies */}
              <span className="v51-slot-mini" aria-hidden="true">
                {phases.map((p) => (
                  <i
                    key={p.id}
                    style={{
                      left: `${posOf(p.startHour)}%`,
                      width: `${Math.max(2, posOf(p.endHour) - posOf(p.startHour))}%`,
                      '--p-tone': p.accent,
                    }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <p className="v51-slot-foot">
        {value === 'all5'
          ? 'ভোর ৫:৩০ থেকে গভীর রাত ২:০০ — দিনের সবচেয়ে বড় পড়ার জানালা।'
          : value === 'last4'
          ? 'সকাল ১০টা থেকে গভীর রাত ২টা — যারা রাত জেগে পড়েন তাঁদের জন্য।'
          : 'ভোর ৫:৩০ থেকে রাত ১০টা — সূর্যাস্তের আগেই পড়া শেষ করার রুটিন।'}
      </p>
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
