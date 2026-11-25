# Study Sentry — Handoff

**Version:** 4.3.5
**Date:** 2026-11-22
**Stack:** Vite + React 18 + TypeScript (strict on the shell, JSX components) · Tauri v2 shell for Windows · Supabase for the Study Lounge

This file is the running record of what changed, from the first version the app
was handed over in, through every brief since. It is written so that the next
person can (a) understand the design laws the codebase is now held to, and
(b) find the exact file that owns any behaviour they need to touch.

---

## 0. How to run it

```bash
npm install
npm run dev            # http://localhost:5173 — live preview / hot reload
npm run typecheck      # tsc --noEmit — must stay clean
npm test               # curated regression suite (see tests/STALE_TESTS.md)
npm run build:web      # production web build → dist-web/
npx tauri build --target x86_64-pc-windows-gnu --bundles nsis   # Windows installer
```

`tests/run-all.mjs` lists the live checks. `v45-redesign-check` (20/20),
`v43-sprint-planner-check` (13/13), `group-redesign-check` (PASS), and
`v59-suite-redesign-check` are the focused gates; the rest are historical and
documented as stale in the test runner.

---

## 1. Design laws (these are enforced by review, not by tests)

These came out of the briefs and every later change is expected to obey them.

1. **One design per pattern.** If a control appears on two surfaces it is the
   same component. `ActivityChips`, `ChapterPicker`, `PhaseModeCards` and
   `GroupVector` are the four shared vocabularies. Never fork one.
2. **No numbers that were not asked for.** Chapter titles dropped their numbers
   entirely (v4.2). Dates, counts and percentages use Latin numerals; Bengali is
   for words, labels and subject names (see the policy comment at the top of
   `src/utils/bangla.js`).
3. **A control states its own state.** Sliders show position, pips show counts,
   rings show completion. A label that changes text after a click is a bug.
4. **Chrome hides until needed.** The top bar is edge-revealed, the PiP pill
   yields to fullscreen and zen, the card tool cluster appears on hover.
5. **No decorative prose.** If the drawing or the number already says it, the
   sentence is removed (status pill above the focus clock, posture caption in
   the scene corner, backup-cadence paragraph in Settings).
6. **Objects get independent surfaces.** The Weekly Routine stays horizontal,
   but each day is its own rounded card; each period and task is a separate
   compact, rounded surface. Do not merge them into one ruled frame.

---

## 2. Chronology

### v1 — first handover
Single-page focus timer. Study/Tasks/Insights as plain views, a stock timer ring,
default typography, no design system. Everything below sits on top of this.

### v2 — clean suite shell
- `src/views/CommandHubView.jsx` became the home board.
- Split the UI into `views/` (one file per screen) + `components/` (shared).
- Introduced `src/styles/v2-clean-suite.css` and the first `.card` primitive.

### v3 → v4.0 — bento home and the card scale
- The home board became a bento grid (`bento-card`, `span-4`, tone classes).
- **ONE CARD SCALE + radius law** written into CSS: one radius token
  (`--ui-rad-k`), one padding rhythm, one border alpha; every new surface
  inherits rather than invents.
- 3D spatial motion engine (`src/components/SpatialMotionEngine.jsx`) with a
  Calm/Ultra mode, later surfaced as the top-bar switch.

### v4.0.0 — shipped Windows build
- Tauri v2 Windows target, NSIS bundle, portable exe.
- Drive delivery: setup / web / source zips.

### v4.1.0 — the 4.txt brief (16 items)
Shipped under the segment letters R–S in the work log:
- **Wall clock** replaced the ring as the Focus hero (`v48-wall-clock-face`,
  `AnalogFocusDial`, `FocusDigitalReadout`).
- **FocusRoomScene** — the illustrated room with three states (studying / break /
  resting): window with moon, picture frames, desk, lamp, mug, paper stack.
