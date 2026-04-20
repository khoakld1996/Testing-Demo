@echo off
title Nebula Quiz
color 0A
echo.
echo  ===================================
echo   NEBULA QUIZ - Khoi dong server
echo  ===================================
echo.

:: Thu Python truoc (co san tren Windows 10/11)
python --version >nul 2>&1
if %errorlevel% equ 0 (
  echo  Dung Python HTTP Server...
  echo  Mo trinh duyet tai: http://localhost:3000
  start "" http://localhost:3000
  python -m http.server 3000
  goto :end
)

python3 --version >nul 2>&1
if %errorlevel% equ 0 (
  echo  Dung Python3 HTTP Server...
  start "" http://localhost:3000
  python3 -m http.server 3000
  goto :end
)

node --version >nul 2>&1
if %errorlevel% equ 0 (
  echo  Dung Node.js...
  start "" http://localhost:3000
  npx serve -l 3000 .
  goto :end
)

echo  [LOI] Can cai Python hoac Node.js
echo  Tai Python: https://www.python.org/downloads/
pause

:end
