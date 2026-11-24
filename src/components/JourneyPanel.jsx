import React, { useEffect, useRef, useState } from 'react';
import { Award, Check, ChevronDown, ChevronUp, Clock3, Flame, Lock, Target, Zap } from 'lucide-react';
import { AURA_RANKS, formatHM } from '../utils/seedData';
import { bnNum } from '../utils/bangla';
import JourneyBadge from './JourneyBadge';

export const RANK_DETAILS = {
  1: { bnTitle: 'নবীন অভিযাত্রী', enTitle: 'Novice', milestoneText: 'শুরুর স্তর' },
  2: { bnTitle: 'নিষ্ঠাবান শিক্ষানবিশ', enTitle: 'Apprentice', milestoneText: '২+ ঘণ্টা' },
  3: { bnTitle: 'মনোযোগী অভিযাত্রী', enTitle: 'Initiate', milestoneText: '৫ ঘণ্টা' },
  4: { bnTitle: 'স্থিরচিত্ত সাধক', enTitle: 'Focused', milestoneText: '৯+ ঘণ্টা' },
  5: { bnTitle: 'প্রজ্ঞাবান শিক্ষার্থী', enTitle: 'Scholar', milestoneText: '১৫ ঘণ্টা' },
  6: { bnTitle: 'অবিচল শৃঙ্খলাবদ্ধ', enTitle: 'Disciplined', milestoneText: '২২.৫ ঘণ্টা' },
  7: { bnTitle: 'অদম্য যোদ্ধা', enTitle: 'Relentless', milestoneText: '৩২.৫ ঘণ্টা' },
  8: { bnTitle: 'অগ্রণী পথিকৃৎ', enTitle: 'Vanguard', milestoneText: '৪৫ ঘণ্টা' },
  9: { bnTitle: 'কৌশলী মেধাবী', enTitle: 'Mastermind', milestoneText: '৬০ ঘণ্টা' },
  10: { bnTitle: 'শিখরস্পর্শী', enTitle: 'Apex', milestoneText: '৭৯+ ঘণ্টা' },
  11: { bnTitle: 'কিংবদন্তি সাধক', enTitle: 'Legend', milestoneText: '১০৪+ ঘণ্টা' },
};

