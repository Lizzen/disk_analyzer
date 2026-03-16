@echo off
:: Relanzar como administrador si no lo es ya
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :run
) else (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:run
cd /d "%~dp0"
start "" pythonw app_web.py
