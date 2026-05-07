param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [switch]$SkipInstaller
)

$ErrorActionPreference = "Stop"
$preferredMajor = 20
$minSupportedMajor = 18
$maxSupportedMajor = 20
$requiredVersion = "v20.20.2"
$nodeRoot = Join-Path $ProjectRoot "tools\nodejs"
$cacheRoot = Join-Path $ProjectRoot "tools\node-cache"
$installerRoot = Join-Path $ProjectRoot "tools\nodejs-msi"
$installStartedToken = "__INSTALL_STARTED__"
$installRequiredToken = "__INSTALL_REQUIRED__"
$directMsiVersion = "v20.20.2"
$directMsiUrl = "https://nodejs.org/dist/$directMsiVersion/node-$directMsiVersion-x64.msi"

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

    # Portable ZIP installs may not ship npm.cmd shims next to node.exe.
    # If npm is present under node_modules, create a small cmd shim so the rest
    # of our tooling (start.bat) can reliably call npm.cmd.
    $npmCli = Join-Path $nodeDir "node_modules\npm\bin\npm-cli.js"
    if (Test-Path $npmCli) {
        try {
            $shimPath = $npmCmd
            $shim = @"
@echo off
setlocal
set "NODE_EXE=%~dp0node.exe"
"%NODE_EXE%" "%~dp0node_modules\npm\bin\npm-cli.js" %*
"@
            Set-Content -LiteralPath $shimPath -Value $shim -Encoding ASCII -Force
            return $shimPath
        } catch {
            return $null
        }
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

function Test-NodeCandidate([string]$NodeExe, [int]$MinMajor = 0, [int]$MaxMajor = 0) {
    if (-not $NodeExe -or -not (Test-Path $NodeExe)) {
        return $null
    }

    $version = Get-NodeVersion -NodeExe $NodeExe
    $major = Get-NodeMajor -Version $version

    if (-not $major) {
        return $null
    }

    if ($requiredVersion -and $version -ne $requiredVersion) {
        return $null
    }

    if ($MinMajor -gt 0 -and $MaxMajor -gt 0) {
        if ($major -lt $MinMajor -or $major -gt $MaxMajor) {
            return $null
        }
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

function Test-CommandAvailable([string]$Name) {
    try {
        return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
    } catch {
        return $false
    }
}

function Refresh-ProcessPathFromRegistry {
    try {
        $sysPath = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" -Name "Path" -ErrorAction Stop).Path
    } catch {
        $sysPath = $null
    }

    try {
        $userPath = (Get-ItemProperty -Path "HKCU:\Environment" -Name "Path" -ErrorAction Stop).Path
    } catch {
        $userPath = $null
    }

    $paths = @()
    if ($sysPath) { $paths += $sysPath }
    if ($userPath) { $paths += $userPath }

    if ($paths.Count -gt 0) {
        $env:Path = ($paths -join ";")
    }
}

function Install-NodeJsFromInternet {
    if ($SkipInstaller) {
        return $false
    }

    # Prefer a pinned Node 20 MSI to match native module compatibility and frontend engines.
    try {
        Write-Host "Node.js telepitese kozvetlen letoltessel (PowerShell)..."
        $out = Join-Path $env:TEMP "nodejs-installer.msi"
        Write-Host "Letoltes..."
        Invoke-WebRequest -Uri $directMsiUrl -OutFile $out
        Write-Host "Telepites..."
        $p = Start-Process -FilePath "msiexec.exe" -ArgumentList @("/i", "`"$out`"", "/quiet", "/norestart") -Wait -PassThru
        Remove-Item -LiteralPath $out -Force -ErrorAction SilentlyContinue
        if ($p.ExitCode -eq 0) {
            return $true
        }
        Write-Host "Direkt MSI telepites sikertelen, masik modszer probalasa..."
    } catch {
        Write-Host "Direkt MSI telepites sikertelen, masik modszer probalasa..."
    }

    if (Test-CommandAvailable -Name "winget") {
        try {
            Write-Host "Node.js telepitese winget-tel..."
            $p = Start-Process -FilePath "winget" -ArgumentList @("install", "-e", "--id", "OpenJS.NodeJS.LTS") -Wait -PassThru
            if ($p.ExitCode -eq 0) { return $true }
            Write-Host "winget telepites sikertelen, masik modszer probalasa..."
        } catch {
            Write-Host "winget telepites sikertelen, masik modszer probalasa..."
        }
    }

    if (Test-CommandAvailable -Name "choco") {
        try {
            Write-Host "Node.js telepitese Chocolatey-vel..."
            $p = Start-Process -FilePath "choco" -ArgumentList @("install", "nodejs-lts", "-y") -Wait -PassThru
            if ($p.ExitCode -eq 0) { return $true }
            Write-Host "Chocolatey telepites sikertelen, masik modszer probalasa..."
        } catch {
            Write-Host "Chocolatey telepites sikertelen, masik modszer probalasa..."
        }
    }
    return $false
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
    if ($File.BaseName -match '^node-v(\d+)\.(\d+)\.(\d+)-(?:win-)?x64$') {
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
    $validatedNode = Test-NodeCandidate -NodeExe $extractedNode -MinMajor $minSupportedMajor -MaxMajor $maxSupportedMajor

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

    $validatedNode = Test-NodeCandidate -NodeExe $extractedNode -MinMajor $minSupportedMajor -MaxMajor $maxSupportedMajor

    if ($validatedNode) {
        return $validatedNode
    }

    return $null
}

function Find-CompatibleSystemNode([int]$MinMajor = 0, [int]$MaxMajor = 0) {
    foreach ($candidate in (Get-SystemNodeCandidates)) {
        $validated = Test-NodeCandidate -NodeExe $candidate -MinMajor $MinMajor -MaxMajor $MaxMajor

        if ($validated) {
            return $validated
        }
    }

    return $null
}

# Prefer the pinned Node version, even if another 18-20 is installed.
$existingNode = Find-CompatibleSystemNode -MinMajor $minSupportedMajor -MaxMajor $maxSupportedMajor
if ($existingNode) {
    Write-Output $existingNode.NodeExe
    exit 0
}

# If the pinned Node is not present, install it (even if another Node is installed),
# because native addons and frontend engines are sensitive to ABI/engine changes.

# Online install attempts (winget -> choco -> direct MSI). If these fail, we fall back to the original
# "bundled ZIP/MSI" behavior as the last resort.
if ($SkipInstaller) {
    Write-Output $installRequiredToken
    exit 0
}

$didInstall = Install-NodeJsFromInternet
if ($didInstall) {
    Refresh-ProcessPathFromRegistry
    $existingNode = Find-CompatibleSystemNode -MinMajor $minSupportedMajor -MaxMajor $maxSupportedMajor
    if ($existingNode) {
        Write-Output $existingNode.NodeExe
        exit 0
    }

    Write-Output $installStartedToken
    exit 0
}

# --- Last resort: use bundled portable ZIP or bundled MSI (original behavior) ---
$portableArchive = $null
if ($requiredVersion) {
    $portableArchive = Get-ChildItem -Path $cacheRoot -Filter ("node-" + $requiredVersion + "-win-x64.zip") -File -ErrorAction SilentlyContinue |
        Select-Object -First 1
}
if ($portableArchive) {
    try {
        $portableNode = Repair-PortableNode -ArchiveFile $portableArchive
        if ($portableNode) {
            Write-Output $portableNode.NodeExe
            exit 0
        }
    } catch {
        # ignore and continue to MSI fallback
    }
}

$installer = $null
if ($requiredVersion) {
    $installer = Get-ChildItem -Path $installerRoot -Filter ("node-" + $requiredVersion + "-x64.msi") -File -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

if ($installer) {
    Start-Process -FilePath "msiexec.exe" -ArgumentList @("/i", "`"$($installer.FullName)`"", "/quiet", "/norestart") -Wait | Out-Null

    Refresh-ProcessPathFromRegistry
    $installedNode = Find-CompatibleSystemNode -MinMajor $minSupportedMajor -MaxMajor $maxSupportedMajor
    if ($installedNode) {
        Write-Output $installedNode.NodeExe
        exit 0
    }

    Write-Output $installStartedToken
    exit 0
}

throw "No compatible Node.js installation with a working npm was found, and no Node.js runtime is bundled in tools\node-cache or tools\nodejs-msi."
