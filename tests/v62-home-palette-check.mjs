#!/usr/bin/env node
/** Home Navigation palette contract for the original Obsidian Gold theme. */
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

console.log('v62 Home Navigation — original Obsidian Gold theme');

check('Home surfaces use the original obsidian, carbon and slate values',
  /--bg-root:\s*#090a0e/.test(css) && /--bg-card:\s*#12141d/.test(css) && /--bg-card-elevated:\s*#171a26/.test(css) && /--bg-card-bottom:\s*#0d0f16/.test(css) && /--bg-card-hover:\s*#1f242f/.test(css) && /--home-canvas:\s*#090a0e/.test(css));
check('Home accents use only the original gold, amber, indigo, sky, emerald and rose values',
  ['--home-gold: #fbbf24', '--home-orange: #f59e0b', '--home-violet: #6366f1', '--home-blue: #38bdf8', '--home-green: #34d399', '--home-magenta: #fb7185'].every((token) => css.includes(token)));
check('the Home header retains dark carbon surfaces with restrained original accents',
  /body:has\(\.v48-home\) \.topbar\.clean-topbar\.v12-spatial-topbar\s*\{[\s\S]*?linear-gradient\(105deg, rgba\(23, 26, 38, 0\.98\), rgba\(31, 36, 47, 0\.96\) 54%, rgba\(13, 15, 22, 0\.97\)\)/.test(css));
check('the Home hero uses original gold, indigo, sky and rose glows over a dark Obsidian base',
  /\.v48-home \.v48-hero\s*\{[\s\S]*?rgba\(245, 158, 11, 0\.2\)[\s\S]*?rgba\(99, 102, 241, 0\.26\)[\s\S]*?rgba\(56, 189, 248, 0\.22\)[\s\S]*?rgba\(251, 113, 133, 0\.16\)[\s\S]*?#12141d 0%, #171a26 48%, #191d27 100%/.test(css));
check('Home navigation cards preserve semantic accents on original dark surfaces',
  /\.v48-home \.bento-nav-grid \.bento-card\s*\{[\s\S]*?linear-gradient\(145deg, #171a26 0%, #0d0f16 58%, #090a0e 100%\)/.test(css) && ['tone-amber', 'tone-violet', 'tone-sky', 'tone-orange', 'tone-sprint-yb', 'tone-purple', 'tone-emerald'].every((tone) => css.includes(`.bento-card.${tone}`)));
check('the quick-control dock and hover states use original indigo and amber accents',
  /\.v48-home \.bento-quick-dock\s*\{[\s\S]*?linear-gradient\(145deg, #171a26 0%, #090a0e 100%\)/.test(css) && /\.v48-home \.bento-quick-dock \.bento-sub-action:hover\s*\{[\s\S]*?rgba\(245, 158, 11, 0\.15\), rgba\(99, 102, 241, 0\.24\)/.test(css));
check('the original visible theme name and stable preference ID are restored', /name: 'Obsidian Gold'/.test(theme) && /id: 'obsidian-amber'/.test(theme) && /DEFAULT_THEME_ID: DarkThemeId = 'obsidian-amber'/.test(theme));
check('both HTML entry documents use the original app-window background and text',
  /background:#090a0e;color:#f8fafc/.test(index) && /background:#090a0e;color:#f8fafc/.test(standalone));
check('the original-color stylesheet is the final shared layer before App',
  /import '\.\/styles\/v60-redesign-polish\.css';[\s\S]*import '\.\/styles\/v61-focus-redesign\.css';[\s\S]*import App from '\.\/App';/.test(main));

console.log(`\n${pass}/${pass + failures.length} checks passed`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  FAIL ${failure}`));
  process.exit(1);
}
