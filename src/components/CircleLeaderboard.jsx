import CustomSelect from './CustomSelect';
import React, { useEffect, useMemo, useState } from 'react';
import { Award, Crown, Flame, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import {
  DEFAULT_CIRCLE_NAME,
  LOUNGE_BRAND_NAME,
  circleClient as db,
  ensureUserCircleBootstrap,
} from '../utils/studyCircle';
import { bnNum } from '../utils/bangla';
import { useStudy } from '../context/StudyContext';

function formatHoursCompact(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${bnNum(m)} মি.`;
  if (m === 0) return `${bnNum(h)} ঘ.`;
  return `${bnNum(h)}ঘ ${bnNum(m)}মি`;
}

function formatHoursDecimal(sec) {
  const hrs = Math.max(0, Number(sec) || 0) / 3600;
  if (hrs === 0) return `${bnNum(0)} ঘ.`;
  if (hrs < 1) return `${bnNum(Math.max(1, Math.round(hrs * 60)))} মি.`;
  const rounded = Math.round(hrs * 10) / 10;
  return `${bnNum(Number.isInteger(rounded) ? rounded : rounded.toFixed(1))} ঘ.`;
}

function initialsOf(name) {
  const clean = String(name || 'শিক্ষার্থী').trim();
  return Array.from(clean)[0]?.toUpperCase() || 'শ';
}

function shortHandle(row) {
  const clean = String(row?.display_name || row?.username || 'শিক্ষার্থী').trim();
  return clean.length > 14 ? `${clean.slice(0, 13)}…` : clean;
}

export default function CircleLeaderboard({
  onReachRankOne,
  previewRows = null,
  previewGroupName = DEFAULT_CIRCLE_NAME,
}) {
  const { navigate } = useStudy();
  const [session, setSession] = useState(null);
  const [circles, setCircles] = useState([]);
  const [selected, setSelected] = useState('');
  const [period, setPeriod] = useState('today_seconds');
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [last, setLast] = useState(null);
  const [mode, setMode] = useState('group');
  const [metric, setMetric] = useState('time');
  const [refreshing, setRefreshing] = useState(false);

  const isPreview = !session && Array.isArray(previewRows);

  useEffect(() => {
    let alive = true;
    db.auth.getSession().then(({ data }) => alive && setSession(data.session));
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setCircles([]);
      setSelected('');
      setRows([]);
      return undefined;
    }
    let alive = true;
    ensureUserCircleBootstrap(session)
      .then(({ groups, defaultGroupId }) => {
        if (!alive) return;
        setCircles(groups || []);
        const saved = localStorage.getItem('sentry-selected-circle');
        const pick =
          (groups || []).find((x) => x.id === saved)?.id ||
          defaultGroupId ||
          groups?.[0]?.id ||
          '';
        setSelected(pick);
      })
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  const loadBoard = async (showSpin = false) => {
    if (!session || (mode === 'group' && !selected)) return;
    if (showSpin) setRefreshing(true);
    try {
      const { data, error } =
        mode === 'global'
          ? await db.rpc('sentry_global_board')
          : metric === 'xp'
          ? await db.rpc('sentry_group_xp_board', { cid: selected })
          : await db.rpc('sentry_circle_board', { cid: selected });
      if (error) {
        setErr(error.message);
        return;
      }
      setRows(data || []);
      setLast(new Date());
      setErr('');
    } finally {
      if (showSpin) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!session || (mode === 'group' && !selected)) return undefined;
    if (selected) localStorage.setItem('sentry-selected-circle', selected);
    let live = true;
    const tick = () => {
      if (live) void loadBoard(false);
    };
    tick();
    const t = setInterval(tick, 10000);
    const onChanged = () => tick();
    window.addEventListener('sentry-circle-changed', onChanged);
    return () => {
      live = false;
      clearInterval(t);
      window.removeEventListener('sentry-circle-changed', onChanged);
    };
  }, [selected, mode, metric, session?.user?.id]);

  const isXp = mode === 'group' && metric === 'xp';
  const showFull = (n) => (isXp ? `${bnNum(n || 0)} XP` : formatHoursCompact(n));
  const showBarTop = (n) => (isXp ? `${bnNum(n || 0)} XP` : formatHoursDecimal(n));

  const effectiveRows = useMemo(() => {
    if (!isPreview) return rows;
    return previewRows.map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      username: m.username,
      streak: m.streak || 0,
      today_seconds: isXp ? Math.round((m.todaySeconds || 0) / 40) : m.todaySeconds || 0,
      week_seconds: isXp ? Math.round((m.weekSeconds || 0) / 40) : m.weekSeconds || 0,
      month_seconds: isXp ? Math.round((m.monthSeconds || 0) / 40) : m.monthSeconds || 0,
    }));
  }, [isPreview, previewRows, rows, isXp]);

  const sorted = useMemo(
    () =>
      [...effectiveRows].sort(
        (a, b) =>
          (Number(b[period]) || 0) - (Number(a[period]) || 0) ||
          String(a.user_id || '').localeCompare(String(b.user_id || ''))
      ),
    [effectiveRows, period]
  );

  const selfUid = isPreview ? 'preview-self' : session?.user?.id;
  const myIndex = sorted.findIndex((x) => x.user_id === selfUid);
  const me = myIndex >= 0 ? sorted[myIndex] : null;
  const activeCircleName = isPreview
    ? previewGroupName
    : mode === 'global'
    ? 'গ্লোবাল র‍্যাঙ্কিং'
    : circles.find((c) => c.id === selected)?.name || DEFAULT_CIRCLE_NAME;

  useEffect(() => {
    if (
      !session?.user?.id ||
      myIndex !== 0 ||
      !me ||
      period !== 'today_seconds' ||
      isXp
    ) {
      return;
    }
    const mySec = Number(me.today_seconds) || 0;
    if (mySec < 60) return;
    const todayStamp = new Date().toISOString().slice(0, 10);
    const celebKey = `sentry-rank1-celebrated-${session.user.id}-${selected || 'global'}-${todayStamp}`;
    if (localStorage.getItem(celebKey) === '1') return;
    localStorage.setItem(celebKey, '1');
    const detail = { rank: 1, delta: null, circle: activeCircleName, seconds: mySec };
    if (onReachRankOne) onReachRankOne(detail);
    else window.dispatchEvent(new CustomEvent('sentry-rank1-achieved', { detail }));
  }, [
    myIndex,
    me?.today_seconds,
    period,
    isXp,
    selected,
    session?.user?.id,
    activeCircleName,
    onReachRankOne,
  ]);

  if (!session && !isPreview) {
    return (
      <div className="v30-lounge-card sc-board-guest">
        <div className="sc-board-title">
          <span className="sc-board-symbol">
            <Award size={22} />
          </span>
          <div>
            <h3>{DEFAULT_CIRCLE_NAME} লিডারবোর্ড</h3>
          </div>
        </div>
        <button
          type="button"
          className="v30-lounge-primary-btn"
          onClick={() => navigate('circle')}
        >
          {LOUNGE_BRAND_NAME} খুলুন
        </button>
      </div>
    );
  }

  const chartMembers = sorted.slice(0, 10);
  const maxVal = Math.max(1, ...chartMembers.map((r) => Math.max(0, Number(r[period]) || 0)));

  return (
    <div className="v30-lounge-card sc-board v28-graphical-board v30-board clean-view-stage">
      <div className="sc-board-head">
        <div className="sc-board-title">
          <span className="sc-board-symbol">
            <Trophy size={20} />
          </span>
          <div>
            <h3>{activeCircleName}</h3>
          </div>
        </div>

        <div className="v28-board-head-actions">
          {!isPreview && mode === 'group' && circles.length > 1 && (
            <CustomSelect
              aria-label="গ্রুপ নির্বাচন"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {circles.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </CustomSelect>
          )}
          {!isPreview && (
            <button
              type="button"
              className="v30-icon-glow-btn"
              disabled={refreshing}
              onClick={() => loadBoard(true)}
              title="রিফ্রেশ"
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            </button>
          )}
        </div>
      </div>

      <div className="v28-board-controls">
        <div className="v30-seg-pills" role="tablist" aria-label="সময়কাল">
          {[
            ['today_seconds', 'আজ'],
            ['week_seconds', 'সপ্তাহ'],
            ['month_seconds', 'মাস'],
          ].map(([id, text]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={period === id}
              className={period === id ? 'is-active' : ''}
              onClick={() => setPeriod(id)}
            >
              {text}
            </button>
          ))}
        </div>

        <div className="v30-seg-pills">
          <button
            type="button"
            className={mode === 'group' && metric === 'time' ? 'is-active' : ''}
            onClick={() => {
              setMode('group');
              setMetric('time');
            }}
          >
            ফোকাস ঘণ্টা
          </button>
          <button
            type="button"
            className={mode === 'group' && metric === 'xp' ? 'is-active' : ''}
            onClick={() => {
              setMode('group');
              setMetric('xp');
            }}
          >
            Quest XP
          </button>
          <button
            type="button"
            className={mode === 'global' ? 'is-active' : ''}
            onClick={() => {
              setMode('global');
              setMetric('time');
            }}
          >
            গ্লোবাল
          </button>
        </div>
      </div>

      {err && (
        <p role="alert" className="sc-error">
          {err} {last && `· ${last.toLocaleTimeString('bn-BD')}`}
        </p>
      )}

      {!sorted.length ? (
        <div className="v30-jn-empty">
          <Award size={24} />
          <span>আজ এখনো কোনো ফোকাস রেকর্ড নেই</span>
        </div>
      ) : (
        <>
          <div className="v28-vbar-chart-scroll">
            <div
              className="v28-vbar-chart"
              style={{ '--bar-count': Math.max(3, chartMembers.length) }}
            >
              {chartMembers.map((m, i) => {
                const rank = i + 1;
                const val = Math.max(0, Number(m[period]) || 0);
                const heightPct = val > 0 ? Math.max(14, Math.round((val / maxVal) * 100)) : 8;
                const isMe = m.user_id === selfUid;
                const tier =
                  rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'standard';

                return (
                  <div
                    key={m.user_id}
                    className={`v28-vbar-col tier-${tier} ${isMe ? 'is-me' : ''}`}
                    title={`#${rank} ${m.display_name || 'শিক্ষার্থী'} — ${showFull(val)}`}
                  >
                    <div className="v28-vbar-meta-top">
                      <span className={`v28-rank-pill tier-${tier}`}>
                        {rank === 1 && <Crown size={12} strokeWidth={2.5} />}#{bnNum(rank)}
                      </span>
                      <div className={`v28-user-avatar tier-${tier} ${isMe ? 'is-me' : ''}`}>
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{initialsOf(m.display_name)}</span>
                        )}
                      </div>
                      <strong className="v28-user-name">
                        {shortHandle(m)}
                        {isMe && <em>আপনি</em>}
                      </strong>
                      <span className="v28-user-hours">{showBarTop(val)}</span>
                    </div>

                    <div className="v28-vbar-track">
                      <div
                        className={`v28-vbar-fill tier-${tier}`}
                        style={{ height: `${heightPct}%` }}
                      >
                        <span className="v28-vbar-shine" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="v28-rank-list">
            {sorted.map((m, i) => {
              const rank = i + 1;
              const val = Math.max(0, Number(m[period]) || 0);
              const isMe = m.user_id === selfUid;
              return (
                <div key={m.user_id} className={`v28-rank-row ${isMe ? 'is-me' : ''}`}>
                  <span className={`v28-row-rank r-${rank <= 3 ? rank : 'n'}`}>
                    {rank === 1 ? <Crown size={13} /> : null}#{bnNum(rank)}
                  </span>
                  <span className="sc-avatar">{initialsOf(m.display_name)}</span>
                  <div className="v28-row-user">
                    <strong>
                      {m.display_name || 'শিক্ষার্থী'}
                      {isMe ? ' · আপনি' : ''}
                    </strong>
                    {m.streak > 0 && !isXp && (
                      <small>
                        <Flame size={11} /> {bnNum(m.streak)} দিন স্ট্রিক
                      </small>
                    )}
                  </div>
                  <strong className="v28-row-time">{showFull(val)}</strong>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className={`sc-my-rank ${myIndex === 0 ? 'is-champion' : ''}`}>
        {me ? (
          <>
            <strong>
              {myIndex === 0 ? <Crown size={17} /> : <Sparkles size={15} />} আপনার অবস্থান #
              {bnNum(myIndex + 1)}
            </strong>
            <span>{showFull(me[period])}</span>
          </>
        ) : (
          <span>ফোকাস শুরু করলেই আপনার সময় এখানে যুক্ত হবে।</span>
        )}
      </div>
    </div>
  );
}