- **Hands v3** — both forearms on the keyboard with a palm, a thumb and four
  finger ticks; slow two-beat typing.
- **Duration presets** for every timer field.
- **Telemetry ribbon** across the focus card.
- **Phase tabs** on Insights, **step seal** on the sprint wizard.
- **Name picker** on first run, **plan-grid width** fixes.
- **Squircle nav** (bottom dock), **routine tints**, **paper stack**.
- Version bump 4.0.0 → 4.1.0, rebuilt, re-zipped, re-uploaded; the three v4.0.0
  Drive files were trashed after the v4.1.0 links went live.

### v4.1 → v4.2 — the 4-2.txt brief (9 items)
1. **Chapter picker, one design everywhere.** `ChapterPicker.jsx` is the single
   implementation; `CurriculumPicker`, `SprintChapterPicker`,
   `SprintChapterMultiPicker`, `SyllabusChapterTree` are thin adapters.
   Paper ১ম/২য় পত্র became a sliding capsule (26px segments, `::before` thumb,
   `[data-paper='2']`), chapter cards became accent-gradient plates with a 3px
   accent rail and a filled check disc when selected.
   Fixed a real bug: `--chp-accent: var(--chp-accent, #fbbf24)` was
   self-referencing and resolved to empty, so every accent-driven style had
   silently gone grey.
2. **Focus illustration.**
   - Laptop redrawn in three-quarter perspective (~75° off the camera): the far
     edge recedes up-right, the near corner comes forward, the body follows the
     same axis, the lid closes when resting. Screen carries code lines raked
     along the skew plus one blinking caret.
   - Hands moved onto the raked deck; the right hand sits higher and smaller.
   - The clip-art houseplant was replaced by three artefacts: a wide ceramic
     planter with broad leaves, a book stack standing in as a lamp table with a
     small brass reading lamp, and a tall floor vase with dried stems.
   - The Bangla status pill above the clock and the posture caption in the
     scene corner were removed from view (kept as `role="status"` sr-only text).
   - **Fullscreen rebuilt**: edge-to-edge stage, no floating 1180px card. The
     scene's viewBox grows 118 units above and below (`tall` prop) so the stage
     fills the screen and shows *more* room — cornice above, board seams below —
     instead of letterboxing. Top rail: subject, reading type, live state, clock.
     Bottom rail: progress, elapsed, remaining, pause and close.
   - The floating PiP pill is hidden while fullscreen (`body:has(.v51-illus-stage)`).
   - **Zen mode completely rebuilt**: the old orbit-ring-with-BODONI-digits paper
     clock is gone; zen is now the room full-bleed with two gradient rails and a
     transport bar.
3. **কাজের ধরন is one control.** `TodoTaskEditor`'s private `tp-chip-row` was
   replaced with the shared `ActivityChips`.
4. **Insights.**
   - `অধ্যায়ন প্রহর` went **back to the box form**: the radial gauge was rejected
     and replaced by a box whose own fill is the progress, with elapsed / target
     and the percentage inside it, plus the 12-step rail.
   - The duplicate subject minutes row under the donut (`v48-subj-rank`) was
     deleted — the chips already carry both numbers.
   - Subject chips now anchor on the donut's centre line; the card sizes to its
     content instead of stretching to the chart beside it.
5. **Overview cards.** The deadline / progress tiles were compacted: tighter
   padding, smaller icon, figures on one baseline, ellipsis instead of wrap.
6. **Syllabus / weekly routine.**
   - The seven day cards became a segmented week ruler: square corners, no
     shadow, hairline dividers, height set by their two lines, selection as a
     filled block with a 2px top edge.
   - Phase columns share one frame with the strip and stop where their content
     stops.
   - The `অধ্যায় খুঁজুন` box was removed from the syllabus tab (the picker keeps
     it on every other surface via a `hideSearch` prop).
