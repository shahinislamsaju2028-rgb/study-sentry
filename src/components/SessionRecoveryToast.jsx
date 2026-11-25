import React, { useEffect, useState } from 'react';
import { Clock3, ListTodo, Play, X, CheckCircle2 } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { bnNum, bnSubject } from '../utils/bangla';

const AUTO_TO_TASKBOARD_SECONDS = 22;

/**
 * Reminder toast shown on app launch when a previous focus session was interrupted
 * by exiting Study Sentry (e.g., 40m completed out of 90m -> 40m already saved,
 * 50m remaining). Clicking resumes immediately; ignoring or dismissing automatically
 * moves the remaining minutes into Task Board & Task Timeline!
 */
export default function SessionRecoveryToast() {
  const {
    pendingSessionRecovery: rec,
    resumePendingRecovery,
    deferRecoveryToTaskBoard,
  } = useStudy();

  const [secondsLeft, setSecondsLeft] = useState(AUTO_TO_TASKBOARD_SECONDS);

  useEffect(() => {
    if (!rec?.id) return undefined;
    setSecondsLeft(AUTO_TO_TASKBOARD_SECONDS);
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          // User didn't click the toast in time -> automatically add to Task Board & Timeline
          setTimeout(() => deferRecoveryToTaskBoard(false), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rec?.id, deferRecoveryToTaskBoard]);

  if (!rec) return null;

  const pct = Math.max(0, Math.min(100, (secondsLeft / AUTO_TO_TASKBOARD_SECONDS) * 100));

  return (
    <aside
      className="ss-recovery-toast"
      role="alertdialog"
      aria-live="polite"
      aria-label="পূর্বের অসমাপ্ত ফোকাস সেশনের রিমাইন্ডার"
    >
      <div className="ss-recovery-top">
        <span className="ss-recovery-badge">
          <CheckCircle2 size={14} /> পূর্বের {bnNum(rec.completedMin)} মিনিট সেভ হয়েছে
        </span>
        <button
          type="button"
          className="ss-recovery-close"
          title="টাস্ক বোর্ড ও টাইমলাইনে পাঠান"
          aria-label="বন্ধ করে টাস্ক বোর্ডে যোগ করুন"
          onClick={() => deferRecoveryToTaskBoard(false)}
        >
          <X size={15} />
        </button>
      </div>

      <div
        className="ss-recovery-body"
        role="button"
        tabIndex={0}
        onClick={() => resumePendingRecovery()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            resumePendingRecovery();
          }
        }}
      >
        <strong>
          আপনার আরও <em>{bnNum(rec.remainingMin)} মিনিট</em> ফোকাস বাকি রয়েছে
        </strong>
        <p>
          {bnSubject(rec.subjectName)}
          {rec.chapter ? ` · ${rec.chapter}` : ''} — মোট {bnNum(rec.originalMin)} মিনিটের মধ্যে{' '}
          {bnNum(rec.completedMin)} মিনিট সম্পন্ন হয়ে সংরক্ষিত আছে। ক্লিক করলেই বাকি{' '}
          {bnNum(rec.remainingMin)} মিনিট শুরু হবে, নতুবা টাস্ক বোর্ডে যুক্ত হবে।
        </p>
      </div>

      <div className="ss-recovery-actions">
        <button
          type="button"
          className="ss-recovery-btn primary"
          onClick={() => resumePendingRecovery()}
        >
          <Play size={14} fill="currentColor" />
          <span>বাকি {bnNum(rec.remainingMin)} মিনিট শুরু করুন</span>
        </button>
        <button
          type="button"
          className="ss-recovery-btn ghost"
          onClick={() => deferRecoveryToTaskBoard(true)}
        >
          <ListTodo size={14} />
          <span>টাস্ক বোর্ডে রাখুন ({bnNum(secondsLeft)}s)</span>
        </button>
      </div>

      <div className="ss-recovery-timer-rail" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>
    </aside>
  );
}
