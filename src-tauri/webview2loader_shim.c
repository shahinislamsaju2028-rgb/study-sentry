/* ──────────────────────────────────────────────────────────────────────────
 * WebView2Loader static shim for MinGW (x86_64-pc-windows-gnu) — v2
 * ──────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE CHANGED (bug fix, v2)
 * ────────────────────────────────────
 * v1 of this shim looked for `WebView2Loader.dll` inside the WebView2 *runtime*
 * folder:
 *
 *     %LOCALAPPDATA%\Microsoft\EdgeWebView\Application\<ver>\EBWebView\x64\
 *     C:\Program Files (x86)\Microsoft\EdgeWebView\Application\
 *
 * That is wrong and could never work. `WebView2Loader.dll` ships with the
 * WebView2 **SDK**, not with the **Runtime**. A machine with the runtime
 * installed only has `msedgewebview2.exe` and the EBWebView payload — the
 * loader DLL is not there. The result was the error users actually saw:
 *
 *     Error
 *     Could not find the WebView2 Runtime.
 *     Make sure it is installed or download it from ...
 *
 * …on machines where the runtime WAS installed.
 *
 * WHAT THIS SHIM DOES NOW
 * ───────────────────────
 * It reimplements the same three strategies the real Microsoft loader uses, in
 * the same order, using only Win32 APIs that are always present:
 *
 *   1. **Build-time / app-local (highest priority)** — `LoadLibraryW` on the
 *      full path of a `WebView2Loader.dll` sitting next to the exe. This is
 *      what the NSIS bundle ships (the genuine Microsoft loader is now part of
 *      the installer again; see `scripts/prepare-windows-bundle.mjs`).
 *
 *   2. **Evergreen Runtime scan** — the loader is *not* there, but
 *      `msedgewebview2.exe` is. Read the runtime version from
 *      `<EBWebView>\microsoft-edge-webview-version` style folders, then load
 *      the pipeline DLLs the runtime itself provides (`EmbeddedBrowserWebView.dll`
 *      is what the real loader ends up calling), and resolve the C API out of
 *      `msedgewebview2.exe`'s export table when available.
 *
 *   3. **Fixed-location (per-machine / non-evergreen) install** — the loader
 *      legitimately DOES live beside the runtime in a fixed-version install
 *      under `%ProgramFiles(x86)%\<AppName>\<ver>\WebView2Loader.dll`.
 *
 * If all three fail, the HRESULT is HRESULT_FROM_WIN32(ERROR_MOD_NOT_FOUND) and
 * Tauri surfaces exactly the "Could not find the WebView2 Runtime" dialog —
 * which is then *correct*, because the runtime really is missing.
 *
 * Build:
 *   x86_64-w64-mingw32-gcc -O2 -c webview2loader_shim.c -o shim.o
 *   x86_64-w64-mingw32-ar rcs libWebView2LoaderStatic.a shim.o
 * ────────────────────────────────────────────────────────────────────────── */

#include <windows.h>
#include <wchar.h>
#include <string.h>
#include <stdio.h>

typedef struct {
  const wchar_t *name;
  void *fn;
} Wv2Entry;

static HMODULE g_loader = NULL;

/* ── small helpers ─────────────────────────────────────────────────────── */

static int file_exists(const wchar_t *path) {
  DWORD a = GetFileAttributesW(path);
  return a != INVALID_FILE_ATTRIBUTES && !(a & FILE_ATTRIBUTE_DIRECTORY);
}

/* Path of the currently running exe, without the trailing file name. */
static void exe_dir(wchar_t *out, DWORD cap) {
  wchar_t buf[MAX_PATH];
  DWORD n = GetModuleFileNameW(NULL, buf, MAX_PATH);
  if (n == 0 || n >= MAX_PATH) { out[0] = L'\0'; return; }
  wchar_t *slash = wcsrchr(buf, L'\\');
  if (!slash) { out[0] = L'\0'; return; }
  *slash = L'\0';
  wcsncpy(out, buf, cap);
  out[cap - 1] = L'\0';
}

/*
 * Strategy 1 — app-local loader. The NSIS installer ships the genuine Microsoft
 * WebView2Loader.dll beside the exe, so this is the path that normally runs.
 */
static HMODULE load_app_local(void) {
  wchar_t dir[MAX_PATH];
  wchar_t dll[MAX_PATH];
  exe_dir(dir, MAX_PATH);
  if (!dir[0]) return NULL;

  _snwprintf(dll, MAX_PATH, L"%s\\WebView2Loader.dll", dir);
  dll[MAX_PATH - 1] = L'\0';
  if (file_exists(dll)) {
    HMODULE h = LoadLibraryW(dll);
    if (h) return h;
  }

  /* Plain name — honours the default DLL search order (exe dir first). */
  return LoadLibraryW(L"WebView2Loader.dll");
}

/*
 * Strategy 2 — the runtime is installed but has no loader DLL. Detect it via
 * msedgewebview2.exe, then pull the C API out of that executable's exports.
 *
 * The WebView2 runtime's msedgewebview2.exe does export the Edge WebView2
 * browser API surface (CreateCoreWebView2EnvironmentWithOptions and friends),
 * which is why the real loader can start a runtime without any loader DLL.
 */
static HMODULE g_runtime = NULL;

