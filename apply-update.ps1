# ================================================================
# GRAFIK GILLETTE - APPLY UPDATE PATCH
# ================================================================
# Version: 1.2
#
# Purpose: Apply structured patch from update_code.md to project files.
#
# Companion of: export-code.ps1 (generates code.json for AI upload)
# AI response format spec: see code.json.ai_response_contract
#
# TWO-SCRIPT WORKFLOW:
#   1. .\export-code.ps1        -> creates code.json
#   2. Upload code.json to AI chat (Claude, ChatGPT, Gemini)
#   3. Describe desired changes in natural language
#   4. AI responds using format from code.json.ai_response_contract
#   5. Save AI response verbatim as: update_code.md
#   6. .\apply-update.ps1       -> parses, validates, applies patch
#   7. Verify with: git diff, then commit
#
# Supported operations: REPLACE, CREATE, DELETE, INSERT_AFTER, INSERT_BEFORE
#
# Safety layers:
#   - Sanity check: detect invisible chars (ZWS/BOM) that break parser
#   - Sanity check: detect single-backtick fences (must be triple)
#   - Optional git commit backup before apply
#   - Per-file .backup in .update-backups/ with timestamp
#   - Validate ALL operations first (fail-fast)
#   - Rollback on error (interactive prompt)
#
# CHANGELOG:
#   v1.2 - Added sanity checks for invisible chars + single backticks
#          Fixed $matches autovariable conflict (GOTCHA 1)
#          Fixed array unwrap on single-op return (,$operations)
#          Better LOCATE not-found error message with preview
#   v1.1 - Force array wrapping in Parse-UpdateFile return
#   v1.0 - Initial version
# ================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# --- CONFIGURATION ---

$UPDATE_FILE = "update_code.md"
$BACKUP_DIR = ".update-backups"
$AUTO_GIT_COMMIT = $false  # true = auto git commit before apply (recommended)
$DRY_RUN = $false          # true = show what would happen, don't modify files

