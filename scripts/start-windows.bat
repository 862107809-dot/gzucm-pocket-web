@echo off
chcp 65001 >nul
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 18+ from https://nodejs.org/ first.
  pause
  exit /b 1
)
set PUBLIC_MODE=
set HOST=127.0.0.1
set PORT=4173
start "" "http://127.0.0.1:4173/"
node server\server.js
pause
