#!/bin/bash

# Continue deployment after npm audit
echo "🚀 Continuing deployment after security audit..."

# Build the application (should work despite warnings)
echo "🏗️ Building React application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Continue with server setup
    echo "🔧 Setting up server..."
    cd /var/www/project-anonymous/server
    
    # Install server dependencies
    npm install --production
    
    # Start PM2
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    # Restart Nginx
    sudo systemctl restart nginx
    
    echo "✅ Deployment completed!"
    echo "🌐 Access your app at: http://$(curl -s ifconfig.me)"
    echo "📊 Monitor with: pm2 monit"
    echo "📋 Logs: pm2 logs project-anonymous-server"
else
    echo "❌ Build failed. Check the error messages above."
fi
