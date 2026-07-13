# ============================================================================
# Newspaper Generator — Windows Installer / Updater (PowerShell)
# ============================================================================
#
# Usage (one-liner, copy-paste into PowerShell):
#
#   irm https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-windows.ps1 | iex
#
# Or, to install a specific version:
#
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-windows.ps1))) v1.3.6
#
# What it does:
#   1. Queries the GitHub Releases API for the latest (or specified) version
#   2. Downloads the NSIS .exe installer to a temporary location
#   3. Runs the installer silently (/S flag — NSIS silent install)
#      - Installs per-user to %LOCALAPPDATA%\Programs\Newspaper Generator\
#        (Tauri's NSIS default — no admin rights required)
#      - Replaces any existing version automatically
#   4. Optionally launches the app after install
#
# Requirements: Windows 10/11, PowerShell 5.1+ (built-in), internet connection.
# No admin rights required — Tauri NSIS installs per-user by default.
# ============================================================================

param(
    [string]$Version = "",
    [switch]$Interactive,
    [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"
$Repo = "jderksen2504/Newspaper-Generator"
$AppName = "Newspaper Generator"

function Write-Step  { param([string]$msg) Write-Host "› $msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Warn  { param([string]$msg) Write-Host "! $msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$msg) Write-Host "✗ $msg" -ForegroundColor Red }

# ---- Determine version ----------------------------------------------------
if ($Version) {
    Write-Step "Requesting release $Version..."
    $ApiUrl = "https://api.github.com/repos/$Repo/releases/tags/$Version"
} else {
    Write-Step "Requesting latest release..."
    $ApiUrl = "https://api.github.com/repos/$Repo/releases/latest"
}

try {
    $Response = Invoke-WebRequest -Uri $ApiUrl -Headers @{ "User-Agent" = "newspaper-installer" } -UseBasicParsing -TimeoutSec 30
    if ($Response.StatusCode -ne 200) {
        Write-Err "GitHub API returned HTTP $($Response.StatusCode)."
        if ($Response.StatusCode -eq 404) {
            Write-Err ""
            Write-Err "Common causes:"
            Write-Err "  - The release is still in DRAFT state on GitHub (must be published)"
            Write-Err "  - The version tag does not exist"
            Write-Err ""
            Write-Err "Open https://github.com/$Repo/releases to check."
        }
        exit 1
    }
    $Release = $Response.Content | ConvertFrom-Json
} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    if ($StatusCode -eq 404) {
        Write-Err "No published release found (HTTP 404)."
        Write-Err ""
        Write-Err "Common causes:"
        Write-Err "  - The release is still in DRAFT state on GitHub (must be published)"
        Write-Err "  - The version tag does not exist"
        Write-Err ""
        Write-Err "Open https://github.com/$Repo/releases to check."
    } else {
        Write-Err "Could not fetch release info from GitHub (HTTP $StatusCode)."
        Write-Err "Check your internet connection or try again later."
        Write-Err $_.Exception.Message
    }
    exit 1
}

$Version = $Release.tag_name
Write-Ok "Found version: $Version"

# ---- Find NSIS .exe asset -------------------------------------------------
# Asset naming: "Newspaper.Generator_<version>_x64-setup.exe"
$ExeAsset = $Release.assets | Where-Object { $_.name -like "*-setup.exe" -or $_.name -like "*.exe" } | Select-Object -First 1

if (-not $ExeAsset) {
    Write-Err "No .exe installer found in release $Version."
    Write-Err "Available assets:"
    $Release.assets | ForEach-Object { Write-Err "  $($_.name)" }
    exit 1
}

Write-Ok "Asset: $($ExeAsset.name)"

# ---- Download installer ---------------------------------------------------
$TmpExe = Join-Path $env:TEMP "newspaper-installer-$Version.exe"

Write-Step "Downloading $($ExeAsset.name)..."
try {
    Invoke-WebRequest -Uri $ExeAsset.browser_download_url -OutFile $TmpExe -UseBasicParsing
} catch {
    Write-Err "Download failed: $($_.Exception.Message)"
    exit 1
}

$SizeMb = [math]::Round((Get-Item $TmpExe).Length / 1MB, 1)
Write-Ok "Download complete ($SizeMb MB)"

# ---- Run installer --------------------------------------------------------
if ($Interactive) {
    # Interactive mode: show the standard NSIS installer UI
    Write-Step "Running installer (interactive)..."
    $args = @()
} else {
    # Silent mode: NSIS /S flag — installs without UI
    # Per-user install, no admin rights required
    Write-Step "Running installer (silent)..."
    $args = @("/S")
}

