@echo off
title Projekt Dev Starter

echo =====================================
echo Installing dependencies...
echo =====================================

cd backend
call npm install

cd ..

cd Setup-Configurator
call npm install
cd ..

echo =====================================
echo Starting Backend Server...
echo =====================================

start cmd /k "cd backend && node server.js"

echo =====================================
echo Starting Angular Server (port 80)...
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