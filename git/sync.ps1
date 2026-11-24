# sync.ps1
# One-command git sync for the project (run from the project root folder).
#
# Usage:
#   .\sync.ps1 -Message "Fix login bug"    # pull latest + commit ALL changes + push
#   .\sync.ps1 -Message "WIP" -NoPush      # pull + commit only (no push)
#   .\sync.ps1                             # just pull the latest changes from GitHub
#
# Notes:
#   - Safe to run any time; it uses rebase + autostash so local edits are kept.
#   - If pull reports conflicts, run 'git status', resolve, then: git add -A; git rebase --continue
#   - PowerShell blocks scripts by default; if needed run once:
#       Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

param(
    [string]$Message = "",
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".git")) {
    Write-Host "Not a git repository yet. Run git-init-repo.ps1 first." -ForegroundColor Red
    exit 1
}

$hasRemote = @(git remote) -contains "origin"

# --- 1. Pull latest (if remote exists) ----------------------------------
if ($hasRemote) {
    Write-Host "==> Pulling latest changes from GitHub" -ForegroundColor Cyan
    git fetch origin
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Fetch failed - check your internet connection." -ForegroundColor Red
        exit 1
    }

    # Figure out whether the current branch has an upstream yet
    $hasUpstream = $false
    $branch = git rev-parse --abbrev-ref HEAD
    if ($LASTEXITCODE -eq 0 -and $branch) {
        $tracking = git for-each-ref --format="%(upstream:short)" "refs/heads/$branch"
        if ($tracking) { $hasUpstream = $true }
    }

    if ($hasUpstream) {
        git pull --rebase --autostash
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "Pull hit a conflict. Run 'git status' to see it, or ask your AI agent:" -ForegroundColor Yellow
            Write-Host '  "Resolve the git conflict, finish the rebase, then push."' -ForegroundColor Yellow
            exit 1
        }
    }
    else {
        Write-Host "Branch has no upstream yet - skipping pull (first push will set it up)."
    }
}
else {
    Write-Host "No remote yet - skipping pull."
}

# --- 2. Commit (if a message was given) ---------------------------------
if ($Message -ne "") {
    Write-Host "==> Committing: $Message" -ForegroundColor Cyan
    git add -A
    $staged = git status --porcelain
    if ($staged) {
        git commit -m $Message
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Commit failed - check the messages above." -ForegroundColor Red
            exit 1
        }
        Write-Host "Committed." -ForegroundColor Green
    }
    else {
        Write-Host "No changes to commit."
    }
}

# --- 3. Push (unless -NoPush) -------------------------------------------
if ($NoPush) {
    Write-Host "Done (push skipped by -NoPush)."
    exit 0
}

if (-not $hasRemote) {
    Write-Host "No remote yet - nothing to push. Run git-init-repo.ps1 first."
    exit 0
}

Write-Host "==> Pushing to GitHub" -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) {
    # First push on a branch with no upstream: retry with -u
    Write-Host "Retrying with upstream tracking (-u)..."
    git push -u origin HEAD
}
if ($LASTEXITCODE -eq 0) {
    Write-Host "All synced." -ForegroundColor Green
}
else {
    Write-Host "Push failed - read the git message above." -ForegroundColor Red
    exit 1
}
