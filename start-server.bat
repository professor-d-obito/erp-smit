@echo off
title SMIT College ERP - Local Server
echo ======================================================================
echo    Sri Muthukumaran Institute of Technology (SMIT) - College ERP
echo ======================================================================
echo.
echo  [+] Starting ERP Server on port 3000...
echo.
echo  Access URLs:
echo    - On this PC:             http://localhost:3000
echo    - On Mobile / Other PC:   http://10.84.78.68:3000
echo.
echo  Default Login:
echo    - Email:        admin@smit.edu.in  (or ID: EMP-ADMIN-001)
echo    - Password:     Admin@123456
echo.
echo ======================================================================
echo.
npx next dev -H 0.0.0.0 -p 3000
pause
