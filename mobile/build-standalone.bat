@echo off
echo Building standalone APK for Project Anonymous...
echo.

echo Step 1: Cleaning previous builds...
cd android
call gradlew clean
cd ..

echo.
echo Step 2: Building release APK...
echo This will create a standalone APK that can run without USB connection
echo.

cd android
call gradlew assembleRelease
cd ..

echo.
echo Step 3: Locating the built APK...
set APK_PATH=android\app\build\outputs\apk\release\app-release.apk

if exist "%APK_PATH%" (
    echo ✅ APK built successfully!
    echo Location: %APK_PATH%
    echo.
    echo You can now:
    echo 1. Install this APK on your device
    echo 2. Run the app without USB connection
    echo 3. The app will show connection status when server is unavailable
    echo.
    
    echo Opening APK location...
    explorer android\app\build\outputs\apk\release\
) else (
    echo ❌ APK build failed. Check the error messages above.
    echo.
    echo Common solutions:
    echo 1. Make sure Android SDK is properly installed
    echo 2. Check that ANDROID_HOME environment variable is set
    echo 3. Ensure Java JDK is installed and configured
)

echo.
pause
