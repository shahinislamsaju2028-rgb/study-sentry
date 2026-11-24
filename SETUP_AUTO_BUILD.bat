@echo off
REM One time setup: automatic Windows EXE build via GitHub Actions.
REM Put this file AND build-windows.yml together in the project folder,
REM then double-click this file.
cd /d "%~dp0"

echo ============================================
echo    Automatic EXE build - one time setup
echo ============================================
echo.

if not exist "build-windows.yml" (
    echo [ERROR] build-windows.yml not found in this folder.
    echo.
    echo Put SETUP_AUTO_BUILD.bat AND build-windows.yml
    echo together in the project folder, then run again.
    echo.
    pause
    exit /b 1
)

if not exist ".github\workflows" mkdir ".github\workflows"
copy /Y "build-windows.yml" ".github\workflows\build-windows.yml" >nul
if errorlevel 1 (
    echo [ERROR] Could not copy the workflow file.
    pause
    exit /b 1
)
echo [1/2] Workflow file placed: .github\workflows\build-windows.yml

echo.
echo [2/2] Pushing to GitHub (wait a few seconds)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync.ps1" -Message "Add automatic Windows EXE build"
if errorlevel 1 (
    echo.
    echo [ERROR] Push failed - read the messages above.
    pause
    exit /b 1
)

echo.
echo ============================================
echo    DONE!
echo.
echo    From now on: every time code is pushed,
echo    GitHub builds the Windows EXE by itself.
echo.
echo    Download it here:
echo    github.com/shahinislamsaju2028-rgb/study-sentry
echo    -^> Actions tab -^> first run
echo    -^> Artifacts -^> StudySentry-Windows-Setup
echo ============================================
echo.
pause