7. **Study Lounge.** `+ গ্রুপ` became a right-hand sheet with a scrim, Escape to
   close, and the live room still visible behind it. The hand-drawn emblem set
   grew from **10 to 24** symbols in `GroupVector.jsx` (flask, pen, compass,
   atom, globe, clock, leaf, rocket, book, medal, puzzle, spark, scales, moon
   added; all 32×32, no icon library, no emoji).
8. **প্রহর ও প্রোফাইল.** `PhaseModeCards` was rebuilt as a day: a 24-hour ruler
   with every phase window at its true position, and one row per schedule that
   lights its own slice of that ruler, shows the phase emblems, and states the
   total hours.
9. **Top bar.** Hides above the viewport and slides down when the pointer reaches
   the top 18px (hysteresis to 64px so it cannot flicker), returns on keyboard
   focus, always visible on touch. The 3D motion switch became a two-position
   slider — Calm ⟷ 3D — with fixed labels so the knob position *is* the state.

### v4.2.0 — the 5.txt brief (5 items + this file)

#### ① Syllabus chapter cards, rewritten
`src/views/StudentSuiteView.jsx` + new `bnChapterName` in `src/utils/bangla.js`.

- **Chapter names are Bengali and carry no number.** `bnChapterName()` strips
  `Ch 4:`, `Chapter 2 -`, `অধ্যায় ২:` and range forms like `Ch 9.1–9.3:`, then
  maps the known titles. The seed map's English keys now render as
  ভৌত জগৎ ও পরিমাপ / ভেক্টর / নিউটনীয় বলবিদ্যা / সীমা ও অন্তরীকরণ /
  অন্তরীকরণের প্রয়োগ / গুণগত রসায়ন / সংখ্যা পদ্ধতি ও ডিজিটাল লজিক.
  Unparseable (user-authored) titles pass through untouched.
- **New card anatomy** (`.v52-ch-card`): a subject-tinted plate with a 3px left
  rail, the paper tag, a two-line-clamped Bengali name, a percent **ring**, one
  **pip per type** filled when that type is fully ticked, the type tally
  (`3 টাইপ · 1/3 সম্পন্ন`), a progress rail, the topic count (`0/4 টপিক`) and a
  `সম্পন্ন দেখুন` button. Edit and delete moved into a hover cluster so they stop
  competing with the numbers. The `টপিক দেখুন` expander keeps the in-place
  topic tree.
- The legacy `v30-syl-ch-card` layout rules are explicitly neutralised once at
  the top of the new block instead of being fought property by property.

#### ② The `সম্পন্ন` dialog, rebuilt
`src/components/SyllabusChecklist.jsx` (`.v52-ck`).
- Hero: subject + paper chips, the Bengali chapter name, the tally, and a 76px
  ring. The old dialog said the same thing three ways (percentage, bar, caption).
- Tools collapsed into one row: search capsule with a clear button, a three-way
  filter thumb, and a `সব` / `রিসেট` toggle.
- The flat checkbox list became **one tinted card per type**, cycling five
  tones, each with its own count, percentage and rail. Topic rows are full-width
  targets with a filled box and a struck label when done.
- Footer states the outcome (`সব টপিক সম্পন্ন` or `nটি টপিক বাকি`) and closes.

#### ③ Study Lounge illustration — the body angle
`src/components/LiveStudyScene.jsx`. Only the figure changed; the backdrop, desk,
lamp, plant, window and shelf are untouched.
- The figure used to sit square to the camera (two symmetric shoulders, centred
  head, laptop facing the viewer), which read as a portrait of a desk. It is now
  turned ~75° toward the screen: asymmetric torso wedge with the near shoulder
  forward, short angled neck, elliptical head pushed right of the torso centre,
  hair mass on the far side of the skull with a shadowed back-of-head, profile
  features only on the near edge (one eye, a brow line, a cheek smile), the
  headphone band running back over the skull with the near cup oversized, and
  the working arm starting high from the near shoulder.

