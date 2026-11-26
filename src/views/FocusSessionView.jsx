import React, { useEffect,useState } from 'react';
import {createPortal} from 'react-dom';
import {ModalShell} from '../components/Modals';
import {
  BellRing,
  BookOpen,
  Clock3,
  Headphones,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  PictureInPicture2,
  Play,
  Plus,
  Sparkles,
  Square,
  Timer,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { StudyIllustration } from '../components/StudyIllustration';
import { PreviewSubjectIcon } from '../components/PreviewSubjectIcon';
import SubjectCards from '../components/SubjectCards';
import CurriculumPicker from '../components/CurriculumPicker';
import AnalogFocusDial from '../components/AnalogFocusDial';
import FocusDigitalReadout from '../components/FocusDigitalReadout';
import FocusConfigGridSelect from '../components/FocusConfigGridSelect';
import FocusRoomScene from '../components/FocusRoomScene';
import { focusTypeName } from '../utils/focusDetails';
import { ActivityChips, activityIcon, activityLabel } from '../components/ActivityChips';
import { activityBangla, activityName } from '../utils/subjectActivities';
import { bnChapterName, bnNum, bnSubject } from '../utils/bangla';


export default function FocusSessionView() {
  const {
    state,
    timer,
    isAlarm,
    now,
    remainingSec,
    pipProgressPct,
    phaseSnapshot,
    pauseRequest,
    toggleTimer,
    startTimer,
    stopAlarm,
    finishTimer,
    endWithPrompt,
    sessionLocked,
    selectedSubject,
    selectSubject,
    setMode,
    setDuration,
    setZen,
    openModal,
    updatePip,
    updatePrefs,
    todayKey,
    commit,
    toast,
  } = useStudy();

  const [illumFullscreen, setIllumFullscreen] = useState(false);

  const prefs = state.timerPrefs || {};
  const mode = timer?.mode || prefs.mode || 'pomodoro';
  // v35 — the Focus clock offers exactly two presentations:
  //   'analog'  → machined instrument dial (default)
  //   'digital' → illuminated glass readout
  // Legacy saved values (e.g. the retired split-flap 'flip') fall back to analog.
  const mainClockStyle = prefs.mainClockStyle === 'digital' ? 'digital' : 'analog';
  /* 5.txt ⑤ — the fullscreen stage now carries the clock, so it needs its own
     analog/digital control. It starts on whatever the Focus page is set to and
     does not write back to preferences: changing the view inside fullscreen is
     a viewing decision, not a settings change. */
  const [fsClockStyle, setFsClockStyle] = useState(mainClockStyle);
  useEffect(() => {
    if (illumFullscreen) setFsClockStyle(mainClockStyle);
  }, [illumFullscreen, mainClockStyle]);
  const draft = state.focusDraft || {};
  const info = timer?.focusMeta || draft;
  const type = info.activityType || 'practice';
  const isBreak = timer?.phase === 'break';
  const isRunning = timer?.status === 'running';
  const isPaused = Boolean(
    timer && (timer.status === 'paused' || timer.status === 'half_wait' || !!pauseRequest)
  );
  // Active focus animation state: head bowed studying ONLY when focus timer is actively running
  const isActivelyStudying = Boolean(isRunning && !pauseRequest && !isAlarm && !isBreak);

  // The hero illustration reuses the Study Lounge scene set — one illustration
  // per state: studying / break / resting.
  const sceneStatus = isBreak
    ? 'break'
    : isPaused
    ? 'paused'
    : isActivelyStudying
    ? 'studying'
    : 'offline';

  const [configDialog,setConfigDialog]=useState(false);
  useEffect(()=>{if(!configDialog)return;const handle=e=>{if(e.key==='Escape'){e.stopPropagation();setConfigDialog(false)}};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)},[configDialog]);

  const setDraft = (patch) =>
    commit((prev) => ({ ...prev, focusDraft: { ...(prev.focusDraft || {}), ...patch } }));

  const statusText = !timer
    ? 'ফোকাসের জন্য প্রস্তুত · শান্ত অবস্থা'
    : isAlarm
    ? 'সময় পূর্ণ · হালকা টিক-টিক রিমাইন্ডার সক্রিয়'
    : isBreak
    ? isRunning
      ? 'নির্ধারিত বিশ্রাম চলছে'
      : 'বিশ্রাম পজ করা আছে'
    : pauseRequest
    ? '৩০-সেকেন্ড পজ যাচাই চলছে'
    : isRunning
    ? 'গভীর মনোযোগে অধ্যয়ন চলছে (নীরব মোড)'
    : 'পজ অবস্থায় আছে · নিওন রিমাইন্ডার সক্রিয়';

  const action = () => {
    if (isAlarm) return stopAlarm();
    if (timer) return toggleTimer();
    if (type === 'recorded' && draft.videoPosition && !/^\d{1,4}:[0-5]\d$/.test(draft.videoPosition)) {
      toast('ভিডিওর অবস্থান মিনিট:সেকেন্ড আকারে লিখুন, যেমন 32:15।');
      return;
    }
    const curPhaseId = phaseSnapshot?.currentPhase?.id || null;
    startTimer(selectedSubject?.id, {
      stay: true,
      workType: draft.workType || 'Study',
      taskId: draft.taskId,
      focusMeta: {
        ...draft,
        activityType: type,
        phaseId: draft.phaseId || curPhaseId,
        subjectId: selectedSubject?.id || '',
      },
    });
  };

  // The daily session goal moved into the Focus config sheet when the
  // bottom summary dock was retired, so it stays reachable.
  const goal = Math.max(1, Number(prefs.focusSessionsGoal) || 6);

  const contextParts = [
    selectedSubject ? bnSubject(selectedSubject.name) : 'বিষয় বেছে নিন',
    info.cycle,
    info.chapter,
    info.title && info.title !== info.chapter && info.title !== selectedSubject?.name ? info.title : '',
    info.className,
  ].filter(Boolean);

  const summaryActivityKey = activityName(info.activityType || draft.activityType) || info.activityType || type;
  const SummaryActivityIcon = activityIcon(summaryActivityKey);
  const summaryActivityLabel = activityLabel(summaryActivityKey) || focusTypeName(type);

  // Analog dial needs both the live remainder AND the full session length.
  const dialRemainingSec = Math.max(0, Number(remainingSec) || 0);
  const dialTotalSec =
    timer?.mode === 'pomodoro'
      ? Math.max(1, Number(timer.durationSec) || 1)
      : Math.max(dialRemainingSec, Number(prefs.focusMin) * 60 || 1500);

  // 4-2.txt ② — the fullscreen stage prints elapsed/remaining. Same numbers as
  // the dial, formatted once here so the rails and the dial never disagree.
  const fmtV51 = (sec) => {
    const v = Math.max(0, Math.round(Number(sec) || 0));
    const m = Math.floor(v / 60);
    const ss = v % 60;
    return m >= 60
      ? `${bnNum(Math.floor(m / 60))}:${String(m % 60).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      : `${bnNum(m)}:${String(ss).padStart(2, '0')}`;
  };
  const illusRemaining = dialRemainingSec;
  const illusRemainingLabel = fmtV51(illusRemaining);
  const illusElapsedLabel = fmtV51(Math.max(0, dialTotalSec - illusRemaining));


  return (
    <div className="view-page focus-session-page v4-focus-page">
      {/* MAIN ILLUSTRATIVE + BODONI FOCUS STUDIO CARD */}
      <section
        className={`card compact-focus v4-focus-studio v61-focus-shell ${
          isAlarm ? 'focus-alarm-active' : ''
        } ${isBreak ? 'is-break-stage' : ''} ${isPaused ? 'is-paused-stage' : ''}`}
        aria-label="Focus Studio"
      >
        {/* TOP EXECUTIVE HEADER */}
        <div className="focus-session-head v4-focus-head">
          <div className="v4-focus-title-cluster">
            <div className="clean-icon-heading">
              <Timer size={18} className="clean-head-icon" />
              <h2>
                {isBreak ? (
                  'বিশ্রাম ও রিচার্জ সেশন'
                ) : (
                  <>
                    <PreviewSubjectIcon subject={selectedSubject} size={18} />{' '}
                    {contextParts.join(' · ')}
                  </>
                )}
              </h2>
            </div>

          </div>

          <div className="focus-head-quick-actions v35-focus-tools">
            {state.pipSettings?.open === false && (
              <button
                type="button"
                className="focus-mode-chip active"
                onClick={() => updatePip({ open: true })}
                title="Always-On-Top PiP উইজেট চালু করুন"
              >
                <PictureInPicture2 size={14} />
                <span>PiP চালু</span>
              </button>
            )}

            {/* v35 - exactly two clock presentations: Analog / Digital */}
            <div className="v35-clock-switch" role="group" aria-label="ঘড়ির ধরন">
              <button
                type="button"
                className={mainClockStyle === 'analog' ? 'is-active' : ''}
                aria-pressed={mainClockStyle === 'analog'}
                onClick={() => updatePrefs({ mainClockStyle: 'analog' })}
                title="অ্যানালগ ডায়াল - যন্ত্রের মতো ঘড়ি"
              >
                <Clock3 size={14} />
                <span>অ্যানালগ</span>
              </button>
              <button
                type="button"
                className={mainClockStyle === 'digital' ? 'is-active' : ''}
                aria-pressed={mainClockStyle === 'digital'}
                onClick={() => updatePrefs({ mainClockStyle: 'digital' })}
                title="ডিজিটাল রিডআউট - আলোকিত সংখ্যা"
              >
                <Sparkles size={14} />
                <span>ডিজিটাল</span>
              </button>
            </div>

            <button
              type="button"
              className="focus-mode-chip zen-trigger-btn"
              onClick={() => setZen(true)}
              title="সম্পূর্ণ স্ক্রিন জুড়ে শান্ত ফোকাস মোড (ESC চাপলে বের হওয়া যাবে)"
            >
              <Maximize2 size={14} /> Zen
            </button>
            <button type="button" className="focus-expand" aria-haspopup="dialog" aria-expanded={configDialog} disabled={isBreak} onClick={()=>setConfigDialog(true)}>কনফিগার</button>
          </div>
        </div>

        {/* SCANNABLE TASK TELEMETRY RIBBON */}
        {!isBreak && (
          <div className="focus-task-brief v4-focus-brief">
            <div>
              <span>চলমান কাজ</span>
              <strong>{info.workLabel || info.title || 'স্বাধীন ফোকাস সেশন'}</strong>
            </div>
            <div>
              <span>পড়ার ধরন</span>
              <strong>{focusTypeName(type)}</strong>
            </div>
            <div>
              <span>লক্ষ্য ও অগ্রগতি</span>
              <strong>
                {mode === 'stopwatch'
                  ? 'স্টপওয়াচ'
                  : `${bnNum(timer ? Math.round(timer.durationSec / 60) : prefs.focusMin)} মিনিট`}
                {timer ? ` · ${bnNum(Math.round(pipProgressPct || 0))}% সম্পন্ন` : ''}
              </strong>
            </div>
          </div>
        )}

        {/* RESTORED ILLUSTRATIVE DYNAMIC STAGE + BODONI TIMER + CONTROLS */}
        <div className="v5-illustrative-focus-stage v35-focus-stage v48-focus-stage">
          {/* THE SCENE IS THE STAGE: illustration fills the tab, the clock sits
              on the wall inside it. */}
          <div className="v5-illustration-card v35-focus-illustration-card v48-scene-card">
            <div className="v35-focus-illus-frame v48-scene-frame">
              <FocusRoomScene status={sceneStatus} />
              {/* Clock mounted on the wall, replacing the old centre column. */}
              <div className="v48-wall-clock">
                <div
                  className={`v5-bodoni-center-dial v13-focus-clean-stage v35-focus-clock v48-wall-clock-inner ${
                    isActivelyStudying ? 'is-studying' : ''
                  } ${isAlarm ? 'is-alarm' : ''}`}
                >
                  <div className="v13-focus-ambient-aura" aria-hidden="true" />
                  {/* 4-2.txt ② — no Bangla label sits above the clock. The
                      dial and the drawing say everything the pill said, and the
                      pill was the only chrome left on an otherwise bare wall.
                      It stays in the DOM for screen readers only. */}
                  <span className="v51-status-sr" role="status">
                    {statusText}
                  </span>

                  <div className="v4-clock-display-wrap v35-clock-wrap v48-wall-clock-face">
                    {mainClockStyle === 'digital' ? (
                      <FocusDigitalReadout
                        remainingSec={dialRemainingSec}
                        totalSec={dialTotalSec}
                        size={230}
                        isAlarm={isAlarm}
                        isPaused={isPaused}
                        isRunning={isRunning}
                      />
                    ) : (
                      <AnalogFocusDial
                        remainingSec={dialRemainingSec}
                        totalSec={dialTotalSec}
                        size={250}
                        isAlarm={isAlarm}
                        isPaused={isPaused}
                        isRunning={isRunning}
                      />
                    )}
                  </div>

                  <div className="v4-hero-progress-rail v48-wall-rail" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, Math.max(2, pipProgressPct || 0))}%` }} />
                  </div>

                  <small className="v4-hero-caption v48-wall-caption">
                    {isAlarm
                      ? 'সেশন পূর্ণ - হালকা রিমাইন্ডার চলছে'
                      : isPaused && !isBreak
                      ? 'পজ অবস্থায় - রিজিউম করুন'
                      : isActivelyStudying
                      ? 'SILENT CONCENTRATION MODE'
                      : mode === 'stopwatch'
                      ? 'ELAPSED FOCUS TIME'
                      : 'REMAINING FOCUS TIME'}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="v35-illus-fullscreen-btn"
                onClick={() => setIllumFullscreen(true)}
                aria-label="ইলাস্ট্রেশন ফুল মোডে দেখুন"
                title="ইলাস্ট্রেশন ফুল মোডে দেখুন"
              >
                <Maximize2 size={14} />
              </button>
            </div>
            {/* 4-2.txt ② — the posture caption is gone from the scene.
                "গভীর মনোযোগে পড়াশোনা চলছে" was a sentence describing what the
                drawing already shows: headphones on, laptop open, hands on the
                keys. The illustration carries the state now. */}
            <span className="v51-status-sr">
              {isBreak
                ? 'বিরতির মুহূর্ত'
                : isPaused
                ? 'পজ অবস্থায় আছে'
                : isActivelyStudying
                ? 'গভীর মনোযোগে পড়াশোনা চলছে'
                : 'প্রস্তুত অবস্থা'}
            </span>
          </div>

          {/* BOTTOM: TACTILE ACTION CONTROLS — laid out as a ROW (v43) */}
          <div className="v5-illustrative-controls v35-focus-controls">
            <button
              type="button"
              className="v4-dock-secondary"
              aria-label="ব্যাকগ্রাউন্ড সাউন্ডস্কেপ"
              title="বৃষ্টি / ব্রাউন নয়েজ সাউন্ডস্কেপ"
              onClick={() => openModal('sounds')}
            >
              <Headphones size={18} />
              <span>সাউন্ড</span>
            </button>

            {isAlarm ? (
              <button
                type="button"
                className="v4-dock-primary is-alarm"
                onClick={stopAlarm}
              >
                <BellRing size={19} />
                <span>সংরক্ষণ করুন</span>
              </button>
            ) : (
              <button
                type="button"
                className={`v4-dock-primary ${isActivelyStudying ? 'is-running' : ''} ${
                  isBreak ? 'is-break' : ''
                }`}
                disabled={timer?.status === 'half_wait'}
                onClick={action}
              >
                {isActivelyStudying ? (
                  <>
                    <Pause size={20} fill="currentColor" />
                    <span>পজ রিকোয়েস্ট</span>
                  </>
                ) : (
                  <>
                    <Play size={20} fill="currentColor" />
                    <span>{timer ? 'রিজিউম করুন' : 'ফোকাস শুরু'}</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              className={`v4-dock-secondary ${!isBreak && sessionLocked && !isAlarm ? 'is-session-locked' : ''}`}
              aria-label="সেশন সমাপ্ত করুন"
              title={
                isBreak
                  ? 'বিরতি শেষ করুন'
                  : sessionLocked && !isAlarm
                  ? '7 মিনিট ফোকাস পূর্ণ — নির্ধারিত সময় শেষ না হওয়া পর্যন্ত সমাপ্ত করা লক আছে'
                  : 'সেশন শেষ ও সংরক্ষণ করুন'
              }
              disabled={!timer || (!isBreak && sessionLocked && !isAlarm)}
              onClick={() => (isBreak ? finishTimer(false) : endWithPrompt())}
            >
              <Square size={15} fill="currentColor" />
              <span>
                {isBreak
                  ? 'বিরতি শেষ'
                  : sessionLocked && !isAlarm
                  ? 'লকড (7m+)'
                  : 'সমাপ্ত'}
              </span>
            </button>
          </div>
        </div>

        {configDialog&&createPortal(
        /* 6.txt · ⓵⓶ — the config used to open as a 1360px floating card on a
           dimmed page. It is now a full-screen sheet: the whole window is the
           form, the close control moves into the sheet's own header, and the
           two columns get the width they were always asking for. */
        <ModalShell title="ফোকাস কনফিগার" onClose={()=>setConfigDialog(false)} fullScreen className="focus-config-modal">
          <div className="focus-config-dialog v48-cfg v54-focus-layout is-screen">
            {/* ── LEFT COLUMN: chapter first, then subject, then session body ── */}
            <div className="v48-cfg-main v54-focus-panel" aria-label="বিষয় ও পড়ার ধরন">
              {/* 2 · subject chips — the first choice, one colour each */}
              <section className="v48-cfg-block">
                <div className="v48-cfg-head">
                  <span className="v48-cfg-step">১</span>
                  <strong>বিষয় নির্বাচন</strong>
                  {draft.source && <small>সংযুক্ত কাজ সরালে বিষয় পরিবর্তন করা যাবে</small>}
                </div>
                <SubjectCards
                  compact
                  label="Focus subject cards"
                  subjects={state.subjects}
                  value={selectedSubject?.name}
                  disabled={!!timer || !!draft.source}
                  onSelect={(name, sub) => sub && selectSubject(sub.id)}
                />
              </section>

              {/* Step 2's selected-subject header + paper switch live on one line
                  inside the shared chapter picker — no duplicate context row. */}
              <section className="v48-cfg-block v48-cfg-chapter-first v54-focus-chapters">
                <div className="focus-curriculum-field">
                  <CurriculumPicker
                    stepIndex="২"
                    compact
                    hideTools
                    shortSprintChapter={['sprint-class','sprint-task'].includes(draft.source)}
                    subject={selectedSubject?.name || ''}
                    paper={draft.paper || ''}
                    chapter={draft.chapter || ''}
                    type={draft.curriculumType || ''}
                    topic={draft.curriculumTopic || ''}
                    onChange={v=>setDraft({paper:v.paper,chapter:v.chapter,curriculumType:v.type,curriculumTopic:v.topic})}
                  />
                </div>
              </section>

              {/* 3 · session body */}
              <section className="v48-cfg-block">
                <div className="v48-cfg-head">
                  <span className="v48-cfg-step">৩</span>
                  <strong>পড়ার ধরন ও নোট</strong>
                </div>
                <ActivityChips
                  compact
                  value={draft.activityType}
                  onChange={(id) => setDraft({ activityType: id })}
                  label="পড়ার ধরন"
                />
                <div className="focus-context-fields v54-focus-context-fields">
                  <input
                    aria-label="কাজের শিরোনাম"
                    value={draft.workLabel || ''}
                    onChange={(e) => setDraft({ workLabel: e.target.value })}
                    placeholder="কাজের শিরোনাম · যেমন: ভেক্টর অনুশীলনী"
                  />
                  <input
                    aria-label="সাইকেল (ঐচ্ছিক)"
                    value={draft.cycle || ''}
                    onChange={(e) => setDraft({ cycle: e.target.value })}
                    placeholder="সাইকেল · ঐচ্ছিক"
                  />
                  {type === 'recorded' && (
                    <input
                      aria-label="ভিডিও অবস্থান (মিনিট:সেকেন্ড)"
                      value={draft.videoPosition || ''}
                      onChange={(e) => setDraft({ videoPosition: e.target.value })}
                      placeholder="ভিডিও অবস্থান · MM:SS"
                      inputMode="numeric"
                    />
                  )}
                </div>
              </section>
            </div>

            {/* ── RIGHT COLUMN: timer options fill what used to be dead space ── */}
            <aside className="v48-cfg-side v54-focus-panel" aria-label="সেশন সেটিংস">
              <div className="v54-focus-side-heading">
                <span className="v48-cfg-step">৪</span>
                <div><strong>সেশন সেটিংস</strong><small>সময় ও বিরতি</small></div>
              </div>
              <div className="v48-cfg-block v54-focus-mode-block">
                <span className="clean-label">টাইমারের ধরন</span>
                <div className="clean-segments" role="group" aria-label="Timer mode">
                  <button type="button" disabled={!!timer} aria-pressed={mode === 'pomodoro'} onClick={() => setMode('pomodoro')}>
                    Countdown
                  </button>
                  <button type="button" disabled={!!timer} aria-pressed={mode === 'stopwatch'} onClick={() => setMode('stopwatch')}>
                    Stopwatch
                  </button>
                </div>
              </div>

              <div className="v48-cfg-block v54-focus-control-block">
                <FocusConfigGridSelect
                  label="দৈনিক সেশন লক্ষ্য"
                  value={goal}
                  Icon={Timer}
                  disabled={!!timer}
                  options={[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => ({
                    value: n,
                    label: `${bnNum(n)}টি সেশন`,
                    valueLabel: bnNum(n),
                    unit: 'সেশন',
                  }))}
                  onChange={(value) => updatePrefs({ focusSessionsGoal: Number(value) })}
                />
              </div>

              {mode === 'pomodoro' && (
                <div className="v48-cfg-block v54-focus-control-block">
                  <FocusConfigGridSelect
                    label="সেশন সময়সীমা"
                    value={prefs.focusMin}
                    Icon={Clock3}
                    disabled={!!timer}
                    options={[15, 20, 25, 30, 45, 50, 60, 75, 90, 120, 150, 180, 240, 300].map((m) => ({
                      value: m,
                      label: m % 60 === 0
                        ? `${bnNum(m / 60)} ঘণ্টা`
                        : m > 60
                        ? `${bnNum(Math.floor(m / 60))} ঘণ্টা ${bnNum(m % 60)} মিনিট`
                        : `${bnNum(m)} মিনিট`,
                      valueLabel: bnNum(m),
                      unit: 'মিনিট',
                    }))}
                    extraOption={{ label: 'কাস্টম সময়…', onSelect: () => openModal('duration') }}
                    onChange={(value) => setDuration(Number(value), 'custom')}
                  />
                </div>
              )}

              <div className="v48-cfg-block">
                <span className="clean-label">বিরতির দৈর্ঘ্য</span>
                <div className="focus-duration">
                  <button type="button" aria-label="বিরতি কমান" disabled={!!timer || Number(prefs.breakMin) <= 3}
                    onClick={() => updatePrefs({ breakMin: Math.max(3, Number(prefs.breakMin || 10) - 1) })}>
                    <Minus size={15} />
                  </button>
                  <strong>{bnNum(prefs.breakMin || 10)} মিনিট</strong>
                  <button type="button" aria-label="বিরতি বাড়ান" disabled={!!timer || Number(prefs.breakMin) >= 60}
                    onClick={() => updatePrefs({ breakMin: Math.min(60, Number(prefs.breakMin || 10) + 1) })}>
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className="v48-cfg-actions">
                {draft.source && !timer && (
                  <button type="button" className="focus-clear" onClick={() => commit(prev => ({ ...prev, focusDraft: {} }))}>
                    সংযুক্ত কাজ সরান
                  </button>
                )}
                <button type="button" className="action-btn primary-emerald" data-modal-default-action onClick={() => setConfigDialog(false)}>
                  ঠিক আছে
                </button>
              </div>
            </aside>
          </div>
        </ModalShell>,document.body)}

        {/* Keep the live controls and the current configuration in one rounded Focus card. */}
        <section className="v54-focus-summary-card" aria-label="ফোকাস সেশনের সারাংশ">
          <header className="v54-focus-summary-heading">
            <span className="v54-focus-summary-icon"><SummaryActivityIcon size={20} /></span>
            <div>
              <small>ফোকাস সেশন</small>
              <strong>আপনার বর্তমান কনফিগারেশন</strong>
            </div>
          </header>
          <div className="v54-focus-summary-grid">
            <div className="v54-focus-summary-item">
              <Clock3 size={19} />
              <span>ফোকাস সময়</span>
              <b>{mode === 'stopwatch' ? 'স্টপওয়াচ' : `${bnNum(prefs.focusMin || 50)} মিনিট`}</b>
            </div>
            <div className="v54-focus-summary-item">
              <Timer size={19} />
              <span>বিরতি</span>
              <b>{bnNum(prefs.breakMin || 10)} মিনিট</b>
            </div>
            <div className="v54-focus-summary-item">
              <BookOpen size={19} />
              <span>বিষয় ও অধ্যায়</span>
              <b>{selectedSubject ? bnSubject(selectedSubject.name) : 'বিষয় বাছুন'}{draft.chapter ? ` · ${bnChapterName(draft.chapter)}` : ''}</b>
            </div>
            <div className="v54-focus-summary-item">
              <SummaryActivityIcon size={19} />
              <span>পড়ার ধরন</span>
              <b>{summaryActivityLabel}</b>
            </div>
          </div>
        </section>
      </section>

      {/* ILLUSTRATION FULLSCREEN - the Study Lounge scene, edge to edge */}
      {illumFullscreen &&
        createPortal(
          <div
            className="v35-illus-fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label="ইলাস্ট্রেশন ফুল মোড"
            onClick={() => setIllumFullscreen(false)}
          >
            <div
              className="v51-illus-stage"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 4-2.txt ② — the illustration itself is now the whole screen.
                  Around it, above and below, the session earns a real
                  environment: a top rail with subject, reading type and the
                  live clock; a bottom rail with the running bar, elapsed and
                  remaining, and the two controls you might want mid-session.
                  Same language as the Focus page, scaled up. */}
              <div className="v51-illus-top">
                <span className="v51-illus-chip">
                  <BookOpen size={15} />
                  {info.subject ? info.subject : 'স্বাধীন সেশন'}
                </span>
                <span className="v51-illus-chip is-quiet">
                  <Clock3 size={15} />
                  {focusTypeName(type)}
                </span>
                <span className={`v51-illus-chip is-state ${isActivelyStudying ? 'is-live' : ''}`}>
                  <i />
                  {isBreak ? 'বিরতি' : isPaused ? 'পজ' : isActivelyStudying ? 'চলছে' : 'প্রস্তুত'}
                </span>
                {/* the clock the Focus page shows, at fullscreen scale */}
                <div className={`v52-illus-clock ${fsClockStyle === 'analog' ? 'is-analog' : ''}`}>
                  {fsClockStyle === 'analog' ? (
                    <AnalogFocusDial
                      remainingSec={illusRemaining}
                      totalSec={dialTotalSec}
                      size={104}
                      isAlarm={isAlarm}
                      isPaused={isPaused}
                      isRunning={isRunning}
                    />
                  ) : (
                    <span className="v51-illus-clock">
                      {bnNum(Math.floor(illusRemaining / 60))}
                      <em>:</em>
                      {String(Math.floor(illusRemaining % 60)).padStart(2, '0')}
                    </span>
                  )}
                </div>
                {/* the view switch, small and always reachable in fullscreen */}
                <div className="v52-illus-clock-toggle" role="group" aria-label="ঘড়ির ধরন">
                  <button
                    type="button"
                    className={fsClockStyle === 'analog' ? 'is-active' : ''}
                    aria-pressed={fsClockStyle === 'analog'}
                    onClick={() => setFsClockStyle('analog')}
                    title="অ্যানালগ ডায়াল"
                  >
                    <Clock3 size={15} />
                  </button>
                  <button
                    type="button"
                    className={fsClockStyle === 'digital' ? 'is-active' : ''}
                    aria-pressed={fsClockStyle === 'digital'}
                    onClick={() => setFsClockStyle('digital')}
                    title="ডিজিটাল রিডআউট"
                  >
                    <Sparkles size={15} />
                  </button>
                </div>
                <button
                  type="button"
                  className="v51-illus-close"
                  onClick={() => setIllumFullscreen(false)}
                  aria-label="ফুল মোড বন্ধ করুন"
                >
                  <Minimize2 size={17} />
                </button>
              </div>

              <div className="v51-illus-canvas">
                {/* fill={false} → `meet` instead of `slice`: in fullscreen the
                    whole room has to be in frame, walls and floor included,
                    instead of the strip that survives a 3:1 drawing stretched
                    across a 16:9 stage. */}
                <FocusRoomScene status={sceneStatus} fill={false} tall />
              </div>

              <div className="v51-illus-bottom">
                <div className="v51-illus-progress">
                  <div className="v51-illus-progress-rail">
                    <span style={{ width: `${Math.min(100, Math.max(2, pipProgressPct || 0))}%` }} />
                  </div>
                  <div className="v51-illus-progress-meta">
                    <span>
                      অতিবাহিত <b>{illusElapsedLabel}</b>
                    </span>
                    <span>
                      বাকি <b>{illusRemainingLabel}</b>
                    </span>
                  </div>
                </div>
                <div className="v51-illus-actions">
                  <button
                    type="button"
                    className="v51-illus-action is-ghost"
                    onClick={() => setIllumFullscreen(false)}
                  >
                    <Minimize2 size={15} /> ফিরে যান
                  </button>
                  <button
                    type="button"
                    className={`v51-illus-action ${isActivelyStudying ? 'is-live' : 'is-primary'}`}
                    disabled={timer?.status === 'half_wait'}
                    onClick={action}
                  >
                    {isActivelyStudying ? (
                      <>
                        <Pause size={16} fill="currentColor" /> পজ রিকোয়েস্ট
                      </>
                    ) : (
                      <>
                        <Play size={16} fill="currentColor" />
                        {timer ? 'রিজিউম করুন' : 'ফোকাস শুরু'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
}
