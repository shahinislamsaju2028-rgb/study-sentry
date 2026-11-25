#!/usr/bin/env bash
# Extracts the platform-independent guard predicates from guard.rs and runs them
# as a plain Rust test binary, so the allow / pause / block rules can be checked
# on any machine without building the Tauri app.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP="$(mktemp -d)"
python3 - "$ROOT" "$TMP" <<'PY'
import pathlib, sys
root, tmp = map(pathlib.Path, sys.argv[1:3])
src = (root / 'src-tauri/src/guard.rs').read_text()
start = src.index('/// Strictly checks whether a Brave address-bar URL is permitted')
end = src.index('impl GuardEngine {')
(tmp / 'guard_extract.rs').write_text(src[start:end])
test = (root / 'tests/rust/guard_verdicts_test.rs').read_text().replace(
    'include!("/tmp/guard_extract.rs");',
    f'include!(r"{(tmp / "guard_extract.rs").resolve()}");')
(tmp / 't.rs').write_text(test)
PY
rustc --test --edition 2021 "$TMP/t.rs" -o "$TMP/guard_test"
"$TMP/guard_test"
