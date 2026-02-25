#!/bin/bash

# Project Anonymous Ubuntu EC2 Setup
# This script sets up both server and client on Ubuntu EC2

set -e

echo "🚀 Setting up Project Anonymous on Ubuntu EC2..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx for reverse proxy
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install build tools for client
echo "📦 Installing build tools..."
sudo apt install -y build-essential

# Create application directory structure
echo "📁 Creating application directories..."
sudo mkdir -p /var/www/project-anonymous/{server,client}
sudo chown -R $USER:$USER /var/www/project-anonymous

# Navigate to project directory
cd /var/www/project-anonymous

# Setup Server
echo "🔧 Setting up server..."
cd server
cp /tmp/project-anonymous/server/package.json .
cp /tmp/project-anonymous/server/server.js .
cp /tmp/project-anonymous/server/.env.example .env

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install --production

# Create PM2 ecosystem for server
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

mkdir -p logs

# Setup Client
echo "🔧 Setting up client..."
cd ../client
cp /tmp/project-anonymous/client/package.json .
cp -r /tmp/project-anonymous/client/src .
cp -r /tmp/project-anonymous/client/public .

# Install client dependencies and build
echo "📦 Installing and building client..."
npm install
npm run build

# Configure Nginx
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

# Enable the site
sudo ln -sf /etc/nginx/sites-available/project-anonymous /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Start services
echo "🚀 Starting services..."
cd /var/www/project-anonymous/server
pm2 start ecosystem.config.js
pm2 save
pm2 startup

sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✅ Setup completed successfully!"
echo "🌐 Your application is accessible at: http://$(curl -s ifconfig.me)"
echo "📊 Monitor server with: pm2 monit"
echo "📋 View server logs with: pm2 logs project-anonymous-server"
echo "🔧 Nginx logs: sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log"
