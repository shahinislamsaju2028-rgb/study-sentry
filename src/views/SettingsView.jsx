import { BanglaNumberInput } from '../components/BanglaInputs';
import React, { useEffect, useRef } from 'react';
import {
  Check,
  CheckCircle2,
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
      {/* Fast Segmented Control Panel Switcher */}
      <div className="settings-seg-bar" role="tablist" aria-label="Settings Control Panels">
        {SETTINGS_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeSection === id}
            className={`settings-seg-btn ${activeSection === id ? 'active' : ''}`}
            onClick={() => setSettingsSection(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
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

            <div className="form-grid-2">
              <label className="form-label form-group">
                নাম
                <input
                  className="form-input"
                  value={bnSample(state.profile.name, state.isDemo)}
                  maxLength="50"
                  onChange={(e) => updateProfile({ name: e.target.value })}
                  placeholder="শিক্ষার্থী"
                />
              </label>

              <label className="form-label form-group">
                দৈনিক লক্ষ্য (মিনিট)
                <BanglaNumberInput
                  className="form-input"
                  min="1"
                  max="1440"
                  value={state.profile.dailyGoalMin}
                  onChange={(e) =>
                    updateProfile({
                      dailyGoalMin: Math.max(1, Math.min(1440, Number(e.target.value) || 1)),
                    })
                  }
                />
              </label>

              <label className="form-label form-group">
                ডিফল্ট ফোকাস (মিনিট)
                <BanglaNumberInput
                  className="form-input"
                  min="1"
                  max="720"
                  value={state.timerPrefs.focusMin}
                  onChange={(e) =>
                    updatePrefs({
                      focusMin: Math.max(1, Math.min(720, Number(e.target.value) || 1)),
                    })
                  }
                />
              </label>

              <label className="form-label form-group">
                ছোট বিরতি (মিনিট)
                <BanglaNumberInput
                  className="form-input"
                  min="1"
                  max="120"
                  value={state.timerPrefs.breakMin}
                  onChange={(e) =>
                    updatePrefs({
                      breakMin: Math.max(1, Math.min(120, Number(e.target.value) || 1)),
                    })
                  }
                />
              </label>

              <label className="form-label form-group">
                দীর্ঘ বিরতি (মিনিট)
                <BanglaNumberInput
                  className="form-input"
                  min="1"
                  max="120"
                  value={state.timerPrefs.longBreakMin || 15}
                  onChange={(e) =>
                    updatePrefs({
                      longBreakMin: Math.max(1, Math.min(120, Number(e.target.value) || 1)),
                    })
                  }
                />
              </label>

              <div className="settings-check-wrap">
                <span className="form-label">সাউন্ড</span>
                <label className="switch-line">
                  <input
                    type="checkbox"
                    checked={!!state.profile.soundEnabled}
                    onChange={(e) => updateProfile({ soundEnabled: e.target.checked })}
                  />{' '}
                  অ্যালার্ম ও রিমাইন্ডার সাউন্ড
                </label>
                <label className="switch-line">
                  <input type="checkbox" checked={state.profile.uiSoundEnabled !== false}
                    onChange={(e) => updateProfile({ uiSoundEnabled: e.target.checked })} /> ইন্টারফেস ক্লিক সাউন্ড
                </label>
                <label className="form-label">ক্লিক সাউন্ডের মাত্রা: {state.profile.uiSoundVolume ?? 50}%
                  <input type="range" min="0" max="100" value={state.profile.uiSoundVolume ?? 50}
                    disabled={state.profile.uiSoundEnabled === false}
                    onChange={(e) => updateProfile({ uiSoundVolume: Number(e.target.value) })} />
                </label>
                <small>Pause সতর্কবার্তা সিস্টেমের ভলিউম ১০০% করতে পারে। হেডফোন ব্যবহারে সতর্ক থাকুন।</small>
              </div>
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

              <p>ডেস্কটপে দিনে একবার ডেটা ফোল্ডারের backups-এ JSON কপি রাখা হয় (সর্বশেষ ৭টি দিন)। রিস্টোরের আগেও কপি রাখা হয়। ওয়েব প্রিভিউর কপি শুধু ব্রাউজার স্টোরেজে থাকে। আলাদা ড্রাইভেও ব্যাকআপ রাখুন।</p>
              {backupStatus && <p role="status">{backupStatus}</p>}
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
