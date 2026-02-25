#!/bin/bash

# Fix security vulnerabilities and continue deployment
echo "🔧 Fixing security vulnerabilities..."

cd /var/www/project-anonymous/client

# Fix moderate and high vulnerabilities (safe fixes)
npm audit fix

# Check if there are still critical issues
echo "📋 Checking remaining vulnerabilities..."
npm audit --audit-level=high

# Continue with build
echo "🏗️ Building React application..."
npm run build

echo "✅ Client build completed!"