try {
    $process = Start-Process -FilePath $TmpExe -ArgumentList $args -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -ne 0) {
        Write-Err "Installer exited with code $($process.ExitCode)."
        Write-Err "Try running with -Interactive flag to see the installer UI:"
        Write-Err "  irm https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-windows.ps1 | iex"
        Remove-Item $TmpExe -Force -ErrorAction SilentlyContinue
        exit $process.ExitCode
    }
} catch {
    Write-Err "Failed to launch installer: $($_.Exception.Message)"
    Remove-Item $TmpExe -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Ok "Installation complete."

# ---- Cleanup --------------------------------------------------------------
Remove-Item $TmpExe -Force -ErrorAction SilentlyContinue

# ---- Locate installed app & launch ----------------------------------------
# Tauri NSIS default install location (per-user):
#   %LOCALAPPDATA%\Programs\Newspaper Generator\Newspaper Generator.exe
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\$AppName"
$ExePath = Join-Path $InstallDir "$AppName.exe"

if (-not (Test-Path $ExePath)) {
    # Fallback: search common locations
    $SearchPaths = @(
        (Join-Path $env:ProgramFiles "$AppName\$AppName.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "$AppName\$AppName.exe")
    )
    foreach ($p in $SearchPaths) {
        if (Test-Path $p) { $ExePath = $p; break }
    }
}

# Also create Start Menu shortcut (NSIS does this by default, but just in case)
$ShortcutPath = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\$AppName.lnk"
if ((Test-Path $ExePath) -and (-not (Test-Path $ShortcutPath))) {
    try {
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
        $Shortcut.TargetPath = $ExePath
        $Shortcut.WorkingDirectory = $InstallDir
        $Shortcut.Save()
        Write-Ok "Start Menu shortcut created."
    } catch {
        Write-Warn "Could not create Start Menu shortcut (non-fatal)."
    }
}

# ---- Install runtime dependencies: Node.js + Playwright WebKit -----------
# The PNG/PDF export uses a Node.js sidecar (export.js) that launches a
# headless WebKit browser via Playwright. Both must be present on the user's
# system — they are NOT bundled in the app (would add ~200MB to the installer).
# We install them automatically so the user doesn't have to.

Write-Host ""
Write-Step "Checking runtime dependencies for PNG/PDF export..."

# --- Node.js ---
$NeedNode = $true
try {
    $NodeOutput = & node --version 2>$null
    if ($LASTEXITCODE -eq 0 -and $NodeOutput -match '^v(\d+)') {
        $NodeMajor = [int]$Matches[1]
        if ($NodeMajor -ge 20) {
            Write-Ok "Node.js $NodeOutput found."
            $NeedNode = $false
        } else {
            Write-Warn "Node.js $NodeOutput found, but v20+ required. Upgrading..."
        }
    }
} catch { }

if ($NeedNode) {
    Write-Step "Installing Node.js 20 LTS..."
    # Try winget first (built into Windows 10/11)
    $WingetResult = $null
    try {
        $WingetResult = & winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent 2>&1
        $WingetExit = $LASTEXITCODE
    } catch {
        $WingetExit = -1
    }

    # Refresh PATH for current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    if ($WingetExit -ne 0) {
        # winget failed or not available — download official .msi
        Write-Warn "winget not available or failed. Downloading Node.js installer directly..."
        $NodeMsi = Join-Path $env:TEMP "node-v20.18.1-x64.msi"
        try {
            Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi" -OutFile $NodeMsi -UseBasicParsing
            Write-Step "Running Node.js MSI installer (may prompt for permission)..."
            $msiProcess = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", "`"$NodeMsi`"", "/qb" -Wait -PassThru
            Remove-Item $NodeMsi -Force -ErrorAction SilentlyContinue
            # Refresh PATH again after install
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        } catch {
            Write-Err "Could not download Node.js installer: $($_.Exception.Message)"
        }
    }

    # Verify
    try {
        $NodeCheck = & node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Node.js $NodeCheck installed."
        } else {
            Write-Err "Node.js installation failed. Please install manually from https://nodejs.org/"
            Write-Err "PNG/PDF export will not work without Node.js."
        }
    } catch {
        Write-Err "Node.js not found in PATH after install. Open a new PowerShell window and try again,"
        Write-Err "or install manually from https://nodejs.org/"
    }
}

# --- Playwright WebKit browser binary ---
# Playwright stores browser binaries in %LOCALAPPDATA%\ms-playwright\
Write-Step "Checking Playwright WebKit browser..."
$PwCache = Join-Path $env:LOCALAPPDATA "ms-playwright"
$PwWebkitFound = $false
if (Test-Path $PwCache) {
    $PwWebkitExe = Get-ChildItem -Path $PwCache -Recurse -Filter "Playwright.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($PwWebkitExe) { $PwWebkitFound = $true }
}

if ($PwWebkitFound) {
    Write-Ok "Playwright WebKit found."
} else {
    Write-Step "Installing Playwright WebKit browser (~80 MB, one-time download)..."
    # Use the sidecar's bundled playwright-core if available
    $SidecarDir = Join-Path $InstallDir "resources\sidecars\playwright-export"
    if (Test-Path (Join-Path $SidecarDir "node_modules\playwright-core")) {
        Push-Location $SidecarDir
        try {
            & npx playwright install webkit 2>&1 | Select-Object -Last 5
        } finally {
            Pop-Location
        }
    } else {
        # Fallback: install globally
        & npx --yes playwright@latest install webkit 2>&1 | Select-Object -Last 5
    }

    # Verify
    if (Test-Path $PwCache) {
        $PwWebkitExe = Get-ChildItem -Path $PwCache -Recurse -Filter "Playwright.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($PwWebkitExe) {
            Write-Ok "Playwright WebKit installed."
        } else {
            Write-Warn "Could not verify Playwright WebKit installation."
            Write-Warn "If PNG export fails, run manually: npx playwright install webkit"
        }
    } else {
        Write-Warn "Could not verify Playwright WebKit installation."
        Write-Warn "If PNG export fails, run manually: npx playwright install webkit"
    }
}

if ($NoLaunch) {
    Write-Ok "Done. Launch via Start Menu or: $ExePath"
    exit 0
}

if (Test-Path $ExePath) {
    Write-Step "Launching $AppName..."
    Start-Process -FilePath $ExePath
    Write-Ok "Done. $AppName is running."
} else {
    Write-Warn "Could not locate the installed executable automatically."
    Write-Warn "Look for ""$AppName"" in your Start Menu."
}

Write-Host ""
Write-Host "To update later, re-run the same command. To install a specific version:" -ForegroundColor DarkGray
Write-Host "  & ([scriptblock]::Create((irm https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-windows.ps1))) v1.3.6" -ForegroundColor DarkGray
