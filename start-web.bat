@echo off
echo Starting Project Anony Web Application...
cd client
echo Installing dependencies...
npm install
echo.
echo Starting web server...
echo ===============================================
echo  Web app will be available at: http://localhost:3001
echo  Debug mode available at: client/debug.html
echo  Server should be running at: 192.168.1.85:3000
echo ===============================================
echo.
echo Starting React development server...
npm start
echo.
echo If the browser doesn't open automatically, go to:
echo http://localhost:3001
pause
