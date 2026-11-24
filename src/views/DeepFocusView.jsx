import React, { useRef, useState } from 'react';
import {
  Zap,
  ArrowUpRight,
  Flame,
  CalendarDays,
  Target,
  Pencil,
  Maximize,
  Play,
  Sparkles,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { formatHM, toDateKey } from '../utils/seedData';
import { dateFromKey } from '../utils/stats';
import FocusCommitmentEditor from '../components/FocusCommitmentEditor';
import DailyTracker from '../components/DailyTracker';
import { TimeAnalytics } from '../components/GoalWidgets';
import { dailyTargetHours, dayCountInclusive, deadlineKeyFor } from '../utils/goalAnalytics';

export default function DeepFocusView() {
  const { state, goalTodaySec, streak, startTimer, setZen, updateCommitment, openModal } =
    useStudy();
  const c = state.commitment;
  const [editing, setEditing] = useState(false);
  const editButton = useRef(null);

  const closeEditor = () => {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  };

  const start = dateFromKey(c.startedDateKey);
  const today = dateFromKey(toDateKey());
  const daysElapsed = Math.max(
    1,
    Math.floor(
      (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        86400000
    ) + 1
  );
  const totalDays =
    dayCountInclusive(c.startedDateKey || toDateKey(), deadlineKeyFor(c)) ||
    Number(c.totalDays) ||
    30;
  const challengeDay = Math.min(daysElapsed, totalDays);
  const goalSec = dailyTargetHours(c, toDateKey()) * 3600;
  const progress = goalSec > 0 ? Math.min(100, Math.round((goalTodaySec / goalSec) * 100)) : 0;

  return (
    <div className="view-page focus-page">
      <div className="focus-layout">
        <div className="focus-main-col">
          <div className="commit-hero-card">
            <div className="commit-hero-copy">
              <span className="commit-tag">
                <Sparkles size={13} /> YOUR COMMITMENT
              </span>
              <h3>{c.active ? c.title : 'আপনার পড়ার অঙ্গীকার তৈরি করুন'}</h3>
              {c.active && c.pledge && <p>{c.pledge}</p>}
              <div className="commit-actions">
                <button
                  ref={editButton}
                  className="action-btn primary-violet df-edit-trigger"
                  onClick={() => setEditing(true)}
                >
                  {c.active ? <Pencil size={15} /> : <Zap size={15} />}{' '}
                  {c.active ? 'অঙ্গীকার সম্পাদনা' : 'নতুন অঙ্গীকার'}
                </button>
                <button
                  className="action-btn commit-zen-btn"
                  onClick={() => setZen(true)}
                >
                  <Maximize size={15} /> Zen Fullscreen
                </button>
              </div>
            </div>
            <div className="commit-art" aria-hidden="true">
              <div className="commit-orbit orbit-one" />
              <div className="commit-orbit orbit-two" />
              <div className="commit-orb">
                <Zap size={42} fill="currentColor" />
              </div>
              <span className="commit-star star-a">
                <Sparkles size={16} />
              </span>
              <span className="commit-star star-b">
                <Sparkles size={12} />
              </span>
            </div>
          </div>
        </div>

        <div className="focus-side-col">
          <section className="card progress-card">
            <div className="card-kicker">TODAY&apos;S PROGRESS</div>
            <div className="progress-card-head">
              <span className="large-progress">
                {progress}
                <small>%</small>
              </span>
              <span className="target-icon">
                <Target size={23} />
              </span>
            </div>
            <div className="progress-track tall">
              <span
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                }}
              />
            </div>
            <div className="progress-caption">
              <span>{formatHM(goalTodaySec)} সম্পন্ন</span>
              <span>লক্ষ্য {formatHM(goalSec)}</span>
            </div>
            <div className="focus-mini-stats">
              <div>
                <Flame size={17} color="var(--accent)" />
                <span>
                  <strong>{streak} দিন</strong>
                  <small>চলমান ধারাবাহিকতা</small>
                </span>
              </div>
              <div>
                <CalendarDays size={17} color="var(--accent-2)" />
                <span>
                  <strong>{c.active ? `${challengeDay} / ${totalDays}` : '—'}</strong>
                  <small>চ্যালেঞ্জ দিবস</small>
                </span>
              </div>
            </div>
            <button
              className="action-btn primary-violet full-btn"
              onClick={() => startTimer()}
            >
              <Play size={15} fill="currentColor" /> ফোকাস সেশন শুরু করুন
            </button>
          </section>

          {c.active && (
            <button
              className="text-button subtle-end"
              onClick={() =>
                openModal('confirm', {
                  title: 'চলমান অঙ্গীকার সমাপ্ত করবেন?',
                  description: 'আপনার আগের সব পড়ার রেকর্ড সুরক্ষিত থাকবে।',
                  confirmLabel: 'সমাপ্ত করুন',
                  danger: true,
                  onConfirm: () => updateCommitment({ active: false }),
                })
              }
            >
              চলমান অঙ্গীকার সমাপ্ত করুন <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="focus-extras">
        <TimeAnalytics compact />
        <DailyTracker embedded />
      </div>
      {editing && <FocusCommitmentEditor commitment={c} onClose={closeEditor} />}
    </div>
  );
}
