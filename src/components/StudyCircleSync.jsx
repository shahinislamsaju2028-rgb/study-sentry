import React, { useEffect, useRef, useState } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  circleClient as db,
  ensureUserCircleBootstrap,
  isDefaultHsc28Group,
} from '../utils/studyCircle';
import { toDateKey, addDays } from '../utils/seedData';
import { activeSecondsOnDay, sessionSecondsOnDay, timerElapsedMs } from '../utils/stats';
import { desktopBridge } from '../bridge/desktopBridge';
import RankOneCelebration from './RankOneCelebration';

function detectDeviceType() {
  if (desktopBridge.isDesktop) return 'computer';
  if (typeof navigator === 'undefined') return null;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return 'mobile';
  if (/Windows|Macintosh|Linux|X11/i.test(navigator.userAgent)) return 'computer';
  return null;
}

function computeTodayFocusSeconds(s, now = Date.now()) {
  const today = toDateKey(new Date(now));
  let sec = (s?.sessions || []).reduce((n, entry) => n + sessionSecondsOnDay(entry, today), 0);
  const timer = s?.activeTimer;
  if (timer && timer.phase !== 'break') {
    sec += activeSecondsOnDay(timer, today, now);
  }
  return Math.min(86400, Math.max(0, Math.floor(sec)));
}

function computePresencePayload(s, session, p, now = Date.now()) {
  const timer = s?.activeTimer;
  const status = !timer
    ? 'idle'
    : timer.phase === 'break'
    ? 'break'
    : timer.status === 'running'
    ? 'studying'
    : 'paused';
  const elapsed = timer ? Math.min(604800, Math.max(0, Math.floor(timerElapsedMs(timer, now) / 1000))) : 0;
  const todaySeconds = computeTodayFocusSeconds(s, now);
  const device = p?.show_device !== false ? detectDeviceType() : null;
  const subject = p?.show_subject !== false ? timer?.subjectName || null : null;

  return {
    user_id: session.user.id,
    display_name: p?.display_name || session.user.user_metadata?.full_name || 'শিক্ষার্থী',
    username: p?.username || null,
    avatar_url: session.user.user_metadata?.avatar_url || null,
    status,
    subject,
    elapsed_seconds: elapsed,
    today_seconds: todaySeconds,
    device_type: device,
    sent_at: new Date(now).toISOString(),
  };
}

// Persistent root-level Realtime Presence channels so switching away from Study Lounge
// to Focus Session / Tasks / PiP NEVER drops a student's live "studying" status!
const globalRoomChannels = new Map();
const globalRoomStates = new Map();

export function getGlobalRoomPresence(groupId) {
  return globalRoomStates.get(groupId) || {};
}

function ensureGlobalRoomChannels(groups, uid, payload, shareLive) {
  const wantedIds = shareLive ? new Set((groups || []).map((g) => g.id).filter(Boolean)) : new Set();

  // Remove stale channels
  for (const [gid, entry] of globalRoomChannels.entries()) {
    if (!wantedIds.has(gid) || entry.uid !== uid) {
      db.removeChannel(entry.ch);
      globalRoomChannels.delete(gid);
      globalRoomStates.delete(gid);
    }
  }

  for (const gid of wantedIds) {
    let entry = globalRoomChannels.get(gid);
    if (!entry) {
      const ch = db.channel(`study-sentry-room-${gid}`, {
        config: { presence: { key: uid } },
      });
      entry = { ch, uid, subscribed: false, latestPayload: payload };
      globalRoomChannels.set(gid, entry);

      const emitPresence = () => {
        const raw = ch.presenceState();
        const map = {};
        const receivedAt = Date.now();
        Object.entries(raw).forEach(([userId, list]) => {
          const latest = Array.isArray(list) ? list[list.length - 1] : null;
          if (latest) map[userId] = { ...latest, _receivedAt: receivedAt };
        });
        globalRoomStates.set(gid, map);
        window.dispatchEvent(
          new CustomEvent('sentry-room-presence', { detail: { groupId: gid, map } })
        );
      };

      ch.on('presence', { event: 'sync' }, emitPresence)
        .on('presence', { event: 'join' }, emitPresence)
        .on('presence', { event: 'leave' }, emitPresence)
        .subscribe(async (st) => {
          if (st === 'SUBSCRIBED') {
            entry.subscribed = true;
            if (entry.latestPayload) {
              try {
                await ch.track(entry.latestPayload);
              } catch (_) {}
            }
          }
        });
    } else {
      entry.latestPayload = payload;
      if (entry.subscribed && payload) {
        entry.ch.track(payload).catch(() => {});
      }
    }
  }
}

