import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type {
  DbLoadResult,
  DbSaveResult,
  DesktopBridge,
  DhakaTickPayload,
  ExportCsvResult,
  GuardFocusStatePayload,
  GuardViolationPayload,
  PickExeResult,
  PipStatePayload,
  RunningAppInfo,
  StudyState,
  SuspendPayload,
} from '../types/study';

export function isTauriRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.__TAURI_INTERNALS__ || ('__TAURI__' in window))
  );
}

function subscribeTauriEvent<T>(
  eventName: string,
  callback: (payload: T) => void
): () => void {
  if (!isTauriRuntime()) {
    return () => {};
  }
  let unlisten: UnlistenFn | null = null;
  let disposed = false;

  listen<T>(eventName, (event) => {
    if (!disposed) {
      callback(event.payload);
    }
  })
    .then((fn) => {
      if (disposed) {
        fn();
      } else {
        unlisten = fn;
      }
    })
    .catch(() => {});

  return () => {
    disposed = true;
    if (unlisten) {
      unlisten();
      unlisten = null;
    }
  };
}

function createDesktopBridge(): DesktopBridge {
  const inTauri = isTauriRuntime();

  return {
    get isDesktop() {
      return inTauri || isTauriRuntime();
    },
    get isTauri() {
      return inTauri || isTauriRuntime();
    },
    get isElectron() {
      return inTauri || isTauriRuntime();
    },
    get engine() {
      return inTauri || isTauriRuntime() ? 'tauri-rust-sqlite' : 'browser-preview';
    },
    get platform() {
      return inTauri || isTauriRuntime() ? 'win32' : 'web';
    },

    async loadState(): Promise<DbLoadResult> {
      if (!isTauriRuntime()) {
        return { ok: false, state: null, error: 'Not running inside Tauri runtime' };
      }
      let lastError = 'Unknown SQLite startup error';
      const delays = [90, 180, 320, 500];
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          const res = await invoke<DbLoadResult>('db_load_state');
          if (res && res.ok) {
            return res;
          }
          lastError = res?.error || 'db_load_state returned ok=false';
        } catch (err) {
          lastError = String(err);
        }
        if (attempt < delays.length) {
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      }
      return { ok: false, state: null, error: lastError };
    },

    async saveState(state: StudyState): Promise<DbSaveResult> {
      if (!isTauriRuntime()) {
        return { ok: false, error: 'Not running inside Tauri runtime' };
      }
      try {
        return await invoke<DbSaveResult>('db_save_state', { state });
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },

    async writeLocalBackup(state: StudyState, kind: string): Promise<string> {
      if (!isTauriRuntime()) throw new Error('Desktop backup unavailable');
      return await invoke<string>('write_local_backup', { state, kind });
    },

    async openDataFolder(): Promise<{ ok: boolean }> {
      if (!inTauri) return { ok: false };
      try {
        return await invoke<{ ok: boolean }>('open_data_folder');
      } catch {
        return { ok: false };
      }
    },

    async exportCsvDialog(csvString: string): Promise<ExportCsvResult> {
      if (!inTauri) return { ok: false };
      try {
        return await invoke<ExportCsvResult>('export_csv_dialog', {
          csvContent: csvString,
        });
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },

    async exportJsonDialog(jsonString: string, defaultName?: string): Promise<ExportCsvResult> {
      if (!inTauri) return { ok: false };
      try {
        return await invoke<ExportCsvResult>('export_json_dialog', {
          jsonContent: jsonString,
          defaultName: defaultName || null,
        });
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },

    async notifyRoutine(body: string, title?: string): Promise<boolean> {
      const cleanBody = String(body || '').slice(0, 500);
      if (!cleanBody) return false;
      const cleanTitle = String(title || 'Study Sentry · রিমাইন্ডার').slice(0, 120);

      if (inTauri) {
        try {
          const ok = await invoke<boolean>('notify_routine', {
            body: cleanBody,
            title: cleanTitle,
          });
          if (ok) return true;
        } catch {
          // Fallback to JS notification plugin
        }
        try {
          let granted = await isPermissionGranted();
          if (!granted) {
            const permission = await requestPermission();
            granted = permission === 'granted';
          }
          if (granted) {
            sendNotification({
              title: cleanTitle,
              body: cleanBody,
            });
            return true;
          }
        } catch {
          return false;
        }
      } else if (typeof Notification !== 'undefined') {
        try {
          if (Notification.permission === 'granted') {
            new Notification(cleanTitle, { body: cleanBody });
            return true;
          }
        } catch {
          return false;
        }
      }
      return false;
    },

    async guardSyncConfig(cfg): Promise<{ ok: boolean; error?: string }> {
      if (!inTauri) return { ok: true };
      try {
        return await invoke<{ ok: boolean; error?: string }>('guard_sync_config', {
          timerActive: Boolean(cfg.timerActive),
          enabled: Boolean(cfg.enabled),
          allowedApps: Array.isArray(cfg.allowedApps) ? cfg.allowedApps : [],
          allowArenaAgent: Boolean(cfg.allowArenaAgent),
          guardPaused: Boolean(cfg.guardPaused),
        });
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },

    async guardPickExe(): Promise<PickExeResult> {
      return {
        ok: false,
        canceled: true,
        error: 'ফোকাস গার্ডে শুধুমাত্র নির্ধারিত স্টাডি সফটওয়্যার অনুমোদিত।',
      };
    },

    async guardListRunningApps(): Promise<RunningAppInfo[]> {
      return [];
    },

    onGuardViolation(cb: (payload: GuardViolationPayload) => void): () => void {
      return subscribeTauriEvent<GuardViolationPayload>('guard://violation', cb);
    },

    onGuardFocusState(cb: (payload: GuardFocusStatePayload) => void): () => void {
      return subscribeTauriEvent<GuardFocusStatePayload>('guard://focus-state', cb);
    },

    async pipSetOpen(enable: boolean, layout?: string): Promise<boolean> {
      if (!inTauri) return Boolean(enable);
      try {
        return await invoke<boolean>('pip_set_open', {
          enable: Boolean(enable),
          layout: layout || null,
        });
      } catch {
        return false;
      }
    },

    async pipOpenMenu(
      width?: number,
      height?: number,
      cursorX?: number,
      cursorY?: number
    ): Promise<boolean> {
      if (!inTauri) return false;
      try {
        return await invoke<boolean>('pip_open_menu', {
          width: typeof width === 'number' ? width : null,
          height: typeof height === 'number' ? height : null,
          cursorX: typeof cursorX === 'number' ? Math.round(cursorX) : null,
          cursorY: typeof cursorY === 'number' ? Math.round(cursorY) : null,
        });
      } catch {
        return false;
      }
    },

    async pipResizeMenu(width: number, height: number): Promise<'left' | 'right'> {
      if (!inTauri) return 'right';
      try {
        const side = await invoke<string>('pip_resize_menu', { width, height });
        return side === 'left' ? 'left' : 'right';
      } catch {
        return 'right';
      }
    },

    async pipCloseMenu(): Promise<boolean> {
      if (!inTauri) return false;
      try {
        return await invoke<boolean>('pip_close_menu');
      } catch {
        return false;
      }
    },

    async pipQuitApp(): Promise<void> {
      if (!inTauri) return;
      await invoke('pip_quit_app').catch(() => {});
    },

    async pipBroadcastState(payload: PipStatePayload): Promise<void> {
      if (!inTauri) return;
      await invoke('pip_broadcast_state', { payload }).catch(() => {});
    },

    async pipGetCachedState(): Promise<PipStatePayload | null> {
      if (!inTauri) return null;
      try {
        return await invoke<PipStatePayload | null>('pip_get_cached_state');
      } catch {
        return null;
      }
    },

    async pipSendAction(action: Record<string, unknown>): Promise<void> {
      if (!inTauri) return;
      await invoke('pip_send_action', { action }).catch(() => {});
    },

    onPipState(cb: (payload: PipStatePayload) => void): () => void {
      return subscribeTauriEvent<PipStatePayload>('pip://state', cb);
    },

    onPipAction(cb: (action: Record<string, unknown>) => void): () => void {
      return subscribeTauriEvent<Record<string, unknown>>('pip://action', cb);
    },

    onPipMenuReset(cb: () => void): () => void {
      return subscribeTauriEvent<void>('pip://menu-reset', () => cb());
    },

    onPipMenuLayout(cb: (payload: { flyoutSide: 'left' | 'right' }) => void): () => void {
      return subscribeTauriEvent<{ flyoutSide: 'left' | 'right' }>('pip://menu-layout', cb);
    },

    async minimize(): Promise<void> {
      if (!inTauri) return;
      await invoke('window_minimize').catch(() => {});
    },

    async maximize(): Promise<void> {
      if (!inTauri) return;
      await invoke('window_toggle_maximize').catch(() => {});
    },

    async close(): Promise<void> {
      if (!inTauri) return;
      await invoke('window_close').catch(() => {});
    },

    async restoreMainWindow(): Promise<void> {
      if (!inTauri) return;
      await invoke('window_restore_main').catch(() => {});
    },

    async setAlwaysOnTop(flag: boolean): Promise<boolean> {
      if (!inTauri) return false;
      try {
        return await invoke<boolean>('window_set_always_on_top', { enable: Boolean(flag) });
      } catch {
        return false;
      }
    },

    async setMiniMode(enable: boolean): Promise<boolean> {
      if (!inTauri) return Boolean(enable);
      try {
        return await invoke<boolean>('window_set_mini_mode', { enable: Boolean(enable) });
      } catch {
        return Boolean(enable);
      }
    },

    async setFullScreen(enable: boolean): Promise<boolean> {
      if (!inTauri) return false;
      try {
        return await invoke<boolean>('window_set_fullscreen', { enable: Boolean(enable) });
      } catch {
        return false;
      }
    },

    async setTaskbarProgress(progress: number): Promise<void> {
      if (!inTauri) return;
      await invoke('window_set_taskbar_progress', {
        progress: typeof progress === 'number' ? progress : -1,
      }).catch(() => {});
    },

    async setAudioWarningLock(active: boolean): Promise<void> {
      if (!isTauriRuntime()) return;
      await invoke('audio_set_warning_lock', { active: Boolean(active) }).catch(() => {});
    },

    onExternalFocusLost(cb: () => void): () => void {
      return subscribeTauriEvent('pause://external-focus-lost', () => cb());
    },

    onTrayRequestQuit(cb: () => void): () => void {
      return subscribeTauriEvent('tray://request-quit', () => cb());
    },

    async quitReady(): Promise<void> {
      if (!inTauri) return;
      await invoke('app_quit_ready').catch(() => {});
    },

    onTrayToggleTimer(cb: () => void): () => void {
      return subscribeTauriEvent('tray://toggle-timer', () => cb());
    },

    onTrayTogglePip(cb: () => void): () => void {
      return subscribeTauriEvent('tray://toggle-pip', () => cb());
    },

    onTrayToggleMini(cb: () => void): () => void {
      return subscribeTauriEvent('tray://toggle-mini', () => cb());
    },

    onRustTimerTick(cb: (tick: DhakaTickPayload) => void): () => void {
      return subscribeTauriEvent<DhakaTickPayload>('timer://tick', cb);
    },

    onSystemSuspend(cb: (payload: SuspendPayload) => void): () => void {
      return subscribeTauriEvent<SuspendPayload>('timer://suspended', cb);
    },
  };
}

export const desktopBridge: DesktopBridge = createDesktopBridge();

export function installDesktopBridge(): DesktopBridge {
  if (typeof window !== 'undefined') {
    window.desktopAPI = desktopBridge;
    if (desktopBridge.isTauri) {
      window.electronAPI = desktopBridge;
      document.documentElement.classList.add('is-tauri-desktop');
    } else {
      document.documentElement.classList.add('is-browser-preview');
    }
  }
  return desktopBridge;
}
