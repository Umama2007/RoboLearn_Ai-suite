@echo off
title RoboLearn - Complete Local Environment Installer
color 0B
echo ======================================================================
echo          ROBOLEARN — AUTOMATED LOCAL ENVIRONMENT SETUP
echo ======================================================================
echo.

set SCRIPT_DIR=%~dp0

:: Step 1: Install Python packages
echo [Step 1/3] Installing Python Backend requirements...
python -m pip install --upgrade pip
python -m pip install -r "%SCRIPT_DIR%backend\requirements.txt"
python "%SCRIPT_DIR%backend\preload_model.py"

:: Step 2: Install Node modules
echo.
echo [Step 2/3] Installing Frontend Node.js dependencies...
cd /d "%SCRIPT_DIR%frontend"
call npm install
cd /d "%SCRIPT_DIR%"

:: Step 3: Install Ollama & Pull qwen2.5:1.5b Model
echo.
echo [Step 3/3] Setting up Ollama & downloading local LLM model (qwen2.5:1.5b)...

set "OLLAMA_BIN=ollama"
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        set "OLLAMA_BIN=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    ) else (
        echo Installing Ollama via winget...
        winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
        if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
            set "OLLAMA_BIN=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
        )
    )
)

echo Starting Ollama service...
start "RoboLearn - Ollama Engine" /min cmd /c "%OLLAMA_BIN% serve"
timeout /t 3 /nobreak >nul

echo Pulling model qwen2.5:1.5b...
"%OLLAMA_BIN%" pull qwen2.5:1.5b

echo.
echo ======================================================================
echo   SETUP COMPLETE! You can now run "Run_Website.bat" to start RoboLearn.
echo ======================================================================
pause
