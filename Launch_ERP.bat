@echo off
title Madan Creation ERP - Launcher
echo ========================================
echo   Starting Madan Creation ERP
echo ========================================
cd /d "%~dp0"

:: Start the server via CMD
echo.
echo Please wait for the "VITE ready" message...
echo Once ready, minimize this window and go to:
echo http://localhost:5173
echo ========================================
echo.

cmd /c npm run dev

pause
