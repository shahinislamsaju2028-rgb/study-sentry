!macro NSIS_HOOK_PREINSTALL
  ; 1. Request graceful close first so SQLite WAL flushes cleanly, then force-terminate any lingering process
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /IM "study-sentry.exe"'
  Pop $0
  Pop $1
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /IM "Study Sentry.exe"'
  Pop $0
  Pop $1
  Sleep 550
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "study-sentry.exe" /T'
  Pop $0
  Pop $1
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "Study Sentry.exe" /T'
  Pop $0
  Pop $1
  Sleep 350

  ; 2. Remove legacy hyphenated binary (study-sentry.exe) in both User & Machine install dirs
  Delete "$INSTDIR\study-sentry.exe"
  Delete "$INSTDIR\Study Sentry.exe"
  Delete "$LOCALAPPDATA\Study Sentry\study-sentry.exe"
  Delete "$PROGRAMFILES64\Study Sentry\study-sentry.exe"
  Delete "$PROGRAMFILES\Study Sentry\study-sentry.exe"

  ; 3. Eliminate duplicate opposite-scope installs so Desktop/Start Menu shortcuts never launch an old copy
  ${If} $INSTDIR == "$LOCALAPPDATA\Study Sentry"
    Delete "$PROGRAMFILES64\Study Sentry\Study Sentry.exe"
    Delete "$PROGRAMFILES64\Study Sentry\WebView2Loader.dll"
    Delete "$COMMONDESKTOP\Study Sentry.lnk"
    Delete "$SMPROGRAMS\Study Sentry.lnk"
  ${ElseIf} $INSTDIR == "$PROGRAMFILES64\Study Sentry"
    Delete "$LOCALAPPDATA\Study Sentry\Study Sentry.exe"
    Delete "$LOCALAPPDATA\Study Sentry\WebView2Loader.dll"
  ${EndIf}

  ; 4. Purge stale WebView2 HTTP/JS/GPU caches (strictly preserves SQLite study DB in %APPDATA%)
  RMDir /r "$LOCALAPPDATA\com.studysentry.desktop.personal\EBWebView\Default\Cache"
  RMDir /r "$LOCALAPPDATA\com.studysentry.desktop.personal\EBWebView\Default\Code Cache"
  RMDir /r "$LOCALAPPDATA\com.studysentry.desktop.personal\EBWebView\Default\GPUCache"
  RMDir /r "$LOCALAPPDATA\com.studysentry.desktop.personal\EBWebView\Default\Service Worker\CacheStorage"
  Delete "$LOCALAPPDATA\com.studysentry.desktop.personal\.webview_build_id"

  ; 5. Restore the "overwrite existing files" behaviour for the payload copy.
  ;    `SetOverwrite on` is not enough: Tauri's NSIS template enables the
  ;    "Do not overwrite files that are not older" ("check if newer") flag in
  ;    the install page. When that flag is on, an existing file whose timestamp
  ;    is newer than the one in the installer is SKIPPED — which is exactly what
  ;    happens on a reinstall over a running/newer build, and it would leave a
  ;    stale WebView2Loader.dll (or an older Study Sentry.exe) in $INSTDIR.
  ;    `ifdiff` replaces the file whenever its timestamp or size differs, which
  ;    clears the "skip newer" flag while still avoiding pointless writes of an
  ;    identical payload on a same-build reinstall.
  SetOverwrite ifdiff
  SetOutPath "$INSTDIR"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /IM "study-sentry.exe"'
  Pop $0
  Pop $1
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /IM "Study Sentry.exe"'
  Pop $0
  Pop $1
  Sleep 450
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "study-sentry.exe" /T'
  Pop $0
  Pop $1
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "Study Sentry.exe" /T'
  Pop $0
  Pop $1
  Sleep 300
!macroend
