import React, { useMemo } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flame,
  Target,
  Timer,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { addDays, formatHM, toDateKey } from '../utils/seedData';
import { dateFromKey } from '../utils/stats';
import {
  dailyTargetHours,
  dayCountInclusive,
  deadlineKeyFor,
  goalAnalytics,
  hoursText,
  splitSeconds,
} from '../utils/goalAnalytics';
import { bnDate, bnDateTime, bnNum, bnSample } from '../utils/bangla';

const hoursBn = (seconds) => `${bnNum(hoursText(seconds).replace(/h$/, ''))} ঘণ্টা`;

function ClockDigits({ seconds, label }) {
  const p = splitSeconds(seconds);
  return (
    <div
      className="gw-clock"
      aria-label={`${label}: ${bnNum(p.days)} দিন ${bnNum(p.hours)} ঘণ্টা ${bnNum(p.minutes)} মিনিট ${bnNum(p.seconds)} সেকেন্ড`}
    >
      {[
        ['Day', p.days],
        ['Hr', p.hours],
        ['Min', p.minutes],
        ['Sec', p.seconds],
      ].map(([unit, n]) => (
        <div key={unit}>
          <strong>{bnNum(String(n).padStart(2, '0'))}</strong>
          <span>{unit}</span>
        </div>
      ))}
    </div>
  );
}

