@echo off
setlocal

set "ROOT=%~1"
set "NODE_EXE=%~2"
set "NPM_CMD=%~3"

if not exist "%ROOT%" (
    echo Project root was not found:
    echo %ROOT%
    exit /b 1
)

if not exist "%NODE_EXE%" (
    echo Node executable was not found:
    echo %NODE_EXE%
    exit /b 1
)

if not exist "%NPM_CMD%" (
    echo npm.cmd was not found:
    echo %NPM_CMD%
    exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

echo =====================================
echo Repairing root node modules...
echo =====================================

pushd "%ROOT%"
call "%NPM_CMD%" rebuild better-sqlite3 msnodesqlv8
if errorlevel 1 (
    echo Rebuild failed, running npm install as fallback...
    call "%NPM_CMD%" install
    if errorlevel 1 (
        popd
        echo Module repair failed in project root.
        exit /b 1
    )
)
popd

if exist "%ROOT%\Setup-Configurator\package.json" (
    echo =====================================
    echo Checking frontend node modules...
    echo =====================================

    pushd "%ROOT%\Setup-Configurator"
    call "%NPM_CMD%" install
    if errorlevel 1 (
        popd
        echo Frontend module repair failed.
        exit /b 1
    )
    popd
)

echo Module repair completed.
exit /b 0
