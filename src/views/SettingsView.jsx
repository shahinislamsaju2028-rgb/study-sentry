import { BanglaNumberInput } from '../components/BanglaInputs';
import React, { useEffect, useRef } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileJson,
  FileSpreadsheet,
  FolderOpen,
  HardDrive,
  LockKeyhole,
  PictureInPicture2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Upload,
  UserRound,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { desktopBridge } from '../bridge/desktopBridge';
import { bnSample } from '../utils/bangla';
import StrictGuardPanel from '../components/StrictGuardPanel';
import { PhaseModeCards } from '../components/PhaseModeModal';
import JunkNotes from '../components/JunkNotes';
import BrandIcon from '../components/BrandIcon';

const SETTINGS_TABS = [
  { id: 'general', label: 'প্রহর ও প্রোফাইল', Icon: Clock3 },
  { id: 'guard', label: 'Focus Guard', Icon: ShieldCheck },
  { id: 'junk', label: 'Junk Note', Icon: StickyNote },
  { id: 'backup', label: 'ব্যাকআপ ও ডাটা', Icon: HardDrive },
];

export default function SettingsView() {
  const {
    state,
    settingsSection,
    setSettingsSection,
    updateProfile,
    updatePrefs,
    updatePip,
    saveStatus,
    storagePath,
    backupStatus,
    exportJson,
    exportCsv,
    importJson,
    resetData,
    openModal,
    phaseMode,
    setPhaseMode,
  } = useStudy();
  const fileRef = useRef(null);
  const panelRef = useRef(null);
  const isDesktop = desktopBridge.isDesktop || !!window.electronAPI?.isElectron;

  const activeSection = SETTINGS_TABS.some((t) => t.id === settingsSection)
    ? settingsSection
    : 'general';


  useEffect(() => {
    if (settingsSection === 'guard' || settingsSection === 'junk') {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [settingsSection]);

  const chooseBackup = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    openModal('confirm', {
      title: 'ব্যাকআপ লোড করবেন?',
      description: 'বর্তমান তথ্যের জায়গায় ব্যাকআপ ফাইলের তথ্য প্রতিস্থাপিত হবে।',
      confirmLabel: 'লোড করুন',
      danger: true,
      onConfirm: () => importJson(file),
    });
  };

  const reset = (demo) =>
    openModal('confirm', {
      title: demo ? 'নমুনা ডেটা লোড করবেন?' : 'নতুন করে শুরু করবেন?',
      description: demo
        ? 'বর্তমান তথ্যের জায়গায় নমুনা ডেটা লোড হবে।'
        : 'সব তথ্য মুছে নতুন খালি ওয়ার্কস্পেস তৈরি হবে।',
      confirmLabel: demo ? 'নমুনা লোড' : 'রিসেট করুন',
      danger: true,
      onConfirm: () => resetData(demo),
    });

  return (
    <div className="view-page settings-page" ref={panelRef}>
      {/* Sub-navigation — the same v33 segmented control used by Overview,
          Sprint Planner, Tasks, Student Suite and Study Lounge. */}
      <div className="v33-seg" role="tablist" aria-label="সেটিংস প্যানেল">
        {SETTINGS_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeSection === id}
            className={`v33-seg-tab ${activeSection === id ? 'is-active' : ''}`}
            onClick={() => setSettingsSection(id)}
          >
            <span className="v33-seg-ico">
              <Icon size={16} />
            </span>
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'guard' && (
        <div className="card settings-card clean-view-stage">
          <StrictGuardPanel />
        </div>
      )}

      {activeSection === 'junk' && (
        <div className="card settings-card clean-view-stage">
          <JunkNotes />
        </div>
      )}

      {activeSection === 'general' && (
        <div className="settings-general-stack clean-view-stage">
          {/* 2. Study Phase Selector (4 Phases or All 5 Phases including Deep Night 10:01 PM - 2:00 AM) */}
          <section className="card settings-card">
            <div className="settings-heading">
              <span className="settings-icon">
                <Clock3 size={19} />
              </span>
              <div>
                <h3 className="section-title">দৈনিক অধ্যয়ন প্রহর নির্বাচন (৫ম প্রহর: গভীর রাত যুক্ত)</h3>
                <small className="guard-sub-caption">
                  রাত 10:01 – রাত 2:00 পর্যন্ত নতুন &ldquo;গভীর রাত&rdquo; প্রহরসহ ৪টি বা ৫টি প্রহর বেছে নিন
                </small>
              </div>
            </div>
            <PhaseModeCards value={phaseMode} onSelect={(m) => setPhaseMode(m)} compact />
          </section>

          {/* 3. Student Profile & Timer Durations */}
          <section className="card settings-card">
            <div className="settings-heading">
              <span className="settings-icon">
                <UserRound size={19} />
              </span>
              <h3 className="section-title">প্রোফাইল ও ডিফল্ট সময়সীমা</h3>
            </div>

            {/* 5.txt ④ — the four duration fields were four identical number
                boxes scattered across a two-column grid, each with a label above
                it and a bare input under it. They are the same kind of value
                (minutes) read in the same order every time, so they are now one
                row of dropdowns for the common answers, each still editable by
                typing. The name field gets its own full-width plate, bigger type
                and real rounding, because it is the only free-text field here. */}
            <div className="v52-profile-form">
              <label className="v52-name-field">
                <span className="v52-name-label">নাম</span>
                <span className="v52-name-box">
                  <UserRound size={16} />
                  <input
                    value={bnSample(state.profile.name, state.isDemo)}
                    maxLength="50"
                    onChange={(e) => updateProfile({ name: e.target.value })}
                    placeholder="শিক্ষার্থী"
                  />
                </span>
              </label>

              <div className="v52-duration-row">
                {[
                  {
                    id: 'goal',
                    label: 'দৈনিক লক্ষ্য',
                    hint: 'মিনিট',
                    value: state.profile.dailyGoalMin,
                    max: 1440,
                    options: [30, 60, 120, 180, 240, 300, 360, 480, 600],
                    commit: (v) => updateProfile({ dailyGoalMin: v }),
                  },
                  {
                    id: 'focus',
                    label: 'ফোকাস',
                    hint: 'মিনিট',
                    value: state.timerPrefs.focusMin,
                    max: 720,
                    options: [15, 20, 25, 30, 45, 50, 60, 90, 120],
                    commit: (v) => updatePrefs({ focusMin: v }),
                  },
                  {
                    id: 'short',
                    label: 'ছোট বিরতি',
                    hint: 'মিনিট',
                    value: state.timerPrefs.breakMin,
                    max: 120,
                    options: [3, 5, 10, 15, 20, 30],
                    commit: (v) => updatePrefs({ breakMin: v }),
                  },
                  {
                    id: 'long',
                    label: 'দীর্ঘ বিরতি',
                    hint: 'মিনিট',
                    value: state.timerPrefs.longBreakMin || 15,
                    max: 120,
                    options: [10, 15, 20, 25, 30, 45],
                    commit: (v) => updatePrefs({ longBreakMin: v }),
                  },
                ].map((f) => (
                  <label className="v52-duration-field" key={f.id}>
                    <span className="v52-duration-label">{f.label}</span>
                    <span className="v52-duration-control">
                      <select
                        value={
                          f.options.includes(Number(f.value)) ? String(f.value) : 'custom'
                        }
                        onChange={(e) => {
                          if (e.target.value === 'custom') return;
                          f.commit(Math.max(1, Math.min(f.max, Number(e.target.value) || 1)));
                        }}
                      >
                        {f.options.map((m) => (
                          <option key={m} value={String(m)}>
                            {m} {f.hint}
                          </option>
                        ))}
                        {!f.options.includes(Number(f.value)) && (
                          <option value="custom">
                            {Number(f.value) || 1} {f.hint}
                          </option>
                        )}
                      </select>
                      <ChevronDown size={14} className="v52-duration-caret" />
                    </span>
                    <BanglaNumberInput
                      className="v52-duration-input"
                      min="1"
                      max={String(f.max)}
                      aria-label={`${f.label} — নিজের মতো লিখুন`}
                      value={f.value}
                      onChange={(e) =>
                        f.commit(Math.max(1, Math.min(f.max, Number(e.target.value) || 1)))
                      }
                    />
                  </label>
                ))}
              </div>

              <div className="v52-sound-row">
                <span className="v52-sound-title">সাউন্ড</span>
                <label className="v52-switch">
                  <input
                    type="checkbox"
                    checked={!!state.profile.soundEnabled}
                    onChange={(e) => updateProfile({ soundEnabled: e.target.checked })}
                  />
                  <span className="v52-switch-track" aria-hidden="true"><i /></span>
                  অ্যালার্ম ও রিমাইন্ডার
                </label>
                <label className="v52-switch">
                  <input
                    type="checkbox"
                    checked={state.profile.uiSoundEnabled !== false}
                    onChange={(e) => updateProfile({ uiSoundEnabled: e.target.checked })}
                  />
                  <span className="v52-switch-track" aria-hidden="true"><i /></span>
                  ক্লিক সাউন্ড
                </label>
                <label className="v52-volume">
                  <span>ভলিউম {state.profile.uiSoundVolume ?? 50}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={state.profile.uiSoundVolume ?? 50}
                    disabled={state.profile.uiSoundEnabled === false}
                    onChange={(e) => updateProfile({ uiSoundVolume: Number(e.target.value) })}
                  />
                </label>
              </div>
              <small className="v52-sound-note">
                Pause সতর্কবার্তা সিস্টেমের ভলিউম ১০০% করতে পারে। হেডফোন ব্যবহারে সতর্ক থাকুন।
              </small>
            </div>
          </section>
        </div>
      )}

      {activeSection === 'backup' && (
        <div className="settings-layout clean-view-stage">
          <div className="settings-main">
            <section className="card settings-card">
              <div className="settings-heading">
                <span className="settings-icon">
                  <HardDrive size={19} />
                </span>
                <h3 className="section-title">ডেটা ব্যাকআপ ও এক্সপোর্ট</h3>
              </div>

              <div className="storage-pill">
                <CheckCircle2 size={16} />
                <span>
                  স্ট্যাটাস:{' '}
                  <strong>
                    {saveStatus === 'saving'
                      ? 'সংরক্ষণ হচ্ছে…'
                      : saveStatus === 'error'
                      ? 'সংরক্ষণ ব্যর্থ'
                      : 'স্বয়ংক্রিয়ভাবে সংরক্ষিত'}
                  </strong>
                  {storagePath ? ` · ${storagePath}` : ''}
                </span>
              </div>

              {/* This used to be a five-clause paragraph explaining the backup
                  cadence, the retention window, the web-preview storage model and
                  an advisory. Nobody reads prose in a settings panel — the two
                  facts that actually change behaviour are now chips, and the
                  rest is gone. */}
              <div className="v50-backup-facts">
                <span className="v50-backup-fact">
                  <RotateCcw size={12} /> সর্বশেষ ৭ দিনের কপি রাখা হয়
                </span>
                <span className="v50-backup-fact is-web">
                  {isDesktop ? 'লোকাল ফোল্ডারে সংরক্ষিত' : 'ব্রাউজার স্টোরেজে সংরক্ষিত'}
                </span>
              </div>
              {backupStatus && <p role="status" className="v50-backup-status">{backupStatus}</p>}
              <div className="backup-grid">
                <button className="backup-tile" type="button" onClick={exportJson}>
                  <FileJson size={20} />
                  <strong>JSON ব্যাকআপ ডাউনলোড</strong>
                  <span>সব সেশন, টাস্ক ও সেটিংস</span>
                </button>

                <button className="backup-tile" type="button" onClick={exportCsv}>
                  <FileSpreadsheet size={20} />
                  <strong>CSV সেশন রিপোর্ট</strong>
                  <span>Excel / Google Sheets ফরম্যাট</span>
                </button>

                <button
                  className="backup-tile"
                  type="button"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={20} />
                  <strong>ব্যাকআপ রিস্টোর</strong>
                  <span>JSON ফাইল আপলোড করুন</span>
                </button>

                {isDesktop && (
                  <button
                    className="backup-tile"
                    type="button"
                    onClick={() => desktopBridge.openDataFolder()}
                  >
                    <FolderOpen size={20} />
                    <strong>ডেটা ফোল্ডার খুলুন</strong>
                    <span>SQLite ডাটাবেস লোকেশন</span>
                  </button>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={chooseBackup}
              />

              <div className="danger-zone">
                <button type="button" className="action-btn" onClick={() => reset(true)}>
                  <Sparkles size={15} /> নমুনা ডেটা লোড
                </button>
                <button type="button" className="action-btn ghost-danger" onClick={() => reset(false)}>
                  <RotateCcw size={15} /> নতুন খালি ওয়ার্কস্পেস
                </button>
              </div>
            </section>
          </div>

          <aside className="settings-side">
            <div className="privacy-card">
              <div className="privacy-icon" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                <BrandIcon size={44} variant="obsidian" style={{ borderRadius: 11 }} />
              </div>
              <h3>অফলাইন ও নিরাপদ</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '8px 0 14px' }}>
                আপনার সকল ফোকাস সেশন, টাস্ক এবং নোট সম্পূর্ণ আপনার ডিভাইসে সংরক্ষিত থাকে।
              </p>
              <div className="v11-brand-pack-row" title="Study Sentry Official Optical Icon Suite">
                <BrandIcon size={28} variant="line-obsidian" style={{ borderRadius: 7 }} />
                <BrandIcon size={28} variant="white" style={{ borderRadius: 7 }} />
                <BrandIcon size={26} variant="clock-book" style={{ borderRadius: 7 }} />
                <BrandIcon size={22} variant="clock-only" style={{ borderRadius: 6 }} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
