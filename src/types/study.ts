export interface Subject {
  id: string;
  name: string;
  color: string;
  icon?: string;
  targetHoursPerWeek?: number;
}

export interface TimerSegment {
  start: string;
  end: string;
}

export interface ActiveTimer {
  id: string;
  kind?: 'deep_goal' | 'deep_goal_break' | string;
  goalId?: string;
  goalBaseSec?: number;
  status: 'running' | 'paused' | 'alarm' | 'half_wait';
  mode: 'pomodoro' | 'stopwatch';
  phase: 'focus' | 'break';
  subjectId: string;
  subjectName: string;
  taskId?: string;
  taskTitle?: string;
  focusMeta?: Record<string, unknown> | null;
  activityType?: string;
  durationSec: number;
  pauseRequests?: number;
  pausedByGuard?: boolean;
  workType?: string;
  accumulatedMs: number;
  lastResumedAt: number | null;
  alarmStartedAt?: number | null;
  startedAt: string;
  segments: TimerSegment[];
}

export interface StudySession {
  id: string;
  subjectId: string;
  subjectName: string;
  taskId?: string;
  taskTitle?: string;
  mode: string;
  workType?: string;
  goalId?: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  dateKey: string;
  notes?: string;
  segments?: TimerSegment[];
  focusMeta?: Record<string, unknown> | null;
  focusReport?: Record<string, unknown>;
}

export interface StudyState {
  schemaVersion: number;
  isDemo: boolean;
  uiLanguage?: 'en' | 'bn';
  profile: {
    name: string;
    motto: string;
    dailyGoalMin: number;
    xp: number;
    soundEnabled: boolean;
    uiSoundEnabled?: boolean;
    uiSoundVolume?: number;
    [key: string]: unknown;
  };
  timerPrefs: {
    mode: 'pomodoro' | 'stopwatch';
    focusMin: number;
    breakMin: number;
    longBreakMin?: number;
    selectedSubjectId: string;
    theme?: string;
    presetKey?: string;
    focusCategory?: string;
    [key: string]: unknown;
  };
  commitment: Record<string, unknown>;
  subjects: Subject[];
  sessions: StudySession[];
  todos: Array<Record<string, unknown>>;
  exams: Array<Record<string, unknown>>;
  syllabus: Array<Record<string, unknown>>;
  flashcards: Array<Record<string, unknown>>;
  studyNotes: Array<Record<string, unknown>>;
  routine: Array<Record<string, unknown>>;
  deepGoals: Array<Record<string, unknown>>;
  junkNotes: Array<Record<string, unknown>>;
  pipSettings: Record<string, unknown>;
  strictGuard: Record<string, unknown>;
  sprintData?: Record<string, unknown>;
  dailyTracker?: Record<string, unknown>;
  focusDraft?: Record<string, unknown>;
  halfExitDate?: string;
  activeTimer: ActiveTimer | null;
  [key: string]: unknown;
}

export interface SuspendPayload {
  sleptMs: number;
  nowMs: number;
}

export interface DhakaTickPayload {
  nowMs: number;
  dhakaDate: string;
  dhakaDay: string;
  dhakaTimeHm: string;
}

export interface DbLoadResult {
  ok: boolean;
  state: StudyState | null;
  dbPath?: string;
  migratedFromJson?: boolean;
  error?: string;
}

export interface DbSaveResult {
  ok: boolean;
  dbPath?: string;
  updatedCollections?: number;
  elapsedUs?: number;
  error?: string;
}

export interface ExportCsvResult {
  ok: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

export interface RunningAppInfo {
  exeName: string;
  exePath: string;
  windowTitle: string;
}

export interface PickExeResult {
  ok: boolean;
  canceled?: boolean;
  exeName?: string;
  exePath?: string;
  error?: string;
}

export interface GuardViolationPayload {
  active: boolean;
  appName: string;
  exePath: string;
  windowTitle: string;
  secondsLeft: number;
  closed: boolean;
  kind?: 'app' | 'domain' | string;
}

export interface GuardFocusStatePayload {
  shouldPause: boolean;
  reason: string;
  target: string;
}

export interface PipStatePayload {
  theme: string;
  timerStatus: string;
  mode: string;
  phase: string;
  displayTime: string;
  isAlarm: boolean;
  subjectName: string;
  subjectColor?: string;
  progressPct?: number;
  taskSummary?: string;
  phaseLabel?: string;
  idleMinutes: number;
  layout: string;
  clockStyle?: string;
  completedGoalDots?: number;
  classGoalDots?: number;
  pauseRequestActive?: boolean;
  locked: boolean;
  subjects: Array<{ id: string; name: string; color?: string }>;
}

export interface DesktopBridge {
  isDesktop: boolean;
  isTauri: boolean;
  isElectron: boolean;
  engine: 'tauri-rust-sqlite' | 'browser-preview';
  platform: string;

