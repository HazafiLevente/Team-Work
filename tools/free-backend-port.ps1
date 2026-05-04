param(
    [string]$ProjectRoot,
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

function Get-ProcessInfo([int]$ProcessId) {
    Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
}

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if (-not $connections) {
    Write-Host "Backend port $Port is free."
    exit 0
}

$owners = $connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($owner in $owners) {
    $processInfo = Get-ProcessInfo -ProcessId $owner

    if (-not $processInfo) {
        continue
    }

    $exe = $processInfo.ExecutablePath
    $commandLine = [string]$processInfo.CommandLine
    $isNode = $exe -and ([System.IO.Path]::GetFileName($exe) -ieq "node.exe")

    if (-not $isNode) {
        Write-Error "Port $Port is used by a non-Node process: PID $owner $exe"
        exit 1
    }

    Write-Host "Stopping old Node process on port ${Port}: PID $owner"
    Write-Host $commandLine
    Stop-Process -Id $owner -Force
}

Start-Sleep -Milliseconds 500

$stillBusy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($stillBusy) {
    Write-Error "Port $Port is still busy after stopping old Node processes."
    exit 1
}

Write-Host "Backend port $Port is ready."
exit 0
