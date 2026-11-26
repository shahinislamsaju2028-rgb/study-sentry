#!/usr/bin/env node
/** v60 redesign contract checks for the 7.md UI/interaction brief. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const modal = read('src/components/Modals.jsx');
const task = read('src/components/TodoTaskEditor.jsx');
const subjectCards = read('src/components/SubjectCards.jsx');
const chapterPicker = read('src/components/ChapterPicker.jsx');
const focus = read('src/views/FocusSessionView.jsx');
const sprint = read('src/views/SprintView.jsx');
const goalOverview = read('src/components/GoalOverview.jsx');
const schedule = read('src/utils/sprintSchedule.js');
const insights = read('src/components/PhaseInsights.jsx');
const insightsView = read('src/views/InsightsView.jsx');
const tracker = read('src/components/PhorTracker.jsx');
const home = read('src/views/CommandHubView.jsx');
const journey = read('src/components/JourneyPanel.jsx');
const css = read('src/styles/v60-redesign-polish.css');
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

console.log('v60 redesign brief');

check('chapter selectors use a four-column, larger-target grid', /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\) !important/.test(css) && /min-height:\s*50px !important/.test(css));
check('chapter cards use accent-filled backgrounds and readable labels', /background:\s*color-mix\(in srgb, var\(--chp-accent/.test(css) && /font-size:\s*13px !important/.test(css));
check('paper segments use pill tabs with a real sliding active indicator', chapterPicker.includes('chapter-picker-paper-indicator') && /chapter-picker-paper-indicator[\s\S]*translateX/.test(css) && /border-radius:\s*999px/.test(css));
check('subject selection uses its active highlight without a redundant checkmark', !subjectCards.includes('premium-subject-check') && !subjectCards.includes('{selected && <Check'));
check('chapter cards use an independent palette, equal-height chips, and science index badges', !chapterPicker.includes('subjectColor') && /INDEXED_CHAPTER_SUBJECTS/.test(chapterPicker) && /chapter-picker-index/.test(chapterPicker) && /grid-auto-rows:\s*62px !important/.test(css) && /font-size:\s*14\.5px !important/.test(css));
check('Focus Configuration keeps a title-height header and varied step badge colors', /\.modal-card\.is-fullscreen\.focus-config-modal \.modal-heading\s*\{[\s\S]*?min-height:\s*0 !important/.test(css) && /#c9f7e5/.test(css) && /#d1f4ff/.test(css) && /#e3d8ff/.test(css));
check('full-screen sheets expose a persistent close button', /\.modal-card\.is-fullscreen\.focus-config-modal \.modal-heading \.icon-btn/.test(css) && /\.modal-card\.is-fullscreen\.v54-task-modal \.modal-heading \.icon-btn/.test(css));
check('full-screen Escape and Enter shortcuts are registered at document level', /document\.addEventListener\('keydown', onKeyDown, true\)/.test(modal) && /event\.key === 'Escape'/.test(modal) && /event\.key !== 'Enter'/.test(modal));
check('task and focus dialogs each declare a default action', /data-modal-default-action/.test(task) && /data-modal-default-action/.test(focus));
check('time-slot choices stay content-sized and wrap as an orderly row', /\.v54-slot-picker \.premade-slot-grid\s*\{[\s\S]*?display:\s*flex/.test(css) && /width:\s*fit-content/.test(css));
check('priority and category controls have a color-safe hover and embossed active state', /\.v54-choice-pill:hover:not\(:disabled\)[\s\S]*?background:\s*linear-gradient/.test(css) && /inset 0 1px 0/.test(css));
check('sprint creator has a top primary action and separate left/right columns', /v60-sprint-topbar/.test(sprint) && /v60-sprint-create-primary/.test(sprint) && /v60-sprint-left/.test(sprint) && /v60-sprint-right/.test(sprint));
check('Sprint uses a top X, Escape exit, a full-width chapter row, and a separate phase row', /className="v60-sprint-close"/.test(sprint) && /document\.addEventListener\('keydown', onEscape, true\)/.test(sprint) && !/ফিরে যান/.test(sprint) && /grid-template-columns:\s*minmax\(0,\s*1fr\) !important/.test(css));
check('Sprint exposes five independent workload controls and separates sheet from review duration', ['label="শিট"', 'label="রিভিউ"', 'label="প্র্যাকটিস"'].every((label) => sprint.includes(label)) && /repeat\(5,\s*minmax\(142px,\s*1fr\)\)/.test(css) && /duration:\s*w\.sheetMin/.test(schedule) && /duration:\s*w\.reviewMin/.test(schedule) && /sheetMin:/.test(sprint));
check('Overview replaces the circular gauge with an accessible rectangular progress cockpit', /v60-ov-progress-card/.test(goalOverview) && /role="progressbar"/.test(goalOverview) && !/v29-ov-ring-showcase/.test(goalOverview) && /\.v60-ov-progress-card\s*\{/.test(css));
check('Insights tabs and wrapper use active/inactive glassmorphism', /\.v11-ins-topbar \.v11-ins-tabs\s*\{[\s\S]*?backdrop-filter:\s*blur\(16px\)/.test(css) && /\.v11-ins-topbar \.v11-ins-tab\.is-active/.test(css) && /\.v13-tab-spring-bg/.test(css));
check('header pills are more legible and app content keeps a shared responsive gutter', /\.v57-project-meta \.v28-ov-stat-chip\s*\{[\s\S]*?min-height:\s*32px/.test(css) && /\.view-container\s*\{[\s\S]*?padding-inline:\s*clamp/.test(css));
check('sprint period selector uses four/five icon-led rounded boxes', /premade-slot-grid\.is-five-slots\s*\{[\s\S]*?repeat\(5,/.test(css) && /premade-slot-btn\s*\{[\s\S]*?border-radius:\s*12px/.test(css));
check('Insights keeps the monthly calendar and selectable 3D focus heatmap', /activeTab === 'monthly'/.test(insightsView) && /v10-month-cal-card/.test(insightsView) && /v11-single-heatmap-card/.test(insightsView) && /v12-3d-voxel-matrix/.test(insightsView) && /onSelectDate=\{setSelectedDate\}/.test(insightsView));
check('phase cards use Drive-style chamber fills with visible time windows, status and goal readouts', /v60-phase-chambers/.test(insights) && /phase\.windowLabel/.test(insights) && /phase\.targetMin/.test(insights) && /v29-phase-meter-box/.test(insights) && /aria-valuetext/.test(insights) && /v29-phase-badge/.test(insights) && /\.v60-phase-chambers \.min-phases-title > span\s*\{\s*display:\s*inline-flex !important/.test(css) && /\.v60-phase-chambers \.v29-phase-card \.v29-phase-id small\s*\{\s*display:\s*block !important/.test(css) && /\.v60-phase-chambers \.v29-phase-card \.v29-phase-meter-box\s*\{\s*display:\s*block !important/.test(css) && /\.v60-phase-chambers \.v29-phase-card \.v29-phase-badge\s*\{\s*display:\s*inline-flex !important/.test(css));
check('the balance radar uses the 3D stage, layered rings, and gradient-filled data polygon', /v12-3d-radar-stage/.test(insightsView) && /radarData\.rings\.map/.test(insightsView) && /fill="url\(#v11RadarFill\)"/.test(insightsView));
check('rank tier number and name share the rounded current-rank box', /v60-current-rank-box/.test(journey) && /Tier \{String\(rank\.tier\)\.padStart\(2, '0'\)\}/.test(journey));
check('historical/future tracker marks are disabled and guarded in state updates', /disabled=\{!isToday\}/.test(tracker) && /if \(day !== todayKey\) return;/.test(tracker));
check('dawn and late-night home tiles use their own period colors', /data-slot=\{key\}/.test(home) && /data-slot='dawn'/.test(css) && /data-slot='late_night'/.test(css));
check('v60 motion honors reduced-motion preferences and loads before the v61 Focus polish', /prefers-reduced-motion:\s*reduce/.test(css) && /import '\.\/styles\/v60-redesign-polish\.css';[\s\S]*import '\.\/styles\/v61-focus-redesign\.css';/.test(main));

console.log(`\n${pass}/${pass + failures.length} checks passed`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  FAIL ${failure}`));
  process.exit(1);
}
