# git-init-repo.ps1
# One-time setup: turn this project folder into a GitHub-backed git repo.
#
# Usage (from the project root folder):
#   powershell -ExecutionPolicy Bypass -File .\git-init-repo.ps1 -RepoName study-sentry
#   (or simply double-click SETUP_GITHUB.bat)
#
# Options:
#   -RepoName    Repository name on GitHub (required)
#   -GithubUser  Your GitHub username (prints ready-to-run remote/push commands)
#   -Public      Create a PUBLIC repo instead of the default private one

param(
    [Parameter(Mandatory = $true)]
    [string]$RepoName,

    [string]$GithubUser = "",

    [switch]$Public
)

$ErrorActionPreference = "Stop"

function Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

# Keep the window open so the result can actually be read,
# and stop the log recording before leaving.
function Pause-AndExit([int]$Code) {
    try { Stop-Transcript | Out-Null } catch { }
    Write-Host ""
    Write-Host "Press Enter to close this window..."
    try { [void][System.Console]::ReadLine() } catch { }
    exit $Code
}

function Fail([string]$Msg) {
    Write-Host ""
    Write-Host "FAILED: $Msg" -ForegroundColor Red
    Pause-AndExit 1
}

# Save everything to a log file so the run can be checked
# even after the window is closed.
$logPath = Join-Path (Get-Location) "git-init-repo.log.txt"
try { Start-Transcript -Path $logPath -Force | Out-Null } catch { }

# --- 0. Preconditions -------------------------------------------------
Step "Checking prerequisites"
try {
    $gv = git --version
    Write-Host "OK: $gv"
}
catch {
    Fail "Git is not installed. Install it first: https://git-scm.com/download/win"
}
Write-Host "Working directory: $(Get-Location)"

if (-not (Test-Path "package.json")) {
    Fail "package.json not found here, so this is NOT the project folder. Open Terminal, cd into your study-sentry folder (the one that contains package.json), then run this script again."
}

# --- 1. Initialise the repository -------------------------------------
Step "Initialising git repository"
if (Test-Path ".git") {
    Write-Host "Already a git repository - skipping init."
}
else {
    git init -b main
    if ($LASTEXITCODE -ne 0) {
        # Fallback for older git versions without 'init -b'
        git init
        git symbolic-ref HEAD refs/heads/main
    }
    Write-Host "Created repository with initial branch 'main'."
}

# --- 2. Make sure .gitignore covers build artefacts --------------------
Step "Checking .gitignore"
$required = @(
    "node_modules/",
    "dist/",
    "build/",
    "target/",
    "src-tauri/target/",
    "src-tauri/gen/",
    "release/",
    "*.exe",
    "*.msi",
    ".env",
    ".env.*",
    "*.local",
    ".DS_Store",
    "Thumbs.db"
)
$giPath = ".gitignore"
$existing = @()
if (Test-Path $giPath) {
    $existing = Get-Content $giPath | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
}
$missing = @($required | Where-Object { $existing -notcontains $_ })
if ($missing.Count -gt 0) {
    if (-not (Test-Path $giPath)) { New-Item -ItemType File -Path $giPath | Out-Null }
    Add-Content -Path $giPath -Value ""
    Add-Content -Path $giPath -Value "# Added by git-init-repo.ps1"
    foreach ($entry in $missing) { Add-Content -Path $giPath -Value $entry }
    Write-Host ("Added {0} entr{1} to .gitignore: {2}" -f $missing.Count, $(if ($missing.Count -eq 1) { "y" } else { "ies" }), ($missing -join ", "))
}
else {
    Write-Host ".gitignore already covers all required entries."
}

# --- 3. Identity (local only) ------------------------------------------
Step "Checking git identity"
$name = git config user.name
if (-not $name) {
    if ($GithubUser) {
        git config user.name $GithubUser
        Write-Host "Set local git user.name = $GithubUser"
    }
    else {
        git config user.name "Study Sentry Dev"
        Write-Host "Set local git user.name = 'Study Sentry Dev' (change later with: git config --global user.name 'Your Name')"
    }
}
$email = git config user.email
if (-not $email) {
    git config user.email "dev@localhost"
    Write-Host "Set local git user.email = dev@localhost (change later with: git config --global user.email 'you@example.com')"
}

# --- 4. First commit ----------------------------------------------------
Step "Staging and committing all files"
git add -A
$staged = git status --porcelain
if ($staged) {
    $count = @($staged).Count
    Write-Host "$count file(s)/change(s) staged."
    git commit -m "Initial import: $RepoName"
    if ($LASTEXITCODE -ne 0) {
        Fail "Commit failed - check the messages above."
    }
    Write-Host "Committed." -ForegroundColor Green
}
else {
    Write-Host "Nothing to commit (working tree already clean)."
}

# --- 5. Remote + push ----------------------------------------------------
Step "Setting up GitHub remote"
$remotes = @(git remote)
if ($remotes -contains "origin") {
    Write-Host "Remote 'origin' already exists:"
    git remote -v
}
else {
    $visArg = "--private"
    if ($Public) { $visArg = "--public" }

    if (Get-Command gh -ErrorAction SilentlyContinue) {
        Write-Host "Creating repo '$RepoName' on GitHub with gh CLI ($visArg)..."
        gh repo create $RepoName $visArg --source=. --remote=origin --push
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Done: repo created and pushed." -ForegroundColor Green
        }
        else {
            Write-Host "gh CLI failed (maybe not logged in). Run 'gh auth login' and retry, or create the repo manually below." -ForegroundColor Yellow
        }
    }

    if (-not ((@(git remote)) -contains "origin")) {
        Write-Host ""
        Write-Host "Manual steps:" -ForegroundColor Cyan
        Write-Host "  1. Open https://github.com/new in your browser"
        Write-Host "  2. Repository name: $RepoName"
        if ($Public) { Write-Host "  3. Select: Public" } else { Write-Host "  3. Select: Private" }
        Write-Host "  4. Do NOT initialise with a README"
        Write-Host "  5. Click 'Create repository'"
        Write-Host "  6. Then run in this terminal:"
        if ($GithubUser) {
            Write-Host ""
            Write-Host "       git remote add origin https://github.com/$GithubUser/$RepoName.git" -ForegroundColor Yellow
            Write-Host "       git push -u origin main" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "     (copy-paste these two ready-made commands)" -ForegroundColor Gray
        }
        else {
            Write-Host ""
            Write-Host "       git remote add origin https://github.com/<YOUR-USERNAME>/$RepoName.git" -ForegroundColor Yellow
            Write-Host "       git push -u origin main" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "     Tip: re-run with -GithubUser <name> to get ready-made commands." -ForegroundColor Gray
        }
        Write-Host "  7. First push will ask you to sign in to GitHub in the browser (once)."
        Pause-AndExit 0
    }
}

# If we get here, origin exists (either already or created by gh) - push.
Step "Pushing to GitHub"
$branch = git rev-parse --abbrev-ref HEAD
$tracking = ""
if ($LASTEXITCODE -eq 0 -and $branch) {
    $tracking = git for-each-ref --format="%(upstream:short)" "refs/heads/$branch"
}
if ($tracking) {
    git push
}
else {
    git push -u origin main
}
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "All done! Your project is now on GitHub." -ForegroundColor Green
    Write-Host "Next: use sync.ps1 for day-to-day commits/pushes." -ForegroundColor Green
    Pause-AndExit 0
}
else {
    Fail "Push failed - read the git message above."
}