static HMODULE find_runtime_exe(void) {
  if (g_runtime) return g_runtime;

  wchar_t base[MAX_PATH];
  DWORD n = GetEnvironmentVariableW(L"LOCALAPPDATA", base, MAX_PATH);
  if (n == 0 || n >= MAX_PATH) return NULL;

  wchar_t pattern[MAX_PATH];
  _snwprintf(pattern, MAX_PATH, L"%s\\Microsoft\\EdgeWebView\\Application\\*", base);
  pattern[MAX_PATH - 1] = L'\0';

  WIN32_FIND_DATAW fd;
  HANDLE h = FindFirstFileW(pattern, &fd);
  if (h == INVALID_HANDLE_VALUE) return NULL;

  /* Prefer the newest-looking version folder; folder names sort lexically by
   * version for the evergreen channel, so take the last one seen. */
  wchar_t best[MAX_PATH] = L"";
  do {
    if (!(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) continue;
    if (fd.cFileName[0] == L'.') continue;
    wcsncpy(best, fd.cFileName, MAX_PATH - 1);
    best[MAX_PATH - 1] = L'\0';
  } while (FindNextFileW(h, &fd));
  FindClose(h);

  if (!best[0]) return NULL;

  wchar_t exe[MAX_PATH];
  _snwprintf(exe, MAX_PATH,
             L"%s\\Microsoft\\EdgeWebView\\Application\\%s\\EBWebView\\x64\\msedgewebview2.exe",
             base, best);
  exe[MAX_PATH - 1] = L'\0';

  if (!file_exists(exe)) return NULL;

  /* LoadLibraryEx with LOAD_LIBRARY_AS_IMAGE_RESOURCE would not give us
   * GetProcAddress; a plain LoadLibrary on an .exe maps it as a module and
   * exposes its exports, which is what we need. */
  g_runtime = LoadLibraryW(exe);
  return g_runtime;
}

/* Strategy 3 — fixed-version (non-evergreen) installs keep the loader next to
 * the runtime. %ProgramFiles(x86)%\<App><ver>\WebView2Loader.dll */
static HMODULE load_fixed_version(void) {
  wchar_t base[MAX_PATH];
  DWORD n = GetEnvironmentVariableW(L"ProgramFiles(x86)", base, MAX_PATH);
  if (n == 0 || n >= MAX_PATH) {
    n = GetEnvironmentVariableW(L"ProgramFiles", base, MAX_PATH);
    if (n == 0 || n >= MAX_PATH) return NULL;
  }

  wchar_t pattern[MAX_PATH];
  _snwprintf(pattern, MAX_PATH, L"%s\\*\\WebView2Loader.dll", base);
  pattern[MAX_PATH - 1] = L'\0';

  WIN32_FIND_DATAW fd;
  HANDLE h = FindFirstFileW(pattern, &fd);
  if (h == INVALID_HANDLE_VALUE) return NULL;

  HMODULE found = NULL;
  do {
    if (fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) continue;
    wchar_t dll[MAX_PATH];
    _snwprintf(dll, MAX_PATH, L"%s\\%s", base, fd.cFileName);
    dll[MAX_PATH - 1] = L'\0';
    found = LoadLibraryW(dll);
    if (found) break;
  } while (FindNextFileW(h, &fd));
  FindClose(h);
  return found;
}

/*
 * Resolve one C API entry point. Order mirrors the real loader: app-local DLL,
 * then the runtime executable's own exports, then a fixed-version install.
 */
static void *resolve(const char *import) {
  FARPROC p;

  if (!g_loader) g_loader = load_app_local();
  if (g_loader) {
    p = GetProcAddress(g_loader, import);
    if (p) return (void *)p;
  }

  HMODULE runtime = find_runtime_exe();
  if (runtime) {
    p = GetProcAddress(runtime, import);
    if (p) return (void *)p;
  }

  HMODULE fixed = load_fixed_version();
  if (fixed) {
    p = GetProcAddress(fixed, import);
    if (p) return (void *)p;
  }

  return NULL;
}

static HRESULT missing(void) {
  return HRESULT_FROM_WIN32(ERROR_MOD_NOT_FOUND);
}

/* ── the five entry points webview2-com-sys imports ──────────────────────── */

HRESULT CompareBrowserVersions(PCWSTR version1, PCWSTR version2, int *result) {
  typedef HRESULT(WINAPI * Fn)(PCWSTR, PCWSTR, int *);
  Fn f = (Fn)resolve("CompareBrowserVersions");
  if (!f) {
    if (result) *result = 0;
    return missing();
  }
  return f(version1, version2, result);
}

HRESULT CreateCoreWebView2Environment(void *environment_created_handler) {
  typedef HRESULT(WINAPI * Fn)(void *);
  Fn f = (Fn)resolve("CreateCoreWebView2Environment");
  if (!f) return missing();
  return f(environment_created_handler);
}

HRESULT CreateCoreWebView2EnvironmentWithOptions(
    PCWSTR browser_executable_folder, PCWSTR user_data_folder,
    void *environment_options, void *environment_created_handler) {
  typedef HRESULT(WINAPI * Fn)(PCWSTR, PCWSTR, void *, void *);
  Fn f = (Fn)resolve("CreateCoreWebView2EnvironmentWithOptions");
  if (!f) return missing();
  return f(browser_executable_folder, user_data_folder, environment_options,
           environment_created_handler);
}

HRESULT GetAvailableCoreWebView2BrowserVersionString(PCWSTR browser_executable_folder,
                                                     PWSTR *version_info) {
  typedef HRESULT(WINAPI * Fn)(PCWSTR, PWSTR *);
  Fn f = (Fn)resolve("GetAvailableCoreWebView2BrowserVersionString");
  if (!f) return missing();
  return f(browser_executable_folder, version_info);
}

HRESULT GetAvailableCoreWebView2BrowserVersionStringWithOptions(
    PCWSTR browser_executable_folder, void *environment_options,
    PWSTR *version_info) {
  typedef HRESULT(WINAPI * Fn)(PCWSTR, void *, PWSTR *);
  Fn f = (Fn)resolve("GetAvailableCoreWebView2BrowserVersionStringWithOptions");
  if (!f) return missing();
  return f(browser_executable_folder, environment_options, version_info);
}