# --- COLORS ---
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info    { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn    { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Error2  { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Step    { param($msg) Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor Magenta }

# --- HELPER: UTF-8 file operations ---

function Read-FileUtf8 {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "File not found: $Path"
    }
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-FileUtf8 {
    param(
        [string]$Path,
        [string]$Content
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $absolutePath = if ([System.IO.Path]::IsPathRooted($Path)) {
        $Path
    } else {
        Join-Path (Get-Location) $Path
    }
    # Ensure directory exists
    $dir = Split-Path $absolutePath -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($absolutePath, $Content, $utf8NoBom)
}

# --- HELPER: Git integration ---

function Get-GitStatus {
    try {
        $status = git status --porcelain 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }
        return $status
    } catch {
        return $null
    }
}

function Test-GitClean {
    $status = Get-GitStatus
    if ($null -eq $status) { return $false }  # not a git repo or git not available
    return [string]::IsNullOrWhiteSpace($status)
}

function New-GitBackup {
    param([string]$Message)
    try {
        git add -A 2>&1 | Out-Null
        git commit -m $Message --allow-empty 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $hash = (git rev-parse --short HEAD 2>$null).Trim()
            return $hash
        }
    } catch {}
    return $null
}

# --- HELPER: File backup ---

function Backup-File {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) {
        return $null  # nothing to backup (file will be created)
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safeName = $FilePath.Replace('\', '_').Replace('/', '_').Replace(':', '_')
    $backupPath = Join-Path $BACKUP_DIR "$safeName.$timestamp.backup"

    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    }

    Copy-Item -Path $FilePath -Destination $backupPath -Force
    return $backupPath
}

# --- HELPER: Sanity checks for common AI output issues ---

function Test-InvisibleChars {
    <#
    Detects zero-width chars and BOM markers that break markdown fence parsing.
    Real cause: AI chat rendered content with hidden chars, user copy-pasted.
    Returns count of invisible chars found (0 = clean).
    #>
    param([string]$Content)

    $matches = [regex]::Matches($Content, '[\u200B\u200C\u200D\uFEFF\u2060]')
    return $matches.Count
}

function Test-SingleBacktickFences {
    <#
    Detects lines that start with a single backtick followed by non-backtick.
    Common AI mistake: uses one backtick instead of three for code fences.
    Returns line numbers where problematic single backticks were found.
    #>
    param([string]$Content)

    $lines = $Content -split "`r?`n"
    $badLines = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $trimmed = $lines[$i].Trim()
        # Match: starts with exactly one backtick then anything non-backtick
        # Skip: triple backticks (correct fence) and empty lines
        if ($trimmed -match '^`[^`]') {
            $badLines += ($i + 1)
        }
    }
    return $badLines
}

# --- PARSER: update_code.md ---

function Parse-UpdateFile {
    param([string]$Content)

    $operations = @()
    $currentOp = $null
    $mode = "none"  # none, header, locate, replace, content
    $codeBlockLang = ""
    $codeBuffer = New-Object System.Text.StringBuilder
    $inCodeBlock = $false

    $lines = $Content -split "`r?`n"

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $trimmed = $line.Trim()

        # Detect new operation header: ### OP <N>: <title>
        if ($trimmed -match '^###\s+OP\s+(\d+)\s*:\s*(.+)$') {
            # Save previous operation if exists
            if ($currentOp) {
                if ($inCodeBlock) {
                    # Close pending code block
                    if ($mode -eq "locate") {
                        $currentOp.LocateBlock = $codeBuffer.ToString().TrimEnd()
                    } elseif ($mode -eq "replace") {
                        $currentOp.ReplaceBlock = $codeBuffer.ToString().TrimEnd()
                    } elseif ($mode -eq "content") {
                        $currentOp.Content = $codeBuffer.ToString().TrimEnd()
                    }
                    $inCodeBlock = $false
                }
                $operations += $currentOp
            }
            $currentOp = @{
                Number       = [int]$Matches[1]
                Title        = $Matches[2].Trim()
                File         = ""
                Action       = ""
                LocateBlock  = ""
                ReplaceBlock = ""
                Content      = ""
            }
            $codeBuffer.Clear() | Out-Null
            $inCodeBlock = $false
            $mode = "header"
            continue
        }

        if (-not $currentOp) { continue }

        # Parse headers (before code blocks)
        if (-not $inCodeBlock) {
            if ($trimmed -match '^(?:\*\*)?FILE(?:\*\*)?:\s*[`]?(.+?)[`]?$') {
                $currentOp.File = $Matches[1].Trim() -replace '`', ''
                continue
            }
            if ($trimmed -match '^(?:\*\*)?ACTION(?:\*\*)?:\s*[`]?(\w+)[`]?') {
                $currentOp.Action = $Matches[1].Trim().ToUpper()
                continue
            }
            if ($trimmed -match '^(?:\*\*)?LOCATE(?:\*\*)?:?\s*$') {
                $mode = "locate"
                $codeBuffer.Clear() | Out-Null
                continue
            }
            if ($trimmed -match '^(?:\*\*)?REPLACE_?WITH(?:\*\*)?:?\s*$') {
                $mode = "replace"
                $codeBuffer.Clear() | Out-Null
                continue
            }
            if ($trimmed -match '^(?:\*\*)?CONTENT(?:\*\*)?:?\s*$') {
                $mode = "content"
                $codeBuffer.Clear() | Out-Null
                continue
            }
        }

        # Handle code block open (triple backticks + optional language)
        if ($trimmed -match '^```(\w*)$' -and -not $inCodeBlock) {
            $inCodeBlock = $true
            $codeBlockLang = $Matches[1]
            $codeBuffer.Clear() | Out-Null
            continue
        }
        # Handle code block close (triple backticks alone)
        if ($trimmed -match '^```$' -and $inCodeBlock) {
            $inCodeBlock = $false
            $code = $codeBuffer.ToString().TrimEnd("`r", "`n")
            if ($mode -eq "locate") {
                $currentOp.LocateBlock = $code
            } elseif ($mode -eq "replace") {
                $currentOp.ReplaceBlock = $code
            } elseif ($mode -eq "content") {
                $currentOp.Content = $code
            }
            $codeBuffer.Clear() | Out-Null
            continue
        }

        # Content inside a code block
        if ($inCodeBlock) {
            [void]$codeBuffer.AppendLine($line)
        }
    }

    # Save last operation
    if ($currentOp) {
        if ($inCodeBlock) {
            if ($mode -eq "locate") {
                $currentOp.LocateBlock = $codeBuffer.ToString().TrimEnd()
            } elseif ($mode -eq "replace") {
                $currentOp.ReplaceBlock = $codeBuffer.ToString().TrimEnd()
            } elseif ($mode -eq "content") {
                $currentOp.Content = $codeBuffer.ToString().TrimEnd()
            }
        }
        $operations += $currentOp
    }

    # PowerShell unwraps single-element arrays on return. Force array wrapping:
    return ,$operations
}

# --- VALIDATOR: check operations ---