#### ④ `প্রোফাইল ও ডিফল্ট সময়সীমা`, relaid out
`src/views/SettingsView.jsx` (`.v52-profile-form`).
- The name field became a full-width 48px plate with 14px radius, a leading
  icon and 1rem bold type, with a focus ring; the old two-column grid is gone.
- The four durations are now **one row of four dropdowns** inside a single
  framed group: দৈনিক লক্ষ্য · ফোকাস · ছোট বিরতি · দীর্ঘ বিরতি. Each opens with
  the sensible answers and each keeps a small dashed input underneath for an
  exact value, so the escape hatch survives without four more boxes.
- Sound became two real toggle tracks plus the volume slider on one line.

#### ⑤ Analog clock in fullscreen, with a view switch
`src/views/FocusSessionView.jsx` (`.v52-illus-clock`, `.v52-illus-clock-toggle`).
- The fullscreen stage now renders the same clock the Focus page uses. It used
  to print a bare digital pair regardless of the page's setting.
- A 32px two-button switch beside it flips analog ⟷ digital without leaving
  fullscreen. It is **stage-local state**: it starts from the saved preference
  and never writes back, because changing the view inside fullscreen is a
  viewing decision, not a settings change.
- The dial renders at 104px inside the top rail and does not disturb the
  letterbox-free `tall` scene behind it.

---

## 3. Where things live

| Concern | File |
| --- | --- |
| Design tokens, card scale, all v4.9+ overrides | `src/styles/v49-sprint-unify.css` (append-only; each block is dated by brief) |
| Shared chips (activity / urgency / study mode) | `src/components/ActivityChips.jsx` |
| Chapter picker (all surfaces) | `src/components/ChapterPicker.jsx` |
| Syllabus cards + tabs | `src/views/StudentSuiteView.jsx` |
| Topic checklist dialog | `src/components/SyllabusChecklist.jsx` |
| Focus page, fullscreen stage | `src/views/FocusSessionView.jsx` |
| Focus room illustration | `src/components/FocusRoomScene.jsx` (`status`, `fill`, `tall`) |
| Zen overlay | `src/components/Modals.jsx` → `ZenChamber` |
| Study Lounge + new-group sheet | `src/views/StudyCircleView.jsx` |
| Group creation flow | `src/components/GroupDiscovery.jsx`, `GroupComposer.jsx` |
| Group emblems (24 vectors) | `src/components/GroupVector.jsx` |
| Phase / prhor cards, settings nav | `src/components/PhaseModeModal.jsx` |
| Settings | `src/views/SettingsView.jsx` |
| Top bar (edge reveal, motion slider) | `src/components/TopBar.tsx` |
| Bengali display helpers | `src/utils/bangla.js` (`bnChapterName`, `bnNum`, `bnDate`) |
| Lounge member illustration | `src/components/LiveStudyScene.jsx` |

## 4. Known constraints

- The app enforces **Latin numerals** for digits. `bnNum()` is intentionally an
  identity function; do not "fix" it to emit Bengali digits.
- `--chp-accent` must never be defined in terms of itself (see the v4.2 bug).
- `getComputedStyle(...).getPropertyValue('--x')` returns `""` when the value is
  itself a `var()` chain — probe the resolved element styles instead.
- The web preview runs in a sandboxed iframe with no network: external fonts and
  CDNs will not load there, while the downloaded build works normally.
- `dist-web/` is a build artefact; regenerate it with `npm run build:web` after
  a version bump, and re-zip the source *after* the bump, not before.

## v4.3.0 — 6.txt (33 points)

Released 2026-11-22. Source of truth: `/home/user/uploads/6.txt`.

**Dock & chrome** — nav icons are circles, not rounded squares (①); all motion
reads as 3D (②); the ink-green pips/borders are gone.

