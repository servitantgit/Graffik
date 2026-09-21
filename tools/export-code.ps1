# ================================================================
# GRAFIK GILLETTE - EXPORT PROJECT TO code.json
# ================================================================
# Version: 4.0 - Simplified (no apply-update workflow)
#
# PURPOSE:
#   Package entire project as a single JSON file for AI chat upload.
#   AI reads the code and answers questions or generates instructions
#   for Cline (VS Code extension) which edits files directly.
#
# WORKFLOW:
#   1. .\tools\export-code.ps1
#       -> powershell -ExecutionPolicy Bypass -File .\tools\export-code.ps1
#   2. Upload code.json to AI chat (Claude, ChatGPT, Gemini)
#   3. Describe desired changes in natural language
#   4. AI responds with plan + instructions for Cline
#   5. Cline (in VS Code) executes changes via its own tools
#   6. Verify with: git diff
#   7. Test in browser, then commit
#
# WHY JSON (not .md/.txt):
#   Anthropic detects file type by CONTENT sniffing, not extension.
#   .md/.txt files with lots of code trigger "unsupported file" errors.
#   application/json always passes.
#
# INCLUDED IN OUTPUT:
#   - Project metadata (name, git commit, tree, stats)
#   - Full text of .html/.js/.css/.json/.md/.ps1 files
#
# EXCLUDED (see $EXCLUDE_* arrays):
#   - Binary assets (icons, screenshots)
#   - Build artifacts (node_modules, .venv, __pycache__)
#   - Personal/local files (HANDOFF.md, .env, code.json itself)
#   - Design mockups (mockup-*.html)
#   - Tool scripts (tools/ - not deployed)
#
# OUTPUT: code.json (UTF-8 without BOM, project root)
# ================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# --- CONFIGURATION ---

$OUTPUT_FILE = "code.json"
$MAX_FILE_SIZE_KB = 500
$MAX_TOTAL_SIZE_KB = 2048

$INCLUDE_EXTENSIONS = @(
    '.html', '.js', '.css', '.json',
    '.md', '.ps1', '.yml', '.yaml',
    '.txt'
)

$EXCLUDE_PATTERNS = @(
    '\.git',
    'node_modules',
    '\.venv',
    'venv',
    'screenshots',
    'icons',
    'tools',
    '\.vscode',
    '__pycache__',
    '\.pytest_cache'
)

$EXCLUDE_FILES = @(
    'code.md',
    'code.txt',
    'code.json',
    'HANDOFF.md',
    'package-lock.json',
    'yarn.lock',
    '.env',
    '.DS_Store',
    'Thumbs.db'
)

$EXCLUDE_FILE_PATTERNS = @(
    'mockup-*.html',
    '*.min.js',
    '*.min.css',
    '*.backup',
    '*.log',
    '*.tmp'
)

# --- HELPER FUNCTIONS ---

function Get-LanguageHint {
    param([string]$Extension)
    switch ($Extension) {
        '.js'   { 'javascript' }
        '.html' { 'html' }
        '.css'  { 'css' }
        '.json' { 'json' }
        '.md'   { 'markdown' }
        '.ps1'  { 'powershell' }
        '.yml'  { 'yaml' }
        '.yaml' { 'yaml' }
        default { 'text' }
    }
}

function Should-ExcludeFile {
    param([string]$FilePath, [string]$FileName)
    foreach ($pattern in $EXCLUDE_PATTERNS) {
        if ($FilePath -match $pattern) { return $true }
    }
    if ($EXCLUDE_FILES -contains $FileName) { return $true }
    foreach ($pattern in $EXCLUDE_FILE_PATTERNS) {
        if ($FileName -like $pattern) { return $true }
    }
    return $false
}

