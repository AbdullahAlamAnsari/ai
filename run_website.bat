@echo off
echo Starting Kaoash Next.js Development Server...
cd /d "%~dp0kaoash"
echo.
echo Once the server starts, open your browser to: http://localhost:3000
echo.
call npm run dev
pause
