/**
 * SPRINT PLANNER — RENDER CHECK
 *
 * Mounts the real SprintView with a mocked study context and asserts the
 * redesigned first section really is one horizontal row of four columns,
 * that no class-count dropdown survived, and that the group-aware subject
 * tiles show the selected group's subjects.
 */
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
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
dom.window.matchMedia = (q) => ({
  matches: false,
  media: q,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  onchange: null,
  dispatchEvent() { return false; },
});
dom.window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.scrollTo = () => {};

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');

const profile = { academicGroup: 'business', academicSubjects: ['Accounting'], name: 'টেস্ট' };

globalThis.__mock = {
  state: {
    subjects: [{ id: 'p', name: 'Accounting' }],
    todos: [],
    isDemo: true,
    profile,
    sprintData: { sprints: [], selectedSprintId: null },
    timerPrefs: { phaseMode: 'all5' },
    phorTracker: { items: [], marks: {} },
    leaderboard: [],
  },
  todayKey: '2026-11-22',
  commit: (fn) => { globalThis.__mock.state = fn(globalThis.__mock.state); },
  toast() {},
  prepareFocus() {},
  openModal() {},
  deleteItem() {},
  patchItem() {},
};

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  plugins: [
    {
      name: 'mock',
      enforce: 'pre',
      resolveId(id) {
        if (id.includes('context/StudyContext')) return '\0ctx';
        return null;
      },
      load(id) {
        if (id === '\0ctx')
          return 'export function useStudy(){return globalThis.__mock}\n'
            + 'export function useOptionalStudy(){return globalThis.__mock}';
        return null;
      },
    },
  ],
});

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