**Focus room** — the two handmade plants were removed for an always-running
handmade waterfall in the window (③); the desk lamp was rebuilt with a jointed
arm, a pleated shade and a lit cone (④); the whole scene is animated (⑤); the
laptop moved out from in front of the face into the direction the stretched
left hand points (⑥); সাউন্ড / ফোকাস শুরু / সমাপ্ত were redesigned (⑦).

**Zen** — the analog clock is mounted on the back wall, driven by remaining
session time (⑧).

**Focus config** — the chosen পড়ার ধরন is back as a compact pill above the
fields (⑨); chapters carry a soft tint before hover (⑩) and sit side by side in
two/three columns so nothing scrolls sideways (⑪); the session-limit control no
longer pre-renders every preset (⑫); the পত্র capsule's active state is the
bright gold one (⑬); কনফিগার opens a full-screen sheet (⑭).

**New Task** — full-screen sheet, both sides used, icon tiles with gradient +
inner/outer glow for অগ্রাধিকার / স্টাডি / রিভিশন / এক্সাম / কাজের ধরন (⑮⑯⑲);
date/time pickers recoloured from green to theme gold, compact single-row boxes,
text not shrunk (⑰⑱).

**Chapter select** — অধ্যায় খুঁজুন and নিজে লিখুন removed everywhere (⑳).

**Insights** — অধ্যয়ন প্রহর back to the first version's plain boxes with a
4px hairline rail (㉑); violet and yellow gone from the card views (㉒); the
weekly 3D graph deepened: a lit isometric floor, rim-lit right walls, a soft
tooltip capsule, a quiet goal rule (㉓).

**Sprint** — new-sprint composer is a body-level full-viewport sheet that
scrolls on short windows (㉔㉕); left column holds name/length/dates, right
column holds subject/chapter/phases/minutes, chapter grid uses the shared focus
picker (㉖).

**Student Suite** — chapter cards are plain rounded boxes again, no rail and no
outline (㉗); the syllabus topic popup is full-screen, two columns, 15.5px topic
text (㉘); Biology is green (㉙); Math and Higher Math are one subject shown as
ম্যাথ, and the catalog was merged (㉚); প্রি-মেড সিলেবাস is gone, only অধ্যায় যোগ
remains (㉛).

**Bug fixed in passing** — `AcademicSetupModal.jsx` contained a literal NUL byte
inside a regex character class, which made the single-file build throw
`Range out of order in character class` on boot. It is `\x00` now.

**Artifacts** — `dist-web/` (static host build), `dist-web/StudySentry-4.3.0-web.html`
and `dist-single/StudySentry-4.3.0-web.html` (one self-contained file, fonts and
CSS inlined, opens from disk). Drive: Windows setup
`https://drive.google.com/file/d/1vtS6dbHJoy_1y0TbcMpTsDHG1ZXJJ3sG/view`,
single-file web
`https://drive.google.com/file/d/1VHp5hLMlc7ik3wQOCMNfbRYZhn1mkkJl/view`,
source
`https://drive.google.com/file/d/1Om_GkzaK11kSinYUgk78zv9nldRxIoK6/view`.

**Checks** — `tsc --noEmit` clean · `npm test` 10/24 with 14 known-stale and
**0 blocking** · `npm run build:web` OK · 7-view sweep with 0 page errors ·
sprint sheet verified at 1600×1000 and 1280×720 (scrolls 225px, footer visible).

## v4.3.1 — AI সাইটে টাইমার পজ (7.txt ①)

রিলিজ নোট: `docs/RELEASE-4.3.1.md`

**নিয়ম** — Focus Guard-এ এখন দুই ধরনের allowed:

| ধরন | মানে | কী কী |
|---|---|---|
| allowed · counting | খোলা যাবে, সময় গোনা হবে | Study Sentry, SumatraPDF, PotPlayer, BlueStacks, browsers-with-allowed-URL |
| allowed · resting | খোলা যাবে (কখনো বন্ধ হবে না), ঘড়ি থামবে | Gemini, NotebookLM, arena.ai/agent, Google sign-in |

