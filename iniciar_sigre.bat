@echo off
color 0B
echo =======================================================
echo          SIGRE - Sistema de Gestion Escolar
echo =======================================================
echo.
echo Instalando dependencias necesarias (esto puede tardar unos segundos)...
call npm install

if %errorlevel% neq 0 (
    echo.
    color 0C
    echo ERROR: Hubo un problema instalando las dependencias.
    echo Asegurate de tener Node.js instalado.
    pause
    exit /b %errorlevel%
)

echo.
echo Dependencias instaladas correctamente.
echo.
echo Levantando servidor local de Vite...
echo.
echo =======================================================
echo    Abre tu navegador en: http://localhost:5173
echo =======================================================
echo.
call npm run dev
pause
