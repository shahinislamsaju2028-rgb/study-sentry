// ─────────────────────────────────────────────────────────────────────────
// Standalone (hosted) entry point.
//
// Used only for the static web build (`npm run build:web`). Sets the flag the
// data layer already honours (see src/context/StudyContext.jsx) so that:
//   • no /api/state fetch is attempted — there is no server middleware here;
//   • state is read from and written to localStorage;
//   • the demo seed is used on a first visit.
//
// The Tauri/desktop bundle keeps using src/main.tsx unchanged.
// ─────────────────────────────────────────────────────────────────────────
window.__STUDYSENTRY_STANDALONE_PREVIEW__ = true;

import('./main.tsx');
