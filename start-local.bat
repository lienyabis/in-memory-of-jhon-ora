@echo off
rem ============================================================
rem  John Paul Ora Memorial - ALL-IN-ONE local server
rem  Serves the React build + PHP API at http://localhost:8000
rem  Requirements: PHP 8+ in PATH, MySQL running (WAMP/XAMPP)
rem ============================================================
cd /d "%~dp0"
echo Starting http://localhost:8000  (Ctrl+C to stop)
php -S localhost:8000 router.php
pause