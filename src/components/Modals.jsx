import { BanglaNumberInput } from './BanglaInputs';
import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Sparkles,
  Headphones,
  Play,
  Pause,
  Square,
  ArrowLeft,
  CloudRain,
  Waves,
  Library,
  AudioLines,
  BellRing,
  PictureInPicture2,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { bnNum, bnSubject } from '../utils/bangla';
import { formatHM } from '../utils/seedData';
import { studyAudio } from '../utils/audioEngine';
import { StudyDurationModal, StudySubjectModal } from './StudyPreviewModals';
import { PreviewSubjectIcon } from './PreviewSubjectIcon';
import FocusCommitmentEditor from './FocusCommitmentEditor';
import FocusCompletionHero from './FocusCompletionHero';

export function ModalShell({ title, eyebrow, children, onClose, wide = false, extraWide = false, className = '' }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal-card ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={
          extraWide
            ? { maxWidth: 'min(1360px, 96vw)', width: 'min(1360px, 96vw)' }
            : wide
            ? { maxWidth: 'min(900px, 94vw)' }
            : undefined
        }
      >
        <div className="modal-heading">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" aria-label="বন্ধ করুন" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function DurationModal() {
  const { state, setDuration, closeModal } = useStudy();
  const initial = Number(state.timerPrefs.focusMin) || 50;
  const [hours, setHours] = useState(Math.floor(initial / 60));
  const [minutes, setMinutes] = useState(initial % 60);
  const total = Math.max(0, (Number(hours) || 0) * 60 + (Number(minutes) || 0));

  return (
    <ModalShell title="ফোকাস সময় নির্ধারণ" eyebrow="কাস্টম সময়সীমা" onClose={closeModal}>
      <div className="drum-picker-row">
        {[
          { label: 'ঘণ্টা', value: hours, set: setHours, max: 12 },
          { label: 'মিনিট', value: minutes, set: setMinutes, max: 59 },
        ].map((p, i) => (
          <React.Fragment key={p.label}>
            {i === 1 && <span className="drum-colon">:</span>}
            <div className="drum-unit">
              <span className="form-label">{p.label}</span>
              <button
                className="drum-step"
                onClick={() => p.set(Math.min(p.max, (Number(p.value) || 0) + 1))}
                aria-label={`Increase ${p.label}`}
              >
                <Plus size={14} />
              </button>
              <div className="drum-box">
                <BanglaNumberInput
                  plain
                  aria-label={p.label}
                  min="0"
                  max={p.max}
                  value={p.value}
                  onChange={(e) =>
                    p.set(Math.max(0, Math.min(p.max, Number(e.target.value) || 0)))
                  }
                />
              </div>
              <button
                className="drum-step"
                onClick={() => p.set(Math.max(0, (Number(p.value) || 0) - 1))}
                aria-label={`Reduce ${p.label}`}
              >
                <Minus size={14} />
              </button>
            </div>
          </React.Fragment>
        ))}
      </div>
      <button
        className="action-btn primary-pink full-btn"
        disabled={!total || total > 720}
        onClick={() => {
          if (setDuration(total, 'custom')) closeModal();
        }}
      >
        সময় নিশ্চিত করুন · {bnNum(total)} মিনিট
      </button>
    </ModalShell>
  );
}