function Test-Operation {
    param($Op)

    $errors = @()

    if (-not $Op.File) {
        $errors += "Missing FILE"
    }
    if (-not $Op.Action) {
        $errors += "Missing ACTION"
    }

    switch ($Op.Action) {
        "REPLACE" {
            if (-not $Op.LocateBlock)  { $errors += "REPLACE requires LOCATE block" }
            if (-not $Op.ReplaceBlock) { $errors += "REPLACE requires REPLACE_WITH block" }
        }
        "CREATE" {
            if (-not $Op.Content) { $errors += "CREATE requires CONTENT block" }
        }
        "DELETE" {
            # No additional requirements
        }
        "INSERT_AFTER" {
            if (-not $Op.LocateBlock)  { $errors += "INSERT_AFTER requires LOCATE block" }
            if (-not $Op.ReplaceBlock) { $errors += "INSERT_AFTER requires REPLACE_WITH block (content to insert)" }
        }
        "INSERT_BEFORE" {
            if (-not $Op.LocateBlock)  { $errors += "INSERT_BEFORE requires LOCATE block" }
            if (-not $Op.ReplaceBlock) { $errors += "INSERT_BEFORE requires REPLACE_WITH block (content to insert)" }
        }
        default {
            $errors += "Unknown ACTION: $($Op.Action) (allowed: REPLACE, CREATE, DELETE, INSERT_AFTER, INSERT_BEFORE)"
        }
    }

    return $errors
}

# --- EXECUTOR: apply single operation ---

function Invoke-Operation {
    param(
        $Op,
        [string]$BackupPath
    )

    switch ($Op.Action) {
        "REPLACE" {
            $content = Read-FileUtf8 -Path $Op.File
            # Normalize line endings for matching (handle both CRLF and LF)
            $normalized = $content -replace "`r`n", "`n"
            $locateNorm = $Op.LocateBlock -replace "`r`n", "`n"

            if ($normalized -notmatch [regex]::Escape($locateNorm)) {
                # Better error: show first 2 lines of LOCATE for context
                $preview = ($locateNorm -split "`n" | Select-Object -First 2) -join " | "
                if ($preview.Length -gt 120) {
                    $preview = $preview.Substring(0, 120) + "..."
                }
                throw "LOCATE block not found in '$($Op.File)'. First lines: [$preview]"
            }

            # Count occurrences (use $locateMatches — avoid $matches autovariable, see AGENT.md GOTCHA 1)
            $locateMatches = [regex]::Matches($normalized, [regex]::Escape($locateNorm))
            if ($locateMatches.Count -gt 1) {
                throw "LOCATE block found $($locateMatches.Count) times in '$($Op.File)'. Must be unique. Add more context lines to LOCATE."
            }

            # Replace on normalized content
            $newContent = $normalized -replace [regex]::Escape($locateNorm), $Op.ReplaceBlock.Replace('$', '$$')

            # Restore original line endings (CRLF if original had it)
            if ($content -match "`r`n") {
                $newContent = $newContent -replace "`n", "`r`n"
            }

            Write-FileUtf8 -Path $Op.File -Content $newContent

            $addedLines = ($Op.ReplaceBlock -split "`n").Count
            $removedLines = ($Op.LocateBlock -split "`n").Count
            return "Replaced $removedLines lines with $addedLines lines"
        }

        "CREATE" {
            if (Test-Path $Op.File) {
                throw "File already exists: '$($Op.File)'. Use REPLACE or DELETE first."
            }
            Write-FileUtf8 -Path $Op.File -Content $Op.Content
            $lines = ($Op.Content -split "`n").Count
            return "Created file with $lines lines"
        }

        "DELETE" {
            if (-not (Test-Path $Op.File)) {
                throw "File not found: $($Op.File)"
            }
            # Try git rm first (if tracked)
            try {
                git ls-files --error-unmatch $Op.File 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    git rm $Op.File 2>&1 | Out-Null
                    return "Deleted (git rm)"
                }
            } catch {}
            # Fallback: regular delete
            Remove-Item -Path $Op.File -Force
            return "Deleted (not git-tracked)"
        }

        "INSERT_AFTER" {
            $content = Read-FileUtf8 -Path $Op.File
            $normalized = $content -replace "`r`n", "`n"
            $locateNorm = $Op.LocateBlock -replace "`r`n", "`n"

            if ($normalized -notmatch [regex]::Escape($locateNorm)) {
                $preview = ($locateNorm -split "`n" | Select-Object -First 2) -join " | "
                throw "LOCATE block not found in '$($Op.File)'. First lines: [$preview]"
            }

            $insertContent = "`n" + $Op.ReplaceBlock
            $newContent = $normalized -replace [regex]::Escape($locateNorm), ($locateNorm + $insertContent).Replace('$', '$$')

            if ($content -match "`r`n") {
                $newContent = $newContent -replace "`n", "`r`n"
            }

            Write-FileUtf8 -Path $Op.File -Content $newContent
            $addedLines = ($Op.ReplaceBlock -split "`n").Count
            return "Inserted $addedLines lines after LOCATE block"
        }

        "INSERT_BEFORE" {
            $content = Read-FileUtf8 -Path $Op.File
            $normalized = $content -replace "`r`n", "`n"
            $locateNorm = $Op.LocateBlock -replace "`r`n", "`n"

            if ($normalized -notmatch [regex]::Escape($locateNorm)) {
                $preview = ($locateNorm -split "`n" | Select-Object -First 2) -join " | "
                throw "LOCATE block not found in '$($Op.File)'. First lines: [$preview]"
            }

            $insertContent = $Op.ReplaceBlock + "`n"
            $newContent = $normalized -replace [regex]::Escape($locateNorm), ($insertContent + $locateNorm).Replace('$', '$$')

            if ($content -match "`r`n") {
                $newContent = $newContent -replace "`n", "`r`n"
            }

            Write-FileUtf8 -Path $Op.File -Content $newContent
            $addedLines = ($Op.ReplaceBlock -split "`n").Count
            return "Inserted $addedLines lines before LOCATE block"
        }

        default {
            throw "Unknown action: $($Op.Action)"
        }
    }
}

