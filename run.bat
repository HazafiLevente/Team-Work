@echo off
setlocal

echo ===============================
echo  Setup Configurator - DEV START
echo ===============================

REM ===== ROOT =====
echo.
echo [1/4] Root dependencies check...
if not exist node_modules (
  echo   Installing root dependencies...
  call npm install
) else (
  echo   Root node_modules already present, skipping.
)

REM ===== BACKEND =====
echo.
echo [X] Building images.runtime.json...
call node backend\services\build-image-map.js



echo.
echo [2/4] Backend dependencies check...
if not exist backend\node_modules (
  echo   Installing backend dependencies...
  cd backend
  call npm install
  cd ..
) else (
  echo   Backend node_modules already present, skipping.
)

REM ===== FRONTEND =====
echo.
echo [3/4] Frontend dependencies check...
if not exist Setup-Configurator\node_modules (
  echo   Installing frontend dependencies...
  cd Setup-Configurator
  call npm install --no-engine-strict
  cd ..
) else (
  echo   Frontend node_modules already present, skipping.
)

REM ===== START BACKEND =====
echo.
echo [4/4] Starting backend server...
start "Backend" cmd /k "node backend/server.js"

REM ===== START ANGULAR =====
echo.
echo Starting Angular frontend...
start "Angular" cmd /k "cd Setup-Configurator && npx ng serve --proxy-config proxy.conf.json"

echo.
echo ===============================
echo  ALL SERVICES STARTED
echo ===============================
pause
