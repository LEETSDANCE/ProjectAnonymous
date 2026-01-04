@echo off
REM Optimized SCP Transfer Script for Project Anonymous (Windows)

echo 🔄 Project Anonymous SCP Transfer to Ubuntu VM
echo.

REM Configuration - UPDATE THESE VALUES
set VM_IP=your-ubuntu-vm-ip
set VM_USER=your-username
set VM_DEST=/var/www/project-anonymous
set PROJECT_DIR=%cd%

echo 📋 Current Configuration:
echo 🖥️  VM IP: %VM_IP%
echo 👤 VM User: %VM_USER%
echo 📁 Destination: %VM_DEST%
echo 📂 Source: %PROJECT_DIR%
echo.

REM Validate configuration
if "%VM_IP%"=="your-ubuntu-vm-ip" (
    echo ❌ Please update VM_IP and VM_USER in this script
    echo 📝 Edit this file and update the configuration section
    pause
    exit /b 1
)

if "%VM_USER%"=="your-username" (
    echo ❌ Please update VM_IP and VM_USER in this script
    echo 📝 Edit this file and update the configuration section
    pause
    exit /b 1
)

REM Check if SCP is available
where scp >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ SCP command not found. Please install Git Bash or OpenSSH for Windows
    echo 📦 Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Test SSH connection
echo 🔍 Testing SSH connection to %VM_USER%@%VM_IP%...
ssh -o ConnectTimeout=10 %VM_USER%@%VM_IP% "echo SSH connection successful" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ SSH connection failed. Please check:
    echo    - VM IP address is correct
    echo    - SSH service is running on VM
    echo    - Firewall allows SSH connections
    echo    - SSH keys are properly configured
    pause
    exit /b 1
)

echo ✅ SSH connection successful

REM Create clean transfer directory
set TEMP_DIR=%TEMP%\project-anonymous-transfer-%random%
echo 📁 Creating clean transfer directory: %TEMP_DIR%
mkdir "%TEMP_DIR%"

REM Copy only essential files (excluding node_modules, build, etc.)
echo 📋 Copying essential files for transfer...
xcopy /E /I /Q client "%TEMP_DIR%\client"
xcopy /E /I /Q server "%TEMP_DIR%\server"
xcopy /E /I /Q mobile "%TEMP_DIR%\mobile"
copy *.md "%TEMP_DIR%\" >nul
copy *.sh "%TEMP_DIR%\" >nul
copy README.md "%TEMP_DIR%\" >nul

REM Exclude unnecessary files
echo 🧹 Cleaning up unnecessary files...
for /d /r "%TEMP_DIR%" %%d in (node_modules) do @if exist "%%d" rd /s /q "%%d"
for /d /r "%TEMP_DIR%" %%d in (build) do @if exist "%%d" rd /s /q "%%d"
for /d /r "%TEMP_DIR%" %%d in (.git) do @if exist "%%d" rd /s /q "%%d"
del /s /q "%TEMP_DIR%\package-lock.json" >nul 2>&1
del /s /q "%TEMP_DIR%\.DS_Store" >nul 2>&1

REM Create compressed archive for faster transfer
echo 📦 Creating compressed archive...
set ARCHIVE_NAME=project-anonymous-clean-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.tar.gz
cd /d "%TEMP%"
tar -czf "%TEMP%\%ARCHIVE_NAME%" *

REM Transfer archive to VM
echo 📤 Transferring archive to VM...
scp "%TEMP%\%ARCHIVE_NAME%" %VM_USER%@%VM_IP%:/tmp/

if %errorlevel% equ 0 (
    echo ✅ Archive transferred successfully
) else (
    echo ❌ Transfer failed
    del "%TEMP%\%ARCHIVE_NAME%" >nul 2>&1
    rd /s /q "%TEMP_DIR%" >nul 2>&1
    pause
    exit /b 1
)

REM Extract and setup on VM
echo 📥 Setting up files on VM...
ssh %VM_USER%@%VM_IP% "cd /tmp && tar -xzf %ARCHIVE_NAME% && sudo mkdir -p %VM_DEST% && sudo cp -r * %VM_DEST%/ && sudo chown -R %VM_USER%:%VM_USER% %VM_DEST% && rm -f %ARCHIVE_NAME%"

REM Clean up local files
echo 🧹 Cleaning up local temporary files...
del "%TEMP%\%ARCHIVE_NAME%" >nul 2>&1
rd /s /q "%TEMP_DIR%" >nul 2>&1

REM Display next steps
echo.
echo 🎉 Transfer completed successfully!
echo.
echo 🔧 Next steps on Ubuntu VM:
echo 1. SSH into VM: ssh %VM_USER%@%VM_IP%
echo 2. Navigate to project: cd %VM_DEST%
echo 3. Make deployment script executable: chmod +x deploy-server.sh
echo 4. Run deployment: ./deploy-server.sh
echo 5. Test server: curl http://localhost:3000
echo.
echo 🌐 After deployment, test from your machine:
echo    curl http://%VM_IP%:3000
echo    curl http://%VM_IP%:3000/quantum-security
echo.
echo 📱 Update mobile app server URL to: http://%VM_IP%:3000
echo 🌐 Update web app .env file to: REACT_APP_SERVER_URL=http://%VM_IP%:3000
echo.
echo 🛡️ Your quantum-secure Project Anonymous will be running on Ubuntu VM!
echo.
pause