# --- ROLLBACK ---

function Restore-Backups {
    param($Backups)

    Write-Warn "Rolling back all changes..."
    foreach ($backup in $Backups) {
        if ($backup.BackupPath -and (Test-Path $backup.BackupPath)) {
            Copy-Item -Path $backup.BackupPath -Destination $backup.FilePath -Force
            Write-Info "  Restored: $($backup.FilePath)"
        } elseif ($backup.WasCreated) {
            if (Test-Path $backup.FilePath) {
                Remove-Item -Path $backup.FilePath -Force
                Write-Info "  Removed created file: $($backup.FilePath)"
            }
        }
    }
}

# --- MAIN EXECUTION ---

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " GRAFIK GILLETTE - Apply Update Patch" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check working directory
if (-not (Test-Path "index.html")) {
    Write-Error2 "index.html not found. Run from project root!"
    exit 1
}

# Check update file
if (-not (Test-Path $UPDATE_FILE)) {
    Write-Error2 "$UPDATE_FILE not found in current directory."
    Write-Info "Create this file with patch content from AI chat."
    Write-Info "AI response format: see code.json.ai_response_contract"
    exit 1
}

# Check git status
if ($AUTO_GIT_COMMIT) {
    Write-Step "Checking git status"
    if (-not (Test-GitClean)) {
        Write-Warn "Working tree has uncommitted changes."
        $answer = Read-Host "Commit them before applying patch? (y/N)"
        if ($answer -eq 'y') {
            $backupHash = New-GitBackup -Message "chore: pre-patch backup"
            if ($backupHash) {
                Write-Success "Git backup created: $backupHash"
            } else {
                Write-Warn "Git backup failed, continuing without git safety net"
            }
        }
    } else {
        Write-Success "Working tree clean"
    }
}

# Parse update file
Write-Step "Parsing $UPDATE_FILE"
$content = Read-FileUtf8 -Path $UPDATE_FILE

# --- SANITY CHECKS: catch common AI output issues before parsing ---

# Check 1: Invisible characters (ZWS/BOM) — most common issue with copy-paste from chat
$invisibleCount = Test-InvisibleChars -Content $content
if ($invisibleCount -gt 0) {
    Write-Error2 "Found $invisibleCount invisible character(s) in $UPDATE_FILE"
    Write-Warn "  These break markdown code fence parsing."
    Write-Warn "  Common cause: copy-paste from rendered HTML/chat."
    Write-Info ""
    Write-Info "  Auto-fix command:"
    Write-Host "    `$c = Get-Content '$UPDATE_FILE' -Raw" -ForegroundColor Gray
    Write-Host "    `$c = `$c -replace '[\u200B\u200C\u200D\uFEFF\u2060]', ''" -ForegroundColor Gray
    Write-Host "    [System.IO.File]::WriteAllText((Resolve-Path '$UPDATE_FILE').Path, `$c, [System.Text.UTF8Encoding]::new(`$false))" -ForegroundColor Gray
    Write-Info ""
    Write-Info "  Then re-run: .\apply-update.ps1"
    exit 1
}

