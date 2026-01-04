#!/bin/bash
# Quick Web Start Script for Project Anonymous

echo "🚀 Starting Project Anonymous Web Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Navigate to client directory
cd "$(dirname "$0")/client" || {
    echo "❌ Client directory not found"
    exit 1
}

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install || {
        echo "❌ Failed to install dependencies"
        exit 1
    }
fi

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating environment file..."
    cat > .env << EOF
REACT_APP_SERVER_URL=http://localhost:3000
REACT_APP_APP_NAME=ProjectAnonymous
EOF
fi

# Start the application
echo "🌐 Starting web application..."
echo "📍 Application will be available at: http://localhost:3000"
echo "🛡️ Quantum cryptography enabled"
echo "📱 QR codes and URL sharing available"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