function xpToReadableFocus(xpAmount) {
  const mins = Math.max(0, Math.ceil((Number(xpAmount) || 0) / 2));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${bnNum(h)}h ${bnNum(m)}m`;
  if (h > 0) return `${bnNum(h)}h`;
  return `${bnNum(m)}m`;
}

export default function JourneyPanel({
  state,
  rank,
  nextRank,
  xpPercent,
  timer,
  elapsedSec,
  totalSec,
}) {
  const badgeScroll = useRef(null);
  const [showRoadmap, setShowRoadmap] = useState(false);

  useEffect(() => {
    const container = badgeScroll.current;
    const selected = container?.querySelector('.jp-rank-card.current');
    if (!container || !selected || container.scrollWidth <= container.clientWidth) return;
    const cr = container.getBoundingClientRect();
    const sr = selected.getBoundingClientRect();
    container.scrollLeft += sr.left - cr.left - (cr.width - sr.width) / 2;
  }, [rank.tier, showRoadmap]);

  const earnedXp = Math.max(0, Number(state.profile.xp) || 0);
  const pendingXp =
    timer && timer.phase !== 'break'
      ? Math.floor(Math.max(0, Number(elapsedSec) || 0) / 60) * 2
      : 0;
  const difference = nextRank ? Math.max(1, nextRank.minXp - rank.minXp) : 1;
  const pendingPercent = nextRank
    ? Math.max(0, Math.min(100, ((earnedXp + pendingXp - rank.minXp) / difference) * 100))
    : 100;
  const remainingXp = nextRank ? Math.max(0, nextRank.minXp - earnedXp) : 0;
  const pct = Math.max(0, Math.min(100, Number(xpPercent) || 0));
  const pctLabel = nextRank ? Math.min(99, Math.round(pct)) : 100;

  const curMeta = RANK_DETAILS[rank.tier] || RANK_DETAILS[1];
  const nextMeta = nextRank ? RANK_DETAILS[nextRank.tier] : null;
  const sessionsCount = (state.sessions || []).length;

  return (
    <section className="card jp-journey jp-prestige-panel" aria-labelledby="jp-heading">
      {/* Single Clean Minimal Header with Icon */}
      <div className="jp-heading">
        <div className="clean-icon-heading">
          <Award size={20} className="clean-head-icon" />
          <h2 id="jp-heading">র‍্যাংক যাত্রা</h2>
        </div>

        <div className="jp-tier-meta">
          <span className="jp-unlocked-Summary">
            <Flame size={14} /> {bnNum(rank.tier)} / {bnNum(AURA_RANKS.length)}
          </span>
          <button
            type="button"
            className="jp-roadmap-toggle"
            aria-expanded={showRoadmap}
            onClick={() => setShowRoadmap((v) => !v)}
          >
            {showRoadmap ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{showRoadmap ? 'সংক্ষিপ্ত' : '১১টি র‍্যাংক'}</span>
          </button>
        </div>
      </div>

      <div className="jp-prestige-hero">
        <div className="jp-crest-showcase">
          <div
            className="jp-crest-halo v13-crest-levitate"
            style={{ '--rank-accent': rank.color || 'var(--accent)' }}
          >
            <JourneyBadge tier={rank.tier} size={94} />
          </div>
          <div className="jp-crest-copy">
            <span className="jp-current-kicker">Tier {String(rank.tier).padStart(2, '0')}</span>
            <h3>
              {curMeta.bnTitle} <small>({curMeta.enTitle})</small>
            </h3>
            <div className="jp-quick-pills">
              <span title="মোট ফোকাস সময়">
                <Clock3 size={13} /> <b>{formatHM(totalSec)}</b>
              </span>
              <span title="সম্পন্ন সেশন">
                <Award size={13} /> <b>{bnNum(sessionsCount)}</b>
              </span>
            </div>
          </div>
        </div>

        <div className="jp-telemetry-box">
          <div className="jp-telemetry-stats">
            <div className="jp-stat-block">
              <span>XP</span>
              <strong>{bnNum(earnedXp.toLocaleString())}</strong>
            </div>

            <div className="jp-stat-block highlight">
              <span>{nextRank ? 'পরবর্তী স্তর' : 'সর্বোচ্চ স্তর'}</span>
              <strong>{nextMeta ? nextMeta.bnTitle : 'Legend'}</strong>
              {nextRank && <em>বাকি {xpToReadableFocus(remainingXp)}</em>}
            </div>
          </div>

          <div className="jp-bar-header">
            <span>
              {nextMeta ? `${curMeta.bnTitle} → ${nextMeta.bnTitle}` : curMeta.bnTitle}
            </span>
            <strong>{bnNum(pctLabel)}%</strong>
          </div>

          <div
            className="jp-liquid-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pctLabel}
          >
            {pendingXp > 0 && nextRank && (
              <div className="jp-liquid-pending" style={{ width: `${pendingPercent}%` }} />
            )}
            <div className="jp-liquid-fill static-smooth" style={{ width: `${pct}%` }} />
          </div>

          {pendingXp > 0 && (
            <div className="jp-bar-footer">
              <span className="jp-live-earning">
                <Zap size={12} /> +{bnNum(pendingXp)} XP চলমান
              </span>
            </div>
          )}
        </div>
      </div>

      {showRoadmap && (
        <div className="jp-roadmap-section clean-view-stage">
          <div className="jp-roadmap-grid" ref={badgeScroll} role="list">
            {AURA_RANKS.map((r) => {
              const info = RANK_DETAILS[r.tier] || RANK_DETAILS[1];
              const isCurrent = r.tier === rank.tier;
              const isUnlocked = r.tier <= rank.tier;
              const isNext = r.tier === rank.tier + 1;

              return (
                <div
                  key={r.tier}
                  role="listitem"
                  className={`jp-rank-card ${isCurrent ? 'current' : ''} ${
                    isUnlocked ? 'unlocked' : 'locked'
                  } ${isNext ? 'next-target' : ''}`}
                  style={{ '--tier-color': r.color }}
                >
                  <div className="jp-rank-card-top">
                    <span className="jp-tier-num">T{String(r.tier).padStart(2, '0')}</span>
                    <span
                      className={`jp-status-pill ${
                        isCurrent ? 'current' : isUnlocked ? 'done' : isNext ? 'next' : 'locked'
                      }`}
                    >
                      {isCurrent ? (
                        '★'
                      ) : isUnlocked ? (
                        <Check size={11} />
                      ) : isNext ? (
                        <Target size={11} />
                      ) : (
                        <Lock size={11} />
                      )}
                    </span>
                  </div>

                  <div className="jp-rank-card-emblem">
                    <JourneyBadge tier={r.tier} size={62} />
                  </div>

                  <div className="jp-rank-card-body">
                    <strong>{info.bnTitle}</strong>
                    <span className="jp-en-sub">{info.enTitle}</span>
                  </div>

                  <div className="jp-rank-card-foot">
                    <span className="jp-milestone-hours">{info.milestoneText}</span>
                    <b>{bnNum(r.minXp.toLocaleString())} XP</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