# Check 2: Single-backtick fences (AI sometimes uses one instead of three)
$badFenceLines = Test-SingleBacktickFences -Content $content
if ($badFenceLines.Count -gt 0) {
    Write-Warn "Found $($badFenceLines.Count) line(s) starting with a single backtick."
    Write-Warn "  Code fences MUST use exactly three backticks."
    Write-Warn "  Affected lines: $($badFenceLines -join ', ')"
    Write-Info "  Parser will likely ignore these -- LOCATE/REPLACE blocks may end up empty."
    Write-Info "  Continue anyway? (y/N)"
    $answer = Read-Host
    if ($answer -ne 'y') {
        Write-Info "Aborted. Fix the file and re-run."
        exit 1
    }
}

$operations = Parse-UpdateFile -Content $content

if ($operations.Count -eq 0) {
    Write-Error2 "No operations found in $UPDATE_FILE"
    Write-Info "Expected format: '### OP N: title' followed by FILE, ACTION, LOCATE/REPLACE_WITH/CONTENT blocks"
    Write-Info "See code.json.ai_response_contract for full format spec."
    exit 1
}

Write-Success "Found $($operations.Count) operation(s)"

# Validate all operations first
Write-Step "Validating operations"
$hasErrors = $false
foreach ($op in $operations) {
    $errors = Test-Operation -Op $op
    if ($errors.Count -gt 0) {
        Write-Error2 "OP $($op.Number) [$($op.Title)]:"
        foreach ($err in $errors) {
            Write-Host "    - $err" -ForegroundColor Red
        }
        $hasErrors = $true
    } else {
        Write-Success "OP $($op.Number) [$($op.Title)] - $($op.Action) $($op.File)"
    }
}

if ($hasErrors) {
    Write-Error2 "Validation failed. Fix errors above and retry."
    exit 1
}

# Dry run mode
if ($DRY_RUN) {
    Write-Warn "DRY_RUN mode enabled. No files will be modified."
    Write-Info "Set `$DRY_RUN = `$false in script to actually apply changes."
    exit 0
}

# Confirm before applying
Write-Host ""
Write-Warn "About to apply $($operations.Count) operation(s)."
$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne 'y') {
    Write-Info "Aborted by user."
    exit 0
}

# Apply operations
Write-Step "Applying operations"
$backups = @()
$succeeded = 0
$failed = 0

foreach ($op in $operations) {
    Write-Host ""
    Write-Info "OP $($op.Number): $($op.Action) $($op.File)"

    # Backup
    $wasCreated = -not (Test-Path $op.File)
    $backupPath = if ($op.Action -ne "CREATE") { Backup-File -FilePath $op.File } else { $null }
    $backups += @{
        FilePath   = $op.File
        BackupPath = $backupPath
        WasCreated = $wasCreated
    }

    if ($backupPath) {
        Write-Host "    Backup: $backupPath" -ForegroundColor DarkGray
    }

    # Execute
    try {
        $result = Invoke-Operation -Op $op -BackupPath $backupPath
        Write-Success "    $result"
        $succeeded++
    } catch {
        Write-Error2 "    Failed: $($_.Exception.Message)"
        $failed++

        Write-Host ""
        Write-Warn "Rollback all changes? (y/N)"
        $rollback = Read-Host
        if ($rollback -eq 'y') {
            Restore-Backups -Backups $backups
            Write-Error2 "All changes rolled back. Exiting."
            exit 1
        } else {
            Write-Warn "Continuing with remaining operations..."
        }
    }
}

# Summary
Write-Step "Summary"
Write-Host "Succeeded: $succeeded / $($operations.Count)" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "Failed: $failed" -ForegroundColor Red
}
Write-Host "Backups in: $BACKUP_DIR/" -ForegroundColor Gray

# Next steps
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify changes: git status" -ForegroundColor Gray
Write-Host "  2. Review diff: git diff" -ForegroundColor Gray
Write-Host "  3. Test in browser (F12, hard reload)" -ForegroundColor Gray
Write-Host "  4. Commit: git commit -am 'apply: <description>'" -ForegroundColor Gray
Write-Host "  5. Cleanup old backups (optional): Remove-Item $BACKUP_DIR -Recurse" -ForegroundColor Gray
Write-Host ""
Write-Host "Rollback single file:" -ForegroundColor Yellow
Write-Host "  git checkout HEAD -- <path>" -ForegroundColor Gray
Write-Host "OR restore from backup:" -ForegroundColor Yellow
Write-Host "  Copy-Item $BACKUP_DIR/<file>.backup <original-path>" -ForegroundColor Gray
Write-Host ""
