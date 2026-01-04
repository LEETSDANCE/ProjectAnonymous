#!/bin/bash
# Quick Mobile Start Script for Project Anonymous

echo "📱 Starting Project Anonymous Mobile Application..."

# Check if React Native CLI is installed
if ! command -v npx react-native &> /dev/null; then
    echo "❌ React Native CLI not found. Installing..."
    npm install -g @react-native-community/cli
fi

# Navigate to mobile directory
cd "$(dirname "$0")/mobile" || {
    echo "❌ Mobile directory not found"
    exit 1
}

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing mobile dependencies..."
    npm install || {
        echo "❌ Failed to install mobile dependencies"
        exit 1
    }
fi

# Check if Android is setup
if command -v adb &> /dev/null; then
    echo "🤖 Android detected"
    echo "📱 Choose platform:"
    echo "1) Android"
    echo "2) iOS (Mac only)"
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        1)
            echo "🚀 Starting Android application..."
            npx react-native run-android
            ;;
        2)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                echo "🍎 Starting iOS application..."
                npx react-native run-ios
            else
                echo "❌ iOS is only supported on macOS"
                exit 1
            fi
            ;;
        *)
            echo "❌ Invalid choice"
            exit 1
            ;;
    esac
else
    echo "❌ Android development environment not setup"
    echo "Please install Android Studio and setup Android SDK"
    echo "Visit: https://reactnative.dev/docs/environment-setup"
    exit 1
fi
