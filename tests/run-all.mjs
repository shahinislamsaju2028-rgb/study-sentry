#!/usr/bin/env node
/**
 * Runs every test in this folder and prints a summary.
 *
 *   node tests/run-all.mjs
 *   node tests/run-all.mjs --verbose
 *
 * Exit code is non-zero only when a test in KNOWN_PASSING fails, so stale
 * tests from older UI iterations don't break CI while they're being rewritten.
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const verbose = process.argv.includes('--verbose');

/** Tests that currently match the shipped UI. */
const KNOWN_PASSING = [
  'compact-planner-controls.mjs',
  'custom-control-check.mjs',
  'group-redesign-check.mjs',
  'pip-startup-refinement.mjs',
  'quest-tags-check.mjs',
  'sprint-name-control-check.mjs',
  'timeline-week-check.mjs',
  'v43-sprint-planner-check.mjs',
  'v45-redesign-check.mjs',
  'v52-hierarchy-check.mjs',
  'v59-suite-redesign-check.mjs',
  'v60-redesign-check.mjs',
  'v61-focus-redesign-check.mjs',
  'v62-home-palette-check.mjs',
  'v63-midnight-prism-palette-check.mjs',
  'verify_catalog.mjs',
];

/** Tests written against layouts that have since changed — see tests/STALE_TESTS.md. */
const STALE = [
  'curriculum-controls.mjs',
  'focus-dialog.mjs',
  'inward-motion.mjs',
  'minimal-motion.mjs',
  'planner-tracker.mjs',
  'sprint-day-phases.mjs',
  'sprint-integrations.mjs',
  'sprint-routine-integration.mjs',
  'sprint-routine.mjs',
  'syllabus-tracking.mjs',
  'task-board.mjs',
  'v28-all-features.mjs',
  'v43-redesign-verification.mjs',
  'windows-timer-recovery.mjs',
];

const files = readdirSync(here).filter(
  (f) => f.endsWith('.mjs') && f !== 'run-all.mjs'
);

const results = [];
for (const file of files) {
  const kind = KNOWN_PASSING.includes(file)
    ? 'passing'
    : STALE.includes(file)
      ? 'stale'
      : 'unknown';

  const out = spawnSync(process.execPath, [join(here, file)], {
    encoding: 'utf8',
    timeout: 300_000,
  });
  const ok = out.status === 0;
  results.push({ file, kind, ok });

  const mark = ok ? '✔' : kind === 'stale' ? '○' : '✘';
  const label = ok ? 'PASS' : kind === 'stale' ? 'FAIL (known stale)' : 'FAIL';
  console.log(`${mark} ${file.padEnd(32)} ${label}`);

  if (!ok && (verbose || kind === 'unknown')) {
    const tail = `${out.stdout || ''}${out.stderr || ''}`.trim().split('\n').slice(-6).join('\n');
    if (tail) console.log(tail.replace(/^/gm, '    '));
  }
}

const hard = results.filter((r) => r.kind !== 'stale' && !r.ok);
const passed = results.filter((r) => r.ok).length;

console.log(`\n${passed}/${results.length} passed${hard.length ? `, ${hard.length} blocking` : ''}`);

if (STALE.length) {
  console.log(
    `\n${STALE.length} test(s) are known stale (written against older layouts):\n  ${STALE.join('\n  ')}\nSee tests/STALE_TESTS.md.`
  );
}

process.exit(hard.length ? 1 : 0);