export function GoalDays({ compact = false }) {
  const { state, now, todayKey, navigate } = useStudy();
  const c = state.commitment;
  const startKey = c?.startedDateKey || todayKey;
  const endKey = deadlineKeyFor(c);
  const keys = useMemo(() => {
    const count = Math.min(3650, dayCountInclusive(startKey, endKey));
    const start = dateFromKey(startKey);
    return Array.from({ length: count }, (_, i) => toDateKey(addDays(start, i)));
  }, [startKey, endKey]);

  if (!c?.active || !keys.length) {
    return (
      <section className={`card gw-days ${compact ? 'compact' : ''}`}>
        <div className="gw-section-head">
          <div>
            <span className="gw-eyebrow">লক্ষ্য পরিক্রমা</span>
            <h3>লক্ষ্যের দিনসমূহ</h3>
          </div>
        </div>
        <p className="gw-muted">লক্ষ্য নির্ধারণ করলে প্রতিদিনের অগ্রগতি এখানে দেখা যাবে।</p>
        <button type="button" className="gw-link" onClick={() => navigate('focus')}>
          লক্ষ্য নির্ধারণ করুন <ArrowRight size={14} />
        </button>
      </section>
    );
  }

  const data = goalAnalytics(c, state.todos, now, 0);
  const ended = !data.deadline || data.deadline.getTime() <= now;
  const elapsed = keys.filter((k) => k < todayKey || (k === todayKey && ended)).length;
  const current = keys.includes(todayKey) && !ended;
  const remaining = keys.length - elapsed - (current ? 1 : 0);

  return (
    <section
      className={`card gw-days ${compact ? 'compact' : ''}`}
      aria-labelledby="goal-days-heading"
    >
      <div className="gw-section-head">
        <div>
          <span className="gw-eyebrow">লক্ষ্য পরিক্রমা</span>
          <h3 id="goal-days-heading">প্রতিটি দিন গুরুত্বপূর্ণ</h3>
          <p>{bnSample(c.title, state.isDemo)}</p>
        </div>
        <div className="gw-day-total">
          <strong>{bnNum(keys.length)}</strong>
          <span>মোট দিন</span>
        </div>
      </div>

      <div className="gw-dot-grid" role="list">
        {keys.map((key, i) => {
          const status =
            key < todayKey || (key === todayKey && ended)
              ? 'past'
              : key === todayKey && current
              ? 'today'
              : 'future';
          const readable = bnDate(dateFromKey(key), {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          const stateName =
            status === 'past' ? 'অতিবাহিত' : status === 'today' ? 'আজ' : 'আসন্ন';
          return (
            <span
              key={key}
              role="listitem"
              className={`gw-dot ${status}`}
              title={`দিন ${bnNum(i + 1)} · ${readable} · ${stateName}`}
            />
          );
        })}
      </div>

      <div className="gw-dot-legend">
        <span>
          <i className="past" /> অতিবাহিত {bnNum(elapsed)}
        </span>
        <span>
          <i className="today" /> আজ {bnNum(current ? 1 : 0)}
        </span>
        <span>
          <i className="future" /> বাকি {bnNum(remaining)}
        </span>
      </div>
    </section>
  );
}

export function TimeAnalytics({ compact = false }) {
  const { state, now, goalTodaySec } = useStudy();
  const c = state.commitment;
  if (!c?.active) {
    return (
      <section className="card gw-analytics">
        <div className="gw-section-head">
          <div>
            <span className="gw-eyebrow">সময় বিশ্লেষণ</span>
            <h3>সময়সীমা নির্ধারণ করুন</h3>
          </div>
          <CalendarClock size={19} />
        </div>
        <p className="gw-muted">বাকি সময় ও ফোকাস হিসাব দেখতে একটি লক্ষ্য ও ডেডলাইন সেট করুন।</p>
      </section>
    );
  }

  const data = goalAnalytics(c, state.todos, now, goalTodaySec);
  const goalDate = data.deadline;

  return (
    <section
      className={`card gw-analytics ${compact ? 'compact' : ''}`}
      aria-label="সময়সীমার হিসাব"
    >
      <div className="gw-section-head">
        <div>
          <span className="gw-eyebrow">সময় বিশ্লেষণ</span>
          <h3>ডেডলাইন কাউন্টডাউন</h3>
        </div>
        <CalendarClock size={20} />
      </div>
      <div className="gw-time-grid">
        <div className="gw-time-block">
          <div className="gw-time-title">
            <Timer size={15} />
            <span>প্রকৃত বাকি সময়</span>
          </div>
          <ClockDigits seconds={data.realSeconds} label="প্রকৃত বাকি সময়" />
          <small>
            {data.realSeconds === 0
              ? 'সময় পূর্ণ হয়েছে'
              : `শেষ সময়: ${goalDate ? bnDateTime(goalDate) : '—'}`}
          </small>
        </div>

        <div className="gw-time-block focus">
          <div className="gw-time-title">
            <Clock3 size={15} />
            <span>সম্ভাব্য মোট ফোকাস</span>
            <b>{hoursBn(data.focusSeconds)}</b>
          </div>
          <ClockDigits seconds={data.focusSeconds} label="সম্ভাব্য মোট ফোকাস" />
          <small>দৈনিক লক্ষ্য অনুযায়ী বাকি দিনগুলোর মোট ফোকাস সময়</small>
        </div>
      </div>
    </section>
  );
}

export function TimeBalance({ compact = false }) {
  const { state, now, goalTodaySec, navigate } = useStudy();
  const c = state.commitment;
  const data = goalAnalytics(c, state.todos, now, goalTodaySec);
  const over = c?.active && data.shortfallSeconds > 0;

  if (!c?.active) {
    return (
      <section className={`gw-balance ${compact ? 'compact' : ''}`}>
        <CircleAlert size={18} />
        <div>
          <strong>কাজ ও সময়ের ভারসাম্য</strong>
          <p>লক্ষ্য চালু করলে আপনার বাকি কাজ ও ফোকাস সময়ের তুলনা দেখাবে।</p>
        </div>
        <button type="button" className="gw-link" onClick={() => navigate('focus')}>
          লক্ষ্য সেট করুন <ArrowRight size={14} />
        </button>
      </section>
    );
  }

  return (
    <section
      className={`gw-balance ${over ? 'over' : 'balanced'} ${compact ? 'compact' : ''}`}
      aria-label="কাজ ও সময়ের ভারসাম্য"
    >
      {over ? <CircleAlert size={19} /> : <CheckCircle2 size={19} />}
      <div>
        <strong>
          {over ? 'কাজের পরিমাণ নির্ধারিত ফোকাস সময়ের চেয়ে বেশি' : 'পরিকল্পিত কাজ নির্ধারিত সময়ের মধ্যে সম্ভব'}
        </strong>
        <p>
          পরিকল্পিত কাজ: {hoursBn(data.plannedSeconds)} · সম্ভাব্য ফোকাস: {hoursBn(data.focusSeconds)}
          {over ? ` · ঘাটতি: ${hoursBn(data.shortfallSeconds)}` : ''}
        </p>
      </div>
      {!compact && (
        <button type="button" className="gw-link" onClick={() => navigate('todo')}>
          Task Board <ArrowRight size={14} />
        </button>
      )}
    </section>
  );
}

export function GoalSummary() {
  const { state, todayKey, goalTodaySec, streak } = useStudy();
  const targetSec = dailyTargetHours(state.commitment, todayKey) * 3600;
  const pct = targetSec > 0 ? Math.min(100, Math.round((goalTodaySec / targetSec) * 100)) : 0;

  return (
    <section className="card gw-summary" aria-label="আজকের লক্ষ্য সারাংশ">
      <div className="gw-section-head">
        <div>
          <span className="gw-eyebrow">দৈনিক অগ্রগতি</span>
          <h3>আজকের সারাংশ</h3>
        </div>
        <Target size={19} />
      </div>
      <div className="gw-summary-row">
        <div className="gw-streak">
          <Flame size={20} />
          <span>
            <strong>{bnNum(streak)} দিন</strong>
            <small>ধারাবাহিকতা</small>
          </span>
        </div>
        <strong className="gw-percent">
          {bnNum(pct)}
          <small>%</small>
        </strong>
      </div>
      <div
        className="gw-summary-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="gw-summary-caption">
        <span>{formatHM(goalTodaySec)} সম্পন্ন</span>
        <span>{targetSec ? `লক্ষ্য ${formatHM(targetSec)}` : 'বিশ্রামের দিন'}</span>
      </div>
    </section>
  );
}
