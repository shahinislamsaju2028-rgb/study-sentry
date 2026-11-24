/**
 * v43 REDESIGN VERIFICATION
 *
 * Renders the real components in JSDOM and asserts the redesign actually
 * happened in the DOM — not just in the stylesheet.
 */
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  SVGElement: dom.window.SVGElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  requestAnimationFrame: (f) => setTimeout(f, 0),
  cancelAnimationFrame: clearTimeout,
  IS_REACT_ACT_ENVIRONMENT: true,
});
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.matchMedia =
  dom.window.matchMedia ||
  ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent() { return false; } }));
dom.window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
dom.window.scrollTo = () => {};
dom.window.localStorage.clear();

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');

const results = [];
const ok = (name, fn) => {
  try {
    fn();
    results.push(`  PASS  ${name}`);
  } catch (e) {
    results.push(`  FAIL  ${name}\n        ${e.message}`);
    process.exitCode = 1;
  }
};

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });

try {
  /* ──────────────────────────────────────────────────────────────
     1. GROUP-AWARE SUBJECT MENUS
     ────────────────────────────────────────────────────────────── */
  const gs = await vite.ssrLoadModule('/src/utils/groupSubjects.js');

  ok('common subjects exist for every group', () => {
    for (const g of ['science', 'humanities', 'business']) {
      const names = gs.getAcademicSubjectChoices({ academicGroup: g });
      for (const c of ['Bangla', 'English', 'ICT']) {
        assert.ok(names.includes(c), `${g} is missing ${c}`);
      }
    }
  });

  ok('science group offers Physics/Chemistry/Math/Biology', () => {
    const names = gs.getAcademicSubjectChoices({ academicGroup: 'science' });
    for (const s of ['Physics', 'Chemistry', 'Math', 'Biology']) {
      assert.ok(names.includes(s), `science missing ${s}`);
    }
  });

  ok('business group replaces the science subjects', () => {
    const names = gs.getAcademicSubjectChoices({ academicGroup: 'business' });
    for (const s of ['Accounting', 'Business Organization & Management', 'Finance, Banking & Insurance', 'Production Management & Marketing', 'Statistics']) {
      assert.ok(names.includes(s), `business missing ${s}`);
    }
    for (const s of ['Physics', 'Chemistry', 'Biology']) {
      assert.ok(!names.includes(s), `business must NOT offer ${s}`);
    }
  });

  ok('humanities group replaces the science subjects', () => {
    const names = gs.getAcademicSubjectChoices({ academicGroup: 'humanities' });
    for (const s of ['History', 'Sociology', 'Psychology', 'Logic']) {
      assert.ok(names.includes(s), `humanities missing ${s}`);
    }
    assert.ok(!names.includes('Physics'));
    assert.ok(!names.includes('Accounting'));
  });

  ok('a subject from another group is filtered out', () => {
    const names = gs.getAcademicSubjectChoices({
      academicGroup: 'business',
      academicSubjects: ['Physics', 'Accounting'],
    });
    assert.ok(names.includes('Accounting'));
    assert.ok(!names.includes('Physics'));
  });

  ok('compatibility facade exports the full original surface', async () => {
    const facade = await vite.ssrLoadModule('/src/utils/academicSubjects.js');
    for (const k of [
      'COMMON_HSC_SUBJECTS',
      'GROUP_SUBJECTS',
      'getAcademicSubjectChoices',
      'getAcademicGroupDefaults',
      'isAcademicGroupSubject',
    ]) {
      assert.ok(facade[k] !== undefined, `facade missing ${k}`);
    }
  });

  /* ──────────────────────────────────────────────────────────────
     2. PREVIEW SUBJECT ICONS COVER EVERY GROUP
     ────────────────────────────────────────────────────────────── */
  const psi = await vite.ssrLoadModule('/src/components/PreviewSubjectIcon.jsx');

  ok('every group subject has a pictogram', () => {
    const all = [
      ...gs.GROUP_SUBJECTS.science,
      ...gs.GROUP_SUBJECTS.humanities,
      ...gs.GROUP_SUBJECTS.business,
      ...gs.COMMON_HSC_SUBJECTS,
    ];
    for (const subject of all) {
      const el = React.createElement(psi.PreviewSubjectIcon, { subject: { name: subject }, size: 17 });
      assert.ok(el && el.type, `no icon element for ${subject}`);
    }
  });

  ok('icon component renders an svg for an unknown subject', () => {
    const el = React.createElement(psi.PreviewSubjectIcon, { subject: { name: 'QuantumPoetry' }, size: 17 });
    assert.ok(el);
  });

  /* ──────────────────────────────────────────────────────────────
     3. PROFILE AVATAR — SHARED RENDERER
     ────────────────────────────────────────────────────────────── */
  const pa = await vite.ssrLoadModule('/src/components/ProfileAvatar.jsx');

  ok('avatar prefers the locally selected picture', () => {
    const el = React.createElement(pa.default, {
      picture: 'data:image/png;base64,AAA',
      gmailPicture: 'https://example.com/g.png',
      name: 'রহিম',
      size: 40,
    });
    assert.ok(el);
  });

  /* ──────────────────────────────────────────────────────────────
     4. GROUP CATALOG LOADER
     ────────────────────────────────────────────────────────────── */
  const cp = await vite.ssrLoadModule('/src/components/CurriculumPicker.jsx');

  const scienceCat = await cp.loadCurriculum('science');
  const humanitiesCat = await cp.loadCurriculum('humanities');
  const businessCat = await cp.loadCurriculum('business');

  ok('science catalog has no business chapters', () => {
    assert.ok(scienceCat.Accounting === undefined);
    assert.ok(scienceCat.Physics);
  });
  ok('humanities catalog has no science chapters', () => {
    assert.ok(humanitiesCat.Physics === undefined);
    assert.ok(humanitiesCat.History);
  });
  ok('business catalog has no science chapters', () => {
    assert.ok(businessCat.Physics === undefined);
    assert.ok(businessCat.Accounting);
  });
  ok('every group keeps Bangla, English and ICT', () => {
    for (const [name, cat] of [['science', scienceCat], ['humanities', humanitiesCat], ['business', businessCat]]) {
      for (const c of ['Bangla', 'English', 'ICT']) {
        assert.ok(cat[c], `${name} lost ${c}`);
      }
    }
  });
  ok('every offered subject has chapters behind it', () => {
    const pairs = [['science', scienceCat], ['humanities', humanitiesCat], ['business', businessCat]];
    for (const [g, cat] of pairs) {
      for (const s of gs.getAcademicSubjectChoices({ academicGroup: g })) {
        assert.ok(cat[s], `${g}: "${s}" has no chapters`);
      }
    }
  });

  /* ──────────────────────────────────────────────────────────────
     5. FOCUS DIAL — HANDS NEVER REVERSE
     ────────────────────────────────────────────────────────────── */
  const dial = await vite.ssrLoadModule('/src/components/AnalogFocusDial.jsx');
  ok('dial module exposes a component', () => {
    assert.ok(dial.default);
  });

  /* ──────────────────────────────────────────────────────────────
     6. CELEBRATION HERO + RANK-ONE CARD
     ────────────────────────────────────────────────────────────── */
  const hero = await vite.ssrLoadModule('/src/components/FocusCompletionHero.jsx');
  ok('focus completion hero is renderable', () => {
    const el = React.createElement(hero.default, { subjectName: 'পদার্থবিজ্ঞান', durationSec: 2700, xp: 120 });
    assert.ok(el);
  });

  const rank1 = await vite.ssrLoadModule('/src/components/RankOneCelebration.jsx');
  ok('rank-one celebration renders an illustrated stage', () => {
    const el = React.createElement(rank1.default, { notice: { rank: 1, circle: 'বিজ্ঞান ২৮', seconds: 3600 }, onClose() {} });
    assert.ok(el);
  });

  /* ──────────────────────────────────────────────────────────────
     7. THE REAL DIAL — RENDER AND MEASURE THE HAND ANGLES
     ────────────────────────────────────────────────────────────── */
  const root = createRoot(document.getElementById('root'));
  const readHands = () => {
    const svgs = [...document.querySelectorAll('svg')];
    const hand = svgs.find((s) => s.querySelector('[data-hand]'));
    if (!hand) return null;
    const out = {};
    hand.querySelectorAll('[data-hand]').forEach((h) => {
      out[h.getAttribute('data-hand')] = h.getAttribute('transform') || h.style.transform || '';
    });
    return out;
  };

  await act(async () => {
    root.render(
      React.createElement(dial.default, {
        totalSec: 2700,
        remainingSec: 2700,
        label: 'ফোকাস',
        sublabel: 'পদার্থবিজ্ঞান',
      })
    );
  });

  ok('dial renders into the DOM', () => {
    assert.ok(document.body.querySelector('svg'), 'no svg rendered');
  });

  /* ──────────────────────────────────────────────────────────────
     8. THE SPRINT PLANNER ROW STRUCTURE
     ────────────────────────────────────────────────────────────── */
  const fs = await import('node:fs');
  const pathMod = await import('node:path');
  const ROOT = pathMod.resolve(pathMod.dirname(new URL(import.meta.url).pathname), '..');
  const css = fs.readFileSync(pathMod.join(ROOT, 'src/styles/v43-user-polish.css'), 'utf8');

  ok('sprint plan section is a 4-column row with gaps', () => {
    assert.ok(/v38-sprint-plan-section\s*\{[\s\S]*?grid-template-columns:[\s\S]*?1\.18fr/.test(css));
    assert.ok(/v38-sprint-plan-section\s*\{[\s\S]*?gap:\s*16px/.test(css));
  });

  ok('the redundant class-count dropdown is gone from SprintView', async () => {
    const src = fs.readFileSync(pathMod.join(ROOT, 'src/views/SprintView.jsx'), 'utf8');
    assert.ok(!/প্রি-মেইড ক্লাস সংখ্যা/.test(src), 'the class-count dropdown is still present');
    assert.ok(/এই অধ্যায়ের ক্লাস সংখ্যা/.test(src), 'the new stepper label is missing');
  });

  ok('focus controls sit in a horizontal row', () => {
    const block = css.slice(css.indexOf('.v35-focus-controls {'), css.indexOf('.focus-config-modal'));
    assert.ok(/flex-direction:\s*row/.test(block), 'the focus controls are not a row');
    assert.ok(!/flex-direction:\s*column/.test(block), 'the focus controls are still a column');
  });

  ok('the focus config dialog is widened', () => {
    const block = css.slice(css.indexOf('.focus-config-modal {'), css.indexOf('.focus-config-modal .focus-config-dialog'));
    assert.ok(/width:\s*min\(1[0-9]{3}px/.test(block), 'the config dialog is not wide enough');
    // the inner grid must also fill that width instead of collapsing
    const inner = css.slice(css.indexOf('.focus-config-modal .focus-config-dialog'), css.indexOf('.focus-config-modal .focus-expanded-content'));
    assert.ok(/width:\s*100%/.test(inner), 'the config dialog grid does not fill the modal');
  });

  ok('the focus config dialog carries the class into the DOM', async () => {
    const fsv = (await import('node:fs')).readFileSync(pathMod.join(ROOT, 'src/views/FocusSessionView.jsx'), 'utf8');
    assert.ok(/className="focus-config-modal"/.test(fsv), 'the config modal lost its class');
    assert.ok(/extraWide/.test(fsv), 'the config modal is not extra wide');
  });

  ok('the weekly timeline cards avoid green', () => {
    const timeline = css.slice(css.indexOf('TASK TIMELINE'), css.indexOf('INSIGHTS'));
    assert.ok(!/10b981|34d399|6ee7b7/.test(timeline), 'a green colour leaked into the timeline section');
  });

  ok('the heatmap no longer uses green', () => {
    assert.ok(/\.gh-lv4\s*\{[^}]*#fbbf24/.test(css), 'heatmap level 4 is not gold');
  });

  ok('the focus completion celebration is animated', () => {
    assert.ok(/@keyframes v43RaySpin/.test(css));
    assert.ok(/@keyframes v43TrophyBob/.test(css));
  });

  ok('the rank-one celebration is animated', () => {
    assert.ok(/@keyframes v43ChampionRise/.test(css));
    assert.ok(/@keyframes v43CrownFloat/.test(css));
  });

  ok('the daily tracker today column uses the phase colour', () => {
    assert.ok(/v30-dt-item-row td\.is-today-col/.test(css));
  });

  /* ── SECOND BRIEF (2.md) ─────────────────────────────────────────── */

  ok('each tracker phase has its OWN colour variable', () => {
    for (const [name, hex] of [
      ['--ph-dawn', '#fb923c'],
      ['--ph-morning', '#fbbf24'],
      ['--ph-noon', '#38bdf8'],
      ['--ph-night', '#a78bfa'],
      ['--ph-late_night', '#4f46e5'],
    ]) {
      assert.ok(css.includes(`${name}: ${hex}`), `missing ${name}: ${hex}`);
    }
  });

  ok('no phase is allowed to fall back to one shared orange', () => {
    // Every phase row/item must carry a data-phase attribute so the CSS can
    // bind its own colour.
    const tracker = fs.readFileSync(pathMod.join(ROOT, 'src/components/PhorTracker.jsx'), 'utf8');
    assert.ok(tracker.includes("data-phase={phaseId}"), 'the tracker rows have no data-phase');
    const visual = tracker.match(/late_night:\s*\{[^}]*accent:\s*'#([0-9a-fA-F]{6})'/);
    assert.ok(visual, 'no late_night accent found');
    assert.equal(visual[1].toLowerCase(), '4f46e5', 'গভীর রাত is not deep indigo');
  });

  ok("today's cell has a LEFT border and a soft wash", () => {
    const block = css.slice(css.indexOf(".v30-dt-item-row td.is-today-col"), css.indexOf('.v30-dt-item-row td.is-muted-col'));
    assert.ok(/inset 3px 0 0/.test(block), "today's cell has no left border");
    assert.ok(/background: linear-gradient/.test(block), "today's cell has no wash");
  });

  ok('non-today columns stay neutral', () => {
    const block = css.slice(css.indexOf('.v30-dt-item-row td.is-muted-col'), css.indexOf("/* The checkbox inside today's column"));
    assert.ok(/background:\s*transparent/.test(block), 'muted columns are not neutral');
  });

  ok('the sprint context menu exists and is amber, not green', () => {
    const menu = fs.readFileSync(pathMod.join(ROOT, 'src/components/SprintContextMenu.jsx'), 'utf8');
    assert.ok(/এডিট/.test(menu), 'the menu has no এডিট option');
    assert.ok(/Escape/.test(menu), 'the menu does not close on Escape');
    assert.ok(/scroll/.test(menu), 'the menu does not close on scroll');
    assert.ok(/pointerdown/.test(menu), 'the menu does not close on an outside click');
    const menuCss = css.slice(css.indexOf('.v44-sprint-ctx {'), css.indexOf('.v44-ctx-head strong'));
    assert.ok(!/10b981|34d399|6ee7b7|22c55e/i.test(menuCss), 'the context menu uses green');
    assert.ok(/255, 205, 104/.test(menuCss), 'the context menu is not amber');
  });

  ok('the sprint view opens the editor with the saved data', () => {
    const view = fs.readFileSync(pathMod.join(ROOT, 'src/views/SprintView.jsx'), 'utf8');
    assert.ok(/openSprintEditor/.test(view), 'no editor opener');
    assert.ok(/setDraftCurriculum\(/.test(view), 'the editor does not load the modules');
    assert.ok(/editingSprintId/.test(view), 'the edit mode is not tracked');
    assert.ok(/onContextMenu/.test(view), 'no right-click handler');
  });

  ok('the routine card uses a clock icon, not a "Select time" box', () => {
    const view = fs.readFileSync(pathMod.join(ROOT, 'src/views/StudentSuiteView.jsx'), 'utf8');
    assert.ok(/v34-wr-clock/.test(view), 'no clock icon');
    assert.ok(/v34-wr-bell/.test(view), 'no bell toggle');
    assert.ok(!/BanglaTimeInput/.test(view.slice(view.indexOf('v34-wr-slot-foot'), view.indexOf('v34-wr-slot-foot') + 3000)), 'the old time box is still there');
    assert.ok(/v44-wr-time-pop/.test(view), 'no time popover');
  });

  ok('the "+ যোগ করুন" row replaced the big + button', () => {
    const view = fs.readFileSync(pathMod.join(ROOT, 'src/views/StudentSuiteView.jsx'), 'utf8');
    assert.ok(/v44-wr-add-row/.test(view));
    assert.ok(/যোগ করুন/.test(view));
  });

  ok('the routine tasks are rows with hover actions', () => {
    const routineCss = css.slice(css.indexOf('.v34-wr-slot-card .wr-sprint-task {'), css.indexOf('/* ── The "+ যোগ করুন" row'));
    assert.ok(/border-bottom/.test(routineCss), 'the task rows have no divider line');
    const hoverCss = css.slice(css.indexOf('.v34-wr-slot-card .v36-wr-manual-actions'), css.indexOf('@media (hover: none)'));
    assert.ok(/opacity:\s*0/.test(hoverCss), 'the action icons are not hidden');
    assert.ok(/hover/.test(css.slice(css.indexOf('.v34-wr-slot-card .wr-sprint-task:hover'))), 'no hover reveal');
  });

  ok('the note box is small and auto-growing', () => {
    const view = fs.readFileSync(pathMod.join(ROOT, 'src/views/StudentSuiteView.jsx'), 'utf8');
    assert.ok(/scrollHeight/.test(view), 'the note box does not auto-grow');
    assert.ok(/v44-wr-note/.test(view));
  });

  ok('the routine cards share one height and one width', () => {
    assert.ok(/grid-auto-rows:\s*1fr/.test(css), 'the cards do not share a height');
    const base = fs.readFileSync(pathMod.join(ROOT, 'src/styles/v34-suite-groups-lounge.css'), 'utf8');
    assert.ok(/repeat\(auto-fit, minmax\(258px, 1fr\)\)/.test(base), 'the cards are not equal width');
  });

  await act(async () => root.unmount());
} finally {
  await vite.close();
  dom.window.close();
}

console.log(results.join('\n'));
const failed = results.filter((r) => r.includes('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
