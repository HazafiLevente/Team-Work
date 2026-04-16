@echo off
setlocal
title Projekt Dev Starter

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo =====================================
echo Checking Node.js...
echo =====================================

for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\tools\ensure-node.ps1" -ProjectRoot "%ROOT%"`) do set "NODE_EXE=%%I"

if not defined NODE_EXE (
    echo Failed to prepare a compatible Node.js runtime.
    pause
    exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "NPM_CMD=%NODE_DIR%npm.cmd"

if not exist "%NPM_CMD%" (
    echo npm.cmd was not found next to node.exe:
    echo %NODE_EXE%
    pause
    exit /b 1
)

echo Using Node.js:
"%NODE_EXE%" -v

echo =====================================
echo Installing dependencies...
echo =====================================

call :install_deps "%ROOT%" "%NPM_CMD%"
if errorlevel 1 exit /b 1

call :install_deps "%ROOT%\Setup-Configurator" "%NPM_CMD%"
if errorlevel 1 exit /b 1

echo =====================================
echo Starting Backend Server...
echo =====================================

start "Backend Server" cmd /k call "%ROOT%\tools\run-with-node.cmd" "%NODE_EXE%" "%ROOT%\backend" "%NODE_EXE%" server.js

echo =====================================
echo Starting Angular Server...
echo =====================================

start "Angular Server" cmd /k call "%ROOT%\tools\run-with-node.cmd" "%NODE_EXE%" "%ROOT%\Setup-Configurator" "%NPM_CMD%" run start:proxy

echo =====================================
echo Starting Admin Console...
echo =====================================

start "Admin Console" cmd /k call "%ROOT%\tools\run-with-node.cmd" "%NODE_EXE%" "%ROOT%\backend" "%NODE_EXE%" console/adminConsole.js

echo =====================================
echo All services started
echo =====================================

pause
exit /b 0

:install_deps
set "TARGET_DIR=%~1"
set "TARGET_NPM=%~2"

pushd "%TARGET_DIR%"
set "PATH=%NODE_DIR%;%PATH%"
set "npm_config_scripts_prepend_node_path=true"
call "%TARGET_NPM%" install
set "INSTALL_EXIT=%ERRORLEVEL%"
popd

if not "%INSTALL_EXIT%"=="0" (
    echo Dependency installation failed in:
    echo %TARGET_DIR%
    pause
    exit /b %INSTALL_EXIT%
)

exit /b 0
