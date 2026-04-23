@echo off
setlocal

cd /d "%~dp0"

set "NODE_EXE="

if exist "%USERPROFILE%\tools\nodejs\node.exe" set "NODE_EXE=%USERPROFILE%\tools\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"

if not defined NODE_EXE (
  echo [ERROR] Khong tim thay Node.js.
  echo Hay cai Node.js LTS hoac dat Node portable tai "%USERPROFILE%\tools\nodejs".
  exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "NPM_CMD=%NODE_DIR%npm.cmd"

if not exist "node_modules" (
  echo [INFO] Dang cai dependencies lan dau...
  if exist "%NPM_CMD%" (
    call "%NPM_CMD%" install
    if errorlevel 1 (
      echo [ERROR] Cai dependencies that bai.
      exit /b 1
    )
  ) else (
    echo [ERROR] Khong tim thay npm.cmd tai "%NODE_DIR%".
    exit /b 1
  )
)

echo [INFO] Su dung Node: %NODE_EXE%
echo [INFO] Chay app tai http://localhost:4200

for /f %%P in ('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4200 -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess -Unique"') do (
  echo [INFO] Dung tien trinh dang chiem cong 4200: PID %%P
  taskkill /PID %%P /F >nul 2>nul
)

"%NODE_EXE%" ".\node_modules\@angular\cli\bin\ng.js" serve --host localhost --port 4200
exit /b %errorlevel%
