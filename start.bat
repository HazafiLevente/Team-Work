@echo off
title Projekt Dev Starter

echo =====================================
echo Checking Node.js...
echo =====================================

set "NODEJS_MSI=%~dp0tools\nodejs-msi\node-v25.9.0-x64.msi"

node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    IF EXIST "%NODEJS_MSI%" (
        echo Node.js not found. Installing from tools\nodejs-msi...
        msiexec /i "%NODEJS_MSI%" /quiet /norestart
        echo Node installed.
    ) ELSE (
        echo Node.js installer not found: %NODEJS_MSI%
        pause
        exit /b 1
    )
) ELSE (
    echo Node.js already installed.
)

echo =====================================
echo Installing dependencies...
echo =====================================

call npm install

cd Setup-Configurator
call npm install
cd ..

echo =====================================
echo Starting Backend Server...
echo =====================================

start cmd /k "cd backend && node server.js"

echo =====================================
echo Starting Angular Server...
echo =====================================

start cmd /k "cd Setup-Configurator && npm run start:proxy"

echo =====================================
echo Starting Admin Console...
echo =====================================

start cmd /k "cd backend && node console/adminConsole.js"

echo =====================================
echo All services started
echo =====================================

pause
