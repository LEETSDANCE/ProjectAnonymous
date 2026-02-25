#!/bin/bash

# Complete deployment after successful build
echo "🚀 Completing Project Anonymous deployment..."

# Setup server
echo "🔧 Setting up server..."
cd /var/www/ProjectAnonymous/server

# Copy server files if not already done
if [ ! -f "package.json" ]; then
    cp ProjectAnonymous/server/package.json .
    cp ProjectAnonymous/server/server.js .
    cp ProjectAnonymous/server/.env.example .env
fi

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install --production

# Create PM2 ecosystem if not exists
if [ ! -f "ecosystem.config.js" ]; then
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'project-anonymous-server',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      CORS_ORIGIN: '*'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
EOF
fi

# Create logs directory
mkdir -p logs

# Start server with PM2
echo "🚀 Starting server with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure and start Nginx if not already done
if [ ! -f "/etc/nginx/sites-available/project-anonymous" ]; then
    echo "🔧 Configuring Nginx..."
    sudo tee /etc/nginx/sites-available/project-anonymous << EOF
server {
    listen 80;
    server_name _;

    # Client static files
    location / {
        root /var/www/project-anonymous/client/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    # API and WebSocket proxy to server
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Direct API routes
    location /room/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /qr/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /quantum-security {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Enable Nginx site
    sudo ln -sf /etc/nginx/sites-available/project-anonymous /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your Project Anonymous is now live at:"
echo "   http://$SERVER_IP"
echo ""
echo "📊 Management Commands:"
echo "   Monitor: pm2 monit"
echo "   Logs: pm2 logs project-anonymous-server"
echo "   Restart: pm2 restart project-anonymous-server"
echo ""
echo "🔧 Nginx Logs:"
echo "   Access: sudo tail -f /var/log/nginx/access.log"
echo "   Error: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "📱 Update your mobile app server URL to:"
echo "   http://$SERVER_IP"
