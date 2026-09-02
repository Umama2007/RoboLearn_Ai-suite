@echo off
title RoboLearn - Automated Setup and Launcher
color 0A
echo ======================================================================
echo          ROBOLEARN — AUTOMATED LOCAL ENVIRONMENT SETUP & LAUNCHER
echo ======================================================================
echo.

set SCRIPT_DIR=%~dp0

:: 1. CHECK PYTHON
echo [1/4] Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] WARNING: Python command not found in PATH.
    echo Please make sure Python 3.10+ is installed from https://python.org
    pause
    exit /b
)
echo [+] Python found. Installing/verifying Python requirements...
pip install -r "%SCRIPT_DIR%backend\requirements.txt" --quiet
python "%SCRIPT_DIR%backend\preload_model.py"

:: 2. CHECK FRONTEND NODE DEPENDENCIES
echo.
echo [2/4] Checking Frontend dependencies (npm)...
if not exist "%SCRIPT_DIR%frontend\node_modules" (
    echo [!] node_modules missing. Installing npm packages for frontend...
    cd /d "%SCRIPT_DIR%frontend"
    call npm install
    cd /d "%SCRIPT_DIR%"
) else (
    echo [+] Frontend dependencies verified.
)

:: 3. CHECK & SETUP OLLAMA & QWEN MODEL
echo.
echo [3/4] Checking Ollama & Local LLM Model (qwen2.5:1.5b)...

set "OLLAMA_BIN=ollama"
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        set "OLLAMA_BIN=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    ) else (
        echo [!] Ollama not found in system. Attempting automatic installation via winget...
        winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
        if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
            set "OLLAMA_BIN=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
        )
    )
)

echo [+] Starting local Ollama server...
start "RoboLearn - Ollama Engine" /min cmd /c "%OLLAMA_BIN% serve"
timeout /t 3 /nobreak >nul

echo [+] Pulling AI Model 'qwen2.5:1.5b' (if not already downloaded)...
"%OLLAMA_BIN%" pull qwen2.5:1.5b

:: 4. START BACKEND & FRONTEND SERVERS
echo.
echo [4/4] Launching Backend & Frontend servers...
start "RoboLearn - Backend" cmd /k "cd /d %SCRIPT_DIR%backend && python app.py"
start "RoboLearn - Frontend" cmd /k "cd /d %SCRIPT_DIR%frontend && npm run dev"

echo.
echo Waiting 4 seconds for servers to start...
timeout /t 4 /nobreak >nul

:: Launch browser
start http://localhost:3000

echo.
echo ======================================================================
echo   SUCCESS! RoboLearn is running locally at http://localhost:3000
echo ======================================================================
timeout /t 6 >nul
