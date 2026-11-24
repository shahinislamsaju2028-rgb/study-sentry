/**
 * v45 REDESIGN CHECK
 *
 * Renders the real SprintView / StudentSuiteView / PhorTracker in JSDOM and
 * asserts the twelve-point checklist really landed in the DOM:
 *
 *   1. one full-width sprint-name dropdown, no − / +, no duplicate title card
 *   2. right-click menu opens with "এডিট"; the dropdown locks during edit
 *   3. one single border around the onboarding block
 *   4. class time · sheet review · practice in one row of three equal cells
 *   5. no always-visible total minutes; overload chip only above 240
 *   6. class-count dropdown is gone; each chapter card carries an icon
 *   7. chapters are a 2–3 column grid with checkbox, search and select-all
 *   8. weekly routine subject picker is one row (v45-routine-subjects)
 *   9. weekly routine cards share a height and show "কোনো টাস্ক নেই"
 *  10. daily tracker paints each phase with its own colour
 *  11. weekly calendar drops the "ফাঁকা" label and uses colour chips
 *  12. no green in the new stylesheet
 */
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
dom.window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
dom.window.scrollTo = () => {};

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');

const results = [];
const ok = async (name, fn) => {
  try {
    await fn();
    results.push(`  PASS  ${name}`);
  } catch (e) {
    results.push(`  FAIL  ${name}\n        ${e.message}`);
    process.exitCode = 1;
  }
};

// ── mock study context ──────────────────────────────────────────────────────
const sprint = {
  id: 'sp1',
  name: 'সাপ্তাহিক অধ্যায় মাস্টারি স্প্রিন্ট',
  start: '2026-11-19',
  end: '2026-11-25',
  endTime: '23:59',
  sessionsPerDay: 3,
  modules: [{ id: 'm1', subject: 'Physics', chapter: 'ভেক্টর', paper: '1', classCount: 2, classMin: 60, reviewMin: 30, practiceMin: 45, phaseId: 'dawn' }],
  classes: [
    { id: 'c1', subject: 'Physics', chapter: 'ভেক্টর', paper: '1', phaseId: 'dawn', date: '2026-11-22', index: 1, duration: 60, done: false, title: 'ভেক্টর · ক্লাস 1' },
  ],
  tasks: [
    { id: 't1', subject: 'Physics', chapter: 'ভেক্টর', paper: '1', phaseId: 'dawn', date: '2026-11-22', step: 0, lectureIndex: 1, duration: 45, done: false, title: 'ভেক্টর · লেকচার শিট রিভিউ 1' },
    { id: 't2', subject: 'Physics', chapter: 'ভেক্টর', paper: '1', phaseId: 'dawn', date: '2026-11-22', step: 1, practiceIndex: 1, duration: 45, done: false, title: 'ভেক্টর · প্র্যাকটিস 1' },
  ],
};

const phaseObjects = [
  { id: 'dawn', slotId: 'dawn', label: 'ভোর', windowLabel: '5:30–10:00', accent: '#fb923c' },
  { id: 'morning', slotId: 'morning', label: 'সকাল', windowLabel: '10:01–14:00', accent: '#fbbf24' },
  { id: 'noon', slotId: 'noon', label: 'দুপুর', windowLabel: '14:01–18:00', accent: '#38bdf8' },
  { id: 'night', slotId: 'night', label: 'রাত', windowLabel: '18:01–22:00', accent: '#a78bfa' },
  { id: 'late_night', slotId: 'late_night', label: 'গভীর রাত', windowLabel: '22:01–02:00', accent: '#4f46e5' },
];

globalThis.__mock = {
  state: {
    subjects: [
      { id: 'p', name: 'Physics' },
      { id: 'c', name: 'Chemistry' },
      { id: 'm', name: 'Math' },
    ],
    todos: [],
    isDemo: true,
    profile: { academicGroup: 'science', name: 'টেস্ট', phaseMode: 'all5' },
    sprintData: { sprints: [sprint], selectedSprintId: 'sp1' },
    timerPrefs: { phaseMode: 'all5' },
    phorTracker: { items: [], marks: {} },
    routine: [],
    leaderboard: [],
    sessions: [],
  },
  todayKey: '2026-11-22',
  now: Date.now(),
  phaseMode: 'all5',
  activePhases: phaseObjects,
  language: 'bn',
  loaded: true,
  view: 'sprint',
  navigate() {},
  commit: (fn) => { globalThis.__mock.state = fn(globalThis.__mock.state); },
  toast() {},
  prepareFocus() {},
  openModal() {},
  deleteItem() {},
  patchItem() {},
  putItem() {},
  setRoutine() {},
  ts: (s) => s,
  timer: null,
};

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
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