**কোড**

- `src-tauri/src/guard.rs` — `BraveUrlVerdict::AllowedPausing` ও
  `ForegroundVerdict::AllowedButPausing` যোগ; `evaluate_brave_url` AI হোস্টে
  `AllowedPausing` ফেরায়; `fallback_brave_title_check`-ও একই; স্টেট মেশিন
  `reason: "ai"` সহ `guard://focus-state` পাঠায় এবং **কিছু বন্ধ করে না**।
- `src/context/StudyContext.jsx` — `applyGuardFocusState` নামে একটি হ্যান্ডলার,
  ডেস্কটপ ইভেন্ট ও (প্রিভিউ/টেস্টের জন্য) `window.__studySentryGuardFocus`।
  `reason === 'ai'` হলে আলাদা নরম টোস্ট, কোনো সতর্ক-সাউন্ড নেই।
- `src/components/StrictGuardPanel.jsx` — সেকশন দুই ভাগে, AI কার্ডে `পজ` চিপ।
- `tests/rust/run.sh` + `tests/rust/guard_verdicts_test.rs` — নতুন, প্ল্যাটফর্ম
  নির্বিশেষে চলে; `guard.rs` থেকে বিশুদ্ধ ফাংশন কেটে plain Rust test চালায়।

**যাচাই** — Rust 5/5 · tsc ক্লিন · 20/20 · 13/13 · cargo check (windows-gnu) ক্লিন ·
Playwright ফ্লো: start→running, Gemini→paused, Sumatra→running, Discord→paused+warn,
close→running, ০ এরর।

**Artifacts (Drive)** — setup
`https://drive.google.com/file/d/1Qdt4Y3ewkHGTFCM84pWgd1H80TXbx1JH/view`,
web `https://drive.google.com/file/d/1XNe1841tbqctnoeYGVh8ljHbN_J7eX2R/view`,
source `https://drive.google.com/file/d/1d43bcmgLvfYyaLYYxrDCW_jJHVocb4T8/view`.

## v52 — হায়ারার্কি ও স্পেসিং পাস (CSS-only)

**ফাইল:** `src/styles/v52-hierarchy.css` — `main.tsx`-এ সবার শেষে import করা।
আগের কোনো স্টাইলশিট বদলানো হয়নি, তাই রিভার্ট করতে চাইলে শুধু ওই একটি
import মুছে দিলেই হবে।

**যদি এই লেয়ারে হাত দেন —**

| নিয়ম | কোথায় | কেন |
|---|---|---|
| হিরো `padding: 26px 32px`, `gap: 28px` | §1 | হিরোতে ১৫০px রিং + ৪৬px CTA আছে; 14px প্যাডিংয়ে সব ঘেঁষে যেত |
| ≤1080px-এ `flex-direction: column` | §1 | নিজে থেকে wrap হলে টেলিমেট্রি বাঁ কোণে একা পড়ে থাকত |
| কার্ড `padding: 22px 24px`, গ্রিড `gap: 18px` | §2 | 8px স্কেলে দাঁড় করানো |
| শিরোনাম 14.5/700, সাব 11.5/500, মেট্রিক 30/800 | §3 | একটাই মই, `tabular-nums` সহ |
| পপওভার `blur(28px)`, ২-স্তরের ছায়া | §4 | পেছনের পাতা যেন গলে যায় |
| `.cp-month-nav .cs-trigger` → `display:flex` | §4 | পুরনো বাগ: লেবেল+শেভরন দুই লাইনে ভাঙছিল |
| ডক `blur(34px)`, আইকনে hover-কূপ + active হেলো | §5 | "সিলেক্টেড" আর "হোভার" আলাদা বোঝাতে |
| `body:has(.v4-ai-mentor-banner)` প্যাডিং | §6 | কলআউট আর কনটেন্টের ওপরে ভাসে না |

