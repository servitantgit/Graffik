# ================================================================
# GRAFIK GILLETTE - EXPORT PROJECT TO code.json
# ================================================================
# Version: 3.1 - JSON output + AI response contract
#
# PURPOSE:
#   Package entire project as a single JSON file for AI chat upload.
#   AI reads the code + response contract, returns a structured patch
#   that apply-update.ps1 can parse and apply automatically.
#
# TWO-SCRIPT WORKFLOW:
#   1. .\export-code.ps1        -> creates code.json
#   2. Upload code.json to AI chat (Claude, ChatGPT, Gemini)
#   3. Describe desired changes in natural language
#   4. AI responds using format from code.json.ai_response_contract
#   5. Save AI response verbatim as: update_code.md
#   6. .\apply-update.ps1       -> parses, validates, applies patch
#   7. Verify with: git diff
#   8. Test in browser, then commit
#
# WHY JSON (not .md/.txt):
#   Anthropic detects file type by CONTENT sniffing, not extension.
#   .md/.txt files with lots of code trigger "unsupported file" errors.
#   application/json always passes.
#
# INCLUDED IN OUTPUT:
#   - Project metadata (name, git commit, tree, stats)
#   - Full text of .html/.js/.css/.json/.md/.ps1 files
#   - ai_response_contract: strict format spec for update_code.md
#   - Quick ai_instructions: short reminder of key rules
#
# EXCLUDED (see $EXCLUDE_* arrays):
#   - Binary assets (icons, screenshots)
#   - Build artifacts (node_modules, .venv, __pycache__)
#   - Personal/local files (HANDOFF.md, .env, code.json itself)
#   - Design mockups (mockup-*.html)
#   - Tool scripts (tools/ - not deployed)
#
# OUTPUT: code.json (UTF-8 without BOM, project root)
# COMPANION: apply-update.ps1 (parses AI's update_code.md response)
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
    'update_code.md',
    'update_code.txt',
    'update_code.json',
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

# ================================================================
# AI RESPONSE CONTRACT
# Instructions the AI must follow when generating update_code.md
# ================================================================

