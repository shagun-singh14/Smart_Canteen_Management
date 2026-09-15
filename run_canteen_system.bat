@echo off
title Smart Canteen Management System - CSE3001
echo ======================================================================
echo           SMART CANTEEN MANAGEMENT SYSTEM (CSE3001 DBMS)
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js environment...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js.
    pause
    exit /b 1
)

echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing required packages...
    call npm install
)

echo [3/3] Launching Smart Canteen Web App on http://localhost:3000 ...
start http://localhost:3000

echo.
echo Server starting. Press Ctrl+C to stop.
echo.
node server/index.js
pause
