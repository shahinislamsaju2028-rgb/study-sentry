#!/usr/bin/env node
/**
 * v59 suite redesign contract check: Daily Tracker, Weekly Routine and Syllabus.
 * Guards the requested structure and interaction paths without snapshotting
 * theme colors or relying on a browser's computed-style serialization.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tracker = readFileSync(resolve(root, 'src/components/PhorTracker.jsx'), 'utf8');
const suite = readFileSync(resolve(root, 'src/views/StudentSuiteView.jsx'), 'utf8');
const checklist = readFileSync(resolve(root, 'src/components/SyllabusChecklist.jsx'), 'utf8');
const css = readFileSync(resolve(root, 'src/styles/v59-suite-redesign.css'), 'utf8');
const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8');

let pass = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return '';
  const end = css.indexOf('}', start);
  return end < 0 ? '' : css.slice(start, end + 1);
}

console.log('v59 suite redesign');

/* Daily Tracker */
check('Daily Tracker header no longer renders the progress ring', !tracker.includes('v30-dt-ring-wrap'));
check('Daily Tracker header retains title and completion/date metadata', /v30-dt-title-copy/.test(tracker) && /focusStats\.done/.test(tracker));

/* Weekly Routine */
const dayStrip = block('.v34-wr-day-strip');
const dayCard = block('.v34-wr-day-card');
const periodGrid = block('.v34-wr-grid');
const periodCard = block('.v34-wr-slot-card');
const taskCard = block('.v34-wr-slot-card .wr-sprint-task');
check('weekday strip remains horizontal with seven separate tracks', /repeat\(7,\s*minmax\(82px,\s*1fr\)\)/.test(dayStrip) && /overflow-x:\s*auto/.test(dayStrip));
check('weekday buttons are separate rounded cards with distinct selected styling', /border-radius:\s*15px/.test(dayCard) && /\.v34-wr-day-card\.is-selected/.test(css));
check('desktop routine keeps five columns and content-sized rows', /repeat\(5,\s*minmax\(0,\s*1fr\)\)/.test(periodGrid) && /grid-auto-rows:\s*auto/.test(periodGrid));
check('time-period cards use a gradient outline, inner gradient and outer glow', /padding-box/.test(periodCard) && /border-box/.test(periodCard) && /0 0 19px/.test(periodCard));
check('each routine task is independently rounded and gradient outlined', /border-radius:\s*13px/.test(taskCard) && /padding-box/.test(taskCard) && /border-box/.test(taskCard));
check('subject, period metadata and task chips carry leading icons', /BookOpenCheck size=\{11\}/.test(suite) && /Clock3 size=\{11\}/.test(suite) && /ListChecks size=\{10\}/.test(suite));
check('routine columns are compact and responsive', /min-height:\s*0 !important/.test(periodCard) && /@media \(max-width: 760px\)/.test(css));

/* Syllabus */
check('Syllabus top-level overall progress box is removed', !suite.includes('v30-syl-pct-box') && !suite.includes('overallSylPct'));
check('subject filter behavior remains intact', /onClick=\{\(\) => setSubjectFilter\(s\.id\)\}/.test(suite));
check('subject groups use a two-column grid and widen to three columns', /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css) && /@media \(min-width: 1500px\)[\s\S]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(css));
check('chapter labels have a leading icon and larger solid circular progress', /<BookOpenCheck size=\{15\}/.test(suite) && /conic-gradient\(/.test(block('.v59-ch-progress')) && /width:\s*62px/.test(block('.v59-ch-progress')));
check('rounded chapter type chip opens the full-screen checklist', /className="v52-ch-types v59-ch-types-chip"[\s\S]*aria-haspopup="dialog"[\s\S]*setCheckChapter\(ch\.id\)/.test(suite) && /<ModalShell title=\{chapterTitle\} onClose=\{onClose\} fullScreen>/.test(checklist));
check('type overlay explicitly distinguishes selected and unselected types', /selected: done > 0/.test(checklist) && /'সিলেক্টেড' : 'সিলেক্ট করা হয়নি'/.test(checklist));
check('chapter-add CTA follows the shared selector accent treatment', /v30-glow-btn v59-syl-add-btn/.test(suite) && /\.v59-syl-add-btn/.test(css));
check('v59 redesign stylesheet is imported last', /import '\.\/styles\/v59-suite-redesign\.css';\s*$/.test(main));

console.log(`\n${pass}/${pass + failures.length} checks passed`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  FAIL ${failure}`));
  process.exit(1);
}
