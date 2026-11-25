import React, { useEffect, useRef, useState } from 'react';
import { Award, Check, ChevronDown, ChevronUp, Clock3, Flame, Lock, Sparkles, Target, Zap } from 'lucide-react';
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
          <div
            className="jp-unlocked-Summary v57-milestone-count"
            aria-label={`মাইলস্টোন ${bnNum(rank.tier)} / ${bnNum(AURA_RANKS.length)}`}
          >
            <Flame size={15} aria-hidden="true" />
            <span className="jp-milestone-label">MILESTONE</span>
            <strong><span>{bnNum(rank.tier)}</span><i>/</i>{bnNum(AURA_RANKS.length)}</strong>
          </div>
          <button
            type="button"
            className="jp-roadmap-toggle v57-roadmap-toggle"
            aria-label={showRoadmap ? 'র‍্যাংক মাইলস্টোন লুকান' : 'সব র‍্যাংক মাইলস্টোন দেখান'}
            title={showRoadmap ? 'মাইলস্টোন লুকান' : 'মাইলস্টোন দেখান'}
            aria-expanded={showRoadmap}
            onClick={() => setShowRoadmap((v) => !v)}
          >
            {showRoadmap ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
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
          <div className="jp-crest-copy v57-crest-copy">
            <span className="jp-current-kicker v57-tier-eyebrow">
              <Sparkles size={12} aria-hidden="true" />
              <span>CURRENT TIER</span>
              <i aria-hidden="true" />
              <small>{String(rank.tier).padStart(2, '0')}</small>
            </span>
            <h3 className="v57-rank-title">
              <span>{curMeta.enTitle}</span>
              <small>{curMeta.bnTitle}</small>
            </h3>
            <div className="jp-quick-pills v57-quick-pills">
              <span title="মোট ফোকাস সময়">
                <Clock3 size={13} /> <b>{formatHM(totalSec)}</b><small>ফোকাস</small>
              </span>
              <span title="সম্পন্ন সেশন">
                <Award size={13} /> <b>{bnNum(sessionsCount)}</b><small>সেশন</small>
              </span>
            </div>
          </div>
        </div>

        <div className="jp-telemetry-box v57-xp-card">
          <div className="jp-telemetry-stats v57-xp-summary">
            <div className="jp-stat-block v57-xp-earned">
              <span><Sparkles size={13} /> সর্বমোট XP</span>
              <strong>{bnNum(earnedXp.toLocaleString())}<small>XP</small></strong>
              <em>অর্জিত অভিজ্ঞতা</em>
            </div>

            <div className="jp-stat-block highlight v57-xp-next">
              <span>{nextRank ? 'পরবর্তী মাইলস্টোন' : 'সর্বোচ্চ মাইলস্টোন'}</span>
              <strong>{nextMeta ? nextMeta.enTitle : 'Legend'}</strong>
              <em>{nextRank ? `${bnNum(remainingXp)} XP বাকি` : 'সব র‍্যাংক সম্পন্ন'}</em>
            </div>
          </div>

          <div className="jp-bar-header v57-xp-progress-heading">
            <span>
              <b>{curMeta.bnTitle}</b>
              <i aria-hidden="true">→</i>
              <b>{nextMeta ? nextMeta.bnTitle : 'সর্বোচ্চ স্তর'}</b>
            </span>
            <strong>{bnNum(pctLabel)}<small>%</small></strong>
          </div>

          <div
            className="jp-liquid-track v57-xp-track"
            role="progressbar"
            aria-label="পরবর্তী র‍্যাংকে অগ্রগতি"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pctLabel}
          >
            {pendingXp > 0 && nextRank && (
              <div className="jp-liquid-pending" style={{ width: `${pendingPercent}%` }} />
            )}
            <div className="jp-liquid-fill static-smooth" style={{ width: `${pct}%` }} />
            <span className="v57-xp-track-glint" style={{ left: `${pct}%` }}><Sparkles size={12} /></span>
          </div>

          <div className="v57-xp-footer">
            <span>{bnNum(earnedXp.toLocaleString())} XP অর্জিত</span>
            {nextRank && <span>লক্ষ্য {bnNum(nextRank.minXp.toLocaleString())} XP</span>}
            {pendingXp > 0 && (
              <span className="jp-live-earning"><Zap size={12} /> +{bnNum(pendingXp)} XP চলমান</span>
            )}
          </div>
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