  // Database & File Operations (Rust + SQLite WAL)
  loadState: () => Promise<DbLoadResult>;
  saveState: (state: StudyState) => Promise<DbSaveResult>;
  openDataFolder: () => Promise<{ ok: boolean }>;
  exportCsvDialog: (csvString: string) => Promise<ExportCsvResult>;
  writeLocalBackup: (state: StudyState, kind: string) => Promise<string>;
  exportJsonDialog: (jsonString: string, defaultName?: string) => Promise<ExportCsvResult>;

  // Native Windows 11 Notifications
  notifyRoutine: (body: string, title?: string) => Promise<boolean>;

  // Native Windows Software Guard (3-Second Auto-Close + Brave Domain Guard + Auto Pause/Resume)
  guardSyncConfig: (cfg: {
    timerActive: boolean;
    enabled: boolean;
    allowedApps: string[];
    allowArenaAgent?: boolean;
    guardPaused?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  guardPickExe: () => Promise<PickExeResult>;
  guardListRunningApps: () => Promise<RunningAppInfo[]>;
  onGuardViolation: (cb: (payload: GuardViolationPayload) => void) => () => void;
  onGuardFocusState: (cb: (payload: GuardFocusStatePayload) => void) => () => void;

  // Independent Always-On-Top Floating Picture-in-Picture (PiP) OS Window
  pipSetOpen: (enable: boolean, layout?: string) => Promise<boolean>;
  pipOpenMenu: (
    width?: number,
    height?: number,
    cursorX?: number,
    cursorY?: number
  ) => Promise<boolean>;
  pipResizeMenu: (width: number, height: number) => Promise<'left' | 'right'>;
  pipCloseMenu: () => Promise<boolean>;
  pipQuitApp: () => Promise<void>;
  pipBroadcastState: (payload: PipStatePayload) => Promise<void>;
  pipGetCachedState: ( ) => Promise<PipStatePayload | null>;
  pipSendAction: (action: Record<string, unknown>) => Promise<void>;
  onPipState: (cb: (payload: PipStatePayload) => void) => () => void;
  onPipAction: (cb: (action: Record<string, unknown>) => void) => () => void;
  onPipMenuReset: (cb: () => void) => () => void;
  onPipMenuLayout: (cb: (payload: { flyoutSide: 'left' | 'right' }) => void) => () => void;

  // Native Window & Taskbar Controls
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  restoreMainWindow: () => Promise<void>;
  setAlwaysOnTop: (flag: boolean) => Promise<boolean>;
  setMiniMode: (enable: boolean) => Promise<boolean>;
  setFullScreen: (enable: boolean) => Promise<boolean>;
  setTaskbarProgress: (progress: number) => Promise<void>;

  // System Tray & Rust Background Heartbeat Subscriptions
  setAudioWarningLock: (active: boolean) => Promise<void>;
  onExternalFocusLost: (cb: () => void) => () => void;
  onTrayRequestQuit: (cb: () => void) => () => void;
  quitReady: () => Promise<void>;
  onTrayToggleTimer: (cb: () => void) => () => void;
  onTrayTogglePip: (cb: () => void) => () => void;
  onTrayToggleMini: (cb: () => void) => () => void;
  onRustTimerTick: (cb: (tick: DhakaTickPayload) => void) => () => void;
  /** Fires when the OS puts the machine to sleep / wakes it up. */
  onSystemSuspend: (cb: (payload: SuspendPayload) => void) => () => void;
}

declare global {
  interface Window {
    desktopAPI?: DesktopBridge;
    electronAPI?: DesktopBridge;
    __STUDYSENTRY_STANDALONE_PREVIEW__?: boolean;
    __TAURI_INTERNALS__?: unknown;
  }
}
