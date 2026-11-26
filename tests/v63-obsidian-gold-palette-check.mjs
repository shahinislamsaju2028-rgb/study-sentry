#!/usr/bin/env node
/** Verify the original Obsidian Gold theme survives the v61 feature refresh. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const appCss = read('src/styles/app.css');
const vibrant = read('src/styles/vibrant-dark-theme.css');
const lounge = read('src/styles/v30-lounge-tracker.css');
const focusCss = read('src/styles/v61-focus-redesign.css');
const selectorCss = read('src/styles/v60-redesign-polish.css');
const chapterPicker = read('src/components/ChapterPicker.jsx');
const main = read('src/main.tsx');
const themes = read('src/utils/themes.ts');
const index = read('index.html');
const standalone = read('standalone.html');
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const subjectColors = read('src/utils/subjectColors.js');

const activeBlock = vibrant.match(/:root,\s*html\[data-theme="obsidian-amber"\],\s*html\[data-theme="emerald"\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const defaultV30 = lounge.match(/:root,\s*html\[data-theme='obsidian-amber'\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const selectorLayer = selectorCss.slice(selectorCss.indexOf('v61 · shared selector language'));
const rejectedSwatches = [
  '#ff9808', '#0b132b', '#255f38', '#7a1cac', '#03346e', '#a91079',
  '#092635', '#12544f', '#ffd369', '#202940', '#210f37',
];

let pass = 0;
const failures = [];
function check(name, condition) {
  if (condition) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}`);
  }
}

console.log('v63 Original Obsidian Gold palette and latest-feature checks');

check('the pre-refresh theme label, swatches and stable saved-preference ID are restored',
  /name: 'Obsidian Gold'/.test(themes) && /id: 'obsidian-amber'/.test(themes) &&
  /swatches: \['#090a0f', '#151822', '#f59e0b', '#fbbf24'\]/.test(themes) &&
  /DEFAULT_THEME_ID: DarkThemeId = 'obsidian-amber'/.test(themes));
check('the active original theme uses carbon surfaces, champagne amber, indigo and sky blue',
  !!activeBlock && [
    '--bg-root: #090a0e', '--bg-card: #12141d', '--bg-card-elevated: #171a26',
    '--accent-primary: #f59e0b', '--accent-primary-bright: #fbbf24',
    '--accent-secondary: #6366f1', '--accent-secondary-bright: #818cf8',
    '--accent-tertiary: #38bdf8', '--danger: #fb7185',
  ].every((token) => activeBlock.includes(token)));
check('the original v30 component layer is restored without losing its active theme selector',
  !!defaultV30 && /--v30-canvas: #090a0f/.test(defaultV30) && /--v30-surface: #14171f/.test(defaultV30) && /--v30-accent: #f59e0b/.test(defaultV30) && /--v30-accent-2: #818cf8/.test(defaultV30));
check('first-paint fallbacks retain the source project’s original carbon and amber tokens',
  /--bg-root:\s*#080a12/.test(appCss) && /--amber:\s*#f59e0b/.test(appCss) && /--violet:\s*#a78bfa/.test(appCss));
check('the final Focus/Home layer is aligned to the old palette, not the rejected Midnight Prism swatches',
  /--bg-root:\s*#090a0e/.test(focusCss) && /--bg-card-hover:\s*#1f242f/.test(focusCss) &&
  /--accent-primary:\s*#f59e0b/.test(focusCss) &&
  rejectedSwatches.every((swatch) => !focusCss.toLowerCase().includes(swatch)));
check('latest chapter-selector features use the original gold and indigo accents',
  /CHAPTER_ACCENTS\s*=\s*\{\s*first:\s*'#fbbf24',\s*second:\s*'#818cf8'\s*\}/.test(chapterPicker) &&
  /--v61-chapter-cyan:\s*#fbbf24/.test(selectorLayer) && /--v61-chapter-lilac:\s*#818cf8/.test(selectorLayer));
check('legacy alternative-theme selectors remain intact from the original source',
  /html\[data-theme="espresso-bronze"\]/.test(vibrant) && /html\[data-theme="aurora-emerald"\]/.test(vibrant) && /html\[data-theme="sapphire"\]/.test(vibrant));
check('both HTML entry documents and the native main window use the original carbon background',
  /background:#090a0e;color:#f8fafc/.test(index) && /background:#090a0e;color:#f8fafc/.test(standalone) &&
  tauri.app?.windows?.find((window) => window.label === 'main')?.backgroundColor?.toLowerCase() === '#090a0e');
const imports = [...main.matchAll(/import\s+['"](\.\/styles\/[^'"]+\.css)['"];?/g)].map((match) => match[1]);
const order = ['vibrant-dark-theme.css', 'v30-lounge-tracker.css', 'v45-redesign.css', 'v56-redesign.css', 'v57-redesign.css', 'v61-focus-redesign.css'].map((name) => imports.indexOf(`./styles/${name}`));
check('stylesheet order retains the original base theme and applies v61 features last',
  order.every((index) => index >= 0) && order.every((index, i) => i === 0 || order[i - 1] < index) &&
  imports.at(-1) === './styles/v61-focus-redesign.css' && main.indexOf("import './styles/v61-focus-redesign.css';") < main.indexOf("import App from './App';"));
check('original subject colors remain semantic and separate from the app theme',
  /Physics:\s*\{[\s\S]*?base:\s*'#48c8ff'/.test(subjectColors) && /Chemistry:\s*\{[\s\S]*?base:\s*'#b19aff'/.test(subjectColors) && /Math:\s*\{[\s\S]*?base:\s*'#ffbd48'/.test(subjectColors) && /Biology:\s*\{[\s\S]*?base:\s*'#d8c452'/.test(subjectColors));
check('latest styles contain no invalid RGB channels in the active original theme layer',
  !/rgba?\(\s*(?:25[6-9]|2[6-9]\d|[3-9]\d{2})\s*,/i.test(activeBlock + defaultV30 + focusCss + selectorLayer));

console.log(`\n${pass}/${pass + failures.length} checks passed`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  FAIL ${failure}`));
  process.exit(1);
}
