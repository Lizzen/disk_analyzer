@echo off
setlocal EnableDelayedExpansion
title Disk Analyzer

:: ─── Verificar privilegios de administrador ──────────────────────────────────
net session >nul 2>&1
if not %errorLevel% == 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

:: ─── Verificar Python ────────────────────────────────────────────────────────
where pythonw >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  ERROR: Python no encontrado en PATH.
    echo  Instala Python 3.11 desde https://python.org
    pause & exit /b 1
)

:: ─── Verificar dependencias Python ───────────────────────────────────────────
python -c "import fastapi, uvicorn, webview" >nul 2>&1
if %errorLevel% neq 0 (
    echo Instalando dependencias Python...
    python -m pip install -r requirements.txt
    if %errorLevel% neq 0 (
        echo  ERROR: No se pudieron instalar las dependencias.
        pause & exit /b 1
    )
)

:: ─── Verificar/compilar frontend ─────────────────────────────────────────────
if not exist "frontend\dist\index.html" (
    echo Compilando frontend...
    where npm >nul 2>&1
    if %errorLevel% neq 0 (
        echo  AVISO: npm no encontrado. El frontend no se puede compilar.
        echo  Instala Node.js desde https://nodejs.org
        pause & exit /b 1
    )
    if not exist "frontend\node_modules\" (
        cd frontend && npm install && cd ..
    )
    cd frontend && npm run build && cd ..
    if %errorLevel% neq 0 (
        echo  ERROR: Fallo la compilacion del frontend.
        pause & exit /b 1
    )
)

:: ─── Lanzar aplicacion ───────────────────────────────────────────────────────
start "" pythonw app_web.py