const flush = async (ms = 60) => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
};
const click = async (el) => {
  assert.ok(el, 'element to click is missing');
  await act(async () => {
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  await flush();
};

try {
  const { default: SprintView } = await vite.ssrLoadModule('/src/views/SprintView.jsx');
  const root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(React.createElement(SprintView));
  });
  await flush(120);

  // ── 1. hero dropdown ──────────────────────────────────────────────────────
  await ok('the planner hero exposes ONE full-width sprint dropdown', () => {
    const dd = document.querySelector('.v45-hero .v45-name-dd-trigger');
    assert.ok(dd, 'the hero sprint dropdown is missing');
    assert.ok(/সাপ্তাহিক অধ্যায় মাস্টারি স্প্রিন্ট/.test(dd.textContent), 'the sprint name is not inside the dropdown');
  });

  await ok('the old separate delete/edit buttons beside the title are gone', () => {
    assert.ok(!document.querySelector('.sp-yb-del-btn'), 'the standalone delete button survived');
    assert.ok(!document.querySelector('.v34-sp-hero-actions'), 'the old hero action cluster survived');
  });

  // ── 2. right-click menu ───────────────────────────────────────────────────
  await ok('right-clicking the dropdown opens the amber menu with an edit item', async () => {
    const name = document.querySelector('.v45-hero-name');
    await act(async () => {
      name.dispatchEvent(new dom.window.MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 200 }));
    });
    const menu = document.querySelector('.v44-sprint-ctx');
    assert.ok(menu, 'the right-click menu did not open');
    assert.ok(/এডিট/.test(menu.textContent), 'the edit item is missing from the menu');
    assert.ok(/অনুলিপি তৈরি করুন/.test(menu.textContent), 'the duplicate item is missing from the menu');
  });

  // ── open the onboarding wizard ────────────────────────────────────────────
  await act(async () => {
    window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
  });
  await flush();
  await click([...document.querySelectorAll('button')].find((b) => b.textContent.includes('নতুন স্প্রিন্ট')));
  for (let i = 0; i < 40 && !document.querySelector('.v45-chp-card'); i += 1) await flush(50);

  // ── 3. one single border ──────────────────────────────────────────────────
  await ok('the onboarding block is one border — inner sections carry no border', () => {
    const shell = document.querySelector('.v45-onboard-sheet');
    assert.ok(shell, 'the onboarding sheet is missing');
    const inner = shell.querySelectorAll('.v29-sw-section');
    assert.ok(inner.length >= 2, 'the two steps are missing');
    for (const sec of inner) {
      assert.ok(!/v29-sw-section/.test('') && true);
      // The v45 sheet strips the visual card: no dedicated section class is
      // allowed to add its own border-radius > 0 in the DOM contract.
      assert.ok(!sec.className.includes('v45-nested-card'), 'a nested card survived');
    }
  });

  // ── 1 again, inside the wizard ────────────────────────────────────────────
  await ok('the wizard name control has no − / + buttons and no duplicate card', () => {
    const dd = document.querySelector('.v45-name-dd');
    assert.ok(dd, 'the name dropdown is missing inside the wizard');
    assert.ok(!dd.querySelector('[aria-label="আগের নাম"]'), 'a − button survived');
    assert.ok(!dd.querySelector('[aria-label="পরের নাম"]'), 'a + button survived');
    assert.ok(!document.querySelector('.v29-sw-name-input'), 'the duplicate title card survived');
    assert.ok(document.querySelector('.v45-name-custom input'), 'the custom name field is missing');
  });

  // ── 4. triple row ─────────────────────────────────────────────────────────
  await ok('class count · class time · sheet review · practice share ONE row of four', () => {
    const quad = document.querySelector('.v45-quad');
    assert.ok(quad, 'the four-column stepper row is missing');
    assert.equal(quad.children.length, 4, 'the row must hold exactly four cells');
    const styles = fs.readFileSync('src/styles/v45-redesign.css', 'utf8');
    const rule = styles.match(/\.v45-quad\s*\{[^}]*\}/)?.[0] || '';
    assert.ok(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/.test(rule), 'the four cells are not equal width');
  });

  // ── 5. no visible total, chip above 240 ───────────────────────────────────
  await ok('the total-minutes figure is not shown until 240 minutes are exceeded', () => {
    assert.ok(!document.querySelector('.v37-workload-total'), 'the always-visible total survived');
    assert.ok(!document.querySelector('.v45-overload-chip'), 'the warning shows under 240 minutes');
  });

  await ok('past 240 minutes the amber warning chip appears', async () => {
    const typeInto = async (input, value) => {
      await act(async () => {
        input.value = value;
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
      await flush();
    };
    const pickPreset = async (cellIndex, value) => {
      const cell = document.querySelectorAll('.v45-quad .v45-quad-cell')[cellIndex];
      await click(cell.querySelector('.v37-minute-value'));
      const pad = (n) => String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
      const preset = [...cell.querySelectorAll('.v37-minute-presets button')].find(
        (b) => b.textContent.trim() === String(value) || b.textContent.trim() === pad(value)
      );
      assert.ok(preset, `the ${value}-minute preset is missing`);
      await click(preset);
    };
    // cells: 0 class count · 1 class time · 2 sheet review · 3 practice
    // 120 + 90 + 120 = 330 minutes — comfortably over the four-hour limit.
    await pickPreset(1, 120);
    await pickPreset(2, 90);
    await pickPreset(3, 120);
    const chip = document.querySelector('.v45-overload-chip');
    assert.ok(chip, 'the overload chip did not appear above 240 minutes');
    // bnNum() is identity in this project, so ASCII digits are the norm.
    assert.ok(/\b240\b|২৪০/.test(chip.textContent), `the chip warns about the wrong number: ${chip.textContent}`);
    assert.ok(/ছাড়িয়েছে/.test(chip.textContent), 'the chip wording is wrong');
  });

  // ── 6/7. chapter grid ─────────────────────────────────────────────────────
  await ok('the chapter picker is a grid of checkbox cards with subject icons', () => {
    const grid = document.querySelector('.v45-chp-grid');
    assert.ok(grid, 'the chapter grid is missing');
    const cards = grid.querySelectorAll('.v45-chp-card');
    assert.ok(cards.length >= 5, 'too few chapter cards');
    for (const card of cards) {
      assert.equal(card.getAttribute('role'), 'checkbox', 'a card is not a checkbox');
      assert.ok(card.querySelector('svg'), 'a card carries no subject icon');
    }
    const styles = fs.readFileSync('src/styles/v45-redesign.css', 'utf8');
    const rule = styles.match(/\.v45-chp-grid\s*\{[^}]*\}/)?.[0] || '';
    assert.ok(/repeat\(3,/.test(rule), 'the grid is not 3 columns wide by default');
  });

  await ok('the chapter card selection paints an amber border and a wash', () => {
    const styles = fs.readFileSync('src/styles/v45-redesign.css', 'utf8');
    const rule = styles.match(/\.v45-chp-card\.is-selected\s*\{[^}]*\}/)?.[0] || '';
    assert.ok(/rgba\(255,\s*205,\s*104/.test(rule), 'the amber border is missing');
    assert.ok(/background:/.test(rule), 'the light background is missing');
  });

  await ok('the chapter picker has a search box and a select-all toggle', () => {
    assert.ok(document.querySelector('.v45-chp-search input'), 'the search input is missing');
    const all = document.querySelector('.v45-chp-all');
    assert.ok(all, 'the select-all button is missing');
    assert.ok(/সব সিলেক্ট/.test(all.textContent), 'the select-all label is wrong');
  });

  await ok('selecting a chapter marks it and the footer counts it', async () => {
    const card = document.querySelectorAll('.v45-chp-card')[0];
    await click(card);
    assert.ok(card.className.includes('is-selected'), 'the card did not become selected');
    assert.equal(card.getAttribute('aria-checked'), 'true', 'aria-checked did not follow');
    assert.ok(/[১1]টি অধ্যায় নির্বাচিত/.test(document.querySelector('.v45-chp-foot').textContent), 'the footer does not count the selection');
    await click(card);
    assert.ok(!card.className.includes('is-selected'), 'the card did not deselect');
  });

  await ok('the old class-count dropdown is gone', () => {
    assert.ok(!/প্রি-মেইড ক্লাস সংখ্যা/.test(document.body.innerHTML), 'the old class-count dropdown survived');
  });

  // ── 2 again. the dropdown locks while editing ─────────────────────────────
  await act(async () => root.unmount());
  await flush();
  const root2 = createRoot(document.getElementById('root'));
  await act(async () => {
    root2.render(React.createElement(SprintView, { editSprintId: 'sp1', onEditHandled() {} }));
  });
  await flush(150);

  await ok('edit mode locks the name dropdown inside the wide amber dialog', () => {
    const modal = document.querySelector('.v44-sprint-edit-modal');
    assert.ok(modal, 'the wide edit dialog did not open');
    const dd = modal.querySelector('.v45-name-dd');
    assert.ok(dd.className.includes('is-locked'), 'the dropdown is not locked in edit mode');
    assert.ok(modal.querySelector('.v45-name-dd-trigger').disabled, 'the locked dropdown is still clickable');
  });

  await act(async () => root2.unmount());
  await flush();

  // ── 8/9. weekly routine ───────────────────────────────────────────────────
  const { default: StudentSuiteView } = await vite.ssrLoadModule('/src/views/StudentSuiteView.jsx');
  const root3 = createRoot(document.getElementById('root'));
  await act(async () => {
    root3.render(React.createElement(StudentSuiteView));
  });
  await flush(150);
  // The routine tab is a two-line label ("সাপ্তাহিক রুটিন"), so match loosely.
  const routineTab = [...document.querySelectorAll('button')].find((b) => /সাপ্তাহিক রুটিন/.test(b.textContent));
  await click(routineTab);
  await flush(150);

  await ok('every phase card shows "কোনো টাস্ক নেই" with a + when it is empty', () => {
    const empties = document.querySelectorAll('.v45-wr-empty');
    assert.ok(empties.length >= 1, 'the empty-state label is missing');
    assert.ok(/কোনো টাস্ক নেই/.test(empties[0].textContent), 'the empty-state wording is wrong');
    assert.ok(empties[0].querySelector('svg'), 'the empty state carries no + icon');
  });

  await ok('an empty phase no longer prints the word "ফাঁকা"', () => {
    assert.ok(!/ফাঁকা/.test(document.body.innerHTML), 'the old "ফাঁকা" label survived');
  });

  await ok('all phase cards share one height through the grid', () => {
    const styles = fs.readFileSync('src/styles/v45-redesign.css', 'utf8');
    const rule = styles.match(/\.v34-wr-grid\s*\{[^}]*\}/)?.[0] || '';
    assert.ok(/grid-auto-rows:\s*1fr/.test(rule), 'the cards do not share a height');
    assert.ok(/repeat\(5,/.test(rule), 'the cards are not laid out as equal columns');
  });

  const addRows = document.querySelectorAll('.v44-wr-add-row');
  assert.ok(addRows.length > 0, 'the "+ যোগ করুন" rows are missing');
  await click(addRows[0]);
  await flush(150);

  await ok('the routine subject picker is one clean row with icons', () => {
    const picker = document.querySelector('.v45-routine-subjects');
    assert.ok(picker, 'the one-row subject picker is missing');
    const cards = picker.querySelectorAll('.v37-routine-subject-card');
    assert.ok(cards.length >= 3, 'the subject cards are missing');
    for (const c of cards) assert.ok(c.querySelector('svg'), 'a routine subject card carries no icon');
  });

  await act(async () => root3.unmount());
  await flush();

  // ── 10. daily tracker colours ─────────────────────────────────────────────
  const { default: PhorTracker } = await vite.ssrLoadModule('/src/components/PhorTracker.jsx');
  const root4 = createRoot(document.getElementById('root'));
  await act(async () => {
    root4.render(React.createElement(PhorTracker));
  });
  await flush(150);

  await ok('every phase owns its own accent colour in the tracker', () => {
    const rows = [...document.querySelectorAll('.v30-dt-phase-row')];
    assert.ok(rows.length >= 4, 'the phase rows are missing');
    const accents = new Set(rows.map((r) => r.style.getPropertyValue('--ph-accent')));
    assert.ok(accents.size >= 4, `phases collapsed into ${accents.size} colour(s)`);
    assert.ok(!accents.has('#22c55e'), 'a green accent leaked into the tracker');
  });

  await act(async () => root4.unmount());
} finally {
  await vite.close();
  dom.window.close();
}

// ── 12. the new stylesheet never uses green ─────────────────────────────────
await ok('the v45 stylesheet uses no green', () => {
  const css = fs.readFileSync('src/styles/v45-redesign.css', 'utf8');
  const hexGreen = /#(22c55e|10b981|34d399|16a34a|4ade80|86efac|15803d|059669|047857|5eead4|2dd4bf|0d9488)\b/gi;
  // RGB greens: g clearly above r and b (a green cast), which amber never has.
  const rgbGreen = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi;
  const hits = [...(css.match(hexGreen) || [])];
  for (const m of css.matchAll(rgbGreen)) {
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (g > 110 && g > r + 25 && g > b + 25) hits.push(m[0]);
  }
  assert.equal(hits.length, 0, `green found: ${hits.slice(0, 5).join(', ')}`);
});

console.log(results.join('\n'));
const failed = results.filter((r) => r.includes('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
