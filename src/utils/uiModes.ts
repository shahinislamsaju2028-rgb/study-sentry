/**
 * Study Sentry — Interface Mode
 *
 * The app used to feel like two different products glued together:
 *   · Focus / Task / Insights  → dense, technical "instrument panel"
 *   · Overview / Tracker / Suite / Lounge → warm, spacious "campus"
 *
 * `UI_MODES` lets the user pick which finish the whole app should wear.
 * The *layout density* split between the two families is always preserved
 * (see `v32-ui-modes.css`), so the two groups never look identical.
 */

export type UiModeId = 'campus' | 'studio';

export interface UiModeOption {
  id: UiModeId;
  name: string;
  bnName: string;
  desc: string;
  /** Which navigation family this finish is modelled on. */
  modelledOn: string;
  swatches: [string, string, string];
}

export const UI_MODES: UiModeOption[] = [
  {
    id: 'campus',
    name: 'Campus',
    bnName: 'ক্যাম্পাস — স্টুডি লাউঞ্জের মতো',
    desc: 'নরম কার্ড, মসৃণ আলো, বেশি শ্বাসকষ্ট। ওভারভিউ · ট্র্যাকার · সুইট · লাউঞ্জ।',
    modelledOn: 'Study Lounge',
    swatches: ['#090a0f', '#151822', '#ff9808'],
  },
  {
    id: 'studio',
    name: 'Studio',
    bnName: 'স্টুডিও — টাস্ক ও ইনসাইটসের মতো',
    desc: 'ঘন ডেটা, স্পষ্ট গ্রিড, কম আলো। ফোকাস · টাস্ক · ইনসাইটস।',
    modelledOn: 'Task Board & Insights',
    swatches: ['#070a10', '#101725', '#38bdf8'],
  },
];

export const DEFAULT_UI_MODE: UiModeId = 'campus';

export function resolveUiMode(raw?: string | null): UiModeId {
  return raw === 'studio' ? 'studio' : DEFAULT_UI_MODE;
}
