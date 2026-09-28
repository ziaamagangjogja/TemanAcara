@echo off
REM ============================================================
REM  Teman Acara - BACKEND saja (port 3001)
REM  Tambahkan folder Node.js ke PATH dulu supaya tidak muncul
REM  error "node is not recognized".
REM ============================================================

set "NODEDIR=C:\Program Files\nodejs"
set "PATH=%NODEDIR%;%PATH%"
cd /d "%~dp0server"

if not exist "%NODEDIR%\node.exe" (
  echo [GAGAL] Node.js tidak ditemukan di "%NODEDIR%". Install dari https://nodejs.org
  pause
  exit /b 1
)

echo Menjalankan BACKEND di http://localhost:3001 ...
echo JANGAN tutup jendela ini selama memakai aplikasi.
echo.
node server.js
pause