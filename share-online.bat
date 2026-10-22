@echo off
title SMIT College ERP - Cloudflare Public Tunnel
echo ======================================================================
echo    SMIT College ERP - Remote / Mobile Access (Cloudflare Tunnel)
echo ======================================================================
echo.
echo  Make sure the local server is running (start-server.bat) on port 3000!
echo  Creating public HTTPS URL for any phone, tablet or remote device...
echo.
echo ======================================================================
echo.
.\cloudflared.exe tunnel --url http://localhost:3000
pause
