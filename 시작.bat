@echo off
title 카지노 플랫폼 실행기
color 0A

echo.
echo  ========================================
echo   🎰 카지노 플랫폼 시작 중...
echo  ========================================
echo.

:: 백엔드 서버
echo  [1/3] 백엔드 서버 시작...
start "🎰 백엔드 서버 (4000)" cmd /k "cd /d F:\casino-platform\backend && node index.js"

timeout /t 2 /nobreak >nul

:: 디스코드 봇
echo  [2/3] 디스코드 봇 시작...
start "🤖 디스코드 봇" cmd /k "cd /d F:\casino-platform\discord-bot && node index.js"

timeout /t 2 /nobreak >nul

:: 프론트엔드
echo  [3/3] 프론트엔드 시작...
start "🌐 프론트엔드 (3000)" cmd /k "cd /d F:\casino-platform\frontend && npm run dev"

echo.
echo  ========================================
echo   ✅ 전부 실행됐어요!
echo.
echo   🌐 사이트:   http://localhost:3000
echo   ⚙️  백엔드:   http://localhost:4000
echo  ========================================
echo.
echo  창을 닫으면 이 런처만 종료돼요.
echo  각 서버는 개별 창에서 실행 중이에요.
echo.
pause
