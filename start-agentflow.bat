@echo off
setlocal
cd /d "%~dp0"

title LocalAI Nexus
echo Starting LocalAI Nexus desktop app...
echo Project: %CD%
echo.

if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron runtime is missing. Installing dependencies first...
  call npm.cmd install
  if errorlevel 1 goto fail
)

if not exist "dist\index.html" (
  echo Renderer build not found. Building LocalAI Nexus...
  call npm.cmd run build
  if errorlevel 1 goto fail
) else if not exist "dist-electron\main\index.js" (
  echo Electron main build not found. Building LocalAI Nexus...
  call npm.cmd run build
  if errorlevel 1 goto fail
) else if not exist "dist-electron\main\preload.js" (
  echo Electron preload build not found. Building LocalAI Nexus...
  call npm.cmd run build
  if errorlevel 1 goto fail
)

set AGENTFLOW_LOAD_DIST=1
set AGENTFLOW_SKIP_DEVTOOLS=1
echo Launching Electron shell with secure preload bridge...
echo Login: 123@admin.com / 123456
echo.
start "" "%CD%\node_modules\electron\dist\electron.exe" "%CD%\dist-electron\main\index.js"
exit /b 0

:fail
echo.
echo LocalAI Nexus failed to start. Please run:
echo   cd /d "%~dp0"
echo   npm.cmd install
echo   npm.cmd run build
pause
exit /b 1
