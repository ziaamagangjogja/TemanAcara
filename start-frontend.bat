@echo off
REM ============================================================
REM  Teman Acara - FRONTEND saja (port 8080)
REM  Tambahkan folder Node.js ke PATH dulu supaya tidak muncul
REM  error "node is not recognized".
REM ============================================================

set "NODEDIR=C:\Program Files\nodejs"
set "PATH=%NODEDIR%;%PATH%"
cd /d "%~dp0"

if not exist "%NODEDIR%\node.exe" (
  echo [GAGAL] Node.js tidak ditemukan di "%NODEDIR%". Install dari https://nodejs.org
  pause
  exit /b 1
)

echo Menjalankan FRONTEND di http://localhost:8080 ...
echo JANGAN tutup jendela ini selama memakai aplikasi.
echo.
npm run dev
pause