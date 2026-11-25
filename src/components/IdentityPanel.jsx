import CustomSelect from './CustomSelect';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  CloudDownload,
  CloudUpload,
  Flame,
  ListChecks,
  LogOut,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  UsersRound,
  Zap,
} from 'lucide-react';
import { circleClient as db, privacyManualOffKey } from '../utils/studyCircle';
import { bnActivity, bnNum, bnSubject, bnTask } from '../utils/bangla';
import { toDateKey } from '../utils/seedData';
import { activeSecondsOnDay, currentStreak, sessionSecondsOnDay } from '../utils/stats';
import { sprintTasksForViews } from '../utils/sprintProjection';
import { taskHeading } from '../utils/taskHeading';
import { slotMetaById } from './TodoPreviewControls';
import { formatActivityLabel } from '../utils/subjectActivities';
import { bnSample } from '../utils/bangla';
import { subjectColor, subjectTint } from '../utils/subjectColors';
import { useStudy } from '../context/StudyContext';
import AvatarPicker from './AvatarPicker';
import ProfileAvatar from './ProfileAvatar';

const TASK_XP = 25;
const FOCUS_GOAL_XP = 50;
const ALL_TASKS_BONUS_XP = 40;

function readLocalTaskXp(userKey, day) {
  try {
    const raw = localStorage.getItem(`sentry-task-quest-xp-${userKey}`);
    const parsed = raw ? JSON.parse(raw) : { totalXp: 0, days: {} };
    return {
      totalXp: Number(parsed.totalXp) || 0,
      claimed: new Set(Array.isArray(parsed.days?.[day]) ? parsed.days[day] : []),
      raw: parsed,
    };
  } catch {
    return { totalXp: 0, claimed: new Set(), raw: { totalXp: 0, days: {} } };
  }
}

function writeLocalTaskXp(userKey, day, taskId, xpDelta) {
  const cur = readLocalTaskXp(userKey, day);
  if (cur.claimed.has(taskId)) return cur;
  cur.claimed.add(taskId);
  const nextDays = { ...(cur.raw.days || {}), [day]: Array.from(cur.claimed) };
  const nextTotal = cur.totalXp + xpDelta;
  try {
    localStorage.setItem(
      `sentry-task-quest-xp-${userKey}`,
      JSON.stringify({ totalXp: nextTotal, days: nextDays })
    );
  } catch (_) {}
  return { totalXp: nextTotal, claimed: cur.claimed };
}