function Get-GitInfo {
    $info = @{ Commit = "unknown"; Branch = "unknown"; Status = "unknown" }
    try {
        $commit = git rev-parse --short HEAD 2>$null
        if ($LASTEXITCODE -eq 0) { $info.Commit = $commit.Trim() }
    } catch {}
    try {
        $branch = git branch --show-current 2>$null
        if ($LASTEXITCODE -eq 0) { $info.Branch = $branch.Trim() }
    } catch {}
    try {
        $status = git status --porcelain 2>$null
        if ($LASTEXITCODE -eq 0) {
            if ([string]::IsNullOrWhiteSpace($status)) { $info.Status = "clean" }
            else {
                $modifiedCount = ($status -split "`n" | Where-Object { $_.Trim() }).Count
                $info.Status = "$modifiedCount uncommitted change(s)"
            }
        }
    } catch {}
    return $info
}

function Format-FileSize {
    param([long]$Bytes)
    if ($Bytes -lt 1024) { return "$Bytes B" }
    if ($Bytes -lt 1048576) { return "{0:N1} KB" -f ($Bytes / 1024) }
    return "{0:N2} MB" -f ($Bytes / 1048576)
}

function Get-ProjectTree {
    param([string]$RootPath, [int]$MaxDepth = 4)
    $script:tree = @()
    $script:tree += "Graffik/"

    function Add-TreeLevel {
        param([string]$Path, [string]$Prefix, [int]$CurrentDepth, [int]$MaxDepth)
        if ($CurrentDepth -ge $MaxDepth) { return }
        $items = Get-ChildItem -Path $Path -Force | Sort-Object { $_.PSIsContainer -eq $false }, Name
        $items = $items | Where-Object {
            $itemPath = $_.FullName.Replace('\', '/')
            -not (Should-ExcludeFile -FilePath $itemPath -FileName $_.Name)
        }
        $count = $items.Count
        for ($i = 0; $i -lt $count; $i++) {
            $item = $items[$i]
            $isLast = ($i -eq $count - 1)
            $marker = if ($isLast) { "\--- " } else { "+--- " }
            $extension = if ($item.PSIsContainer) { "/" } else { "" }
            $line = "$Prefix$marker$($item.Name)$extension"
            $script:tree += $line
            if ($item.PSIsContainer) {
                $newPrefix = if ($isLast) { "$Prefix     " } else { "$Prefix|    " }
                Add-TreeLevel -Path $item.FullName -Prefix $newPrefix -CurrentDepth ($CurrentDepth + 1) -MaxDepth $MaxDepth
            }
        }
    }

    Add-TreeLevel -Path $RootPath -Prefix "" -CurrentDepth 0 -MaxDepth $MaxDepth
    return ($script:tree -join "`n")
}

# --- MAIN EXECUTION ---

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " GRAFIK GILLETTE - Export to $OUTPUT_FILE (JSON)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "index.html")) {
    Write-Host "[ERROR] index.html not found. Run from project root!" -ForegroundColor Red
    exit 1
}

$projectRoot = Get-Location
Write-Host "[INFO] Project root: $projectRoot" -ForegroundColor Gray

$gitInfo = Get-GitInfo
Write-Host "[INFO] Git: $($gitInfo.Branch) | $($gitInfo.Commit) | $($gitInfo.Status)" -ForegroundColor Gray

Write-Host ""
Write-Host "[SCAN] Scanning project files..." -ForegroundColor Yellow

$allFiles = Get-ChildItem -Path $projectRoot -Recurse -File -Force | Where-Object {
    $ext = $_.Extension.ToLower()
    $INCLUDE_EXTENSIONS -contains $ext
}

$includedFiles = @()
$excludedCount = 0

