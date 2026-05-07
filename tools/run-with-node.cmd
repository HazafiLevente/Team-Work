@echo off
setlocal

set "NODE_EXE=%~1"
set "WORKDIR=%~2"
set "COMMAND=%~3"

if not exist "%NODE_EXE%" (
    echo Node executable not found:
    echo %NODE_EXE%
    exit /b 1
)

if not exist "%COMMAND%" (
    echo Command executable not found:
    echo %COMMAND%
    exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

cd /d "%WORKDIR%"
call "%COMMAND%" %~4 %~5 %~6 %~7 %~8 %~9
