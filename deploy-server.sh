#!/bin/bash
# Ubuntu Server Deployment Script for Project Anonymous

echo "🖥️ Deploying Project Anonymous to Ubuntu Server..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run this script as root. Run as regular user with sudo privileges."
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y || {
    echo "❌ Failed to update system"
    exit 1
}

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs || {
    echo "❌ Failed to install Node.js"
    exit 1
}

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install PM2
echo "📦 Installing PM2 process manager..."
sudo npm install -g pm2 || {
    echo "❌ Failed to install PM2"
    exit 1
}

# Create project directory
echo "📁 Creating project directory..."
sudo mkdir -p /var/www/project-anonymous
sudo chown $USER:$USER /var/www/project-anonymous

# Copy project files (assuming script is run from project directory)
echo "📋 Copying project files..."
cp -r "$(dirname "$0")"/* /var/www/project-anonymous/ || {
    echo "❌ Failed to copy project files"
    exit 1
}

cd /var/www/project-anonymous

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install || {
    echo "❌ Failed to install server dependencies"
    exit 1
}

# Create environment file
echo "📝 Creating environment file..."
cat > .env << EOF
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*
USE_DATABASE=false
EOF

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 3000
sudo ufw allow ssh
sudo ufw --force enable || {
    echo "⚠️ Firewall configuration failed, but continuing..."
}

# Start server with PM2
echo "🚀 Starting server with PM2..."
pm2 start server.js --name "project-anonymous-server" || {
    echo "❌ Failed to start server"
    exit 1
}

# Save PM2 configuration
pm2 save

# Setup PM2 startup
echo "🔧 Setting up PM2 startup..."
pm2 startup | tail -1 | sudo bash

# Display status
echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Server is running at: http://$(hostname -I | awk '{print $1}'):3000"
echo "📊 PM2 status: pm2 status"
echo "📋 PM2 logs: pm2 logs project-anonymous-server"
echo "🛡️ Quantum cryptography enabled"
echo ""
echo "🔧 Next steps:"
echo "1. Test the server: curl http://localhost:3000"
echo "2. Test quantum security: curl http://localhost:3000/quantum-security"
echo "3. Configure web and mobile apps to connect to this server"
echo "4. Set up Nginx reverse proxy (optional)"
echo ""
echo "🎉 Your Project Anonymous server is now running with quantum cryptography!"
