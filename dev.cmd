@echo off
REM Lance un serveur local et ouvre le site.
REM Necessaire car les modules ES sont bloques en file:// par le navigateur.
setlocal
cd /d "%~dp0"
set "PORT=5173"

where python >nul 2>nul
if not errorlevel 1 goto :python

where npx >nul 2>nul
if not errorlevel 1 goto :node

echo.
echo   Ni Python ni Node.js n'a ete trouve sur cette machine.
echo   Installez l'un des deux, puis relancez ce fichier.
echo.
pause
exit /b 1

:python
start "portfolio (serveur)" /min python -m http.server %PORT%
goto :open

:node
start "portfolio (serveur)" /min npx --yes serve . -l %PORT%
goto :open

:open
timeout /t 2 /nobreak >nul
start "" "http://localhost:%PORT%/"
echo.
echo   Site servi sur http://localhost:%PORT%/
echo   Fermez la fenetre "portfolio (serveur)" pour l'arreter.
echo.
pause
