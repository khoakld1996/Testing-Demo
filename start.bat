@echo off
title Nebula Quiz - HTTP Server
color 0A

echo.
echo  ============================================
echo   NEBULA QUIZ SYSTEM - HTTP Server
echo  ============================================
echo.
echo  Dang kiem tra Node.js...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [LOI] Khong tim thay Node.js!
    echo.
    echo  Cai dat Node.js tai: https://nodejs.org
    echo  Sau do chay lai file nay.
    echo.
    pause
    exit
)

echo  Node.js: OK
echo.
echo  Dang kiem tra npx serve...
call npx serve --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Cai dat serve...
    call npm install -g serve
)

echo.
echo  ============================================
echo   SERVER DANG CHAY tai: http://localhost:3000
echo  ============================================
echo.
echo  Trinh duyet se tu dong mo...
echo  Nhan Ctrl+C de tat server.
echo.

:: Mo trinh duyet sau 2 giay
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Chay server
call npx serve -l 3000 .

pause