function evaluate(expression) {
  const src = expression
    .replace(/\s+/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi');
  const tokens = src.match(/(?:\d+\.?\d*|\.\d+)|[a-z]+|[()+\-*/^]/gi) || [];
  if (tokens.join('') !== src || !tokens.length) throw new Error('Invalid expression');
  let i = 0;
  const parseExpression = () => {
    let v = parseTerm();
    while (tokens[i] === '+' || tokens[i] === '-') {
      const op = tokens[i++];
      const b = parseTerm();
      v = op === '+' ? v + b : v - b;
    }
    return v;
  };
  const parseTerm = () => {
    let v = parseUnary();
    while (tokens[i] === '*' || tokens[i] === '/') {
      const op = tokens[i++];
      const b = parseUnary();
      v = op === '*' ? v * b : v / b;
    }
    return v;
  };
  const parseUnary = () => {
    if (tokens[i] === '+') {
      i++;
      return parseUnary();
    }
    if (tokens[i] === '-') {
      i++;
      return -parseUnary();
    }
    return parsePower();
  };
  const parsePower = () => {
    let v = parsePrimary();
    if (tokens[i] === '^') {
      i++;
      v = Math.pow(v, parseUnary());
    }
    return v;
  };
  const parsePrimary = () => {
    const tok = tokens[i++];
    if (tok === '(') {
      const v = parseExpression();
      if (tokens[i++] !== ')') throw Error('Missing )');
      return v;
    }
    if (tok === 'pi') return Math.PI;
    if (tok === 'e') return Math.E;
    if (['sin', 'cos', 'tan', 'sqrt', 'ln', 'log', 'abs'].includes(tok)) {
      if (tokens[i++] !== '(') throw Error('Use parentheses');
      const v = parseExpression();
      if (tokens[i++] !== ')') throw Error('Missing )');
      return {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        sqrt: Math.sqrt,
        ln: Math.log,
        log: Math.log10,
        abs: Math.abs,
      }[tok](v);
    }
    if (tok && /^(?:\d|\.)/.test(tok)) return Number(tok);
    throw Error('Invalid expression');
  };
  const result = parseExpression();
  if (i !== tokens.length || !Number.isFinite(result)) throw Error('Invalid result');
  return Number(result.toPrecision(12)).toString();
}

function CalculatorModal() {
  const { closeModal } = useStudy();
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const keys = [
    ['sin', 'cos', 'tan', 'π'],
    ['√', 'ln', 'log', '^'],
    ['C', '(', ')', '⌫'],
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '−'],
    ['0', '.', '=', '+'],
  ];
  const press = (key) => {
    if (key === 'C') {
      setExpr('');
      setResult('');
      return;
    }
    if (key === '⌫') {
      setExpr((v) => v.slice(0, -1));
      return;
    }
    if (key === '=') {
      try {
        setResult(evaluate(expr));
      } catch {
        setResult('সমীকরণ যাচাই করুন');
      }
      return;
    }
    const val =
      key === '√'
        ? 'sqrt('
        : ['sin', 'cos', 'tan', 'ln', 'log'].includes(key)
        ? `${key}(`
        : key;
    setExpr((v) => (v + val).slice(0, 180));
  };
  return (
    <ModalShell title="সায়েন্টিফিক ক্যালকুলেটর" eyebrow="দ্রুত গণনা" onClose={closeModal}>
      <div className="calc-screen">
        <label className="sr-only" htmlFor="calc-input">
          Mathematics
        </label>
        <input
          id="calc-input"
          autoFocus
          value={expr}
          onChange={(e) => setExpr(e.target.value.slice(0, 180))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              press('=');
            }
          }}
          placeholder="0"
        />
        <div className="calc-result">{result || ' '}</div>
      </div>
      <div className="calc-grid">
        {keys.flat().map((k, i) => (
          <button
            key={i}
            className={`calc-key ${['÷', '×', '−', '+', '^'].includes(k) ? 'op' : ''} ${
              k === '=' ? 'eq' : ''
            }`}
            onClick={() => press(k)}
          >
            {k}
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

function SoundsModal() {
  const { closeModal, toast, state, updateProfile } = useStudy();
  const [levels, setLevels] = useState(() =>
    Object.fromEntries(
      studyAudio.presets.map((p) => [p.id, Math.round(studyAudio.getChannelVolume(p.id) * 100)])
    )
  );
  const soundIcons = { rain: CloudRain, brown: Waves, library: Library, binaural: AudioLines };
  const soundNames = {
    rain: ['হালকা বৃষ্টির শব্দ', 'একটানা শান্ত বৃষ্টির আবহ'],
    brown: ['ডিপ ব্রাউন নয়েজ', 'বাইরের শব্দ আড়াল করার গভীর ধ্বনি'],
    library: ['নীরব লাইব্রেরি', 'পড়ার ঘরের স্থির পরিবেশ'],
    binaural: ['৪০ হার্জ ফোকাস ওয়েভ', 'মনোযোগ সহায়ক স্টেরিও টোন (হেডফোনে উত্তম)'],
  };
  const change = (id, val) => {
    const n = Number(val);
    try {
      studyAudio.setChannelVolume(id, n / 100);
      setLevels((v) => ({ ...v, [id]: n }));
    } catch {
      toast('অডিও চালানো সম্ভব হয়নি।');
    }
  };
  return (
    <ModalShell title="ফোকাস ব্যাকগ্রাউন্ড সাউন্ড" eyebrow="১০০% অফলাইন অডিও" onClose={closeModal} wide>
      <div className="sound-list">
        {studyAudio.presets.map((p) => {
          const Icon = soundIcons[p.id] || AudioLines;
          return (
            <div className="sound-row" key={p.id}>
              <div className="sound-icon">
                <Icon size={18} />
              </div>
              <div className="sound-copy">
                <strong>{soundNames[p.id][0]}</strong>
                <span>{soundNames[p.id][1]}</span>
              </div>
              <input
                type="range"
                aria-label={soundNames[p.id][0]}
                min="0"
                max="100"
                value={levels[p.id]}
                onChange={(e) => change(p.id, e.target.value)}
              />
              <span className="sound-level">{bnNum(levels[p.id])}%</span>
            </div>
          );
        })}
      </div>
      <div className="modal-bottom-row">
        <label className="switch-line">
          <input
            type="checkbox"
            checked={!!state.profile.soundEnabled}
            onChange={(e) => updateProfile({ soundEnabled: e.target.checked })}
          />{' '}
          সেশন সমাপ্তির নোটিফিকেশন ধ্বনি
        </label>
        <button
          className="action-btn"
          onClick={() => {
            studyAudio.stopAllAmbient();
            setLevels(Object.fromEntries(studyAudio.presets.map((p) => [p.id, 0])));
          }}
        >
          সব সাউন্ড বন্ধ করুন
        </button>
      </div>
    </ModalShell>
  );
}

function CompleteModal({ info }) {
  const { closeModal, startTimer, state, saveFocusReport } = useStudy();
  const [status, setStatus] = useState('');
  const [solved, setSolved] = useState('');
  const [correct, setCorrect] = useState('');
  const [position, setPosition] = useState(info.focusMeta?.videoPosition || '');
  const [error, setError] = useState('');
  const isRecorded = info.focusMeta?.activityType === 'recorded';

  const save = () => {
    if (!info.isSprintWork && !status) {
      setError('কাজের অবস্থা বেছে নিন।');
      return;
    }
    if (solved !== '' && (!Number.isInteger(Number(solved)) || Number(solved) < 0)) {
      setError('প্রশ্নের সংখ্যা সঠিকভাবে লিখুন।');
      return;
    }
    if (
      correct !== '' &&
      (solved === '' ||
        !Number.isInteger(Number(correct)) ||
        Number(correct) < 0 ||
        Number(correct) > Number(solved))
    ) {
      setError('সঠিক উত্তরের সংখ্যা মোট প্রশ্নের চেয়ে বেশি হতে পারে না।');
      return;
    }
    if (position && !/^\d{1,4}:[0-5]\d$/.test(position)) {
      setError('ভিডিওর অবস্থান মিনিট:সেকেন্ড আকারে লিখুন, যেমন 32:15।');
      return;
    }
    saveFocusReport(info.sessionId, {
      status: info.isSprintWork ? (info.qualified ? 'done' : 'partial') : status,
      solved: solved === '' ? null : Number(solved),
      correct: correct === '' ? null : Number(correct),
      videoPosition: position,
      reportedAt: new Date().toISOString(),
    });
    closeModal();
  };

  return (
    <ModalShell
      title={info.auto ? 'ফোকাস সেশন সম্পন্ন!' : 'সেশন সংরক্ষিত হয়েছে'}
      eyebrow="সেশন রিপোর্ট"
      onClose={closeModal}
      className="completion-modal focus-report-modal"
    >
      <FocusCompletionHero
        subjectName={bnSubject(info.subjectName)}
        durationSec={info.durationSec}
        xp={info.xp}
      />
      <div className="complete-subject">
        <Sparkles size={14} /> {bnSubject(info.subjectName)}{' '}
        {info.focusMeta?.workLabel ? `· ${info.focusMeta.workLabel}` : ''}
      </div>
      <div className="complete-stats">
        <div>
          <span>এই সেশন</span>
          <strong>{formatHM(info.durationSec)}</strong>
        </div>
        <div>
          <span>আজ মোট</span>
          <strong>{formatHM(info.todaySec)}</strong>
        </div>
        <div>
          <span>অর্জিত XP</span>
          <strong>+{bnNum(info.xp)}</strong>
        </div>
      </div>

      <div className="focus-report-form">
        {info.isSprintWork ? (
          <div className={`sprint-report-result ${info.qualified ? 'success' : ''}`}>
            <strong>
              {info.qualified
                ? 'নির্ধারিত সময় পূর্ণ হয়েছে · কাজটি সম্পন্ন!'
                : 'নির্ধারিত পূর্ণ সময় এখনো বাকি আছে'}
            </strong>
            <span>
              প্রয়োজন ছিল অন্তত {bnNum(Math.ceil(info.requiredSec / 60))} মিনিট, এই সেশনে হয়েছে{' '}
              {formatHM(info.durationSec)}।
            </span>
          </div>
        ) : (
          <>
            <span className="clean-label">কাজের অগ্রগতি</span>
            <div className="focus-report-status" role="group" aria-label="কাজের অগ্রগতি">
              {[
                ['done', 'সম্পূর্ণ শেষ'],
                ['partial', 'আংশিক শেষ'],
                ['pending', 'আরও বাকি'],
              ].map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={status === key}
                  className={status === key ? 'selected' : ''}
                  onClick={() => setStatus(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {!isRecorded && (
          <div className="focus-report-counts">
            <label>
              মোট সমাধানকৃত প্রশ্ন <small>(ঐচ্ছিক)</small>
              <BanglaNumberInput
                min="0"
                max="10000"
                value={solved}
                onChange={(e) => setSolved(e.target.value)}
              />
            </label>
            <label>
              সঠিক উত্তর <small>(ঐচ্ছিক)</small>
              <BanglaNumberInput
                min="0"
                max="10000"
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
              />
            </label>
          </div>
        )}

        {isRecorded && (
          <label>
            ভিডিওর সর্বশেষ অবস্থান <small>(MM:SS)</small>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="32:15"
              inputMode="numeric"
            />
          </label>
        )}

        {error && (
          <p className="focus-report-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="modal-button-row">
        <button className="action-btn" onClick={closeModal}>
          এড়িয়ে যান
        </button>
        <button className="action-btn primary" onClick={save}>
          রিপোর্ট সংরক্ষণ করুন
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({ payload }) {
  const { closeModal } = useStudy();
  return (
    <ModalShell
      title={payload?.title || 'আপনি কি নিশ্চিত?'}
      eyebrow="নিশ্চিতকরণ"
      onClose={closeModal}
    >
      <p className="modal-intro">{payload?.description}</p>
      <div className="modal-button-row">
        <button className="action-btn" onClick={closeModal}>
          বাতিল
        </button>
        <button
          className={`action-btn ${payload?.danger ? 'ghost-danger' : 'primary-emerald'}`}
          onClick={() => {
            closeModal();
            payload?.onConfirm?.();
          }}
        >
          {payload?.confirmLabel || 'নিশ্চিত করুন'}
        </button>
      </div>
    </ModalShell>
  );
}

function EndTimerModal() {
  const { timer, elapsedSec, closeModal, finishTimer } = useStudy();
  return (
    <ModalShell
      title={timer?.phase === 'break' ? 'বিরতি শেষ করবেন?' : 'চলমান সেশন শেষ করবেন?'}
      eyebrow="ফোকাস কন্ট্রোল"
      onClose={closeModal}
    >
      <p className="modal-intro">
        {timer?.phase === 'break'
          ? 'চলমান বিরতি এখনই সমাপ্ত হবে।'
          : `আপনি ${formatHM(elapsedSec)} ফোকাস করেছেন — এই সময়টুকু আপনার রেকর্ডে যোগ হবে।`}
      </p>
      <div className="modal-button-row">
        <button className="action-btn" onClick={closeModal}>
          চালু রাখুন
        </button>
        <button
          className="action-btn primary-amber"
          onClick={() => {
            closeModal();
            finishTimer(false);
          }}
        >
          হ্যাঁ, সমাপ্ত করুন
        </button>
      </div>
    </ModalShell>
  );
}

/**
 * DAILY GOAL SETUP — wired to the "দৈনিক লক্ষ্য" edit action.
 * Previously the button opened a modal type with no handler, so it silently did nothing.
 */
function GoalSetupModal() {
  const { state, closeModal } = useStudy();
  return (
    <FocusCommitmentEditor
      commitment={state.commitment || {}}
      onClose={closeModal}
    />
  );
}

export function GlobalModals() {
  const { modal, closeModal, view } = useStudy();
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, closeModal]);
  if (!modal) return null;
  switch (modal.type) {
    case 'duration':
      return view === 'study' ? <StudyDurationModal Shell={ModalShell} /> : <DurationModal />;
    case 'subject':
      return <StudySubjectModal Shell={ModalShell} existing={modal.payload} />;
    case 'calculator':
      return <CalculatorModal />;
    case 'sounds':
      return <SoundsModal />;
    case 'complete':
      return <CompleteModal info={modal.payload} />;
    case 'endTimer':
      return <EndTimerModal />;
    case 'confirm':
      return <ConfirmModal payload={modal.payload} />;
    case 'goal':
      return <GoalSetupModal />;
    default:
      return null;
  }
}

export function ZenChamber() {
  const {
    zen,
    setZen,
    timer,
    isAlarm,
    displayTime,
    selectedSubject,
    toggleTimer,
    stopAlarm,
    endWithPrompt,
    sessionLocked,
    openModal,
    updatePip,
    modal,
  } = useStudy();

  useEffect(() => {
    if (!zen) return;
    const handler = (e) => {
      if (e.key === 'Escape') setZen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zen, setZen]);

  useEffect(() => {
    if (zen && modal?.type === 'complete') setZen(false);
  }, [zen, modal?.type, setZen]);

  if (!zen) return null;

  return (
    <div className="zen-overlay" role="dialog" aria-label="Zen Fullscreen Focus" aria-modal="true">
      <div className="zen-top">
        <div className="zen-brand">
          <span>
            <Sparkles size={20} />
          </span>{' '}
          Study Sentry <b>/ Zen Fullscreen</b>
        </div>
        <div className="zen-top-actions">
          <button
            className="action-btn"
            onClick={() => {
              updatePip({ open: true });
            }}
          >
            <PictureInPicture2 size={15} /> Floating PiP
          </button>
          <button className="action-btn" onClick={() => setZen(false)}>
            <ArrowLeft size={15} /> বের হোন <span className="zen-esc">ESC</span>
          </button>
        </div>
      </div>

      <div className="zen-center">
        <div className={`zen-orbit ${isAlarm ? 'zen-alarm-ring' : ''}`}>
          <div className="zen-orbit-inner">
            <span className="zen-overline">
              {isAlarm
                ? 'সময় পূর্ণ · ঘড়ির অ্যালার্ম বাজছে'
                : timer?.phase === 'break'
                ? 'প্রশান্তির বিরতি'
                : timer?.status === 'running'
                ? 'গভীর একাগ্রতা চলছে'
                : 'নীরব ফোকাস কক্ষ'}
            </span>
            <div className={`zen-time v4-bodoni-digits ${isAlarm ? 'negative' : ''}`}>
              {String(displayTime || '25:00').replace(/[০-৯]/g, (d) =>
                String('০১২৩৪৫৬৭৮৯'.indexOf(d))
              )}
            </div>
            <div className="zen-subject">
              {timer?.phase === 'break' ? (
                'একটু বিশ্রাম নিন'
              ) : selectedSubject ? (
                <>
                  <PreviewSubjectIcon subject={selectedSubject} size={16} />{' '}
                  {bnSubject(selectedSubject.name)}
                </>
              ) : (
                'বিষয় নির্বাচন করুন'
              )}
            </div>
          </div>
        </div>

        <div className="focus-controls-row zen-controls">
          <button
            className="round-ctrl-btn secondary"
            aria-label="ব্যাকগ্রাউন্ড সাউন্ড"
            onClick={() => {
              setZen(false);
              openModal('sounds');
            }}
          >
            <Headphones size={18} />
          </button>

          {isAlarm ? (
            <button className="focus-alarm-stop-btn zen-stop-btn" onClick={stopAlarm}>
              <BellRing size={19} /> অ্যালার্ম থামান
            </button>
          ) : (
            <button
              className="round-ctrl-btn"
              aria-label={timer?.status === 'running' ? 'বিরতি নিন' : 'ফোকাস শুরু'}
              onClick={toggleTimer}
            >
              {timer?.status === 'running' ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" />
              )}
            </button>
          )}

          <button
            className="round-ctrl-btn secondary"
            aria-label="সেশন শেষ করুন"
            title={sessionLocked && !isAlarm ? '7 মিনিট ফোকাস পূর্ণ — সেশন লকড' : 'সেশন শেষ করুন'}
            onClick={() => {
              if (isAlarm) {
                stopAlarm();
              } else {
                setZen(false);
                endWithPrompt();
              }
            }}
            disabled={!timer || (sessionLocked && timer?.phase !== 'break' && !isAlarm)}
          >
            <Square size={16} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
