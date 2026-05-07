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

if /I "%NODE_EXE%"=="__INSTALL_STARTED__" (
    echo Node.js installer finished, but no compatible Node.js runtime was detected yet.
    echo If you completed the installation, close this window and run start.bat again.
    pause
    exit /b 0
)

if /I "%NODE_EXE%"=="__INSTALL_REQUIRED__" (
    echo Node.js is required, but installation has not started.
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

call "%NPM_CMD%" --version >nul 2>nul
if errorlevel 1 (
    echo npm is not working for this Node.js installation:
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

call :verify_native_deps "%ROOT%" "%NODE_EXE%" "%NPM_CMD%"
if errorlevel 1 exit /b 1

call :free_backend_port "%ROOT%" "3000"
if errorlevel 1 exit /b 1

echo =====================================
echo Starting Backend Server...
echo =====================================

start "Backend Server" cmd /k call "%ROOT%\tools\run-with-repair.cmd" "%ROOT%" "%NODE_EXE%" "%NPM_CMD%" "%ROOT%\backend" "%NODE_EXE%" server.js

echo =====================================
echo Starting Angular Server...
echo =====================================

start "Angular Server" cmd /k call "%ROOT%\tools\run-with-repair.cmd" "%ROOT%" "%NODE_EXE%" "%NPM_CMD%" "%ROOT%\Setup-Configurator" "%NPM_CMD%" run start:proxy

echo =====================================
echo Starting Admin Console...
echo =====================================

start "Admin Console" cmd /k call "%ROOT%\tools\run-with-repair.cmd" "%ROOT%" "%NODE_EXE%" "%NPM_CMD%" "%ROOT%\backend" "%NODE_EXE%" console/adminConsole.js

echo =====================================
echo All services started
echo =====================================

pause
exit /b 0

:free_backend_port
set "PORT_ROOT=%~1"
set "BACKEND_PORT=%~2"

echo =====================================
echo Checking backend port %BACKEND_PORT%...
echo =====================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\tools\free-backend-port.ps1" -ProjectRoot "%PORT_ROOT%" -Port "%BACKEND_PORT%"
if errorlevel 1 (
    echo Could not free backend port %BACKEND_PORT%.
    echo Close the process using that port, then run start.bat again.
    pause
    exit /b 1
)

exit /b 0

:verify_native_deps
set "CHECK_ROOT=%~1"
set "CHECK_NODE=%~2"
set "CHECK_NPM=%~3"

echo =====================================
echo Checking native modules...
echo =====================================

pushd "%CHECK_ROOT%"
set "PATH=%NODE_DIR%;%PATH%"
"%CHECK_NODE%" -e "require('better-sqlite3'); console.log('Native modules OK')"
set "NATIVE_EXIT=%ERRORLEVEL%"
popd

if "%NATIVE_EXIT%"=="0" exit /b 0

echo Native modules are not compatible with this Node.js version.
echo Repairing modules now...
call "%ROOT%\tools\repair-node-modules.cmd" "%CHECK_ROOT%" "%CHECK_NODE%" "%CHECK_NPM%"
if errorlevel 1 exit /b 1

pushd "%CHECK_ROOT%"
set "PATH=%NODE_DIR%;%PATH%"
"%CHECK_NODE%" -e "require('better-sqlite3'); console.log('Native modules repaired')"
set "NATIVE_RECHECK_EXIT=%ERRORLEVEL%"
popd

if not "%NATIVE_RECHECK_EXIT%"=="0" (
    echo Native module repair finished, but verification still failed.
    pause
    exit /b %NATIVE_RECHECK_EXIT%
)

exit /b 0

:install_deps
set "TARGET_DIR=%~1"
set "TARGET_NPM=%~2"

pushd "%TARGET_DIR%"
set "PATH=%NODE_DIR%;%PATH%"
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
