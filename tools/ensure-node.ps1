param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
$desiredMajor = 20
$nodeRoot = Join-Path $ProjectRoot "tools\nodejs"
$cacheRoot = Join-Path $ProjectRoot "tools\node-cache"
$latestPageUrl = "https://nodejs.org/dist/latest-v20.x/"

function Get-NodeVersion([string]$NodeExe) {
    try {
        return (& $NodeExe --version).Trim()
    } catch {
        return $null
    }
}

function Get-NodeMajor([string]$Version) {
    if ($Version -match "^v(\d+)\.") {
        return [int]$Matches[1]
    }

    return $null
}

function Find-CompatibleNode([string]$SearchRoot, [int]$RequiredMajor) {
    if (-not (Test-Path $SearchRoot)) {
        return $null
    }

    $candidates = Get-ChildItem -Path $SearchRoot -Filter "node.exe" -Recurse -File | Sort-Object FullName

    foreach ($candidate in $candidates) {
        $version = Get-NodeVersion -NodeExe $candidate.FullName

        if ((Get-NodeMajor -Version $version) -eq $RequiredMajor) {
            return $candidate.FullName
        }
    }

    return $null
}

$existingNode = Find-CompatibleNode -SearchRoot $nodeRoot -RequiredMajor $desiredMajor
if ($existingNode) {
    Write-Output $existingNode
    exit 0
}

New-Item -ItemType Directory -Force -Path $nodeRoot, $cacheRoot | Out-Null

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$zipName = $null

try {
    $page = (Invoke-WebRequest -UseBasicParsing -Uri $latestPageUrl).Content
    $zipMatch = [regex]::Match($page, "node-v20\.\d+\.\d+-win-x64\.zip")

    if ($zipMatch.Success) {
        $zipName = $zipMatch.Value
    }
} catch {
}

if (-not $zipName) {
    $cachedZip = Get-ChildItem -Path $cacheRoot -Filter "node-v20.*-win-x64.zip" -File -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        Select-Object -First 1

    if ($cachedZip) {
        $zipName = $cachedZip.Name
    } else {
        throw "Could not download Node.js 20. The first run needs internet access to fetch the portable runtime."
    }
}

$zipUrl = "$latestPageUrl$zipName"
$zipPath = Join-Path $cacheRoot $zipName
$extractFolder = Join-Path $nodeRoot ([System.IO.Path]::GetFileNameWithoutExtension($zipName))

if (-not (Test-Path $zipPath)) {
    Invoke-WebRequest -UseBasicParsing -Uri $zipUrl -OutFile $zipPath
}

if (-not (Test-Path $extractFolder)) {
    Expand-Archive -Path $zipPath -DestinationPath $nodeRoot -Force
}

$downloadedNode = Find-CompatibleNode -SearchRoot $extractFolder -RequiredMajor $desiredMajor
if (-not $downloadedNode) {
    throw "Node.js was downloaded, but node.exe was not found under $extractFolder."
}

Write-Output $downloadedNode
