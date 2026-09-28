@echo off
REM ============================================================
REM  Teman Acara - satu klik untuk menyalakan SEMUA server
REM  Backend (port 3001) + Frontend (port 8080)
REM ============================================================

set "ROOT=%~dp0"

REM Skrip ini memanggil start-backend.bat dan start-frontend.bat yang
REM sudah menangani masalah PATH Node.js secara otomatis.
if not exist "C:\Program Files\nodejs\node.exe" (
  echo.
  echo [GAGAL] Node.js tidak ditemukan di "C:\Program Files\nodejs".
  echo Install dulu Node.js dari https://nodejs.org lalu jalankan file ini lagi.
  echo.
  pause
  exit /b 1
)

REM --- Jendela 1: Backend (port 3001) ---
start "Teman Acara - BACKEND 3001" cmd /k ""%ROOT%start-backend.bat""

REM --- Jendela 2: Frontend (port 8080) ---
start "Teman Acara - FRONTEND 8080" cmd /k ""%ROOT%start-frontend.bat""

REM Beri waktu server menyala, lalu buka browser
timeout /t 12 /nobreak >nul
start "" http://localhost:8080/admin

echo.
echo Dua jendela server sudah dibuka. JANGAN ditutup selama memakai aplikasi.
echo Jendela BACKEND harus menampilkan: "Server running on port 3001"
echo.
pause