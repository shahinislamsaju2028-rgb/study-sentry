#!/usr/bin/env node
/**
 * v52 hierarchy-layer contract test.
 *
 * The polish pass is CSS-only, so the things worth guarding are the *intent*
 * of each rule — not colours, which shift with the theme. Four contracts:
 *
 *   1. the hero grows (padding ≥ 24px, gap ≥ 24px) rather than tightening
 *   2. the bento rhythm stays on the wider step (grid gap ≥ 16, card padding ≥ 20)
 *   3. the type ladder stays ordered: title > subtitle, metric > title
 *   4. the dock declares a heavier blur than the base layer shipped
 *
 * Plus a structural guard: the newest Focus polish layer must be imported LAST,
 * after every other stylesheet, so its overrides remain effective.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const css = readFileSync(resolve(root, 'src/styles/v52-hierarchy.css'), 'utf8');
const plannerCss = readFileSync(resolve(root, 'src/styles/v58-sprint-planner.css'), 'utf8');
const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8');

let pass = 0;
const fails = [];
function check(name, ok, detail) {
  if (ok) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fails.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* rough numeric extractor: the value of `prop: Npx` inside a selector block */
function valueIn(selector, prop) {
  const start = css.indexOf(selector);
  if (start === -1) return null;
  const block = css.slice(start, css.indexOf('}', start));
  const m = block.match(new RegExp(`${prop}\\s*:\\s*([\\d.]+)px`));
  return m ? Number(m[1]) : null;
}

console.log('v52 hierarchy layer');

/* ── 1. hero breathing ──────────────────────────────────────────────────── */
const heroPad = valueIn('.v48-home .v48-hero,', 'padding');
const heroGap = valueIn('.v48-home .v48-hero,', 'gap');
check('hero padding ≥ 24px', (heroPad ?? 0) >= 24, `got ${heroPad}`);
check('hero gap ≥ 24px', (heroGap ?? 0) >= 24, `got ${heroGap}`);

/* ── 2. card rhythm ─────────────────────────────────────────────────────── */
const gridGap = valueIn('.bento-nav-grid.v12-bento-3d-grid', 'gap');
const cardPad = valueIn('.bento-nav-grid .bento-card', 'padding');
check('grid gap ≥ 16px', (gridGap ?? 0) >= 16, `got ${gridGap}`);
check('card padding ≥ 20px', (cardPad ?? 0) >= 20, `got ${cardPad}`);

/* ── 3. type ladder order ───────────────────────────────────────────────── */
const title = valueIn('.bento-card .bento-title-group h3', 'font-size');
const sub = valueIn('.bento-card .bento-title-group small', 'font-size');
const metric = valueIn('.bento-card .bento-big-stat strong', 'font-size');
const heroH2 = valueIn('.v48-home .v48-hero .bento-hero-copy h2', 'font-size');
check('subtitle smaller than title', (sub ?? 99) < (title ?? 0), `${sub} vs ${title}`);
check('metric larger than title', (metric ?? 0) > (title ?? 0), `${metric} vs ${title}`);
check('hero headline ≥ 22px', (heroH2 ?? 0) >= 22, `got ${heroH2}`);
check('metric uses tabular figures', /\.bento-big-stat strong\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s.test(css));

/* ── 4. dock blur weight ────────────────────────────────────────────────── */
/* The rule may carry a second selector (it does, to out-weigh the v5 layer),
   so locate the block by the selector text and read the blur from the block. */
const dockBlockStart = css.indexOf('.nav-dock.v6-complete-fade-dock .bottom-navigation.liquid-glass-dock');
const dockBlock =
  dockBlockStart === -1 ? '' : css.slice(dockBlockStart, css.indexOf('}', dockBlockStart));
const blur = dockBlock.match(/backdrop-filter:\s*blur\((\d+)px\)/);
check('dock blur ≥ 30px', blur ? Number(blur[1]) >= 30 : false, blur ? `${blur[1]}px` : 'not found');
check(
  'dock rule out-weighs the v5 layer',
  dockBlockStart !== -1,
  'needs the .v6-complete-fade-dock variant of the selector'
);

