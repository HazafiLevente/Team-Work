@echo off
title Projekt Dev Starter

echo =====================================
echo Checking Node.js...
echo =====================================

node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js not found. Downloading...

    powershell -Command "Invoke-WebRequest https://nodejs.org/dist/v22.12.0/node-v22.12.0-x64.msi -OutFile nodejs.msi"

    echo Installing Node.js...
    msiexec /i nodejs.msi /quiet /norestart

    echo Node installed.
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