**টেস্ট:** `npm run test:hierarchy` → 14/14। `tests/run-all.mjs`-এ যোগ করা আছে।

**যাচাই হয়েছে:** 1600 / 1440 / 1280 / 1100 / 900px — কোনোটিতেই horizontal overflow
নেই, কার্ড ওভারল্যাপ নেই, হিরো ঠিকভাবে রিফ্লো করে। ৮টি ভিউ (home, focus, todo,
insights, motivation, tracker, suite, circle) সুইপ — ০ পেজ-এরর।

## v4.3.4 — Sprint Planner refinements (`uploads/5.md`)

- Replaced first-day / final-board style presets with practical HSC-28 options
  for current classes, chapter completion, weekly targets, backlog and near-term
  class tests; group headings and helper hints remain.
- Removed the permanent duplicate custom-name field. Right-clicking a preset
  name now opens its edit menu; a non-preset title uses a temporary edit popover.
- Compact duration and daily class-set steppers share a row. Start and End stay
  together; the deadline's Custom control no longer overlaps its label.
- Sprint chapter choices use the shared Focus / New Task picker styling with a
  larger two-column text scale. Math is shown as “Math” and is retained in the
  science-track sprint choices.
- Phase options are icon-led capsules without time ranges. Calendar year choices
  are searchable; month/year menus share a consistent dark-gold palette.
- Toasts render through a body-level fixed portal. The dock keeps its glass blur
  but no longer paints the multicolour gradient.
- Latest polish layer: `src/styles/v58-sprint-planner.css`, imported after the
  previous style layers.

**Verification:** `npm run build` passes; `npm test` → 11 passing, 14 known-stale,
0 blocking; `npm run test:hierarchy` → 27/27.

**Release files:** `StudySentry-v58-redesign.zip`, `StudySentry-v58-setup.exe`,
and `StudySentry-v58-portable.zip`.

## v4.3.5 — Daily Tracker, Weekly Routine & Syllabus refresh (`uploads/6.md`)

- Removed the circular percentage ring from the Daily Tracker's top header.
- Restored the Weekly Routine day strip to separate horizontal rounded cards,
  with a stronger selected state and clearer inactive/today states.
- Replaced the ruled five-period frame with compact, individually rounded
  phase cards and independent task cards. Both use gradient outlines, tinted
  inner surfaces and restrained outer glow. Period hints, subject labels and
  task metadata now carry leading icons.
- Removed the Syllabus header's overall progress box; the subject filter is
  unchanged. Subject groups now form a colored two-column grid, opening to
  three columns on wide displays.
- Chapter titles are icon-led and use a larger, solid conic-gradient circular
  progress indicator. The rounded type chip opens the full-screen checklist,
  where each type is explicitly marked selected or not selected; partial
  progress remains visible in its topic count.
- Restyled `অধ্যায় যোগ` to match the subject/chapter selector accent language.
- Added `src/styles/v59-suite-redesign.css` as the final imported style layer
  and `tests/v59-suite-redesign-check.mjs` as a blocking regression check.

**Verification:** `npm run build` passes. `npm test` → 12 passing, 14 known-stale,
0 blocking. `npm run test:hierarchy` → 27/27. The Windows x64 NSIS target built
successfully; source and portable archives passed `unzip -t`.

**Release files:**
- `/home/user/StudySentry-v59-redesign.zip` — source archive (verified with `unzip -t`).
- `/home/user/StudySentry-v59-setup.exe` — 4,899,440 bytes; SHA-256
  `d419603fd9a5c5849332e357e7390179827ea212c1013f14f3bb11621fdabee6`
- `/home/user/StudySentry-v59-portable.zip` — 5,760,407 bytes; SHA-256
  `e0d645032ce28ef602169ffd46e83756e48fccbf216afde74a503c12c0448f34`

The Windows build is cross-compiled and unsigned; Windows SmartScreen may warn.