function teardownAllGlobalChannels() {
  for (const [, entry] of globalRoomChannels.entries()) {
    db.removeChannel(entry.ch);
  }
  globalRoomChannels.clear();
  globalRoomStates.clear();
}

async function syncCircle(s) {
  const {
    data: { session },
    error: sessionError,
  } = await db.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session || !s) {
    teardownAllGlobalChannels();
    return null;
  }

  const boot = await ensureUserCircleBootstrap(session);
  const p = boot.profile;
  if (!p) return null;

  const now = Date.now();
  const payload = computePresencePayload(s, session, p, now);
  const shareLive = p.show_live !== false;

  // 1. Keep root-level Realtime Presence alive across ALL app tabs & PiP!
  ensureGlobalRoomChannels(boot.groups, session.user.id, payload, shareLive);

  // 2. Write authoritative DB heartbeat so any friend polling sees live status + elapsed immediately
  if (shareLive) {
    const r = await db.rpc('sentry_heartbeat_v2', {
      p_status: payload.status,
      p_subject: payload.subject,
      p_elapsed: payload.elapsed_seconds,
      p_device: payload.device_type,
    });
    if (r.error) {
      const fb = await db.rpc('sentry_heartbeat', {
        p_status: payload.status,
        p_subject: payload.subject,
        p_elapsed: payload.elapsed_seconds,
      });
      if (fb.error) throw r.error;
    }
  }

  // 3. Always sync live + completed focus totals so everyone can see exact studied duration
  if (p.show_leaderboard !== false || p.show_live !== false || p.global_opt_in || p.quest_tracking) {
    const totals = [];
    const timer = s.activeTimer;
    for (let i = 0; i < 31; i++) {
      const day = toDateKey(addDays(new Date(now), -i));
      let seconds = (s.sessions || []).reduce((n, entry) => n + sessionSecondsOnDay(entry, day), 0);
      if (i === 0 && timer && timer.phase !== 'break') {
        seconds += activeSecondsOnDay(timer, day, now);
      }
      totals.push({ day, seconds: Math.min(86400, Math.max(0, Math.floor(seconds))) });
    }
    const r = await db.rpc('sentry_set_totals', { p_totals: totals });
    if (r.error) {
      // Fallback: push at least today's focus duration so today's study time is never missing
      await db.rpc('sentry_set_daily', {
        p_day: totals[0].day,
        p_seconds: totals[0].seconds,
      });
    }

    if (
      p.quest_tracking &&
      totals[0]?.seconds >=
        Math.max(15, Math.min(720, Number(p.quest_goals?.study_min) || 120)) * 60
    ) {
      const personal = await db.rpc('sentry_claim_quest', { p_quest: 'study', p_circle: null });
      if (!personal.error) {
        const selected = localStorage.getItem('sentry-selected-circle') || boot.defaultGroupId;
        if (selected) {
          await db.rpc('sentry_claim_quest', { p_quest: 'study', p_circle: selected });
        }
        if (personal.data) window.dispatchEvent(new Event('sentry-quests-updated'));
      }
    }
  }

  return {
    uid: session.user.id,
    profile: p,
    groups: boot.groups,
    defaultGroupId: boot.defaultGroupId,
  };
}

