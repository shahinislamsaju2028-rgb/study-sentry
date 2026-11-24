import React, { useEffect,useState } from 'react';
import {createPortal} from 'react-dom';
import {ModalShell} from '../components/Modals';
import {
  BellRing,
  Clock3,
  Headphones,
  Maximize2,
  Minimize2,
  ArrowUpRight,
  Minus,
  Volume2,
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
import { BanglaNumberInput } from '../components/BanglaInputs';
import AnalogFocusDial from '../components/AnalogFocusDial';
import FocusDigitalReadout from '../components/FocusDigitalReadout';
import FocusRoomScene from '../components/FocusRoomScene';
import { focusTypeName } from '../utils/focusDetails';
import { ActivityChips } from '../components/ActivityChips';
import { bnNum, bnSubject } from '../utils/bangla';


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

  // Analog dial needs both the live remainder AND the full session length.
  const dialRemainingSec = Math.max(0, Number(remainingSec) || 0);
  const dialTotalSec =
    timer?.mode === 'pomodoro'
      ? Math.max(1, Number(timer.durationSec) || 1)
      : Math.max(dialRemainingSec, Number(prefs.focusMin) * 60 || 1500);


  return (
    <div className="view-page focus-session-page v4-focus-page">
      {/* MAIN ILLUSTRATIVE + BODONI FOCUS STUDIO CARD */}
      <section
        className={`card compact-focus v4-focus-studio ${
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
                  <span
                    className={`v4-focus-status-badge ${isActivelyStudying ? 'running' : ''} ${
                      isPaused ? 'paused' : ''
                    } ${isAlarm ? 'alarm' : ''} ${isBreak ? 'break-mode' : ''}`}
                  >
                    <i /> {statusText}
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
                        size={230}
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
                <Maximize2 size={13} />
                <span>ফুল মোড</span>
              </button>
            </div>
            <span className={`v5-posture-caption v48-posture-caption ${isActivelyStudying ? 'active' : ''}`}>
              {isBreak
                ? 'বিরতির মুহূর্ত - একটু শ্বাস নিন'
                : isPaused
                ? 'পজ অবস্থায় আছে - শান্তিতে থাকুন'
                : isActivelyStudying
                ? 'গভীর মনোযোগে পড়াশোনা চলছে'
                : 'প্রস্তুত অবস্থা - শুরু করতে প্লে চাপুন'}
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
        <ModalShell title="ফোকাস কনফিগার" onClose={()=>setConfigDialog(false)} extraWide className="focus-config-modal">
          <div className="focus-config-dialog v48-cfg">
            {/* ── LEFT COLUMN: chapter first, then subject, then session body ── */}
            <div className="v48-cfg-main">
              {/* 1 · অধ্যায় নির্বাচন — the very first control in the dialog */}
              <section className="v48-cfg-block v48-cfg-chapter-first">
                <div className="v48-cfg-head">
                  <span className="v48-cfg-step">১</span>
                  <strong>অধ্যায় নির্বাচন</strong>
                  <small>{selectedSubject ? bnSubject(selectedSubject.name) : 'আগে বিষয় বাছুন'}</small>
                </div>
                <div className="focus-curriculum-field">
                  <CurriculumPicker
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

              {/* 2 · subject chips — hug their labels, one colour each */}
              <section className="v48-cfg-block">
                <div className="v48-cfg-head">
                  <span className="v48-cfg-step">২</span>
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

              {/* 3 · session body */}
              <section className="v48-cfg-block">
                <div className="v48-cfg-head">
                  <span className="v48-cfg-step">৩</span>
                  <strong>পড়ার ধরন ও নোট</strong>
                </div>
                <ActivityChips
                  value={draft.activityType}
                  onChange={(id) => setDraft({ activityType: id })}
                  label="পড়ার ধরন"
                />

                <div className="focus-context-fields">
                  <label>
                    কাজের শিরোনাম
                    <input
                      value={draft.workLabel || ''}
                      onChange={(e) => setDraft({ workLabel: e.target.value })}
                      placeholder="যেমন: ভেক্টর অনুশীলনী সমাধান"
                    />
                  </label>
                  <label>
                    Cycle <span>(ঐচ্ছিক)</span>
                    <input
                      value={draft.cycle || ''}
                      onChange={(e) => setDraft({ cycle: e.target.value })}
                      placeholder="Cycle 1"
                    />
                  </label>
                  {type === 'recorded' ? (
                    <label>
                      ভিডিও অবস্থান <span>(MM:SS)</span>
                      <input
                        value={draft.videoPosition || ''}
                        onChange={(e) => setDraft({ videoPosition: e.target.value })}
                        placeholder="32:15"
                        inputMode="numeric"
                      />
                    </label>
                  ) : (
                    <label>
                      প্রশ্নের লক্ষ্যমাত্রা <span>(ঐচ্ছিক)</span>
                      <BanglaNumberInput
                        min="0"
                        max="10000"
                        value={draft.questionTarget ?? ''}
                        onChange={(e) => setDraft({ questionTarget: e.target.value })}
                      />
                    </label>
                  )}
                </div>
              </section>
            </div>

            {/* ── RIGHT COLUMN: timer options fill what used to be dead space ── */}
            <aside className="v48-cfg-side">
              <div className="v48-cfg-block">
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

              <div className="v48-cfg-block">
                <span className="clean-label">দৈনিক সেশন লক্ষ্য</span>
                <div className="focus-duration">
                  <button type="button" aria-label="লক্ষ্য কমান" disabled={goal <= 1}
                    onClick={() => updatePrefs({ focusSessionsGoal: Math.max(1, goal - 1) })}>
                    <Minus size={15} />
                  </button>
                  <strong>{bnNum(goal)}টি সেশন</strong>
                  <button type="button" aria-label="লক্ষ্য বাড়ান" disabled={goal >= 50}
                    onClick={() => updatePrefs({ focusSessionsGoal: Math.min(50, goal + 1) })}>
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {mode === 'pomodoro' && (
                <div className="v48-cfg-block">
                  <span className="clean-label">সেশন সময়সীমা</span>
                  <div className="focus-duration">
                    <button type="button" aria-label="সময় কমান" disabled={!!timer || Number(prefs.focusMin) <= 5}
                      onClick={() => setDuration(Math.max(5, Number(prefs.focusMin) - 5), 'custom')}>
                      <Minus size={15} />
                    </button>
                    <strong>{bnNum(prefs.focusMin)} মিনিট</strong>
                    <button type="button" aria-label="সময় বাড়ান" disabled={!!timer || Number(prefs.focusMin) >= 720}
                      onClick={() => setDuration(Math.min(720, Number(prefs.focusMin) + 5), 'custom')}>
                      <Plus size={15} />
                    </button>
                  </div>
                  <div className="v48-cfg-quick">
                    <button type="button" className="focus-duration-custom" disabled={!!timer} onClick={() => setDuration(150, 'custom')}>
                      ২.৫ ঘণ্টা
                    </button>
                    <button type="button" className="focus-duration-custom" disabled={!!timer} onClick={() => openModal('duration')}>
                      কাস্টম
                    </button>
                  </div>
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

              <div className="v48-cfg-block">
                <span className="clean-label">শব্দ ও শান্ত পরিবেশ</span>
                <button type="button" className="v48-cfg-sounds" onClick={() => openModal('sounds')}>
                  <Volume2 size={14} />
                  <span>সাউন্ডস্কেপ বাছুন</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>

              <div className="v48-cfg-actions">
                {draft.source && !timer && (
                  <button type="button" className="focus-clear" onClick={() => commit(prev => ({ ...prev, focusDraft: {} }))}>
                    সংযুক্ত কাজ সরান
                  </button>
                )}
                <button type="button" className="action-btn primary-emerald" onClick={() => setConfigDialog(false)}>
                  ঠিক আছে
                </button>
              </div>
            </aside>
          </div>
        </ModalShell>,document.body)}

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
              className="v35-illus-fullscreen-inner"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="v35-illus-fullscreen-head">
                <strong>
                  {isBreak
                    ? 'বিরতি'
                    : isPaused
                    ? 'পজ'
                    : isActivelyStudying
                    ? 'পড়াশোনা চলছে'
                    : 'প্রস্তুত'}
                </strong>
                <button
                  type="button"
                  className="v35-illus-fullscreen-close"
                  onClick={() => setIllumFullscreen(false)}
                  aria-label="ফুল মোড বন্ধ করুন"
                >
                  <Minimize2 size={16} />
                  <span>বন্ধ করুন</span>
                </button>
              </div>
              <FocusRoomScene status={sceneStatus} />
            </div>
          </div>,
          document.body
        )}

    </div>
  );
}
