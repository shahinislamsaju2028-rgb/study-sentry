import React, { useEffect, useMemo, useRef, useState } from 'react';
import AcademicSetupModal from '../components/AcademicSetupModal';
import {
  Clock3,
  Coffee,
  Eye,
  Flame,
  Layers3,
  LogIn,
  Monitor,
  Moon,
  Radio,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react';
import LiveStudyScene from '../components/LiveStudyScene';
import CircleLeaderboard from '../components/CircleLeaderboard';
import GroupDiscovery from '../components/GroupDiscovery';
import IdentityPanel from '../components/IdentityPanel';
import { getGlobalRoomPresence } from '../components/StudyCircleSync';
import {
  DEFAULT_CIRCLE_NAME,
  LOUNGE_BRAND_NAME,
  circleClient as db,
  circleLogin,
  ensureUserCircleBootstrap,
} from '../utils/studyCircle';
import { useStudy } from '../context/StudyContext';
import { bnNum, bnSubject } from '../utils/bangla';
import { activeSecondsOnDay, sessionSecondsOnDay, timerElapsedMs } from '../utils/stats';
import { desktopBridge, isTauriRuntime } from '../bridge/desktopBridge';

const fmtDuration = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${bnNum(h)} ঘ. ${bnNum(m)} মি.`;
  if (h > 0) return `${bnNum(h)} ঘণ্টা`;
  if (m > 0) return `${bnNum(m)} মিনিট`;
  return s > 0 ? `${bnNum(s)} সে.` : `${bnNum(0)} মি.`;
};

const NAV_TABS = [
  { id: 'live', label: 'লাইভ রুম', Icon: Radio },
  { id: 'leaderboard', label: 'লিডারবোর্ড', Icon: Trophy },
  { id: 'quest', label: 'ডেইলি কোয়েস্ট', Icon: Sparkles },
  { id: 'groups', label: 'গ্রুপসমূহ', Icon: Layers3 },
  { id: 'profile', label: 'প্রোফাইল', Icon: UserRound },
];

// Showcase roster strictly for browser preview mode when not signed into Tauri OAuth
const PREVIEW_GROUPS = [
  {
    id: 'preview-hsc28',
    name: 'এইচএসসি 28',
    tagline: 'সবার সাথে লাইভ ফোকাস ও অধ্যয়ন প্রতিযোগিতা',
    member_count: 5,
    visibility: 'public',
    emblem: '🎓',
  },
  {
    id: 'preview-buet28',
    name: 'ইঞ্জিনিয়ারিং মিশন ২৮',
    tagline: 'পদার্থবিজ্ঞান, রসায়ন ও উচ্চতর গণিত প্র্যাকটিস',
    member_count: 3,
    visibility: 'public',
    emblem: '🚀',
  },
];

const PREVIEW_MEMBERS = [
  {
    user_id: 'demo-ahmed',
    display_name: 'আহমেদ রহমান',
    username: 'ahmed_28',
    status: 'studying',
    subject: 'Physics',
    elapsed_seconds: 2640,
    today_seconds: 11820,
    week_seconds: 68400,
    month_seconds: 241200,
    streak: 12,
    device_type: 'computer',
  },
  {
    user_id: 'demo-nusrat',
    display_name: 'নুসরাত জাহান',
    username: 'nusrat_hsc',
    status: 'studying',
    subject: 'Chemistry',
    elapsed_seconds: 1740,
    today_seconds: 9540,
    week_seconds: 59400,
    month_seconds: 214000,
    streak: 9,
    device_type: 'mobile',
  },
  {
    user_id: 'demo-tanvir',
    display_name: 'তানভীর হাসান',
    username: 'tanvir_math',
    status: 'break',
    subject: 'Math',
    elapsed_seconds: 3000,
    today_seconds: 7800,
    week_seconds: 51200,
    month_seconds: 192000,
    streak: 6,
    device_type: 'computer',
  },
  {
    user_id: 'demo-sadia',
    display_name: 'সাদিয়া ইসলাম',
    username: 'sadia_bio',
    status: 'offline',
    subject: null,
    elapsed_seconds: 0,
    today_seconds: 5400,
    week_seconds: 38900,
    month_seconds: 158400,
    streak: 4,
    device_type: null,
  },
];

export default function StudyCircleView() {
  const { state, timer, todayKey } = useStudy();
  const [showAcademicSetup, setShowAcademicSetup] = useState(false);
  const [section, setSection] = useState('live');
  const [groupSheet, setGroupSheet] = useState(false);
  useEffect(() => {
    if (!groupSheet) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setGroupSheet(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [groupSheet]);
  const [liveFilter, setLiveFilter] = useState('all');
  const [liveSearch, setLiveSearch] = useState('');
  const [session, setSession] = useState(null);
  const [previewMode, setPreviewMode] = useState(() => !isTauriRuntime());
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState('');
  const [members, setMembers] = useState([]);
  const [boardMap, setBoardMap] = useState({});
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [realtimeMap, setRealtimeMap] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const previewBootAt = useRef(Date.now());

  const activeGroup = useRef(selected);
  activeGroup.current = selected;

  // Track real Supabase auth session
  useEffect(() => {
    let live = true;
    db.auth.getSession().then(({ data }) => {
      if (!live) return;
      setSession(data.session);
      if (data.session) setPreviewMode(false);
    });
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setPreviewMode(false);
    });
    const onError = (e) => setError(e.detail);
    window.addEventListener('sentry-auth-error', onError);
    return () => {
      live = false;
      subscription.unsubscribe();
      window.removeEventListener('sentry-auth-error', onError);
    };
  }, []);

  // Smooth 1s tick inside Live Room so live study timers count up seamlessly
  useEffect(() => {
    if (section !== 'live') return undefined;
    setClock(Date.now());
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, [section]);

  const uid = session?.user?.id;
  const isPreview = !session && previewMode;

  useEffect(() => {
    const needsSetup = Boolean(session && (!state.profile?.academicSetupDone || state.profile?.academicSetupUserId !== uid));
    setShowAcademicSetup(needsSetup);
  }, [uid, !!session, state.profile?.academicSetupDone, state.profile?.academicSetupUserId]);

  async function refreshGroups() {
    if (isPreview) return;
    const boot = await ensureUserCircleBootstrap(session);
    setGroups(boot.groups || []);
    if (boot.profile) setProfile(boot.profile);
    setSelected((old) => {
      if (old && (boot.groups || []).some((g) => g.id === old)) return old;
      const saved = localStorage.getItem('sentry-selected-circle');
      return (
        (boot.groups || []).find((x) => x.id === saved)?.id ||
        boot.defaultGroupId ||
        boot.groups?.[0]?.id ||
        ''
      );
    });
  }

  // Bootstrap "এইচএসসি 28" + profile immediately upon login
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setGroups([]);
      setMembers([]);
      setBoardMap({});
      setRealtimeMap({});
      setSelected(isPreview ? PREVIEW_GROUPS[0].id : '');
      return;
    }
    setBusy(true);
    ensureUserCircleBootstrap(session)
      .then(({ groups: gs, defaultGroupId, profile: pf }) => {
        setGroups(gs || []);
        setProfile(pf);
        const saved = localStorage.getItem('sentry-selected-circle');
        const nextId =
          (gs || []).find((x) => x.id === saved)?.id ||
          defaultGroupId ||
          gs?.[0]?.id ||
          '';
        setSelected(nextId);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [uid, isPreview]);

  useEffect(() => {
    if (selected && uid) localStorage.setItem('sentry-selected-circle', selected);
  }, [selected, uid]);

  // Fetch BOTH live presence AND today's total focus seconds for every member every 8s!
  // Uses local `fetchedAt` instead of comparing raw client vs server clocks — permanently immune
  // to laptop clock skew so friends focusing NEVER falsely show offline!
  async function refreshMembers() {
    const groupId = selected;
    if (!groupId || !uid) return;
    const [viewRes, boardRes] = await Promise.all([
      db.rpc('sentry_circle_view_v2', { cid: groupId }),
      db.rpc('sentry_circle_board', { cid: groupId }),
    ]);
    if (activeGroup.current !== groupId) return;
    if (viewRes.error) throw viewRes.error;
    const stamp = Date.now();
    setFetchedAt(stamp);
    setMembers(viewRes.data || []);
    if (!boardRes.error && Array.isArray(boardRes.data)) {
      const nextMap = {};
      boardRes.data.forEach((row) => {
        if (row?.user_id) nextMap[row.user_id] = row;
      });
      setBoardMap(nextMap);
    }
  }

  useEffect(() => {
    setMembers([]);
    setBoardMap({});
    if (!uid || !selected) return undefined;
    refreshMembers().catch((e) => setError(e.message));
    const t = setInterval(() => refreshMembers().catch(() => {}), 8000);
    const onChanged = () => refreshMembers().catch(() => {});
    window.addEventListener('sentry-circle-changed', onChanged);
    return () => {
      clearInterval(t);
      window.removeEventListener('sentry-circle-changed', onChanged);
    };
  }, [selected, uid]);

  // Subscribe to root-level StudyCircleSync Realtime Presence updates (instant <200ms!)
  useEffect(() => {
    if (!uid || !selected) {
      setRealtimeMap({});
      return undefined;
    }
    setRealtimeMap(getGlobalRoomPresence(selected));
    const onPresence = (e) => {
      if (e?.detail?.groupId === selected) {
        setRealtimeMap(e.detail.map || {});
      }
    };
    window.addEventListener('sentry-room-presence', onPresence);
    return () => window.removeEventListener('sentry-room-presence', onPresence);
  }, [uid, selected]);

  // Self today focus seconds
  const myTodaySeconds = useMemo(() => {
    let sec = (state.sessions || []).reduce((n, s) => n + sessionSecondsOnDay(s, todayKey), 0);
    if (timer && timer.phase !== 'break') {
      sec += activeSecondsOnDay(timer, todayKey, clock);
    }
    return Math.max(0, Math.floor(sec));
  }, [state.sessions, timer, todayKey, clock]);

  const effectiveGroups = isPreview ? PREVIEW_GROUPS : groups;
  const effectiveSelected = selected || effectiveGroups[0]?.id || '';

  // Unified roster merging DB presence + DB today focus totals + Realtime presence + local self
  const mergedMembers = useMemo(() => {
    if (isPreview) {
      const deltaSec = Math.max(0, Math.floor((clock - previewBootAt.current) / 1000));
      const selfStatus = !timer
        ? 'idle'
        : timer.phase === 'break'
        ? 'break'
        : timer.status === 'running'
        ? 'studying'
        : 'paused';
      const selfCard = {
        user_id: 'preview-self',
        display_name: state.profile?.name || 'আপনি',
        effStatus: selfStatus,
        subject: timer?.subjectName || null,
        liveElapsed: timer ? Math.floor(timerElapsedMs(timer, clock) / 1000) : 0,
        todaySeconds: myTodaySeconds,
        weekSeconds: myTodaySeconds + 21600,
        monthSeconds: myTodaySeconds + 86400,
        streak: 5,
        device_type: 'computer',
        isSelf: true,
      };
      const peers = PREVIEW_MEMBERS.filter((p) =>
        effectiveSelected === 'preview-buet28' ? p.user_id !== 'demo-sadia' : true
      ).map((p) => ({
        ...p,
        effStatus: p.status,
        liveElapsed:
          p.status === 'studying' ? p.elapsed_seconds + deltaSec : p.elapsed_seconds,
        todaySeconds:
          p.status === 'studying' ? p.today_seconds + deltaSec : p.today_seconds,
        weekSeconds: p.week_seconds,
        monthSeconds: p.month_seconds,
        isSelf: false,
      }));
      const rank = (s) =>
        s === 'studying' ? 0 : s === 'break' || s === 'paused' ? 1 : s === 'idle' ? 2 : 3;
      return [selfCard, ...peers].sort(
        (a, b) => rank(a.effStatus) - rank(b.effStatus) || b.todaySeconds - a.todaySeconds
      );
    }

    const byId = new Map();

    // 1. Seed from circle presence view (server already validated freshness with Postgres now()!)
    for (const m of members) {
      byId.set(m.user_id, {
        ...m,
        _baseAt: fetchedAt,
        _serverVerified: ['studying', 'paused', 'break', 'idle'].includes(m.status),
      });
    }

    // 2. Enrich with leaderboard focus totals (and include any member who studied today!)
    Object.entries(boardMap).forEach(([userId, b]) => {
      const prev = byId.get(userId) || { user_id: userId, status: 'offline', _baseAt: fetchedAt };
      byId.set(userId, {
        ...prev,
        display_name: prev.display_name || b.display_name || 'শিক্ষার্থী',
        username: prev.username || b.username || null,
        avatar_url: prev.avatar_url || b.avatar_url || null,
        today_seconds: Math.max(Number(prev.today_seconds) || 0, Number(b.today_seconds) || 0),
        week_seconds: Number(b.week_seconds) || 0,
        month_seconds: Number(b.month_seconds) || 0,
        streak: Number(b.streak) || 0,
      });
    });

    // 3. Overlay sub-second Realtime Presence
    Object.entries(realtimeMap).forEach(([userId, rt]) => {
      const prev = byId.get(userId) || { user_id: userId };
      byId.set(userId, {
        ...prev,
        display_name: rt.display_name || prev.display_name || 'শিক্ষার্থী',
        username: rt.username || prev.username || null,
        avatar_url: rt.avatar_url || prev.avatar_url || null,
        status: rt.status || prev.status || 'idle',
        subject: rt.subject ?? prev.subject ?? null,
        elapsed_seconds: rt.elapsed_seconds ?? prev.elapsed_seconds ?? 0,
        today_seconds: Math.max(Number(rt.today_seconds) || 0, Number(prev.today_seconds) || 0),
        device_type: rt.device_type || prev.device_type || null,
        _baseAt: rt._receivedAt || fetchedAt,
        _isRealtime: true,
      });
    });

    // 4. Overlay exact instant local self timer
    if (uid && profile?.show_live !== false) {
      const prev = byId.get(uid) || { user_id: uid };
      const selfStatus = !timer
        ? 'idle'
        : timer.phase === 'break'
        ? 'break'
        : timer.status === 'running'
        ? 'studying'
        : 'paused';
      byId.set(uid, {
        ...prev,
        display_name: profile?.display_name || prev.display_name || 'শিক্ষার্থী',
        avatar_url:
          state.profile?.avatarUrl ||
          session?.user?.user_metadata?.avatar_url ||
          prev.avatar_url ||
          null,
        status: selfStatus,
        subject: timer?.subjectName || null,
        elapsed_seconds: timer ? Math.floor(timerElapsedMs(timer, clock) / 1000) : 0,
        today_seconds: Math.max(myTodaySeconds, Number(prev.today_seconds) || 0),
        device_type: desktopBridge.isDesktop ? 'computer' : prev.device_type || 'computer',
        _baseAt: clock,
        _isSelf: true,
      });
    }

    const orderRank = (s) =>
      s === 'studying' ? 0 : s === 'break' || s === 'paused' ? 1 : s === 'idle' ? 2 : 3;

    return Array.from(byId.values())
      .map((m) => {
        const isActive = Boolean(m._isSelf || m._isRealtime || m._serverVerified);
        const effStatus = isActive ? m.status || 'idle' : 'offline';
        const tickDelta =
          !m._isSelf && effStatus === 'studying' && m._baseAt
            ? Math.min(180, Math.max(0, Math.floor((clock - m._baseAt) / 1000)))
            : 0;
        const liveElapsed = Math.max(0, (Number(m.elapsed_seconds) || 0) + tickDelta);
        const baseToday = Math.max(Number(m.today_seconds) || 0, Number(m.elapsed_seconds) || 0);
        const todaySeconds = m._isSelf ? myTodaySeconds : baseToday + tickDelta;
        return {
          ...m,
          isSelf: m.user_id === uid,
          effStatus,
          liveElapsed,
          todaySeconds,
        };
      })
      .sort(
        (a, b) =>
          orderRank(a.effStatus) - orderRank(b.effStatus) ||
          b.todaySeconds - a.todaySeconds ||
          String(a.display_name || '').localeCompare(String(b.display_name || ''))
      );
  }, [
    isPreview,
    members,
    boardMap,
    realtimeMap,
    uid,
    profile,
    session,
    timer,
    clock,
    fetchedAt,
    myTodaySeconds,
    effectiveSelected,
    state.profile?.name,
  ]);

  const studyingCount = mergedMembers.filter((m) => m.effStatus === 'studying').length;
  const breakCount = mergedMembers.filter(
    (m) => m.effStatus === 'break' || m.effStatus === 'paused'
  ).length;
  const restingCount = mergedMembers.length - studyingCount - breakCount;
  const roomTodaySeconds = mergedMembers.reduce((sum, m) => sum + (m.todaySeconds || 0), 0);

  const visibleMembers = useMemo(() => {
    const q = liveSearch.toLocaleLowerCase().trim();
    return mergedMembers
      .filter((m) => !q || String(m.display_name || '').toLocaleLowerCase().includes(q))
      .filter((m) => {
        if (liveFilter === 'studying') return m.effStatus === 'studying';
        if (liveFilter === 'break') return m.effStatus === 'break' || m.effStatus === 'paused';
        if (liveFilter === 'resting')
          return m.effStatus === 'idle' || m.effStatus === 'offline';
        return true;
      });
  }, [mergedMembers, liveSearch, liveFilter]);

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  /* ======================================================================
     SLEEK MODERN GOOGLE SIGN-IN PORTAL
     ====================================================================== */
  if (!session && !previewMode) {
    return (
      <section className="v30-lounge-shell v30-lounge-auth">
        <div className="v30-auth-card">
          <div className="v30-auth-glow" aria-hidden="true" />
          <div className="v30-auth-badge">
            <Radio size={13} />
            <span>{LOUNGE_BRAND_NAME.toUpperCase()}</span>
          </div>

          <h2>{DEFAULT_CIRCLE_NAME}</h2>
          <p>
            যেকোনো Gmail দিয়ে লগইন করলেই স্বয়ংক্রিয়ভাবে <strong>{DEFAULT_CIRCLE_NAME}</strong> লাইভ
            রুমে যুক্ত হবেন — কে কতক্ষণ ফোকাস করছে, কে বিরতিতে আছে, লিডারবোর্ড ও ডেইলি কোয়েস্ট একসাথে।
          </p>

          <div className="v30-auth-preview-trio">
            <div className="v30-auth-mini">
              <LiveStudyScene status="studying" seed="a" />
              <span>লাইভ ফোকাস</span>
            </div>
            <div className="v30-auth-mini">
              <LiveStudyScene status="break" seed="b" />
              <span>বিরতি মোড</span>
            </div>
            <div className="v30-auth-mini">
              <LiveStudyScene status="offline" seed="c" />
              <span>বিশ্রামে</span>
            </div>
          </div>

          <div className="v30-auth-actions">
            <button
              type="button"
              className="v30-lounge-primary-btn"
              disabled={busy}
              onClick={() => run(circleLogin)}
            >
              <LogIn size={16} /> Google দিয়ে যুক্ত হোন
            </button>

            <button
              type="button"
              className="v30-lounge-ghost-btn"
              onClick={() => setPreviewMode(true)}
            >
              <Eye size={15} /> রুম প্রিভিউ
            </button>
          </div>

          {error && (
            <p className="sc-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
    );
  }

  const activeGroupObj =
    effectiveGroups.find((g) => g.id === effectiveSelected) || effectiveGroups[0];
  const myName = isPreview
    ? state.profile?.name || 'শিক্ষার্থী'
    : profile?.display_name || 'শিক্ষার্থী';
  // The picture the student picked in the profile panel wins over the Gmail
  // one, so the Lounge always shows the same face as the rest of the app.
  const myAvatar = state.profile?.avatarUrl || session?.user?.user_metadata?.avatar_url;
  const myInitial = Array.from(myName.trim())[0]?.toUpperCase() || 'শ';

  return (
    <section className="v30-lounge-shell" aria-label={LOUNGE_BRAND_NAME}>
      {/* AMBIENT AURORA HERO HEADER — NO BIG LOGOUT BUTTON, NO "ডিফল্ট ব্যাচ রুম" */}
      <header className="v30-lounge-hero">
        <div className="v30-lounge-hero-main">
          <div className="v30-lounge-room-emblem">
            <UsersRound size={22} />
            {studyingCount > 0 && <i className="v30-emblem-live-dot" />}
          </div>

          <div className="v30-lounge-hero-copy">
            <div className="v30-lounge-title-row">
              <h2>{activeGroupObj?.name || DEFAULT_CIRCLE_NAME}</h2>
              <span className="v30-live-pulse-pill">
                <i /> {bnNum(studyingCount)} জন পড়ছে
              </span>
            </div>

            {/* Joined Group Switcher Pills right in the hero! */}
            <div className="v30-lounge-group-strip" role="tablist" aria-label="আপনার গ্রুপসমূহ">
              {effectiveGroups.map((g) => {
                const isSel = g.id === effectiveSelected;
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="tab"
                    aria-selected={isSel}
                    className={`v30-room-pill ${isSel ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelected(g.id);
                      if (section !== 'live' && section !== 'leaderboard') setSection('live');
                    }}
                  >
                    <span className="v30-room-dot" />
                    <span>{g.name}</span>
                  </button>
                );
              })}
              {/* 4-2.txt ⑦ — this used to jump the whole page to the Groups
                  tab and leave you to find the + button inside it. The brief
                  asks for a separate popover: clicking it now opens a
                  right-hand sheet over the room you are already in, so you can
                  make a group without losing the live room behind it. */}
              <button
                type="button"
                className={`v30-room-pill is-more ${groupSheet ? 'is-open' : ''}`}
                onClick={() => setGroupSheet((v) => !v)}
                title="নতুন গ্রুপ তৈরি বা যুক্ত হোন"
                aria-expanded={groupSheet}
              >
                {groupSheet ? 'বন্ধ করুন' : '+ গ্রুপ'}
              </button>
            </div>
          </div>
        </div>

        {/* Sleek Minimal Right Corner: Self Profile Chip (or Login switch in preview) */}
        <div className="v30-lounge-hero-right">
          {isPreview && (
            <button
              type="button"
              className="v30-lounge-ghost-btn is-compact"
              onClick={() => setPreviewMode(false)}
            >
              <LogIn size={13} /> Google লগইন
            </button>
          )}

          <button
            type="button"
            className="v30-self-chip"
            onClick={() => setSection('profile')}
            title="প্রোফাইল ও সেটিংস"
          >
            <span className="v30-self-avatar">
              {myAvatar ? (
                <img src={myAvatar} alt="" referrerPolicy="no-referrer" />
              ) : (
                myInitial
              )}
            </span>
            <div className="v30-self-meta">
              <strong>{myName}</strong>
              <small>আজ {fmtDuration(myTodaySeconds)}</small>
            </div>
          </button>
        </div>
      </header>

      {error && (
        <p className="sc-error" role="alert">
          {error}
        </p>
      )}

      {/* SCULPTED 5-SECTION CAPSULE NAV WITH LUMINOUS OUTER GLOW */}
      <nav className="v33-seg" aria-label={`${LOUNGE_BRAND_NAME} বিভাগ`}>
        {NAV_TABS.map(({ id, label, Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              type="button"
              className={`v33-seg-tab ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => setSection(id)}
            >
              <span className="v33-seg-ico">
                <Icon size={16} aria-hidden="true" />
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ══════════ 4-2.txt ⑦ · NEW GROUP SHEET ══════════
          A separate popover, not a jump to another tab. It slides in from the
          right over whatever section you are in, dims the page behind it, and
          closes on Escape or a click on the scrim. The composer inside is the
          same one the Groups tab uses, so there is exactly one creation flow. */}
      {groupSheet && (
        <>
          <button
            type="button"
            className="v51-group-scrim"
            aria-label="বন্ধ করুন"
            onClick={() => setGroupSheet(false)}
          />
          <aside
            className="v51-group-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="নতুন গ্রুপ"
          >
            <header className="v51-group-sheet-head">
              <span className="v51-group-sheet-mark">
                <UsersRound size={17} />
              </span>
              <div>
                <strong>নতুন গ্রুপ</strong>
                <small>একটি নাম দিন, একটা আইকন বেছে নিন — ব্যস</small>
              </div>
              <button
                type="button"
                className="v51-group-sheet-x"
                onClick={() => setGroupSheet(false)}
                aria-label="প্যানেল বন্ধ করুন"
              >
                ✕
              </button>
            </header>
            <div className="v51-group-sheet-body">
              <GroupDiscovery
                uid={uid}
                isPreview={isPreview}
                groups={effectiveGroups}
                selected={effectiveSelected}
                setSelected={setSelected}
                refreshGroups={refreshGroups}
                onOpenLive={() => {
                  setSection('live');
                  setGroupSheet(false);
                }}
              />
            </div>
          </aside>
        </>
      )}

      {/* ==================== 1. LIVE STUDY ROOM ==================== */}
      {section === 'live' && (
        <div className="v30-live-stage clean-view-stage">
          {/* 4 Ambient KPI Tiles */}
          <div className="v30-live-kpi-grid">
            <div className="v30-live-kpi is-emerald">
              <span className="v30-kpi-icon">
                <Radio size={16} />
              </span>
              <div>
                <strong>{bnNum(studyingCount)} জন</strong>
                <small>এখন ফোকাসে</small>
              </div>
            </div>

            <div className="v30-live-kpi is-amber">
              <span className="v30-kpi-icon">
                <Coffee size={16} />
              </span>
              <div>
                <strong>{bnNum(breakCount)} জন</strong>
                <small>বিরতিতে</small>
              </div>
            </div>

            <div className="v30-live-kpi is-slate">
              <span className="v30-kpi-icon">
                <Moon size={16} />
              </span>
              <div>
                <strong>{bnNum(restingCount)} জন</strong>
                <small>এখন পড়ছে না</small>
              </div>
            </div>

            <div className="v30-live-kpi is-gold">
              <span className="v30-kpi-icon">
                <Clock3 size={16} />
              </span>
              <div>
                <strong>{fmtDuration(roomTodaySeconds)}</strong>
                <small>রুমের আজকের মোট</small>
              </div>
            </div>
          </div>

          {/* Sleek Search + Status Filter + Icon Refresh */}
          <div className="v30-live-toolbar">
            <label className="v30-live-search">
              <Search size={15} />
              <input
                value={liveSearch}
                onChange={(e) => setLiveSearch(e.target.value)}
                placeholder="সদস্য খুঁজুন…"
                aria-label="সদস্য খুঁজুন"
              />
            </label>

            <div className="v30-live-filters" role="group" aria-label="অবস্থা ফিল্টার">
              {[
                ['all', `সবাই (${bnNum(mergedMembers.length)})`],
                ['studying', `পড়ছে (${bnNum(studyingCount)})`],
                ['break', `বিরতি (${bnNum(breakCount)})`],
                ['resting', `পড়ছে না (${bnNum(restingCount)})`],
              ].map(([id, text]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={liveFilter === id}
                  className={`v30-filter-pill ${liveFilter === id ? 'is-active' : ''}`}
                  onClick={() => setLiveFilter(id)}
                >
                  {text}
                </button>
              ))}

              {!isPreview && (
                <button
                  type="button"
                  className="v30-icon-glow-btn"
                  disabled={busy || !effectiveSelected}
                  onClick={() => run(refreshMembers)}
                  title="রিফ্রেশ"
                >
                  <RefreshCw size={14} className={busy ? 'spin' : ''} />
                </button>
              )}
            </div>
          </div>

          {/* EXPRESSIVE ILLUSTRATED MEMBER GRID */}
          {visibleMembers.length > 0 ? (
            <div className="v30-member-grid">
              {visibleMembers.map((m) => {
                const st = m.effStatus;
                const isStudying = st === 'studying';
                const isBreak = st === 'break' || st === 'paused';
                const modeClass = isStudying
                  ? 'is-studying'
                  : isBreak
                  ? 'is-break'
                  : 'is-resting';
                const badgeText = isStudying
                  ? 'ফোকাসে'
                  : st === 'paused'
                  ? 'সাময়িক বিরতি'
                  : st === 'break'
                  ? 'বিরতিতে'
                  : 'পড়ছে না';
                const device = ['computer', 'mobile'].includes(m.device_type)
                  ? m.device_type
                  : null;

                return (
                  <article
                    key={m.user_id}
                    className={`v30-member-card ${modeClass} ${m.isSelf ? 'is-self' : ''}`}
                  >
                    <div className="v30-member-scene-wrap">
                      <LiveStudyScene
                        status={st}
                        device={device}
                        seed={m.user_id || m.display_name}
                      />
                    </div>

                    <div className="v30-member-info">
                      <div className="v30-member-top">
                        <div className="v30-member-name">
                          <strong>{m.display_name || 'শিক্ষার্থী'}</strong>
                          {m.isSelf && <em className="v30-you-tag">আপনি</em>}
                        </div>

                        <span className={`v30-state-pill ${modeClass}`}>
                          <i />
                          {badgeText}
                        </span>
                      </div>

                      {/* Live Session + Total Today Focus Duration (Always visible to everyone!) */}
                      <div className="v30-member-stats">
                        {isStudying ? (
                          <span className="v30-session-chip is-live">
                            {m.subject ? bnSubject(m.subject) : 'ফোকাস'} · {fmtDuration(m.liveElapsed)}
                          </span>
                        ) : isBreak ? (
                          <span className="v30-session-chip is-break">
                            <Coffee size={12} /> চা/বিশ্রাম বিরতি
                            {m.subject ? ` · ${bnSubject(m.subject)}` : ''}
                          </span>
                        ) : (
                          <span className="v30-session-chip is-rest">
                            <Moon size={12} /> এখন বিশ্রামে
                          </span>
                        )}

                        <div className="v30-member-foot">
                          <span className="v30-today-total">
                            <Clock3 size={12} /> আজ ফোকাস:{' '}
                            <strong>{fmtDuration(m.todaySeconds || 0)}</strong>
                          </span>

                          <div className="v30-member-badges">
                            {m.streak > 0 && (
                              <span className="v30-streak-mini" title="স্ট্রিক">
                                <Flame size={11} /> {bnNum(m.streak)}
                              </span>
                            )}
                            {device && (
                              <span className="v30-dev-mini">
                                {device === 'mobile' ? (
                                  <Smartphone size={12} />
                                ) : (
                                  <Monitor size={12} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="v30-jn-empty">
              <UsersRound size={24} />
              <span>এই ফিল্টারে কোনো সদস্য নেই</span>
            </div>
          )}
        </div>
      )}

      {/* ==================== 2. LEADERBOARD ==================== */}
      {section === 'leaderboard' && (
        <CircleLeaderboard
          previewRows={isPreview ? mergedMembers : null}
          previewGroupName={activeGroupObj?.name || DEFAULT_CIRCLE_NAME}
        />
      )}

      {/* ==================== 3. TASK-DRIVEN DAILY QUEST ==================== */}
      {section === 'quest' && (
        <IdentityPanel
          mode="quest"
          session={session}
          isPreview={isPreview}
          profile={profile}
          onProfile={setProfile}
          state={state}
          groups={effectiveGroups}
        />
      )}

      {/* ==================== 4. GROUPS ==================== */}
      {section === 'groups' && (
        <GroupDiscovery
          uid={uid}
          isPreview={isPreview}
          groups={effectiveGroups}
          selected={effectiveSelected}
          setSelected={setSelected}
          refreshGroups={refreshGroups}
          onOpenLive={() => setSection('live')}
        />
      )}

      {/* ==================== 5. MINIMAL PROFILE (with discreet sign-out) ==================== */}
      {section === 'profile' && (
        <IdentityPanel
          mode="profile"
          session={session}
          isPreview={isPreview}
          profile={profile}
          onProfile={setProfile}
          state={state}
          groups={effectiveGroups}
          onSignOut={() => {
            if (isPreview) setPreviewMode(false);
            else run(async () => db.auth.signOut());
          }}
        />
      )}
      {showAcademicSetup && session && <AcademicSetupModal userId={uid} onClose={() => setShowAcademicSetup(false)} />}
    </section>
  );
}
