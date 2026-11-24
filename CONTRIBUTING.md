# Contributing

## First day: get it running

```bash
npm ci
npm run dev          # browser mode, no Rust needed → localhost:5173
```

You can develop **every UI feature** in browser mode. Native features
(app guard, native dialogs, PiP window) return safe fallbacks via
`isTauriRuntime()`. Only install Rust when you need to test those.

```bash
# when you do need the desktop shell
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
npm run tauri:dev
```

## Before you write code

Read these three, in order. They take ~20 minutes and save days:

1. `src/context/StudyContext.jsx` — the entire app state and every action.
2. `src/bridge/desktopBridge.ts` — the native/browser boundary.
3. `src-tauri/src/lib.rs` → the `generate_handler![]` list — all 29 commands.

## Rules that will bite you if ignored

| Rule | Why |
|---|---|
| Never mutate state from a view | `StudyContext` handles persistence, backups and cross-window sync. Direct mutation silently loses data. |
| Add native features in `desktopBridge.ts`, not in views | Views must stay runnable in a plain browser. |
| Never edit old `v*.css` files | They're ordered cascade layers. Append to `v45-redesign.css` instead. |
| Keep `windows_subsystem = "windows"` in `main.rs` | Without it the exe opens a console window behind the app. |
| Guard `requestAnimationFrame` | jsdom (used by the tests) doesn't implement it. |
| One colour per subject, no reuse | The design system requires distinct hues; `subjectColor()` has a fallback but it looks wrong. |
| No green in the theme | The current palette is brown-gold. Check `src/styles/v45-redesign.css`. |

## Adding a feature: checklist

**Frontend only**
- [ ] Component in `src/components/` or view in `src/views/`
- [ ] Named export, no default
- [ ] Uses `useStudy()` for state, never `localStorage` directly
- [ ] Bengali strings centralised (or inline, but only once)
- [ ] Styles appended to `v45-redesign.css`
- [ ] Test added in `tests/` if it has measurable layout

**With persistence**
- [ ] Field added to the state shape in `StudyContext.jsx`
- [ ] Load path handles the field being absent (old data on disk)
- [ ] `src-tauri/src/db.rs` schema updated if it's a new table
- [ ] Migration path for existing users' data

**With a native capability**
- [ ] `#[tauri::command]` in `lib.rs` (or a submodule)
- [ ] Registered in `generate_handler![]`
- [ ] Wrapper in `desktopBridge.ts` with a browser fallback
- [ ] `#[cfg(target_os = "windows")]` on Win32-only code

## Tests

```bash
node tests/v43-sprint-planner-check.mjs    # 13 checks
node tests/v45-redesign-check.mjs          # 20 checks
node tests/compact-planner-controls.mjs
node tests/sprint-name-control-check.mjs
```

All tests render real components in jsdom and assert on the DOM — so a broken
CSS rule or a changed column count is caught without a browser.

When adding a test:

```js
import { JSDOM } from 'jsdom';
// … render, then:
assert.equal(el.getBoundingClientRect().width, expected);
```

**jsdom caveats:** `getBoundingClientRect()` returns zeros unless you stub it;
`requestAnimationFrame` doesn't exist. Stub both.

## Commit style

```
feat(planner): size chapter columns to the longest name
fix(pip): stop the menu window from stealing focus
style(theme): replace remaining teal accents with brass
docs(readme): document the WebView2 cross-compile shim
```

Scope = the area (`planner`, `insights`, `pip`, `guard`, `theme`, `db`, `build`).

## Code review expectations

- Does it work in **browser mode** as well as Tauri? (unless it's native-only)
- Is the state change in `StudyContext`, not in the view?
- Does old persisted data still load?
- Are the tests green?
- Is Bengali text correct and consistent with the rest of the UI?

## Reporting a bug

Include:
- Windows version + whether WebView2 runtime is installed
- Whether it happens in `npm run dev` (browser) too — that separates UI bugs
  from native bugs
- `%APPDATA%\<app-identifier>\` log/sqlite files if persistence is involved
