# split-css.ps1 - splits css/styles.css into modular files

$sourceFile = "css/styles.css"
$outputDir = "css"
$backupFile = "css/styles.css.backup"

# Backup
if (-not (Test-Path $backupFile)) {
    Copy-Item $sourceFile $backupFile
    Write-Host "[OK] Backup created" -ForegroundColor Green
}

# Read UTF-8
$content = [System.IO.File]::ReadAllText((Resolve-Path $sourceFile).Path, [System.Text.Encoding]::UTF8)
Write-Host "[OK] Source: $sourceFile" -ForegroundColor Cyan

# Mapping: section name -> file
$mapping = @{
    'TOP BAR' = 'layout'
    'LANGUAGE DROPDOWN' = 'layout'
    'SIDE MENU' = 'layout'
    'MAIN CONTROLS' = 'layout'
    'VIEW SWITCHER' = 'layout'
    'EDIT BANNER' = 'components'
    'EDIT PALETTE' = 'components'
    'TOAST' = 'components'
    'MODAL' = 'components'
    'PALETTE BUTTONS' = 'components'
    'MONTH NAV' = 'calendar'
    'CALENDAR' = 'calendar'
    'INFO PANEL' = 'calendar'
    'LEGEND' = 'calendar'
    'NOTIFICATION LEAD' = 'calendar'
    'NADGODZINY' = 'overtime'
    'WYSOKA STAWKA' = 'overtime'
    'RELIEF POPUP' = 'overtime'
    'POPUP FIX' = 'overtime'
    'WEEK VIEW' = 'views'
    'YEAR VIEW' = 'views'
    'TABLE VIEW' = 'views'
    'DASHBOARD' = 'dashboard'
    'EMPTY STATE' = 'dashboard'
}

# Collectors
$files = @{
    'variables'  = @()
    'layout'     = @()
    'components' = @()
    'calendar'   = @()
    'overtime'   = @()
    'views'      = @()
    'dashboard'  = @()
    'responsive' = @()
    'print'      = @()
}

# Extract prelude (before first section)
$firstSection = [regex]::Match($content, '(?m)^/\* === ')
if ($firstSection.Success) {
    $prelude = $content.Substring(0, $firstSection.Index)
    $files['variables'] += $prelude.TrimEnd()
    $content = $content.Substring($firstSection.Index)
    Write-Host "[OK] Extracted prelude to variables.css" -ForegroundColor Green
}

# Split by sections - use different variable name (NOT $matches!)
$pattern = '(?ms)(/\* === (.+?) === \*/.*?)(?=/\* === |\z)'
$sectionMatches = [regex]::Matches($content, $pattern)

Write-Host "[OK] Found $($sectionMatches.Count) sections" -ForegroundColor Cyan
Write-Host ""

foreach ($m in $sectionMatches) {
    $fullSection = $m.Groups[1].Value
    $sectionName = $m.Groups[2].Value.Trim()

    $targetFile = $null
    foreach ($key in $mapping.Keys) {
        if ($sectionName -match $key) {
            $targetFile = $mapping[$key]
            break
        }
    }

    if (-not $targetFile) {
        Write-Host "[WARN] UNMAPPED: '$sectionName' -> components" -ForegroundColor Yellow
        $targetFile = 'components'
    } else {
        Write-Host "  '$sectionName' -> $targetFile.css" -ForegroundColor Gray
    }

    $files[$targetFile] += $fullSection.TrimEnd()
}

Write-Host ""

# Extract media queries into responsive.css and print.css
foreach ($fileName in @('variables', 'layout', 'components', 'calendar', 'overtime', 'views', 'dashboard')) {
    $combined = $files[$fileName] -join "`n`n"

    # Extract print
    $printPattern = '(?ms)@media\s+print\s*\{(?:[^{}]|\{[^{}]*\})*\}'
    $printMatches = [regex]::Matches($combined, $printPattern)
    foreach ($pm in $printMatches) {
        $files['print'] += $pm.Value.TrimEnd()
    }
    $combined = [regex]::Replace($combined, $printPattern, '')

    # Extract responsive (max-width / max-height)
    $respPattern = '(?ms)@media\s*\([^)]*max-(?:width|height)[^)]*\)\s*\{(?:[^{}]|\{[^{}]*\})*\}'
    $respMatches = [regex]::Matches($combined, $respPattern)
    foreach ($rm in $respMatches) {
        $files['responsive'] += $rm.Value.TrimEnd()
    }
    $combined = [regex]::Replace($combined, $respPattern, '')

    $files[$fileName] = @($combined.Trim())
}

Write-Host "[OK] Extracted $($files['responsive'].Count) responsive blocks" -ForegroundColor Cyan
Write-Host "[OK] Extracted $($files['print'].Count) print blocks" -ForegroundColor Cyan
Write-Host ""

# Write files
foreach ($fileName in $files.Keys) {
    $outputPath = Join-Path $outputDir "$fileName.css"
    $fileContent = $files[$fileName] -join "`n`n"

    if ([string]::IsNullOrWhiteSpace($fileContent)) {
        Write-Host "[SKIP] $fileName.css (empty)" -ForegroundColor Yellow
        continue
    }

    $header = "/* ================================================================`n"
    $header += "   GRAFIK GILLETTE - $($fileName.ToUpper()).CSS`n"
    $header += "   Part of modular CSS split (v3.8.0)`n"
    $header += "   ================================================================ */`n`n"

    $finalContent = $header + $fileContent

    [System.IO.File]::WriteAllText(
        (Join-Path (Get-Location) $outputPath),
        $finalContent,
        [System.Text.UTF8Encoding]::new($false)
    )

    $lineCount = ($finalContent -split "`n").Count
    Write-Host "[OK] Wrote: $outputPath ($lineCount lines)" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  SPLIT COMPLETE" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT: Update index.html, test, then delete original styles.css" -ForegroundColor Yellow
Write-Host "Backup at: $backupFile" -ForegroundColor Yellow