export default function StudyCircleSync() {
  const { state } = useStudy();
  const ref = useRef(state);
  ref.current = state;
  const lastIds = useRef(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const onRank1 = (e) => {
      if (e?.detail) setNotice(e.detail);
    };
    window.addEventListener('sentry-rank1-achieved', onRank1);
    return () => window.removeEventListener('sentry-rank1-achieved', onRank1);
  }, []);

  // Fast 8s global heartbeat + immediate trigger on login, focus start/stop, tab focus & reconnect
  useEffect(() => {
    let active = true;
    let running = false;
    let queued = false;

    async function sync() {
      if (running) {
        queued = true;
        return;
      }
      running = true;
      try {
        await syncCircle(ref.current);
      } catch (e) {
        if (active) {
          window.dispatchEvent(
            new CustomEvent('sentry-sync-status', { detail: { ok: false, message: e.message } })
          );
        }
      } finally {
        running = false;
        if (queued && active) {
          queued = false;
          void sync();
        }
      }
    }

    void sync();
    const interval = setInterval(sync, 8000);
    const onChanged = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        teardownAllGlobalChannels();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        void sync();
      }
    });

    window.addEventListener('sentry-circle-changed', onChanged);
    window.addEventListener('online', onChanged);
    window.addEventListener('focus', onChanged);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      clearInterval(interval);
      subscription.unsubscribe();
      window.removeEventListener('sentry-circle-changed', onChanged);
      window.removeEventListener('online', onChanged);
      window.removeEventListener('focus', onChanged);
      document.removeEventListener('visibilitychange', onVisible);
      teardownAllGlobalChannels();
    };
  }, []);

  // Instant sync whenever focus starts, pauses, resumes, switches subject, or ends
  useEffect(() => {
    window.dispatchEvent(new Event('sentry-circle-changed'));
  }, [
    state?.activeTimer?.id,
    state?.activeTimer?.status,
    state?.activeTimer?.phase,
    state?.activeTimer?.subjectName,
  ]);

  // Rank celebration after completing a study session
  useEffect(() => {
    if (!state) return undefined;
    const sessions = state.sessions || [];
    const ids = new Set(sessions.map((x) => x.id));
    if (lastIds.current === null) {
      lastIds.current = ids;
      return undefined;
    }
    const added = sessions.filter((x) => !lastIds.current.has(x.id) && Number(x.durationSec) > 0);
    lastIds.current = ids;
    if (!added.length) return undefined;

    let cancelled = false;
    (async () => {
      const me = await syncCircle(state);
      if (!me || me.profile?.show_leaderboard === false) return;
      const groups = me.groups || [];
      const stored = localStorage.getItem('sentry-selected-circle');
      const group =
        groups.find((g) => g.id === stored) ||
        groups.find((g) => isDefaultHsc28Group(g.name)) ||
        groups[0];
      if (!group) return;

      const { data: board, error } = await db.rpc('sentry_circle_board', { cid: group.id });
      if (error) throw error;
      const sorted = [...(board || [])].sort(
        (a, b) =>
          (Number(b.today_seconds) || 0) - (Number(a.today_seconds) || 0) ||
          String(a.user_id || '').localeCompare(String(b.user_id || ''))
      );
      const i = sorted.findIndex((x) => x.user_id === me.uid);
      if (i < 0) return;

      const rank = i + 1;
      const mySeconds = Number(sorted[i].today_seconds) || 0;
      if (rank === 1) {
        try {
          localStorage.setItem(
            `sentry-rank1-celebrated-${me.uid}-${group.id}-${toDateKey()}`,
            '1'
          );
        } catch (_) {}
      }
      if (!cancelled) {
        setNotice({
          rank,
          seconds: mySeconds,
          delta:
            i > 0
              ? Math.max(1, Math.floor(sorted[i - 1].today_seconds - sorted[i].today_seconds) + 1)
              : null,
          circle: group.name,
        });
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [state?.sessions]);

  return <RankOneCelebration notice={notice} onClose={() => setNotice(null)} />;
}
