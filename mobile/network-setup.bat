@echo off
echo Network Setup for Project Anonymous Mobile App
echo =============================================
echo.

echo Current Network Configuration:
echo Server IP: 192.168.1.85:3000
echo.

echo Checking network connectivity...
ping -n 1 192.168.1.85 >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Server IP is reachable
) else (
    echo ❌ Server IP is not reachable
    echo.
    echo Please check:
    echo 1. Both devices are on the same WiFi network
    echo 2. Server is running on 192.168.1.85:3000
    echo 3. Firewall is not blocking the connection
)

echo.
echo Testing server connection...
curl -s --connect-timeout 5 http://192.168.1.85:3000 >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Server is running and accessible
) else (
    echo ❌ Server is not responding
    echo.
    echo To fix this:
    echo 1. Start the server: cd server && npm start
    echo 2. Check if port 3000 is open
    echo 3. Verify the IP address is correct
)

echo.
echo Your device's IP addresses:
ipconfig | findstr /i "IPv4"

echo.
echo To change server IP in the app:
echo Edit mobile/screens/ChatScreen.tsx
echo Update SERVER_IP constant to your server's IP
echo.

pause