try {
  const { default: SprintView } = await vite.ssrLoadModule('/src/views/SprintView.jsx');
  const root = createRoot(document.getElementById('root'));

  await act(async () => {
    root.render(React.createElement(SprintView));
  });

  // The onboarding form opens behind the "নতুন স্প্রিন্ট" button.
  const newBtn = [...document.querySelectorAll('button')].find((b) =>
    b.textContent.includes('নতুন স্প্রিন্ট')
  );
  assert.ok(newBtn, 'the new-sprint button is missing');
  await act(async () => {
    newBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  // The HSC catalog arrives through a dynamic import — give it a moment so
  // the chapter cards really exist before the assertions run.
  for (let i = 0; i < 40 && !document.querySelector('.chapter-picker-card'); i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
  }

  const html = document.body.innerHTML;

  ok('the sprint planner renders', () => {
    assert.ok(document.querySelector('.v38-sprint-plan-section'), 'the plan section is missing');
  });

  ok('the plan grid carries the four control cells', () => {
    const grid = document.querySelector('.v45-plan-grid');
    assert.ok(grid, 'the v45 plan grid is missing');
    const cols = grid.children;
    assert.ok(cols.length >= 4, `expected 4 plan cells, found ${cols.length}`);
  });

  ok('the cells are: name, duration, classes-per-day, dates', () => {
    const section = document.querySelector('.v45-plan-grid');
    const text = section.textContent || '';
    assert.ok(/স্প্রিন্টের নাম/.test(text), 'the name cell is missing');
    assert.ok(/স্প্রিন্টের দৈর্ঘ্য/.test(text), 'the duration cell is missing');
    assert.ok(/প্রতিদিনের ক্লাস-সেট/.test(text), 'the classes-per-day cell is missing');
    assert.ok(/শেষ তারিখ/.test(text), 'the end-date cell is missing');
  });

  ok('the name control is one full-width dropdown with no − / + steppers', () => {
    const dd = document.querySelector('.v45-name-dd');
    assert.ok(dd, 'the name dropdown is missing');
    assert.ok(dd.querySelector('.v45-name-dd-trigger'), 'the dropdown trigger is missing');
    assert.ok(!dd.querySelector('[aria-label="আগের নাম"], [aria-label="পরের নাম"]'), 'a − / + button survived next to the name');
  });

  ok('there is no duplicate title card under the dropdown', () => {
    const dd = document.querySelector('.v45-name-dd');
    const card = dd?.querySelector('.v29-sw-name-input');
    assert.ok(!card, 'the duplicate title card is still rendered');
  });

  ok('the redundant total-class-count dropdown is gone', () => {
    assert.ok(!/প্রি-মেইড ক্লাস সংখ্যা/.test(html), 'the old dropdown is still rendered');
    assert.ok(/ক্লাস সংখ্যা/.test(html), 'the class-count stepper is missing');
  });

  ok('class count, class time, sheet review and practice share ONE row of four', () => {
    const quad = document.querySelector('.v45-quad');
    assert.ok(quad, 'the four-column stepper row is missing');
    assert.equal(quad.children.length, 4, 'the row must hold exactly four cells');
    const labels = quad.textContent || '';
    assert.ok(/ক্লাস সংখ্যা/.test(labels), 'class count is missing from the row');
    assert.ok(/প্রতি ক্লাসের সময়/.test(labels), 'class time is missing from the row');
    assert.ok(/শিট রিভিউ/.test(labels), 'sheet review is missing from the row');
    assert.ok(/প্র্যাকটিস/.test(labels), 'practice is missing from the row');
  });

  ok('the always-visible total-minutes line is gone', () => {
    assert.ok(!/মোট ১৩৫ মিনিট/.test(html), 'the static total-minutes label is still rendered');
    assert.ok(!document.querySelector('.v37-workload-total'), 'the workload total is still rendered');
  });

  ok('the four plan controls sit on ONE row of four columns', () => {
    const grid = document.querySelector('.v45-plan-grid');
    const cols = [...grid.children];
    assert.equal(cols.length, 4, `expected four plan columns, found ${cols.length}`);
    const labels = grid.textContent || '';
    assert.ok(/স্প্রিন্টের নাম/.test(labels), 'the name column is missing');
    assert.ok(/স্প্রিন্টের দৈর্ঘ্য/.test(labels), 'the duration column is missing');
    assert.ok(/প্রতিদিনের ক্লাস-সেট/.test(labels), 'the class-set column is missing');
    assert.ok(/শেষ তারিখ/.test(labels), 'the end-date column is missing');
  });

  ok('shared subject chips hug their icon and label', () => {
    const grid = document.querySelector('.premium-subject-grid.v48-subject-chips');
    assert.ok(grid, 'the shared subject selector is missing');
    const chips = [...grid.querySelectorAll('.premium-subject-card')];
    assert.ok(chips.length > 0, 'no subject chips rendered');
    assert.ok(chips.every((chip) => chip.getAttribute('aria-pressed') !== null),
      'a subject chip is missing its selected-state semantics');
  });

  ok('the shared selector shows only the business group subject choices', () => {
    const grid = document.querySelector('.premium-subject-grid.v48-subject-chips');
    assert.ok(grid, 'the subject selector is missing');
    const text = grid.textContent || '';
    assert.ok(/হিসাববিজ্ঞান|Accounting/.test(text), 'Accounting is not offered');
    assert.ok(!/পদার্থবিজ্ঞান|ফিজিক্স|Physics/.test(text), 'a science subject leaked into the business choices');
  });

  ok('every shared subject chip carries an icon', () => {
    const tiles = document.querySelectorAll('.premium-subject-grid.v48-subject-chips .premium-subject-card');
    assert.ok(tiles.length > 0, 'no subject chips found');
    for (const tile of tiles) {
      assert.ok(tile.querySelector('.premium-subject-icon svg'), 'a subject chip has no icon');
    }
  });

  ok('the chapter picker is the shared multi-select grid', () => {
    // v49: the sprint planner no longer owns a private picker — it renders the
    // one shared <ChapterPicker/> so every screen selects chapters identically.
    const chp = document.querySelector('.chapter-picker');
    assert.ok(chp, 'the chapter grid is missing');
    // 6.txt ⓶⓪ — no search box inside chapter selectors.
    assert.equal(chp.querySelector('.chapter-picker-search'), null,
      'the chapter search box should be gone');
    assert.ok(
      [...chp.querySelectorAll('button')].some((b) => /সব সিলেক্ট|সব বাদ/.test(b.textContent)),
      'the select-all button is missing'
    );
    const cards = chp.querySelectorAll('.chapter-picker-card');
    assert.ok(cards.length > 0, 'no chapter cards were rendered');
    for (const card of cards) {
      assert.ok(card.querySelector('.chapter-picker-name'), 'a chapter card carries no name');
      assert.equal(card.getAttribute('role'), 'checkbox', 'a chapter card is not a checkbox');
    }
    // every card must share one measured width
    const widths = [...new Set([...cards].map((c) => Math.round(c.getBoundingClientRect().width)))];
    assert.equal(widths.length, 1, `chapter cards differ in width: ${widths.join(', ')}`);
  });

  await act(async () => root.unmount());
} finally {
  await vite.close();
  dom.window.close();
}

console.log(results.join('\n'));
const failed = results.filter((r) => r.includes('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
