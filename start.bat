@echo off
title Casino Platform
color 0A

echo.
echo  ========================================
echo   Casino Platform Starting...
echo  ========================================
echo.

echo  [1/3] Backend Server...
start "Backend (4000)" cmd /k "cd /d F:\casino-platform\backend && node index.js"

timeout /t 2 /nobreak >nul

echo  [2/3] Discord Bot...
start "Discord Bot" cmd /k "cd /d F:\casino-platform\discord-bot && node index.js"

timeout /t 2 /nobreak >nul

echo  [3/3] Frontend...
start "Frontend (3000)" cmd /k "cd /d F:\casino-platform\frontend && npm run dev"

echo.
echo  ========================================
echo   Done!
echo   Site:    http://localhost:3000
echo   Backend: http://localhost:4000
echo  ========================================
echo.
pause