/* ── 5. popover states are distinct ─────────────────────────────────────── */
check('popover hover rule present', /\.cs-menu \.cs-option:hover/.test(css));
check('popover selected fill is a gradient', /\.cs-option\.selected\s*\{[^}]*linear-gradient/s.test(css));
check('calendar month row is a flex trigger', /\.cp-popover \.cp-month-nav \.cs-trigger\s*\{[^}]*display:\s*flex/s.test(css));

/* ── 5b. the dock is a gradient pane, not a solid slab ──────────────────── */
const dockGradStart = css.indexOf('.nav-dock.v6-complete-fade-dock .bottom-navigation.liquid-glass-dock');
const dockGradBlock = dockGradStart === -1 ? '' : css.slice(dockGradStart, css.indexOf('}', dockGradStart));
const radialCount = (dockGradBlock.match(/radial-gradient\(/g) || []).length;
check('dock paint is a multi-stop gradient', radialCount >= 2, `${radialCount} radial washes`);
check(
  'dock base alpha stays sheer (< 0.5)',
  /background-color:\s*rgba\([^)]*0\.[0-4]\d*\)/.test(dockGradBlock),
  'a dense fill would hide the blur'
);
const plannerDockStart = plannerCss.indexOf('.nav-dock .bottom-navigation.liquid-glass-dock,');
const plannerDockBlock = plannerDockStart === -1 ? '' : plannerCss.slice(plannerDockStart, plannerCss.indexOf('}', plannerDockStart));
check(
  'v58 dock override removes the multicolour background image',
  /background-image:\s*none\s*!important/.test(plannerDockBlock),
  'the planner layer must keep the glass dock clear of colour washes'
);

/* ── 5c. the ui-mode flat surface no longer covers the glass ────────────── */
check(
  'ui-mode override keeps the dock translucent',
  /body\[data-ui-mode\][^{]*\.nav-dock[^{]*liquid-glass-dock\s*\{[^}]*background-color/s.test(css)
);

/* ── 5d. route + card entrance are CSS, not JS-driven layout ────────────── */
check('route swap is a CSS keyframe', /@keyframes v52-route-in/.test(css));
check('card entrance is a CSS keyframe', /@keyframes v52-card-in/.test(css));
check(
  'route stage no longer forces a 3D layer',
  /html\[data-spatial-motion='ultra'\] \.v12-view-stage\.v37-route-motion\s*\{[^}]*transform-style:\s*flat/s.test(css)
);

/* ── 6. callout reserves space instead of overlaying ────────────────────── */
check(
  'mentor callout reserves content padding',
  /body:has\(\.v4-ai-mentor-banner\) \.view-container\s*\{[^}]*padding-top/s.test(css)
);

/* ── 6b. the click-path fixes live in source, so guard them too ─────────── */
const appSrc = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const tiltSrc = readFileSync(resolve(root, 'src/components/SpatialMotionEngine.tsx'), 'utf8');
const viteSrc = readFileSync(resolve(root, 'vite.config.ts'), 'utf8');

/* strip comments before asserting — the source *documents* the removal, and
   that prose would otherwise trip the check */
const appCode = appSrc
  .replace(/\{[\s\S]*?\/\*[\s\S]*?\*\/[\s\S]*?\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

check(
  'route swap does not use popLayout',
  !/AnimatePresence/.test(appCode) && !/popLayout/.test(appCode),
  'popLayout measures the outgoing subtree before the new view paints'
);
check('route stage is keyed on the view', /key=\{view\}/.test(appSrc));
check(
  'tilt card no longer animates in via Motion',
  !/initial=\{\{\s*opacity:\s*0,\s*y:\s*5/.test(tiltSrc),
  'eight Motion graphs per home mount'
);
check('tilt card carries the CSS entrance class', /v52-card-in/.test(tiltSrc));
check('dev JSX is compiled to the production runtime', /jsxDev:\s*false/.test(viteSrc));

/* ── 7. import order ────────────────────────────────────────────────────── */
const order = [...main.matchAll(/import '\.\/styles\/([^']+)'/g)].map((m) => m[1]);
const last = order[order.length - 1];
check('latest polish layer is imported last', last === 'v61-focus-redesign.css', `last is ${last}; v61-focus-redesign.css must be final`);

console.log(`\n${pass}/${pass + fails.length} checks passed`);
if (fails.length) {
  fails.forEach((f) => console.error(`  FAIL ${f}`));
  process.exit(1);
}
