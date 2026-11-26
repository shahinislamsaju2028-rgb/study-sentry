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
 * The stable ID preserves saved preferences while the visible theme uses the
 * supplied navy, slate, ocean, forest, violet, magenta, gold, orange, and plum palette.
 */
export const DARK_THEMES: DarkThemeOption[] = [
  {
    id: 'obsidian-amber',
    name: 'Midnight Prism',
    bnName: 'মিডনাইট প্রিজম · রঙিন রাত',
    subtitle: 'Navy · Forest · Teal · Violet · Magenta · Gold',
    swatches: ['#0b132b', '#202940', '#ffd369', '#7a1cac'],
  },
];

export const DEFAULT_THEME_ID: DarkThemeId = 'obsidian-amber';

/**
 * Midnight Prism is the single active theme. The stable ID keeps existing
 * saved preferences compatible while legacy values resolve safely.
 */
export function resolveThemeId(raw?: string | null): DarkThemeId {
  return DEFAULT_THEME_ID;
}