function Get-AiResponseContract {
    # Build fence strings from char codes to avoid PowerShell backtick escaping issues
    $fence = [string][char]0x60 + [string][char]0x60 + [string][char]0x60

    $tpl = @"
### OP 1: <short imperative title>

FILE: <path/to/file>
ACTION: <ACTION>

LOCATE:

__FENCE__<lang>
<exact source to find, byte-for-byte>
__FENCE__

REPLACE_WITH:

__FENCE__<lang>
<new content>
__FENCE__

---

### OP 2: <next operation title>
...
"@ -replace '__FENCE__', $fence

    $exReplace = @"
### OP 1: Remove legacy week view reference

FILE: js/main.js
ACTION: REPLACE

LOCATE:

__FENCE__javascript
let currentView = prefs.view === 'week' ? 'month' : (prefs.view || 'dashboard');
__FENCE__

REPLACE_WITH:

__FENCE__javascript
let currentView = prefs.view || 'dashboard';
__FENCE__
"@ -replace '__FENCE__', $fence

    $exCreate = @"
### OP 1: Add new utility module

FILE: js/utils/date-helpers.js
ACTION: CREATE

CONTENT:

__FENCE__javascript
/* Small date helpers for month view */
function formatShortDate(d) {
  return d.getDate() + '.' + (d.getMonth() + 1);
}
window.formatShortDate = formatShortDate;
__FENCE__
"@ -replace '__FENCE__', $fence

    $exDelete = @"
### OP 1: Remove obsolete migration script

FILE: tools/apply_calendar_privacy.js
ACTION: DELETE
"@

    return [ordered]@{
        purpose = "This project uses a two-script workflow: export-code.ps1 packages the project as code.json; apply-update.ps1 applies your structured patch. Your response MUST follow the format below so the patch parser can read it."

        workflow = @(
            "User uploads code.json to this chat",
            "User describes desired changes in natural language",
            "You (AI) respond with a structured patch matching the format below",
            "User saves your response verbatim as 'update_code.md' in project root",
            "User runs: .\apply-update.ps1",
            "Script parses, validates, backs up, then applies (or rolls back)"
        )

        output_file = "update_code.md"

        critical_encoding_rules = @(
            "Use ONLY plain ASCII backticks (U+0060) for code fences - NEVER copy fences from rendered HTML/markdown",
            "NO zero-width characters (U+200B, U+200C, U+200D, U+FEFF, U+2060) anywhere in output",
            "NO smart/curly quotes (U+2018, U+2019, U+201C, U+201D) - use straight ASCII quotes only",
            "Preserve Polish (a-c-e-l-n-o-s-z-z with diacritics) and Ukrainian (Cyrillic) characters literally - do NOT escape as backslash-u",
            "Match LOCATE block byte-for-byte with source file: indentation, whitespace, quotes all matter",
            "Do NOT wrap the entire response in one big markdown code fence - output must be raw markdown at top level"
        )

        format_specification = [ordered]@{
            operation_header = [ordered]@{
                pattern = "### OP <N>: <title>"
                example = "### OP 1: Remove legacy week view reference"
                notes   = "Line starts with three hashes + space + OP + space + integer + colon + space + human title. N is sequential starting from 1."
            }
            metadata_fields = [ordered]@{
                FILE = [ordered]@{
                    pattern = "FILE: <relative-path-from-project-root>"
                    example = "FILE: js/main.js"
                    notes   = "Forward slashes only. No backticks. No leading slash. No drive letter."
                }
                ACTION = [ordered]@{
                    pattern = "ACTION: <UPPERCASE_ACTION>"
                    example = "ACTION: REPLACE"
                    allowed = @("REPLACE", "CREATE", "DELETE", "INSERT_AFTER", "INSERT_BEFORE")
                }
            }
            code_blocks = [ordered]@{
                block_headers = "LOCATE: | REPLACE_WITH: | CONTENT: (each on its own line, followed by blank line, then fenced code block)"
                fence_open    = "Exactly three ASCII backticks + optional language tag on same line, e.g. triple-backtick + javascript"
                fence_close   = "Exactly three ASCII backticks alone on their own line"
                content_lines = "Everything between fence-open and fence-close is preserved as-is (byte-exact)"
            }
        }

        supported_actions = [ordered]@{
            REPLACE = [ordered]@{
                description  = "Replace exact matching block with new content. LOCATE must appear exactly ONCE in target file."
                requires     = @("FILE", "ACTION", "LOCATE", "REPLACE_WITH")
                failure_mode = "If LOCATE not found -> throw error. If LOCATE found N>1 times -> throw 'must be unique' error."
            }
            CREATE = [ordered]@{
                description  = "Create new file with given content. Fails if file already exists."
                requires     = @("FILE", "ACTION", "CONTENT")
                failure_mode = "If file exists -> throw error. Use REPLACE or DELETE first."
            }
            DELETE = [ordered]@{
                description  = "Delete file. Uses 'git rm' if tracked, else Remove-Item."
                requires     = @("FILE", "ACTION")
                failure_mode = "If file not found -> throw error."
            }
            INSERT_AFTER = [ordered]@{
                description = "Insert new content immediately after LOCATE block."
                requires    = @("FILE", "ACTION", "LOCATE", "REPLACE_WITH")
            }
            INSERT_BEFORE = [ordered]@{
                description = "Insert new content immediately before LOCATE block."
                requires    = @("FILE", "ACTION", "LOCATE", "REPLACE_WITH")
            }
        }

        response_template = $tpl
        example_replace   = $exReplace
        example_create    = $exCreate
        example_delete    = $exDelete

        validation_rules = @(
            "Each OP has unique sequential number starting from 1",
            "FILE is relative path from project root (no leading slash, no drive letter, no ..)",
            "For REPLACE/INSERT: FILE must already exist. For CREATE: FILE must NOT exist. For DELETE: FILE must exist.",
            "ACTION must be exactly one of the 5 uppercase values",
            "LOCATE must match target file byte-for-byte including indentation and whitespace",
            "LOCATE must appear exactly ONCE in target - add context lines if ambiguous",
            "REPLACE_WITH can be empty string (to effectively delete a block) but LOCATE cannot",
            "Multi-file changes = multiple OPs, one OP per file modification"
        )

        common_mistakes_to_avoid = @(
            [ordered]@{
                mistake     = "Using single backticks instead of triple for code fences"
                consequence = "Parser cannot detect code blocks - LOCATE/REPLACE_WITH end up empty - validation fails"
            },
            [ordered]@{
                mistake     = "Copying backticks from rendered chat/HTML (introduces U+200B zero-width space before them)"
                consequence = "Fence regex fails silently - parser treats code as prose - operation malformed"
            },
            [ordered]@{
                mistake     = "Escaping Polish/Ukrainian chars as unicode escapes or HTML entities"
                consequence = "Source file has literal characters, LOCATE has escaped ones -> never matches"
            },
            [ordered]@{
                mistake     = "LOCATE block appears multiple times in file"
                consequence = "Script throws 'LOCATE found N times, must be unique' - add surrounding context lines"
            },
            [ordered]@{
                mistake     = "Whitespace mismatch (tabs vs spaces, trailing spaces)"
                consequence = "LOCATE not found. Script normalizes line endings (CRLF/LF) but NOT tabs vs spaces."
            },
            [ordered]@{
                mistake     = "Wrapping entire response in one big markdown code fence"
                consequence = "Parser sees one huge code block, no OPs detected."
            },
            [ordered]@{
                mistake     = "Adding preamble like 'Here is the patch:' or 'Sure, I can help!' before ### OP 1"
                consequence = "Parser tolerates prose between OPs, but confuses humans reading update_code.md. Start response directly with ### OP 1:"
            }
        )

        self_verification_checklist = @(
            "Response starts with '### OP 1:' at line 1 (no preamble)",
            "Every OP has FILE, ACTION, and all required code blocks for its action type",
            "All code fences are exactly 3 ASCII backticks (U+0060), never 1/2/4, never with invisible prefix",
            "Each LOCATE block was verified against files[].content in code.json - it exists byte-for-byte",
            "Response has no zero-width chars, no smart quotes, no BOM",
            "For multi-file work: separate OPs, not merged"
        )

        after_your_response = "After the OPs, add a brief plain-text summary (2-4 sentences) OUTSIDE any code block explaining what was changed and why. This helps the user review before running apply-update.ps1."
    }
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

# Build root JSON object
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

    # === STRICT CONTRACT: how AI must format its response ===
    ai_response_contract = Get-AiResponseContract

    # === Quick reminder (full contract is above) ===
    ai_instructions = @(
        "Read AGENT.md first (in files[]) - contains critical project rules"
        "Follow ai_response_contract format EXACTLY - apply-update.ps1 parses it strictly"
        "NO ES modules - use window.myFunc = myFunc pattern"
        "Preserve UTF-8 literally (Polish/Ukrainian) - never escape as unicode"
        "Use exactly 3 ASCII backticks for fences - no invisible chars from HTML copy-paste"
        "LOCATE must match target file byte-for-byte and be unique"
        "Verify file paths against files[] array before writing LOCATE"
    )

    project_structure = $treeString
    large_files = $largeFiles
    files = $filesArray
}

Write-Host "[CONVERT] Converting to JSON..." -ForegroundColor Yellow

# Convert to JSON with proper depth (files array + contract are nested)
$jsonString = $jsonObject | ConvertTo-Json -Depth 15 -Compress:$false

# Write UTF-8 without BOM
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
Write-Host "  2. AI reads .files array + .ai_response_contract" -ForegroundColor Gray
Write-Host "  3. Save AI response as update_code.md" -ForegroundColor Gray
Write-Host "  4. Run: .\apply-update.ps1" -ForegroundColor Gray
Write-Host ""