@echo off
REM Daily CADO database backup, run by Windows Task Scheduler.
REM Appends to a log so a silent failure is still discoverable afterwards.
cd /d "%~dp0.."
node scripts\backup-database.mjs >> "C:\Users\Marwan\cado-backups\backup.log" 2>&1
echo [%date% %time%] exit=%ERRORLEVEL% >> "C:\Users\Marwan\cado-backups\backup.log"
