param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [switch]$SkipInstaller
)

$ErrorActionPreference = "Stop"
$preferredMajor = 20
$nodeRoot = Join-Path $ProjectRoot "tools\nodejs"
$cacheRoot = Join-Path $ProjectRoot "tools\node-cache"
$installerRoot = Join-Path $ProjectRoot "tools\nodejs-msi"
$installStartedToken = "__INSTALL_STARTED__"
$installRequiredToken = "__INSTALL_REQUIRED__"

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

function Get-NpmCommand([string]$NodeExe) {
    $nodeDir = Split-Path -Parent $NodeExe
    $npmCmd = Join-Path $nodeDir "npm.cmd"

    if (Test-Path $npmCmd) {
        return $npmCmd
    }

    return $null
}

function Test-NpmCommand([string]$NpmCmd) {
    if (-not $NpmCmd -or -not (Test-Path $NpmCmd)) {
        return $false
    }

    try {
        & $NpmCmd --version *> $null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Test-NodeCandidate([string]$NodeExe, [int]$RequiredMajor = 0) {
    if (-not $NodeExe -or -not (Test-Path $NodeExe)) {
        return $null
    }

    $version = Get-NodeVersion -NodeExe $NodeExe
    $major = Get-NodeMajor -Version $version

    if (-not $major) {
        return $null
    }

    if ($RequiredMajor -gt 0 -and $major -ne $RequiredMajor) {
        return $null
    }

    $npmCmd = Get-NpmCommand -NodeExe $NodeExe

    if (-not (Test-NpmCommand -NpmCmd $npmCmd)) {
        return $null
    }

    return [PSCustomObject]@{
        NodeExe = $NodeExe
        Version = $version
        Major   = $major
        NpmCmd  = $npmCmd
    }
}

function Get-SystemNodeCandidates {
    $candidates = New-Object System.Collections.Generic.List[string]

    foreach ($command in @(Get-Command node -All -ErrorAction SilentlyContinue)) {
        if ($command.Source) {
            [void]$candidates.Add($command.Source)
        }
    }

    foreach ($path in @(
        (Join-Path $env:ProgramFiles "nodejs\node.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\nodejs\node.exe")
    )) {
        if ($path) {
            [void]$candidates.Add($path)
        }
    }

    return $candidates | Select-Object -Unique
}

function Get-ProjectNodeCandidates([string]$SearchRoot) {
    if (-not (Test-Path $SearchRoot)) {
        return @()
    }

    return Get-ChildItem -Path $SearchRoot -Filter "node.exe" -Recurse -File |
        Sort-Object FullName |
        Select-Object -ExpandProperty FullName
}

function Get-VersionedArtifactInfo([System.IO.FileInfo]$File) {
    if ($File.BaseName -match '^node-v(\d+)\.(\d+)\.(\d+)-x64$') {
        return [PSCustomObject]@{
            File    = $File
            Version = [version]("{0}.{1}.{2}" -f $Matches[1], $Matches[2], $Matches[3])
            Major   = [int]$Matches[1]
        }
    }

    return [PSCustomObject]@{
        File    = $File
        Version = [version]"0.0.0"
        Major   = $null
    }
}

function Get-BestArtifact([string]$SearchRoot, [string]$Filter, [int]$RequiredMajor) {
    if (-not (Test-Path $SearchRoot)) {
        return $null
    }

    $artifacts = Get-ChildItem -Path $SearchRoot -Filter $Filter -File |
        ForEach-Object { Get-VersionedArtifactInfo -File $_ }

    if (-not $artifacts) {
        return $null
    }

    $preferred = $artifacts |
        Where-Object { $_.Major -eq $RequiredMajor } |
        Sort-Object Version -Descending |
        Select-Object -First 1

    if ($preferred) {
        return $preferred
    }

    return $artifacts |
        Sort-Object Version -Descending |
        Select-Object -First 1
}

function Repair-PortableNode([System.IO.FileInfo]$ArchiveFile) {
    New-Item -ItemType Directory -Force -Path $nodeRoot | Out-Null

    $extractFolder = Join-Path $nodeRoot $ArchiveFile.BaseName
    $extractedNode = Join-Path $extractFolder "node.exe"
    $validatedNode = Test-NodeCandidate -NodeExe $extractedNode -RequiredMajor $preferredMajor

    if ($validatedNode) {
        return $validatedNode
    }

    if (Test-Path $extractFolder) {
        $resolvedExtractFolder = [System.IO.Path]::GetFullPath($extractFolder)
        $resolvedNodeRoot = [System.IO.Path]::GetFullPath($nodeRoot)

        if (-not $resolvedExtractFolder.StartsWith($resolvedNodeRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to clean a path outside of $resolvedNodeRoot"
        }

        Remove-Item -LiteralPath $extractFolder -Recurse -Force
    }

    Expand-Archive -LiteralPath $ArchiveFile.FullName -DestinationPath $nodeRoot -Force

    $validatedNode = Test-NodeCandidate -NodeExe $extractedNode -RequiredMajor $preferredMajor

    if ($validatedNode) {
        return $validatedNode
    }

    throw "Portable Node.js archive $($ArchiveFile.Name) was extracted, but npm is still not usable."
}

function Find-CompatibleSystemNode([int]$PreferredMajor) {
    foreach ($candidate in (Get-SystemNodeCandidates)) {
        $validated = Test-NodeCandidate -NodeExe $candidate -RequiredMajor $PreferredMajor

        if ($validated) {
            return $validated
        }
    }

    return $null
}

$portableArchive = Get-BestArtifact -SearchRoot $cacheRoot -Filter "node-v*-win-x64.zip" -RequiredMajor $preferredMajor
if ($portableArchive) {
    $portableNode = Repair-PortableNode -ArchiveFile $portableArchive.File
    Write-Output $portableNode.NodeExe
    exit 0
}

$existingNode = Find-CompatibleSystemNode -PreferredMajor $preferredMajor
if ($existingNode) {
    Write-Output $existingNode.NodeExe
    exit 0
}

$installer = Get-BestArtifact -SearchRoot $installerRoot -Filter "node-v*-x64.msi" -RequiredMajor $preferredMajor

if ($installer) {
    if ($installer.Major -ne $preferredMajor) {
        [Console]::Error.WriteLine(
            "No Node.js $preferredMajor installer was found. Launching bundled installer $($installer.File.Name) instead."
        )
    }

    if ($SkipInstaller) {
        Write-Output $installRequiredToken
        exit 0
    }

    Start-Process -FilePath "msiexec.exe" -ArgumentList @("/i", "`"$($installer.File.FullName)`"") -Wait | Out-Null

    $installedNode = Find-CompatibleSystemNode -PreferredMajor $preferredMajor
    if ($installedNode) {
        Write-Output $installedNode.NodeExe
        exit 0
    }

    Write-Output $installStartedToken
    exit 0
}

throw "No compatible Node.js $preferredMajor installation with a working npm was found, and no Node.js $preferredMajor runtime is bundled in tools\node-cache or tools\nodejs-msi."
