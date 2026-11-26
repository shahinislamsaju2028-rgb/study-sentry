#!/usr/bin/env node
/** Focus-room, clock and original Obsidian Gold palette contract checks for v61. */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const focus = read('src/views/FocusSessionView.jsx');
const scene = read('src/components/FocusRoomScene.jsx');
const zen = read('src/components/Modals.jsx');
const digital = read('src/components/FocusDigitalReadout.jsx');
const css = read('src/styles/v61-focus-redesign.css');
const theme = read('src/utils/themes.ts');
const main = read('src/main.tsx');

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

console.log('v61 Focus redesign and original Obsidian Gold palette');

check('Focus and Zen use three realistic, state-matched room plates',
  ['focus-study-room-realistic.jpg', 'focus-break-room-realistic.jpg', 'focus-rest-bed-realistic.jpg'].every((name) => scene.includes(name) && existsSync(resolve(root, 'src/assets', name))) && /status === 'studying'/.test(scene) && /status === 'break'/.test(scene) && /resting/.test(scene));
check('the resting scene exposes an accessible sleeping-in-bed description', /বিছানায় কাত হয়ে শান্তিতে ঘুমাচ্ছে/.test(scene) && /aria-label=/.test(scene));
check('the scene stage is taller and crops the wide illustration in a 16:9 room frame', /aspect-ratio:\s*16 \/ 9/.test(css) && /min-height:\s*390px !important/.test(css) && /max-height:\s*570px !important/.test(css));
check('scene, clock controller, and live config summary share one rounded Focus section', /v4-focus-studio v61-focus-shell/.test(focus) && /v48-focus-stage/.test(focus) && /v54-focus-summary-card/.test(focus) && focus.indexOf('v54-focus-summary-card') < focus.indexOf('      </section>\n\n      {/* ILLUSTRATION FULLSCREEN'));
check('Focus clock keeps the analog/digital switch and enlarges the analog dial', /v35-clock-switch/.test(focus) && /mainClockStyle === 'digital'/.test(focus) && /size=\{250\}/.test(focus));
check('the primary Focus action uses the original champagne-gold-to-amber gradient in every state', /\.v4-dock-primary\.is-running,[\s\S]*?\.v4-dock-primary\.is-break/.test(css) && /background:\s*linear-gradient\(180deg, #fbbf24 0%, #f59e0b 72%, #f59e0b 100%\) !important/.test(css));
check('the recessed LCD uses original indigo trim and high-contrast neutral digits', /FOCUS · DIGITAL/.test(digital) && /v61-digital-value/.test(digital) && /border:\s*2px solid rgba\(99, 102, 241, 0\.82\)/.test(css) && /\.v61-digital-value\s*\{[\s\S]*?color:\s*#f8fafc !important/.test(css));
check('progress rails use the original obsidian, emerald and sky accents', /v48-wall-rail/.test(css) && /\.v61-clock-depth-line/.test(css) && /0 3px 0 #090a0e/.test(css) && /linear-gradient\(180deg, #34d399 0%, #34d399 46%, #38bdf8 100%\)/.test(css));
check('Zen has a working, accessible analog/digital toggle and larger analog dial', /zenClockStyle === 'analog'/.test(zen) && /zenClockStyle === 'digital'/.test(zen) && /aria-pressed=\{zenClockStyle/.test(zen) && /size=\{248\}/.test(zen));
check('Zen analog dial drops its outer shadow without losing its progress glow', /className="v61-zen-dial"/.test(zen) && /\.v61-zen-dial\s*\{\s*filter:\s*none !important/.test(css));
check('the Focus layer exposes only colors from the original Obsidian Gold theme', [
  '--palette-orange: #f59e0b', '--palette-navy: #090a0e', '--palette-green: #34d399',
  '--palette-purple: #6366f1', '--palette-blue: #38bdf8', '--palette-magenta: #fb7185',
  '--palette-teal-deep: #0b0d13', '--palette-teal: #38bdf8', '--palette-gold: #fbbf24',
  '--palette-slate: #14171f', '--palette-plum: #191d27', '--bg-card-hover: #1f242f',
].every((token) => css.includes(token)) && /name: 'Obsidian Gold'/.test(theme) && /id: 'obsidian-amber'/.test(theme));
check('summary cards are legible, aligned, animated, and respect reduced motion', /font-size:\s*14px/.test(css) && /v61-summary-item-arrive/.test(css) && /prefers-reduced-motion:\s*reduce/.test(css) && /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/.test(css));
check('the final v61 Focus stylesheet loads after v60 and before App', /import '\.\/styles\/v60-redesign-polish\.css';[\s\S]*import '\.\/styles\/v61-focus-redesign\.css';[\s\S]*import App from '\.\/App';[\s\S]*installDesktopBridge\(\);/.test(main));

console.log(`\n${pass}/${pass + failures.length} checks passed`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  FAIL ${failure}`));
  process.exit(1);
}
