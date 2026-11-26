#!/usr/bin/env node
/** App-wide Midnight Prism palette, cascade, window and semantic-color checks. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const css = read('src/styles/v61-focus-redesign.css');
const vibrant = read('src/styles/vibrant-dark-theme.css');
const lounge = read('src/styles/v30-lounge-tracker.css');
const main = read('src/main.tsx');
const appCss = read('src/styles/app.css');
const themes = read('src/utils/themes.ts');
const index = read('index.html');
const standalone = read('standalone.html');
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const subjectColors = read('src/utils/subjectColors.js');

const defaultBlock = vibrant.match(/:root,\s*html\[data-theme="obsidian-amber"\],\s*html\[data-theme="emerald"\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const legacyBlock = vibrant.match(/html\[data-theme="espresso-bronze"\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const palette = [
  '#FF9808', '#0B132B', '#255F38', '#7A1CAC', '#03346E', '#A91079',
  '#092635', '#12544F', '#FFD369', '#202940', '#210F37',
].map((color) => color.toLowerCase());

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

console.log('v63 App-wide Midnight Prism palette');

check('all supplied swatches are declared once as shared app palette tokens',
  palette.every((color) => css.toLowerCase().includes(color)) &&
  ['--palette-orange', '--palette-navy', '--palette-green', '--palette-purple', '--palette-blue', '--palette-magenta', '--palette-teal-deep', '--palette-teal', '--palette-gold', '--palette-slate', '--palette-plum'].every((token) => css.includes(token)));
check('the new visible theme name retains the stable saved-preference ID',
  /name: 'Midnight Prism'/.test(themes) && /id: 'obsidian-amber'/.test(themes) && /DEFAULT_THEME_ID: DarkThemeId = 'obsidian-amber'/.test(themes) && /return DEFAULT_THEME_ID;/.test(themes));
check('the root fallback and final theme layer share the supplied navy, slate, teal, gold and accents',
  ['--bg-root: #0b132b', '--bg-card: #202940', '--bg-card-bottom: #092635', '--accent-primary: #ffd369', '--accent-primary-bright: #ff9808', '--accent-secondary: #7a1cac', '--accent-secondary-bright: #a91079', '--accent-tertiary: #03346e'].every((token) => css.includes(token) && appCss.includes(token) || css.includes(token)) && /--bg-root:\s*#0b132b/.test(appCss) && /--bg-card:\s*#202940/.test(appCss));
const activeTokens = [
  '--bg-root: #0b132b', '--bg-card: #202940', '--bg-card-bottom: #092635',
  '--accent-primary: #ffd369', '--accent-primary-bright: #ff9808',
  '--accent-secondary: #7a1cac', '--accent-secondary-bright: #a91079',
  '--accent-tertiary: #03346e', '--emerald: #255f38',
];
check('the active obsidian-amber base selector uses the Midnight Prism palette',
  !!defaultBlock && activeTokens.every((token) => defaultBlock.includes(token)) && !/#(?:78350f|451a03|96601a|c98a22)\b/i.test(defaultBlock));
check('the legacy espresso-bronze selector remains available but now resolves to the new palette',
  !!legacyBlock && activeTokens.every((token) => legacyBlock.includes(token)) && /html\[data-theme="espresso-bronze"\]/.test(vibrant));
check('the v30 ambient and component tokens use the supplied active palette',
  /--v30-canvas: #0b132b/.test(lounge) && /--v30-surface: #202940/.test(lounge) && /--v30-accent: #ffd369/.test(lounge) && /--v30-accent-2: #7a1cac/.test(lounge) && /--v30-good: #255f38/.test(lounge));
const imports = [...main.matchAll(/import\s+['"](\.\/styles\/[^'"]+\.css)['"];?/g)].map((match) => match[1]);
const order = ['vibrant-dark-theme.css', 'v30-lounge-tracker.css', 'v45-redesign.css', 'v56-redesign.css', 'v57-redesign.css', 'v61-focus-redesign.css'].map((name) => imports.indexOf(`./styles/${name}`));
check('stylesheet cascade is explicit: theme base → v30 → v45 → v56 → v57 → final v61 palette',
  order.every((index) => index >= 0) && order.every((index, i) => i === 0 || order[i - 1] < index) && imports.at(-1) === './styles/v61-focus-redesign.css' && main.indexOf("import './styles/v61-focus-redesign.css';") < main.indexOf("import App from './App';"));
check('main and standalone HTML windows begin with the matching app navy',
  /background:#0b132b;color:#f3f5ff/.test(index) && /background:#0b132b;color:#f3f5ff/.test(standalone));
const mainWindow = tauri.app?.windows?.find((window) => window.label === 'main');
check('the native main window uses the same Midnight Prism background', mainWindow?.backgroundColor?.toLowerCase() === '#0b132b');
check('the subject-color atlas remains separate from theme accent substitutions',
  /Physics:\s*\{[\s\S]*?base:\s*'#48c8ff'/.test(subjectColors) && /Chemistry:\s*\{[\s\S]*?base:\s*'#b19aff'/.test(subjectColors) && /Math:\s*\{[\s\S]*?base:\s*'#ffbd48'/.test(subjectColors) && /Biology:\s*\{[\s\S]*?base:\s*'#d8c452'/.test(subjectColors));
const activeStyles = ['src/styles/vibrant-dark-theme.css', 'src/styles/v30-lounge-tracker.css', 'src/styles/v45-redesign.css', 'src/styles/v56-redesign.css', 'src/styles/v57-redesign.css', 'src/styles/v61-focus-redesign.css'].map(read).join('\n');
check('palette sweep leaves no invalid RGB channel values in the active cascade', !/rgba?\(\s*(?:25[6-9]|2[6-9]\d|[3-9]\d{2})\s*,/i.test(activeStyles));
check('old Midnight Tide foundations no longer leak into the final shared palette', !['#080a0d', '#111b29', '#16263a', '#254262', '#00abbf', '#77c5af', '#e5c095', '#e97c4b'].some((color) => css.toLowerCase().includes(color)));

console.log(`\n${pass}/${pass + failures.length} checks passed`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  FAIL ${failure}`));
  process.exit(1);
}
