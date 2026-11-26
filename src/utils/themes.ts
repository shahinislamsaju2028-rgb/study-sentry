export type DarkThemeId = 'obsidian-amber';

export interface DarkThemeOption {
  id: DarkThemeId;
  name: string;
  bnName: string;
  subtitle: string;
  badge?: string;
  isNew?: boolean;
  swatches: [string, string, string, string]; // [canvas, surface, primary, secondary]
}

/**
 * One complete full-atmosphere studio theme.
 *
 * The student asked for a single, unmistakable identity — Obsidian Gold —
 * so the palette is deliberately locked to it across the whole workspace.
 */
export const DARK_THEMES: DarkThemeOption[] = [
  {
    id: 'obsidian-amber',
    name: 'Obsidian Gold',
    bnName: 'কার্বন অবসিডিয়ান ও গোল্ড',
    subtitle: 'Deep Carbon · Champagne Gold',
    swatches: ['#090a0f', '#151822', '#f59e0b', '#fbbf24'],
  },
];

export const DEFAULT_THEME_ID: DarkThemeId = 'obsidian-amber';

/**
 * Obsidian Gold is the only theme — any legacy value resolves back to it so
 * an older saved preference can never resurrect a removed palette.
 */
export function resolveThemeId(raw?: string | null): DarkThemeId {
  return DEFAULT_THEME_ID;
}
