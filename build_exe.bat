@echo off
setlocal EnableDelayedExpansion
title Disk Analyzer — Compilando ejecutable...

:: ─── Verificar privilegios de administrador ──────────────────────────────────
net session >nul 2>&1
if not %errorLevel% == 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
echo.
echo  ============================================================
echo   Disk Analyzer — Build de ejecutable
echo  ============================================================
echo.

:: ─── 1. Compilar frontend ────────────────────────────────────────────────────
echo [1/3] Compilando frontend React...
cd frontend

where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  ERROR: npm no encontrado. Instala Node.js desde https://nodejs.org
    pause & exit /b 1
)

if not exist "node_modules\" (
    echo  Instalando dependencias npm...
    npm install
    if %errorLevel% neq 0 (
        echo  ERROR: npm install fallo.
        pause & exit /b 1
    )
)

npm run build
if %errorLevel% neq 0 (
    echo  ERROR: npm run build fallo.
    cd ..
    pause & exit /b 1
)
cd ..
echo  Frontend compilado correctamente.
echo.

:: ─── 2. Compilar con PyInstaller ─────────────────────────────────────────────
echo [2/3] Compilando ejecutable con PyInstaller...

:: Buscar pyinstaller en ubicaciones conocidas
set PYINST=
for %%P in (
    "pyinstaller"
    "%LOCALAPPDATA%\Packages\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\LocalCache\local-packages\Python311\Scripts\pyinstaller.exe"
    "%APPDATA%\Python\Python311\Scripts\pyinstaller.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\Scripts\pyinstaller.exe"
) do (
    if not defined PYINST (
        %%P --version >nul 2>&1
        if !errorLevel! == 0 set PYINST=%%~P
    )
)

if not defined PYINST (
    echo  PyInstaller no encontrado. Instalando...
    python -m pip install pyinstaller
    set PYINST=python -m PyInstaller
)

:: Limpiar builds anteriores
if exist "dist\DiskAnalyzer\" rd /s /q "dist\DiskAnalyzer"
if exist "build\"             rd /s /q "build"

%PYINST% disk_analyzer.spec --noconfirm --clean
if %errorLevel% neq 0 (
    echo.
    echo  ERROR: PyInstaller fallo. Revisa los mensajes anteriores.
    pause & exit /b 1
)
echo  Ejecutable compilado correctamente.
echo.

:: ─── 3. Verificar resultado ──────────────────────────────────────────────────
echo [3/3] Verificando resultado...
if not exist "dist\DiskAnalyzer.exe" (
    echo  ERROR: No se encontro dist\DiskAnalyzer.exe
    pause & exit /b 1
)

for %%A in ("dist\DiskAnalyzer.exe") do set SIZE=%%~zA
set /a SIZEMB=%SIZE% / 1048576

echo.
echo  ============================================================
echo   BUILD COMPLETADO
echo  ============================================================
echo   Ejecutable: %~dp0dist\DiskAnalyzer.exe  (~%SIZEMB% MB)
echo.
echo   El usuario solo necesita ese unico archivo.
echo   Doble clic en DiskAnalyzer.exe para lanzar la app.
echo  ============================================================
echo.

set /p OPEN="Abrir carpeta dist en el Explorador? (s/n): "
if /i "%OPEN%"=="s" explorer "dist"

pause