foreach ($file in $allFiles) {
    $relativePath = $file.FullName.Substring($projectRoot.Path.Length + 1).Replace('\', '/')
    if (Should-ExcludeFile -FilePath $relativePath -FileName $file.Name) {
        $excludedCount++
        continue
    }
    $includedFiles += $file
}

$includedFiles = $includedFiles | Sort-Object {
    $rel = $_.FullName.Substring($projectRoot.Path.Length + 1)
    $depth = ($rel -split '[\\/]').Count
    "{0:D3}_{1}" -f $depth, $rel
}

Write-Host "[SCAN] Found $($allFiles.Count) files, included $($includedFiles.Count), excluded $excludedCount" -ForegroundColor Gray

$totalSize = ($includedFiles | Measure-Object -Property Length -Sum).Sum
Write-Host "[SIZE] Total content: $(Format-FileSize $totalSize)" -ForegroundColor Gray

Write-Host ""
Write-Host "[TREE] Building structure tree..." -ForegroundColor Yellow
$treeString = Get-ProjectTree -RootPath $projectRoot -MaxDepth 4

Write-Host "[BUILD] Building JSON structure..." -ForegroundColor Yellow

# Build files array
$filesArray = @()
$fileIndex = 0
$largeFiles = @()

foreach ($file in $includedFiles) {
    $fileIndex++
    $relativePath = $file.FullName.Substring($projectRoot.Path.Length + 1).Replace('\', '/')
    $sizeKB = [math]::Round($file.Length / 1024, 1)

    if ($sizeKB -gt $MAX_FILE_SIZE_KB) {
        $largeFiles += "$relativePath ($sizeKB KB)"
    }

    try {
        $fileContent = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $lineCount = ($fileContent -split "`n").Count
    } catch {
        Write-Host "[WARN] Failed to read: $relativePath" -ForegroundColor Yellow
        continue
    }

    $langHint = Get-LanguageHint -Extension $file.Extension.ToLower()

    if ($fileIndex % 5 -eq 0 -or $fileIndex -eq $includedFiles.Count) {
        Write-Host "  [$fileIndex/$($includedFiles.Count)] $relativePath" -ForegroundColor DarkGray
    }

    $filesArray += [ordered]@{
        path = $relativePath
        language = $langHint
        size_bytes = $file.Length
        size_readable = Format-FileSize $file.Length
        lines = $lineCount
        content = $fileContent
    }
}

# Build root JSON object (no ai_response_contract — Cline uses its own tools)
$jsonObject = [ordered]@{
    project = "Grafik Gillette"
    description = "PWA for shift schedule management (4 brigades, P and G factory)"
    generated = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    git = [ordered]@{
        branch = $gitInfo.Branch
        commit = $gitInfo.Commit
        status = $gitInfo.Status
    }
    stats = [ordered]@{
        files_included = $includedFiles.Count
        files_excluded = $excludedCount
        total_size_bytes = $totalSize
        total_size_readable = Format-FileSize $totalSize
    }
    ai_instructions = @(
        "Read docs/AGENT.md first (in files[]) - contains critical project rules",
        "NO ES modules - use window.myFunc = myFunc pattern",
        "Preserve UTF-8 literally (Polish/Ukrainian) - never escape as unicode",
        "This project is edited via Cline (VS Code extension) - AI generates task descriptions, Cline executes"
    )
    project_structure = $treeString
    large_files = $largeFiles
    files = $filesArray
}

Write-Host "[CONVERT] Converting to JSON..." -ForegroundColor Yellow

$jsonString = $jsonObject | ConvertTo-Json -Depth 15 -Compress:$false

Write-Host "[SAVE] Writing to $OUTPUT_FILE..." -ForegroundColor Yellow

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    (Join-Path $projectRoot $OUTPUT_FILE),
    $jsonString,
    $utf8NoBom
)

$outputSize = (Get-Item (Join-Path $projectRoot $OUTPUT_FILE)).Length

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " EXPORT COMPLETE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Output: $OUTPUT_FILE ($(Format-FileSize $outputSize))" -ForegroundColor White
Write-Host "Files: $($includedFiles.Count)" -ForegroundColor White
Write-Host "MIME type: application/json (allowed by chat)" -ForegroundColor Green

if ($outputSize -gt 10485760) {
    Write-Host ""
    Write-Host "[WARN] File exceeds 10 MB!" -ForegroundColor Red
} elseif ($outputSize -gt 5242880) {
    Write-Host ""
    Write-Host "[INFO] File is large ($(Format-FileSize $outputSize))" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Upload $OUTPUT_FILE to chat (JSON allowed!)" -ForegroundColor Gray
Write-Host "  2. AI reads .files array and answers your questions" -ForegroundColor Gray
Write-Host "  3. Use Cline (VS Code) to apply changes" -ForegroundColor Gray
Write-Host "  4. Verify: git diff, test in browser, commit" -ForegroundColor Gray
Write-Host ""