import warningSoundUrl from '../assets/audio/warning-sound.mp3';
import tickTacSoundUrl from '../assets/audio/tick-tac-sound.mp3';
import { desktopBridge } from '../bridge/desktopBridge';

const AMBIENT_PRESETS = [
  { id: 'rain', label: 'Gentle Rain' },
  { id: 'brown', label: 'Deep Brown Noise' },
  { id: 'library', label: 'Quiet Library' },
  { id: 'binaural', label: '40Hz Focus Wave' },
];

class StudyAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientMasterGain = null;

    // Multi-channel ambient mixer (used by SoundsModal / ZenChamber)
    this.presets = AMBIENT_PRESETS;
    this._channelVolumes = { rain: 0, brown: 0, library: 0, binaural: 0 };
    this._channelNodes = {};
    this._backgroundMuted = false;
    this._mutedDomMedia = new Set();

    // Legacy single-channel compatibility
    this.ambientNode = null;
    this.ambientGain = null;
    this.currentAmbient = 'none';
    this.volume = 0.42;
    this.soundEnabled = true;

    // Exact Google Drive audio assets:
    // 1. Warning Sound (WARN.mp3) -> Pause Request countdown loop
    // 2. Tick-Tick Sound (audio-editor-output.mp3) -> Final countdown & Completion loop
    this._warningAudioEl = null;
    this._tickTacAudioEl = null;
    this._rawArrayBuffers = { warning: null, tickTac: null };
    this._decodedBuffers = { warning: null, tickTac: null };
    this._decodePromises = { warning: null, tickTac: null };
    this._activeBufferSource = null;
    this._activeBufferGain = null;
    this._loopSessionToken = 0;
    this._lastNotifAt = 0;

    this._activeLoopMode = 'none'; // 'none' | 'drive-tick-tac' | 'drive-warning-loop'

    // Eagerly prefetch raw MP3 bytes off the main critical path so decode takes <1ms
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      const warmBytes = () => {
        this._ensureHtmlAudioElements();
        fetch(warningSoundUrl)
          .then((r) => r.arrayBuffer())
          .then((ab) => {
            this._rawArrayBuffers.warning = ab;
          })
          .catch(() => {});
        fetch(tickTacSoundUrl)
          .then((r) => r.arrayBuffer())
          .then((ab) => {
            this._rawArrayBuffers.tickTac = ab;
          })
          .catch(() => {});
      };
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(warmBytes, { timeout: 1200 });
      } else {
        setTimeout(warmBytes, 150);
      }
    }
  }

  _ensureCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.92;
      this.masterGain.connect(this.ctx.destination);

      this.ambientMasterGain = this.ctx.createGain();
      this.ambientMasterGain.gain.value = this._backgroundMuted ? 0.0001 : 1.0;
      this.ambientMasterGain.connect(this.masterGain);

      // Warm decoded PCM buffers in background as soon as AudioContext exists
      void this._preloadDecodedBuffer('warning');
      void this._preloadDecodedBuffer('tickTac');
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _ensureHtmlAudioElements() {
    if (typeof Audio === 'undefined') return;
    if (!this._warningAudioEl) {
      const el = new Audio(warningSoundUrl);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0.88;
      el.dataset.ssInternal = '1';
      this._warningAudioEl = el;
    }
    if (!this._tickTacAudioEl) {
      const el = new Audio(tickTacSoundUrl);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0.85;
      el.dataset.ssInternal = '1';
      this._tickTacAudioEl = el;
    }
  }

  async _preloadDecodedBuffer(kind) {
    if (this._decodedBuffers[kind]) return this._decodedBuffers[kind];
    if (this._decodePromises[kind]) return this._decodePromises[kind];

    const url = kind === 'warning' ? warningSoundUrl : tickTacSoundUrl;
    const ctx = this.ctx;
    if (!ctx || typeof fetch === 'undefined') return null;

    const getBytes = this._rawArrayBuffers[kind]
      ? Promise.resolve(this._rawArrayBuffers[kind])
      : fetch(url).then((res) => res.arrayBuffer());

    this._decodePromises[kind] = getBytes
      .then((ab) => ctx.decodeAudioData(ab.slice(0)))
      .then((decoded) => {
        this._decodedBuffers[kind] = decoded;
        return decoded;
      })
      .catch(() => null);

    return this._decodePromises[kind];
  }

  /**
   * Auto-Mute Background Audio during Full-Screen Pause Request:
   * Immediately mutes all app ambient channels AND any external <audio>/<video> media
   * in the document so ONLY the Warning Sound loop plays cleanly.
   * Restores background audio smoothly as soon as focus resumes.
   */
  setBackgroundMuted(muted) {
    const next = Boolean(muted);
    if (this._backgroundMuted === next) return;
    this._backgroundMuted = next;

    if (this.ambientMasterGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.ambientMasterGain.gain.cancelScheduledValues(now);
        this.ambientMasterGain.gain.setTargetAtTime(next ? 0.0001 : 1.0, now, 0.04);
      } catch (_) {}
    }

    if (typeof document !== 'undefined') {
      if (next) {
        const mediaList = document.querySelectorAll('audio, video');
        mediaList.forEach((el) => {
          if (el.dataset?.ssInternal === '1') return;
          if (!el.muted) {
            el.muted = true;
            this._mutedDomMedia.add(el);
          }
        });
      } else {
        this._mutedDomMedia.forEach((el) => {
          try {
            el.muted = false;
          } catch (_) {}
        });
        this._mutedDomMedia.clear();
      }
    }
  }

  _stopAllLoopPlayers() {
    this._loopSessionToken = (this._loopSessionToken || 0) + 1;
    if (this._warningEnforceTimer) {
      clearInterval(this._warningEnforceTimer);
      this._warningEnforceTimer = null;
    }
    desktopBridge.setAudioWarningLock(false).catch(() => {});

    const oldSrc = this._activeBufferSource;
    const oldGain = this._activeBufferGain;
    this._activeBufferSource = null;
    this._activeBufferGain = null;

    if (oldSrc) {
      try {
        oldSrc.onended = null;
        oldSrc.stop(0);
      } catch (_) {}
      try {
        oldSrc.disconnect();
      } catch (_) {}
    }
    if (oldGain) {
      try {
        oldGain.disconnect();
      } catch (_) {}
    }

    if (this._warningAudioEl) {
      try {
        this._warningAudioEl.pause();
        this._warningAudioEl.currentTime = 0;
      } catch (_) {}
    }
    if (this._tickTacAudioEl) {
      try {
        this._tickTacAudioEl.pause();
        this._tickTacAudioEl.currentTime = 0;
      } catch (_) {}
    }
  }

  _startDriveAudioLoop(kind, gainTarget = 0.85) {
    this._stopAllLoopPlayers();
    const myToken = this._loopSessionToken;
    this._ensureHtmlAudioElements();
    const isUnmutableWarning = kind === 'warning';
    const expectedMode = isUnmutableWarning ? 'drive-warning-loop' : 'drive-tick-tac';
    const htmlEl = isUnmutableWarning ? this._warningAudioEl : this._tickTacAudioEl;

    if (isUnmutableWarning) {
      // Lock OS + App Warning Volume to 100% Maximum & Unmutable!
      desktopBridge.setAudioWarningLock(true).catch(() => {});
      this._warningEnforceTimer = setInterval(() => {
        if (this._activeLoopMode !== 'drive-warning-loop') return;
        desktopBridge.setAudioWarningLock(true).catch(() => {});
        if (this.ctx?.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.value = 1.0;
        }
        if (this._activeBufferGain && this.ctx) {
          this._activeBufferGain.gain.value = 1.35;
        }
        if (this._warningAudioEl) {
          this._warningAudioEl.muted = false;
          this._warningAudioEl.volume = 1.0;
        }
      }, 180);
    }

    const ctx = this._ensureCtx();
    const cachedBuf = this._decodedBuffers[kind];
    if (ctx && cachedBuf && ctx.state === 'running') {
      try {
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = cachedBuf;
        src.loop = true;
        const effectiveGain = isUnmutableWarning ? 1.35 : gainTarget;
        gain.gain.setValueAtTime(effectiveGain, ctx.currentTime);
        src.connect(gain);
        gain.connect(isUnmutableWarning ? ctx.destination : this.masterGain);
        src.start(0);
        this._activeBufferSource = src;
        this._activeBufferGain = gain;
        return;
      } catch (_) {}
    }

    if (htmlEl) {
      try {
        htmlEl.muted = false;
        htmlEl.currentTime = 0;
        htmlEl.volume = isUnmutableWarning ? 1.0 : gainTarget;
        const p = htmlEl.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    }

    this._preloadDecodedBuffer(kind).then((decoded) => {
      if (
        !decoded ||
        this._loopSessionToken !== myToken ||
        this._activeLoopMode !== expectedMode ||
        this._activeBufferSource
      ) {
        return;
      }
      if (htmlEl && htmlEl.paused && this.ctx) {
        try {
          const src = this.ctx.createBufferSource();
          const gain = this.ctx.createGain();
          src.buffer = decoded;
          src.loop = true;
          const effectiveGain = isUnmutableWarning ? 1.35 : gainTarget;
          gain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
          src.connect(gain);
          gain.connect(isUnmutableWarning ? this.ctx.destination : this.masterGain);
          src.start(0);
          this._activeBufferSource = src;
          this._activeBufferGain = gain;
        } catch (_) {}
      }
    });
  }

  /**
   * Synchronizes exact timer sound mode:
   * - 'none'               -> Active concentration (>10s remaining) or Idle
   * - 'drive-tick-tac'     -> Drive Tick-Tac Sound (Session Completion & final 10s countdown)
   * - 'drive-warning-loop' -> Drive Warning Sound Loop (Full-Screen Pause Request & Paused state)
   */
  syncTimerLoopState(mode = 'none') {
    // Support legacy aliases seamlessly
    if (mode === 'gentle-finish-tick') mode = 'drive-tick-tac';
    if (mode === 'neon-pause-warning') mode = 'drive-warning-loop';

    // CRITICAL RULE: 'drive-warning-loop' (WARN.mp3) CANNOT BE MUTED!
    // Even if soundEnabled === false or system volume is lowered/muted, Warning Sound plays at 100% Max!
    if (!this.soundEnabled && mode !== 'drive-warning-loop') {
      mode = 'none';
    }

    if (this._activeLoopMode === mode) {
      if (mode === 'none') {
        this._stopAllLoopPlayers();
        return;
      }
      if (mode === 'drive-warning-loop') {
        desktopBridge.setAudioWarningLock(true).catch(() => {});
      }
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    this._stopAllLoopPlayers();
    this._activeLoopMode = mode;

    if (mode === 'none') return;

    if (mode === 'drive-warning-loop') {
      this._startDriveAudioLoop('warning', 1.0);
    } else if (mode === 'drive-tick-tac') {
      this._startDriveAudioLoop('tickTac', 0.82);
    }
  }

  startClockTickAlarm() {
    this.syncTimerLoopState('drive-tick-tac');
  }

  stopClockTickAlarm() {
    if (this._activeLoopMode === 'drive-tick-tac') {
      this.syncTimerLoopState('none');
    }
  }

  stopAllTimerLoops() {
    this._activeLoopMode = 'none';
    this._stopAllLoopPlayers();
  }

  /**
   * Crisp Push Notification Sound Alert (debounced 500ms against burst duplicates)
   */
  playNotificationAlert() {
    if (!this.soundEnabled) return;
    const nowWall = Date.now();
    if (nowWall - (this._lastNotifAt || 0) < 500) return;
    this._lastNotifAt = nowWall;

    const ctx = this._ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 880, 1174.66];
    notes.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.085);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.085);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.085 + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.085 + 0.34);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.085);
        osc.stop(now + idx * 0.085 + 0.38);
      } catch (_) {}
    });
  }

  playChime(type = 'complete') {
    if (!this.soundEnabled) return;
    const ctx = this._ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes =
      type === 'complete'
        ? [523.25, 659.25, 783.99, 1046.5]
        : type === 'phase-complete'
        ? [440, 554.37, 659.25, 880, 1108.73]
        : type === 'nudge'
        ? [587.33, 493.88, 659.25]
        : type === 'start'
        ? [440, 554.37, 659.25]
        : type === 'achieve'
        ? [587.33, 739.99, 880, 1174.66]
        : [392.0, 523.25];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'achieve' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.16, now + idx * 0.11 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.52);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.58);
    });
  }

  /* ============================================================================
     MULTI-CHANNEL OFFLINE AMBIENT MIXER (Auto-Muted During Pause Request)
     ============================================================================ */
  getChannelVolume(id) {
    return Number(this._channelVolumes[id] || 0);
  }

  setChannelVolume(id, vol) {
    const clamped = Math.max(0, Math.min(1, Number(vol) || 0));
    this._channelVolumes[id] = clamped;

    if (clamped <= 0.005) {
      this._stopChannel(id);
      return;
    }

    const ctx = this._ensureCtx();
    if (!ctx) return;

    if (this._channelNodes[id]?.gain) {
      this._channelNodes[id].gain.gain.setTargetAtTime(clamped * 0.48, ctx.currentTime, 0.08);
      return;
    }

    this._startChannel(ctx, id, clamped);
  }

  _startChannel(ctx, id, vol) {
    this._stopChannel(id);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.48, ctx.currentTime + 0.35);
    gain.connect(this.ambientMasterGain);

    if (id === 'binaural') {
      const merger = ctx.createChannelMerger(2);
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.type = 'sine';
      oscR.type = 'sine';
      oscL.frequency.value = 200;
      oscR.frequency.value = 240; // 40Hz Gamma Focus Beat
      const gL = ctx.createGain();
      const gR = ctx.createGain();
      gL.gain.value = 0.16;
      gR.gain.value = 0.16;
      oscL.connect(gL);
      oscR.connect(gR);
      gL.connect(merger, 0, 0);
      gR.connect(merger, 0, 1);
      merger.connect(gain);
      oscL.start();
      oscR.start();
      this._channelNodes[id] = { sources: [oscL, oscR], gain };
      return;
    }

    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (id === 'rain') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.042;
        b6 = white * 0.115926;
      }
    } else if (id === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 0.22;
      }
    } else {
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const drone =
          Math.sin(2 * Math.PI * 110 * t) * 0.07 +
          Math.sin(2 * Math.PI * 164.81 * t) * 0.05 +
          Math.sin(2 * Math.PI * 220 * t) * 0.035;
        const hiss = (Math.random() * 2 - 1) * 0.01;
        data[i] = drone + hiss;
      }
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = id === 'rain' ? 1450 : id === 'brown' ? 460 : 880;

    noise.connect(filter);
    filter.connect(gain);
    noise.start();
    this._channelNodes[id] = { sources: [noise], gain };
  }

  _stopChannel(id) {
    const entry = this._channelNodes[id];
    if (!entry) return;
    delete this._channelNodes[id];
    (entry.sources || []).forEach((s) => {
      try { s.stop(); } catch (_) {}
      try { s.disconnect(); } catch (_) {}
    });
    try { entry.gain?.disconnect(); } catch (_) {}
  }

  stopAllAmbient() {
    Object.keys(this._channelNodes).forEach((id) => this._stopChannel(id));
    Object.keys(this._channelVolumes).forEach((id) => {
      this._channelVolumes[id] = 0;
    });
    this.stopAmbient();
  }

  startAmbient(type = 'none', volume = this.volume) {
    this.volume = volume;
    if (type === 'none' || !type) {
      this.stopAllAmbient();
      return;
    }
    this.currentAmbient = type;
    this.setChannelVolume(type, volume);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentAmbient && this.currentAmbient !== 'none') {
      this.setChannelVolume(this.currentAmbient, this.volume);
    }
  }

  stopAmbient() {
    if (this.ambientNode) {
      try {
        this.ambientNode.stop();
        this.ambientNode.disconnect();
      } catch (_) {}
      this.ambientNode = null;
    }
    this.currentAmbient = 'none';
  }
}

export const studyAudio = new StudyAudioEngine();
