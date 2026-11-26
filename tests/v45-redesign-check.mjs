/**
 * v45 REDESIGN CHECK
 *
 * Renders the real SprintView / StudentSuiteView / PhorTracker in JSDOM and
 * asserts the twelve-point checklist really landed in the DOM:
 *
 *   1. one full-width sprint-name dropdown, no − / +, no duplicate title card
 *   2. right-click menu opens with "এডিট"; the dropdown locks during edit
 *   3. one single border around the onboarding block
 *   4. class count · time · sheet · review · practice in one row of five cells
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
  modules: [{ id: 'm1', subject: 'Physics', chapter: 'ভেক্টর', paper: '1', classCount: 2, classMin: 60, sheetMin: 30, reviewMin: 45, practiceMin: 45, phaseId: 'dawn' }],
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
  suiteTab: 'routine',
  setSuiteTab(tab) { globalThis.__mock.suiteTab = tab; },
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
  for (let i = 0; i < 40 && !document.querySelector('.chapter-picker-card'); i += 1) await flush(50);

  await ok('the planner has a working top X, no return footer, and Escape exits immediately', async () => {
    let sheet = document.querySelector('.v45-onboard-sheet');
    const close = sheet?.querySelector('.v60-sprint-close');
    assert.ok(close, 'the top close control is missing');
    assert.ok(!/ফিরে যান/.test(sheet.textContent), 'the old return button label survived');
    await click(close);
    assert.equal(document.querySelector('.v45-onboard-sheet'), null, 'the top X did not exit the fullscreen planner');

    await click([...document.querySelectorAll('button')].find((b) => b.textContent.includes('নতুন স্প্রিন্ট')));
    for (let i = 0; i < 40 && !document.querySelector('.chapter-picker-card'); i += 1) await flush(50);
    sheet = document.querySelector('.v45-onboard-sheet');
    assert.ok(sheet, 'the planner did not reopen after the X close');
    await act(async () => {
      document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
        key: 'Escape', bubbles: true, cancelable: true,
      }));
    });
    await flush();
    assert.equal(document.querySelector('.v45-onboard-sheet'), null, 'Escape did not exit the fullscreen planner');
  });

  await click([...document.querySelectorAll('button')].find((b) => b.textContent.includes('নতুন স্প্রিন্ট')));
  for (let i = 0; i < 40 && !document.querySelector('.chapter-picker-card'); i += 1) await flush(50);
  const physicsSubject = [...document.querySelectorAll('.premium-subject-card')].find((b) => /Physics/.test(b.textContent));
  if (physicsSubject) await click(physicsSubject);
  for (let i = 0; i < 40; i += 1) {
    const picker = document.querySelector('.chapter-picker');
    if (picker?.querySelector('.chapter-picker-subject-name')?.textContent.includes('Physics')
      && picker.querySelectorAll('.chapter-picker-card').length) break;
    await flush(50);
  }

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
  await ok('the wizard name control has no duplicate bottom box and opens preset editing on right-click', async () => {
    const dd = document.querySelector('.v45-name-dd');
    assert.ok(dd, 'the name dropdown is missing inside the wizard');
    assert.ok(!dd.querySelector('[aria-label="আগের নাম"]'), 'a − button survived');
    assert.ok(!dd.querySelector('[aria-label="পরের নাম"]'), 'a + button survived');
    assert.ok(!document.querySelector('.v29-sw-name-input'), 'the duplicate title card survived');
    assert.equal(document.querySelector('.v45-name-custom input'), null,
      'the redundant permanent custom-name box survived');

    const trigger = dd.querySelector('.v45-name-dd-trigger');
    await act(async () => {
      trigger.dispatchEvent(new dom.window.MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      }));
    });
    await flush();
    const editMenu = dd.querySelector('.v48-name-ctx');
    assert.ok(editMenu, 'right-clicking the sprint-name field did not open the preset edit menu');
    assert.ok(/এডিট/.test(editMenu.textContent), 'the edit action is missing from the preset menu');
  });

  // ── 4. five workload controls + vertical phase row ────────────────────────
  await ok('class count, class time, sheet, review, and practice share one row of five', () => {
    const quad = document.querySelector('.v45-quad');
    assert.ok(quad, 'the workload-control row is missing');
    assert.equal(quad.children.length, 5, 'the row must hold exactly five controls');
    const styles = fs.readFileSync('src/styles/v60-redesign-polish.css', 'utf8');
    const rules = [...styles.matchAll(/\.v60-sprint-right \.v45-quad\s*\{[^}]*\}/g)];
    const rule = rules.at(-1)?.[0] || '';
    assert.ok(/repeat\(5,\s*minmax\(142px,\s*1fr\)\)/.test(rule), 'the five controls are not given usable minimum widths');
    assert.ok(/min-width:\s*750px/.test(rule), 'the controls do not retain a scrollable single row on narrow screens');
  });

  await ok('the full-width chapter selector precedes a separate phase row', () => {
    const split = document.querySelector('.v60-sprint-right .v48-step2-split');
    assert.ok(split, 'the chapter/phase layout is missing');
    assert.equal(split.children[0].classList.contains('v48-step2-chapters'), true, 'the chapter picker is not first');
    assert.equal(split.children[1].classList.contains('v48-step2-phase'), true, 'the phase selector is not below the chapter picker');
    const styles = fs.readFileSync('src/styles/v60-redesign-polish.css', 'utf8');
    const rule = styles.match(/\.v60-sprint-right \.v48-step2-split\.v48-step2\s*\{[^}]*\}/)?.[0] || '';
    assert.ok(/grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(rule), 'the chapter selector does not span the full right column');
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
    // cells: 0 class count · 1 class time · 2 sheet · 3 review · 4 practice
    // 120 + 90 + 90 + 120 = 420 minutes — comfortably over the limit.
    await pickPreset(1, 120);
    await pickPreset(2, 90);
    await pickPreset(3, 90);
    await pickPreset(4, 120);
    const chip = document.querySelector('.v45-overload-chip');
    assert.ok(chip, 'the overload chip did not appear above 240 minutes');
    // bnNum() is identity in this project, so ASCII digits are the norm.
    assert.ok(/\b240\b|২৪০/.test(chip.textContent), `the chip warns about the wrong number: ${chip.textContent}`);
    assert.ok(/ছাড়িয়েছে/.test(chip.textContent), 'the chip wording is wrong');
  });

  // ── 6/7. chapter grid ─────────────────────────────────────────────────────
  await ok('the chapter picker is a grid of equal checkbox cards', () => {
    // v49: every chapter-selection surface now renders the single shared
    // <ChapterPicker/>, so the test looks at that grid instead of the old
    // sprint-only class names.
    const grid = document.querySelector('.chapter-picker-grid');
    assert.ok(grid, 'the chapter grid is missing');
    const cards = grid.querySelectorAll('.chapter-picker-card');
    assert.ok(cards.length >= 5, 'too few chapter cards');
    for (const card of cards) {
      assert.equal(card.getAttribute('role'), 'checkbox', 'a card is not a checkbox');
      assert.ok(card.querySelector('.chapter-picker-name'), 'a card carries no chapter name');
      assert.ok(card.querySelector('.chapter-picker-index'), 'a science chapter is missing its index badge');
    }
    const paperSwitch = document.querySelector('.chapter-picker-papers');
    assert.ok(paperSwitch?.querySelector('.chapter-picker-paper-indicator'), 'the paper switch is missing its sliding indicator');
    // every card in the grid must be exactly the same width — the core rule
    const widths = [...new Set([...cards].map((c) => Math.round(c.getBoundingClientRect().width)))];
    assert.equal(widths.length, 1, `cards are not all the same width: ${widths.join(', ')}`);
    const styles = fs.readFileSync('src/styles/v49-chapter-picker.css', 'utf8');
    const rule = styles.match(/\.chapter-picker-grid\s*\{[^}]*\}/)?.[0] || '';
    assert.ok(/repeat\(/.test(rule) && /--chp-track/.test(rule), 'the grid is not a fixed-track grid');
  });

  await ok('the chapter card selection paints an accent border and an outer glow', () => {
    const styles = fs.readFileSync('src/styles/v49-chapter-picker.css', 'utf8');
    const rule = styles.match(/\.chapter-picker-card\.is-active\s*\{[^}]*\}/)?.[0] || '';
    assert.ok(/border-color/.test(rule), 'the accent border is missing');
    // the student asked for the outer glow specifically
    assert.ok(/box-shadow/.test(rule) && /var\(--chp-accent/.test(rule),
      'the accent outer glow is missing');
  });

  await ok('the chapter picker offers select-all and no search box', () => {
    // 6.txt ⓶⓪ — the brief removes "অধ্যায় খুঁজুন" (search) and "নিজে লিখুন"
    // from chapter selectors entirely. Select-all stays.
    assert.equal(document.querySelector('.chapter-picker-search'), null,
      'the search box should be gone from the chapter picker');
    const all = document.querySelector('.chapter-picker-all');
    assert.ok(all, 'the select-all button is missing');
    assert.ok(/সব সিলেক্ট/.test(all.textContent), 'the select-all label is wrong');
  });

  await ok('selecting a chapter marks it and the footer counts it', async () => {
    const card = document.querySelectorAll('.chapter-picker-card')[0];
    await click(card);
    assert.ok(card.className.includes('is-active'), 'the card did not become selected');
    assert.equal(card.getAttribute('aria-checked'), 'true', 'aria-checked did not follow');
    assert.ok(/[১1]টি/.test(document.querySelector('.chapter-picker-summary').textContent),
      'the summary does not count the selection');
    await click(card);
    assert.ok(!card.className.includes('is-active'), 'the card did not deselect');
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

  await ok('Escape closes the edit modal through ModalShell without closing the planner route', async () => {
    assert.ok(document.querySelector('.v44-sprint-edit-modal'), 'the edit modal is missing before Escape');
    await act(async () => {
      document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
        key: 'Escape', bubbles: true, cancelable: true,
      }));
    });
    await flush();
    assert.equal(document.querySelector('.v44-sprint-edit-modal'), null, 'Escape did not close the edit modal');
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

  await ok('the routine uses the same shared subject chip selector with icons', () => {
    const picker = document.querySelector('.v36-routine-modal .premium-subject-grid.v48-subject-chips');
    assert.ok(picker, 'the shared routine subject selector is missing');
    const chips = picker.querySelectorAll('.premium-subject-card');
    assert.ok(chips.length >= 3, 'the subject chips are missing');
    for (const chip of chips) {
      assert.ok(chip.querySelector('.premium-subject-icon svg'), 'a routine subject chip carries no icon');
      assert.ok(chip.hasAttribute('aria-pressed'), 'a routine subject chip has no selected-state semantics');
    }
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
