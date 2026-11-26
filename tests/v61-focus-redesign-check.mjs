#!/usr/bin/env node
/** Focus-room, clock and Midnight Prism palette contract checks for v61. */
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

console.log('v61 Focus redesign and Midnight Prism palette');

check('Focus and Zen use three realistic, state-matched room plates',
  ['focus-study-room-realistic.jpg', 'focus-break-room-realistic.jpg', 'focus-rest-bed-realistic.jpg'].every((name) => scene.includes(name) && existsSync(resolve(root, 'src/assets', name))) && /status === 'studying'/.test(scene) && /status === 'break'/.test(scene) && /resting/.test(scene));
check('the resting scene exposes an accessible sleeping-in-bed description', /বিছানায় কাত হয়ে শান্তিতে ঘুমাচ্ছে/.test(scene) && /aria-label=/.test(scene));
check('the scene stage is taller and crops the wide illustration in a 16:9 room frame', /aspect-ratio:\s*16 \/ 9/.test(css) && /min-height:\s*390px !important/.test(css) && /max-height:\s*570px !important/.test(css));
check('scene, clock controller, and live config summary share one rounded Focus section', /v4-focus-studio v61-focus-shell/.test(focus) && /v48-focus-stage/.test(focus) && /v54-focus-summary-card/.test(focus) && focus.indexOf('v54-focus-summary-card') < focus.indexOf('      </section>\n\n      {/* ILLUSTRATION FULLSCREEN'));
check('Focus clock keeps the analog/digital switch and enlarges the analog dial', /v35-clock-switch/.test(focus) && /mainClockStyle === 'digital'/.test(focus) && /size=\{250\}/.test(focus));
check('the primary Focus action uses palette gold and orange in idle, running, and break states', /\.v4-dock-primary\.is-running,[\s\S]*?\.v4-dock-primary\.is-break/.test(css) && /background:\s*linear-gradient\(180deg, #ffd369 0%, #ff9808 72%, #ff9808 100%\) !important/.test(css));
check('the recessed LCD uses a violet bezel, clear caption, and high-contrast neutral digits', /FOCUS · DIGITAL/.test(digital) && /v61-digital-value/.test(digital) && /border:\s*2px solid rgba\(122, 28, 172, 0\.82\)/.test(css) && /\.v61-digital-value\s*\{[\s\S]*?color:\s*#f3f5ff !important/.test(css));
check('raised progress rails use the palette navy, forest, blue, gold, and orange', /v48-wall-rail/.test(css) && /\.v61-clock-depth-line/.test(css) && /0 3px 0 #0b132b/.test(css) && /linear-gradient\(90deg, #255f38 0%, #ffd369 52%, #ff9808 100%\)/.test(css));
check('Zen has a working, accessible analog/digital toggle and larger analog dial', /zenClockStyle === 'analog'/.test(zen) && /zenClockStyle === 'digital'/.test(zen) && /aria-pressed=\{zenClockStyle/.test(zen) && /size=\{248\}/.test(zen));
check('Zen analog dial drops its outer shadow without losing its progress glow', /className="v61-zen-dial"/.test(zen) && /\.v61-zen-dial\s*\{\s*filter:\s*none !important/.test(css));
check('all eleven supplied colors are registered in the shared palette tokens', [
  '--palette-orange: #ff9808', '--palette-navy: #0b132b', '--palette-green: #255f38',
  '--palette-purple: #7a1cac', '--palette-blue: #03346e', '--palette-magenta: #a91079',
  '--palette-teal-deep: #092635', '--palette-teal: #12544f', '--palette-gold: #ffd369',
  '--palette-slate: #202940', '--palette-plum: #210f37',
].every((token) => css.includes(token)) && /name: 'Midnight Prism'/.test(theme) && /id: 'obsidian-amber'/.test(theme));
check('summary cards are legible, aligned, animated, and respect reduced motion', /font-size:\s*14px/.test(css) && /v61-summary-item-arrive/.test(css) && /prefers-reduced-motion:\s*reduce/.test(css) && /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/.test(css));
check('the final v61 palette stylesheet loads before App and after v60', /import '\.\/styles\/v60-redesign-polish\.css';[\s\S]*import '\.\/styles\/v61-focus-redesign\.css';[\s\S]*import App from '\.\/App';[\s\S]*installDesktopBridge\(\);/.test(main));

console.log(`\n${pass}/${pass + failures.length} checks passed`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  FAIL ${failure}`));
  process.exit(1);
}
