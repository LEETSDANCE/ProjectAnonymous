@echo off
echo ===============================================
echo    Project Anony Mobile App Setup
echo ===============================================
cd mobile

echo 1. Installing NPM dependencies...
npm install

echo.
echo 2. Cleaning Gradle cache...
cd android
call gradlew clean
cd ..

echo.
echo 3. Clearing React Native cache...
npx react-native start --reset-cache &

echo.
echo 4. Building and installing app...
echo Make sure your Android device is connected or emulator is running
echo.
npx react-native run-android

echo.
echo ===============================================
echo If build fails, try these commands manually:
echo   cd mobile/android
echo   gradlew clean
echo   cd ..
echo   npx react-native run-android
echo ===============================================
pause
