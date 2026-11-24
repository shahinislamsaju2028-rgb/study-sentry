@echo off
REM One double-click setup: runs git-init-repo.ps1 and keeps this window open.
cd /d "%~dp0"
echo Running Study Sentry GitHub setup...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-init-repo.ps1" -RepoName study-sentry
echo.
echo Press any key to close...
pause >nul