export default function IdentityPanel({
  session,
  isPreview = false,
  profile,
  onProfile,
  state,
  groups = [],
  mode = 'profile',
  questOnly = false,
  onSignOut,
}) {
  const {
    activePhases,
    setPhaseModalOpen,
    toast,
    todayKey,
    timer,
    toggleTodo,
    toggleSprintTask,
    navigate,
    updateProfile: updateLocalProfile,
  } = useStudy();
  const effectiveMode = questOnly ? 'quest' : mode;

  const userKey = session?.user?.id || 'local-student';
  const today = todayKey || toDateKey();

  const [receipts, setReceipts] = useState([]);
  const [summary, setSummary] = useState([]);
  const [localXp, setLocalXp] = useState(() => readLocalTaskXp(userKey, today));
  const [scope, setScope] = useState('personal');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const [name, setName] = useState(profile?.display_name || state.profile?.name || '');
  const [username, setUsername] = useState(profile?.username || '');

  useEffect(() => {
    setName(profile?.display_name || state.profile?.name || '');
    setUsername(profile?.username || '');
  }, [profile, state.profile?.name]);

  useEffect(() => {
    setLocalXp(readLocalTaskXp(userKey, today));
  }, [userKey, today]);

  async function loadQuests() {
    if (!session?.user?.id) return;
    const args = { p_circle: scope === 'personal' ? null : scope };
    const [records, totals] = await Promise.all([
      db.rpc('sentry_my_xp', args),
      db.rpc('sentry_xp_summary', args),
    ]);
    if (records.error || totals.error) throw records.error || totals.error;
    setReceipts(records.data || []);
    setSummary(totals.data || []);
  }

  useEffect(() => {
    if (effectiveMode !== 'quest' || !session?.user?.id) return undefined;
    loadQuests().catch((e) => setErr(e.message));
    const update = () => loadQuests().catch(() => {});
    window.addEventListener('sentry-quests-updated', update);
    return () => window.removeEventListener('sentry-quests-updated', update);
  }, [effectiveMode, scope, session?.user?.id]);

  async function run(fn) {
    setBusy(true);
    setErr('');
    try {
      await fn();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function patchProfile(patch) {
    if (!session?.user?.id) {
      if (patch.display_name) updateLocalProfile?.({ name: patch.display_name });
      return null;
    }
    const { data, error } = await db
      .from('sentry_profiles')
      .update(patch)
      .eq('user_id', session.user.id)
      .select()
      .single();
    if (error) throw error;
    onProfile?.(data);
    window.dispatchEvent(new Event('sentry-circle-changed'));
    return data;
  }

  const streakDays = useMemo(
    () => currentStreak(state.sessions, state.activeTimer),
    [state.sessions, state.activeTimer]
  );

  // Gather today's real Study Tasks (Todo list + active Sprint modules)
  const todayTasks = useMemo(() => {
    const regular = (state.todos || [])
      .filter((t) => (t.dateKey || today) === today)
      .map((t) => {
        const sub = state.subjects?.find((s) => s.id === t.subjectId);
        return {
          id: t.id,
          title: bnTask(t.title, state.isDemo) || taskHeading(t, state.subjects, state.isDemo),
          subject: sub?.name || t.presetSubject || '',
          activity: t.activity || '',
          minutes: Number(t.plannedMin || t.minutes) || 0,
          done: Boolean(t.done),
          isSprint: false,
          raw: t,
        };
      });

    const sprintData = state.sprintData || {};
    const curSprint =
      (sprintData.sprints || []).find((x) => x.id === sprintData.selectedSprintId) ||
      (sprintData.sprints || []).at(-1);
    const sprintList = curSprint
      ? sprintTasksForViews({ sprints: [curSprint] }, state.subjects || [])
          .filter((t) => t.dateKey === today)
          .map((t) => ({
            id: t.id,
            title: t.chapter ? bnSample(t.chapter, state.isDemo) : taskHeading(t, state.subjects || [], false),
            subject: t.presetSubject || '',
            activity: (() => {
              const item = (t.sprintLink.kind === 'class' ? curSprint.classes : curSprint.tasks)?.find(x => x.id === t.sprintLink.itemId);
              if (!item) return t.sprintLabel || '';
              if (t.sprintLink.kind === 'class') return `ক্লাস ${bnNum(item.index || 1)}`;
              if (item.step === 0) return `লেকচার শিট রিভিউ ${bnNum(item.lectureIndex || 1)}`;
              if (item.step === 3) return `রিভিউ ${bnNum(item.revisionIndex || 1)}`;
              return `${formatActivityLabel(item.kind || 'Practice') || 'প্র্যাকটিস'} ${bnNum(item.practiceIndex || 1)}`;
            })(),
            phase: slotMetaById(t.timeSlot)?.bnLabel || '',
            minutes: Number(t.plannedMin || t.minutes) || 0,
            done: Boolean(t.done),
            isSprint: true,
            sprintLink: t.sprintLink,
            raw: t,
          }))
      : [];

    return [...sprintList, ...regular];
  }, [state.todos, state.sprintData, state.subjects, state.isDemo, today]);

  const todayStudyMin = useMemo(() => {
    let sec = (state.sessions || []).reduce((n, s) => n + sessionSecondsOnDay(s, today), 0);
    if (timer && timer.phase !== 'break') {
      sec += activeSecondsOnDay(timer, today, Date.now());
    }
    return Math.floor(sec / 60);
  }, [state.sessions, timer, today]);

  const dailyGoalMin = Math.max(30, Number(state.profile?.dailyGoalMin) || 180);

  async function claimQuestReward(claimKey, xpAmount, serverQuestCode = null) {
    if (localXp.claimed.has(claimKey)) return;

    // Sync to Supabase XP ledger when signed in
    if (session?.user?.id && serverQuestCode) {
      if (serverQuestCode === 'study') {
        const seconds = (state.sessions || []).reduce(
          (n, s) => n + sessionSecondsOnDay(s, today),
          0
        );
        await db.rpc('sentry_set_daily', {
          p_day: today,
          p_seconds: Math.min(86400, Math.floor(seconds)),
        });
      }
      await db
        .rpc('sentry_claim_quest', {
          p_quest: serverQuestCode,
          p_circle: scope === 'personal' ? null : scope,
        })
        .catch(() => {});
      await loadQuests().catch(() => {});
    }

    const updated = writeLocalTaskXp(userKey, today, claimKey, xpAmount);
    setLocalXp({ ...updated });
    updateLocalProfile?.({ xp: (Number(state.profile?.xp) || 0) + xpAmount });
    toast?.(`+${bnNum(xpAmount)} XP অর্জিত হয়েছে!`);
  }

  /* ======================================================================
     MODE 1: CLEAN MODERN PROFILE (with small minimal Sign Out in corner)
     ====================================================================== */
  if (effectiveMode === 'profile') {
    const gmailAvatar = session?.user?.user_metadata?.avatar_url;
    // A picture the student chose themselves always wins over the Gmail one.
    const savedAvatar = state.profile?.avatarUrl || '';
    const displayName = profile?.display_name || state.profile?.name || 'শিক্ষার্থী';
    const liveShared = isPreview ? true : Boolean(profile?.show_live !== false);

    return (
      <div className="v30-profile-stack clean-view-stage">
        <section className="v30-lounge-card v30-profile-main">
          {err && (
            <p className="sc-error" role="alert">
              {err}
            </p>
          )}

          <div className="v30-profile-head">
            <div className="v30-profile-avatar">
              <ProfileAvatar
                size={88}
                className="v30-profile-avatar-media"
                name={displayName}
                src={savedAvatar}
                fallbackSrc={gmailAvatar}
              />
              <button
                type="button"
                className="v30-profile-avatar-edit"
                aria-label="প্রোফাইল ছবি পরিবর্তন করুন"
                onClick={() => setAvatarOpen((v) => !v)}
              >
                <Camera size={13} />
              </button>
            </div>

            <div className="v30-profile-copy">
              <h3>{displayName}</h3>
              <small>
                {profile?.username
                  ? `@${profile.username}`
                  : session?.user?.email || 'এইচএসসি 28'}
              </small>
            </div>

            <div className="v30-profile-badges">
              <span>
                <Flame size={13} /> {bnNum(streakDays)} দিন
              </span>
              <span>
                <UsersRound size={13} /> {bnNum(groups.length)} গ্রুপ
              </span>
            </div>
          </div>

          {avatarOpen && (
            <AvatarPicker
              value={savedAvatar}
              gmailUrl={gmailAvatar}
              onChange={(uri) => {
                updateLocalProfile?.({ avatarUrl: uri });
                // Push it to the Study Lounge as well so the leaderboard and
                // the live room show the very same picture.
                if (uri) patchProfile({ avatar_url: uri }).catch(() => {});
                toast?.('প্রোফাইল ছবি আপডেট হয়েছে।');
              }}
              onReset={() => {
                updateLocalProfile?.({ avatarUrl: '' });
                if (gmailAvatar) patchProfile({ avatar_url: gmailAvatar }).catch(() => {});
                toast?.('Gmail-এর ছবি ফিরিয়ে আনা হয়েছে।');
              }}
            />
          )}

          <div className="v30-profile-form">
            <label>
              <span>নাম</span>
              <input
                value={name}
                maxLength={60}
                placeholder="আপনার নাম"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              <span>ইউজারনেম</span>
              <input
                placeholder="rafid_28"
                value={username}
                maxLength={24}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              />
            </label>
            <button
              type="button"
              className="v30-lounge-primary-btn"
              disabled={busy || !name.trim()}
              onClick={() =>
                run(async () => {
                  await patchProfile({
                    display_name: name.trim(),
                    username: username.trim() || null,
                  });
                  setSavedOk(true);
                  setTimeout(() => setSavedOk(false), 1600);
                  toast?.('প্রোফাইল সেভ হয়েছে');
                })
              }
            >
              {savedOk ? (
                <>
                  <Check size={15} /> সংরক্ষিত
                </>
              ) : (
                'সেভ করুন'
              )}
            </button>
          </div>
        </section>

        <div className="v30-profile-grid">
          <section className="v30-lounge-card v30-profile-sub">
            <div className="v30-sub-title">
              <Clock3 size={16} />
              <strong>অধ্যয়ন প্রহর ({bnNum(activePhases?.length || 4)}টি)</strong>
            </div>
            <div className="v28-phase-tag-row">
              {(activePhases || []).map((p) => (
                <span key={p.id} style={{ '--p-col': p.accent }}>
                  {p.label}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="v30-lounge-ghost-btn"
              onClick={() => setPhaseModalOpen(true)}
            >
              <SlidersHorizontal size={14} /> পরিবর্তন
            </button>
          </section>

          <section className="v30-lounge-card v30-profile-sub">
            <div className="v30-sub-title">
              <ShieldCheck size={16} />
              <strong>লাইভ দৃশ্যমানতা ও ক্লাউড</strong>
            </div>

            <div className="v30-toggle-line">
              <span>লাইভ ফোকাস ও সময় শেয়ার</span>
              <button
                type="button"
                role="switch"
                aria-checked={liveShared}
                disabled={isPreview || busy}
                className={`v30-switch is-sm ${liveShared ? 'is-on' : ''}`}
                onClick={() => {
                  const next = !liveShared;
                  if (session?.user?.id) {
                    try {
                      if (next) localStorage.removeItem(privacyManualOffKey(session.user.id));
                      else localStorage.setItem(privacyManualOffKey(session.user.id), '1');
                    } catch (_) {}
                  }
                  run(() =>
                    patchProfile({
                      show_live: next,
                      show_subject: next,
                      show_device: next,
                      show_leaderboard: next,
                    })
                  );
                }}
              >
                <i />
              </button>
            </div>

            {!isPreview && (
              <div className="v30-cloud-row">
                <button
                  type="button"
                  className="v30-lounge-ghost-btn"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const { error } = await db.from('sentry_cloud_backups').upsert({
                        user_id: session.user.id,
                        snapshot: state,
                        updated_at: new Date().toISOString(),
                      });
                      if (error) throw error;
                      toast?.('ক্লাউড ব্যাকআপ সেভ হয়েছে');
                    })
                  }
                >
                  <CloudUpload size={14} /> ব্যাকআপ
                </button>
                <button
                  type="button"
                  className="v30-lounge-ghost-btn"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const { data, error } = await db
                        .from('sentry_cloud_backups')
                        .select('snapshot')
                        .eq('user_id', session.user.id)
                        .maybeSingle();
                      if (error) throw error;
                      if (!data) throw new Error('কোনো ব্যাকআপ পাওয়া যায়নি।');
                      const blob = new Blob([JSON.stringify(data.snapshot, null, 2)], {
                        type: 'application/json',
                      });
                      const u = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = u;
                      a.download = 'StudySentry_Cloud_Backup.json';
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(u), 1000);
                    })
                  }
                >
                  <CloudDownload size={14} /> রিস্টোর
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Small, discreet, minimal sign-out footer */}
        {onSignOut && !isPreview && (
          <div className="v30-profile-signout-row">
            <button type="button" className="v30-mini-signout" onClick={onSignOut}>
              <LogOut size={13} /> সাইন আউট
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ======================================================================
     MODE 2: REAL TASK-DRIVEN DAILY QUEST (Earn XP by completing Study Tasks!)
     ====================================================================== */
  const serverToday = new Set(receipts.filter((r) => r.day === today).map((r) => r.quest));
  const serverXp = summary.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
  const displayTotalXp = Math.max(serverXp, localXp.totalXp, Number(state.profile?.xp) || 0);

  const completedTasksCount = todayTasks.filter((t) => t.done).length;
  const claimedTasksCount = todayTasks.filter((t) => localXp.claimed.has(`task:${t.id}`)).length;
  const allTasksCompleted = todayTasks.length > 0 && completedTasksCount === todayTasks.length;
  const focusGoalReached = todayStudyMin >= dailyGoalMin;
  const focusGoalClaimed = localXp.claimed.has('milestone:focus') || serverToday.has('study');
  const comboClaimed = localXp.claimed.has('milestone:all-tasks');
  const focusPct = Math.min(100, Math.round((todayStudyMin / dailyGoalMin) * 100));

  return (
    <section className="v30-quest-shell clean-view-stage" aria-label="Daily Quest">
      {/* Top XP Telemetry Banner */}
      <div className="v30-lounge-card v30-quest-hero">
        <div className="v30-quest-hero-left">
          <span className="v30-quest-orb">
            <Sparkles size={22} />
          </span>
          <div>
            <h3>ডেইলি টাস্ক কোয়েস্ট</h3>
            <small>আজকের নির্ধারিত টাস্ক ও ফোকাস সম্পন্ন করে XP অর্জন করুন</small>
          </div>
        </div>

        <div className="v30-quest-hero-stats">
          <div className="v30-q-stat is-xp">
            <Zap size={14} />
            <div>
              <strong>{bnNum(displayTotalXp)} XP</strong>
              <small>মোট অর্জিত</small>
            </div>
          </div>

          <div className="v30-q-stat">
            <ListChecks size={14} />
            <div>
              <strong>
                {bnNum(completedTasksCount)}/{bnNum(todayTasks.length)}
              </strong>
              <small>টাস্ক সম্পন্ন</small>
            </div>
          </div>

          {!isPreview && groups.length > 0 && (
            <CustomSelect
              aria-label="XP গন্তব্য"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="personal">Personal XP</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </CustomSelect>
          )}
        </div>
      </div>

      {err && (
        <p className="sc-error" role="alert">
          {err}
        </p>
      )}

      {/* TODAY'S REAL STUDY TASKS -> COMPLETE & CLAIM XP */}
      <div className="v30-lounge-card v30-quest-tasks-card">
        <div className="v30-qt-head">
          <div className="v30-qt-title">
            <h4>আজকের টাস্ক তালিকা</h4>
            {claimedTasksCount > 0 && (
              <span className="v30-qt-claimed-pill">
                +{bnNum(claimedTasksCount * TASK_XP)} XP সংগৃহীত
              </span>
            )}
          </div>
          <button
            type="button"
            className="v30-lounge-ghost-btn is-compact"
            onClick={() => navigate('todo')}
          >
            <Plus size={14} /> টাস্ক যোগ / দেখুন
          </button>
        </div>

        {todayTasks.length > 0 ? (
          <div className="v30-qt-list">
            {todayTasks.map((task, idx) => {
              const claimKey = `task:${task.id}`;
              const claimed = localXp.claimed.has(claimKey);
              return (
                <article
                  key={task.id}
                  className={`v30-qt-row ${
                    claimed ? 'is-claimed' : task.done ? 'is-ready' : 'is-pending'
                  }`}
                  style={task.subject ? { '--quest-subject': subjectColor(task.subject), '--quest-subject-wash': subjectTint(task.subject, 0.12), '--sp-accent': subjectColor(task.subject) } : undefined}
                >
                  <button
                    type="button"
                    className={`v30-qt-check ${task.done ? 'is-done' : ''}`}
                    title={task.done ? 'সম্পন্ন' : 'সম্পন্ন চিহ্নিত করুন'}
                    aria-label={`${task.title} ${task.done ? 'সম্পন্ন' : 'সম্পন্ন চিহ্নিত করুন'}`}
                    aria-pressed={task.done}
                    disabled={claimed}
                    onClick={() => {
                      if (task.isSprint && task.sprintLink) {
                        toggleSprintTask?.(task.sprintLink);
                      } else {
                        toggleTodo?.(task.id);
                      }
                    }}
                  >
                    {task.done ? <Check size={14} strokeWidth={3} /> : <i />}
                  </button>

                  <div className="v30-qt-copy v41-quest-copy">
                    <div className="v36-sp-title-row v41-quest-title">
                      <strong className="sp-chapter-title">{task.title}</strong>
                      {task.activity && <span className={`v34-sp-type ${task.isSprint && task.sprintLink?.kind === 'class' ? 'is-class' : 'is-task'}`}>
                        {task.isSprint && task.sprintLink?.kind === 'class' ? <BookOpen size={12} /> : <Zap size={12} />}
                        {bnActivity(task.activity)}
                      </span>}
                    </div>
                    <div className="v41-quest-meta">
                      {task.subject && <span className="v34-sp-meta-item is-subject">{bnSubject(task.subject)}</span>}
                      {task.phase && <span className="v34-sp-meta-item">{task.phase}</span>}
                      {task.minutes > 0 && <span className="v34-sp-meta-item"><Clock3 size={11} /> {bnNum(task.minutes)} মি.</span>}
                      <em className="v30-xp-badge">+{bnNum(TASK_XP)} XP</em>
                    </div>
                  </div>

                  <div className="v30-qt-action">
                    {claimed ? (
                      <span className="v30-claimed-chip">
                        <CheckCircle2 size={14} /> +{bnNum(TASK_XP)} XP
                      </span>
                    ) : task.done ? (
                      <button
                        type="button"
                        className="v30-xp-claim-btn"
                        disabled={busy}
                        onClick={() =>
                          run(() =>
                            claimQuestReward(
                              claimKey,
                              TASK_XP,
                              idx === 0 ? 'execution' : null
                            )
                          )
                        }
                      >
                        <Sparkles size={13} /> XP নিন
                      </button>
                    ) : (
                      <span className="v30-qt-waiting">সম্পন্ন করলে XP পাবেন</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="v30-qt-empty">
            <ListChecks size={24} />
            <strong>আজকের জন্য কোনো টাস্ক নেই</strong>
            <button
              type="button"
              className="v30-lounge-primary-btn"
              onClick={() => navigate('todo')}
            >
              <Plus size={15} /> নতুন টাস্ক যোগ করুন
            </button>
          </div>
        )}
      </div>

      {/* 2 STUDY MILESTONE BONUS CARDS */}
      <div className="v30-quest-bonus-grid">
        <article className={`v30-lounge-card v30-bonus-card ${focusGoalClaimed ? 'is-claimed' : ''}`}>
          <div className="v30-bonus-top">
            <span className="v30-bonus-icon is-gold">
              <Award size={18} />
            </span>
            <div className="v30-bonus-copy">
              <strong>দৈনিক ফোকাস লক্ষ্য ({bnNum(dailyGoalMin)} মি.)</strong>
              <small>
                আজ সম্পন্ন: {bnNum(todayStudyMin)} মি. ({bnNum(focusPct)}%)
              </small>
            </div>
            <em className="v30-xp-badge is-lg">+{bnNum(FOCUS_GOAL_XP)} XP</em>
          </div>
          <div className="v30-bonus-bar">
            <i style={{ width: `${focusPct}%` }} />
          </div>
          {focusGoalClaimed ? (
            <span className="v30-claimed-chip">
              <CheckCircle2 size={14} /> সংগৃহীত
            </span>
          ) : (
            <button
              type="button"
              className={focusGoalReached ? 'v30-xp-claim-btn' : 'v30-lounge-ghost-btn is-compact'}
              disabled={busy || !focusGoalReached}
              onClick={() => run(() => claimQuestReward('milestone:focus', FOCUS_GOAL_XP, 'study'))}
            >
              {focusGoalReached ? '✦ +৫০ XP সংগ্রহ করুন' : `${bnNum(Math.max(0, dailyGoalMin - todayStudyMin))} মি. বাকি`}
            </button>
          )}
        </article>

        <article className={`v30-lounge-card v30-bonus-card ${comboClaimed ? 'is-claimed' : ''}`}>
          <div className="v30-bonus-top">
            <span className="v30-bonus-icon is-emerald">
              <Trophy size={18} />
            </span>
            <div className="v30-bonus-copy">
              <strong>সম্পূর্ণ টাস্ক কমপ্লিশন বোনাস</strong>
              <small>
                {todayTasks.length
                  ? `${bnNum(completedTasksCount)} / ${bnNum(todayTasks.length)} টাস্ক সম্পন্ন`
                  : 'আজকের সব টাস্ক শেষ করলে বোনাস'}
              </small>
            </div>
            <em className="v30-xp-badge is-lg">+{bnNum(ALL_TASKS_BONUS_XP)} XP</em>
          </div>
          <div className="v30-bonus-bar is-emerald">
            <i
              style={{
                width: `${
                  todayTasks.length
                    ? Math.round((completedTasksCount / todayTasks.length) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          {comboClaimed ? (
            <span className="v30-claimed-chip">
              <CheckCircle2 size={14} /> সংগৃহীত
            </span>
          ) : (
            <button
              type="button"
              className={allTasksCompleted ? 'v30-xp-claim-btn' : 'v30-lounge-ghost-btn is-compact'}
              disabled={busy || !allTasksCompleted}
              onClick={() =>
                run(() => claimQuestReward('milestone:all-tasks', ALL_TASKS_BONUS_XP, 'login'))
              }
            >
              {allTasksCompleted ? '✦ +৪০ XP বোনাস নিন' : 'সব টাস্ক শেষ করুন'}
            </button>
          )}
        </article>
      </div>
    </section>
  );
}
