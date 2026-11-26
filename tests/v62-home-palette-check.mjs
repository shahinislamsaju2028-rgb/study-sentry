#!/usr/bin/env node
/** Home Navigation palette contract for the supplied Midnight Prism palette. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const css = read('src/styles/v61-focus-redesign.css');
const theme = read('src/utils/themes.ts');
const main = read('src/main.tsx');
const index = read('index.html');
const standalone = read('standalone.html');

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

console.log('v62 Home Navigation palette');

check('the Home foundation uses Midnight Prism navy, slate, and deep teal surfaces',
  /--bg-root:\s*#0b132b/.test(css) && /--bg-card:\s*#202940/.test(css) && /--bg-card-elevated:\s*#202940/.test(css) && /--bg-card-bottom:\s*#092635/.test(css) && !/--bg-root:\s*#080a0d/.test(css));
check('the palette tokens expose every supplied swatch used by Home',
  ['--home-canvas: #0b132b', '--home-surface: #202940', '--home-blue: #03346e', '--home-green: #255f38', '--home-violet: #7a1cac', '--home-magenta: #a91079', '--home-teal: #12544f', '--home-teal-deep: #092635', '--home-gold: #ffd369', '--home-orange: #ff9808', '--home-plum: #210f37'].every((token) => css.includes(token)));
check('the Home top app header uses the slate-to-blue-to-teal surface',
  /body:has\(\.v48-home\) \.topbar\.clean-topbar\.v12-spatial-topbar\s*\{[\s\S]*?linear-gradient\(105deg, rgba\(32, 41, 64, 0\.98\), rgba\(3, 52, 110, 0\.94\) 54%, rgba\(9, 38, 53, 0\.97\)\)/.test(css));
check('the Home hero layers gold, violet, teal and magenta over the supplied blue/slate/plum base',
  /\.v48-home \.v48-hero\s*\{[\s\S]*?rgba\(255, 152, 8, 0\.2\)[\s\S]*?rgba\(122, 28, 172, 0\.26\)[\s\S]*?rgba\(18, 84, 79, 0\.22\)[\s\S]*?rgba\(169, 16, 121, 0\.16\)[\s\S]*?#03346e 0%, #202940 48%, #210f37 100%/.test(css));
check('Home navigation cards use the palette surfaces and keep their distinct semantic tones',
  /\.v48-home \.bento-nav-grid \.bento-card\s*\{[\s\S]*?linear-gradient\(145deg, #202940 0%, #092635 58%, #0b132b 100%\)/.test(css) && ['tone-amber', 'tone-violet', 'tone-sky', 'tone-orange', 'tone-sprint-yb', 'tone-purple', 'tone-emerald'].every((tone) => css.includes(`.bento-card.${tone}`)));
check('the quick-control dock and hover states use teal, violet, slate, navy, and orange',
  /\.v48-home \.bento-quick-dock\s*\{[\s\S]*?linear-gradient\(145deg, #202940 0%, #0b132b 100%\)/.test(css) && /\.v48-home \.bento-quick-dock \.bento-sub-action:hover\s*\{[\s\S]*?rgba\(255, 152, 8, 0\.15\), rgba\(122, 28, 172, 0\.24\)/.test(css));
check('the visible theme label and stable saved-preference ID are updated', /name: 'Midnight Prism'/.test(theme) && /id: 'obsidian-amber'/.test(theme) && /DEFAULT_THEME_ID: DarkThemeId = 'obsidian-amber'/.test(theme));
check('both HTML entry documents begin with the matching navy window surface', /background:#0b132b;color:#f3f5ff/.test(index) && /background:#0b132b;color:#f3f5ff/.test(standalone));
check('the final shared palette stylesheet remains last in the CSS import cascade',
  /import '\.\/styles\/v60-redesign-polish\.css';[\s\S]*import '\.\/styles\/v61-focus-redesign\.css';[\s\S]*import App from '\.\/App';/.test(main));

console.log(`\n${pass}/${pass + failures.length} checks passed`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  FAIL ${failure}`));
  process.exit(1);
}
