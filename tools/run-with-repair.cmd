@echo off
setlocal

set "ROOT=%~1"
set "NODE_EXE=%~2"
set "NPM_CMD=%~3"
set "WORKDIR=%~4"
set "COMMAND=%~5"
set "REPAIRED=0"

if not exist "%NODE_EXE%" (
    echo Node executable not found:
    echo %NODE_EXE%
    exit /b 1
)

if not exist "%NPM_CMD%" (
    echo npm.cmd not found:
    echo %NPM_CMD%
    exit /b 1
)

if not exist "%COMMAND%" (
    echo Command executable not found:
    echo %COMMAND%
    exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

:run_command
cd /d "%WORKDIR%"
call "%COMMAND%" %~6 %~7 %~8 %~9
set "COMMAND_EXIT=%ERRORLEVEL%"

if "%COMMAND_EXIT%"=="0" exit /b 0

if "%REPAIRED%"=="1" (
    echo Service failed after module repair. Exit code: %COMMAND_EXIT%
    exit /b %COMMAND_EXIT%
)

echo Service failed with exit code %COMMAND_EXIT%.
echo Trying module repair once, then restarting this service...
set "REPAIRED=1"
call "%ROOT%\tools\repair-node-modules.cmd" "%ROOT%" "%NODE_EXE%" "%NPM_CMD%"
if errorlevel 1 exit /b 1

goto run_command
