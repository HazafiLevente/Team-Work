@echo off
echo ===============================
echo  Setup Configurator - DEV START
echo ===============================

REM ---- ROOT npm install ----
echo.
echo [1/4] Root npm install...
call npm install

REM ---- BACKEND npm install ----
echo.
echo [2/4] Backend npm install...
cd backend
call npm install
cd ..

REM ---- FRONTEND npm install ----
echo.
echo [3/4] Frontend npm install...
cd Setup-Configurator
call npm install
cd ..

REM ---- START BACKEND ----
echo.
echo [4/4] Starting backend server...
start "Backend" cmd /k "node backend/server.js"

REM ---- START ANGULAR ----
echo.
echo Starting Angular frontend...
start "Angular" cmd /k "cd Setup-Configurator && ng serve --proxy-config proxy.conf.json"

echo.
echo ===============================
echo  ALL SERVICES STARTED
echo ===============================
pause
