# 🚀 Project Anonymous - Complete Deployment Guide

## 📋 Table of Contents
1. [Web Application Setup](#web-application-setup)
2. [Mobile Application Setup](#mobile-application-setup)
3. [Ubuntu Server Setup](#ubuntu-server-setup)
4. [VM Data Sharing](#vm-data-sharing)
5. [Network Configuration](#network-configuration)
6. [Testing & Verification](#testing--verification)

---

## 🌐 Web Application Setup

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Git for cloning repository

### Step 1: Clone Repository
```bash
git clone <your-repository-url>
cd ProjectAnonymous
```

### Step 2: Install Dependencies
```bash
cd client
npm install
```

### Step 3: Configure Environment
```bash
# Create .env file in client directory
cat > .env << EOF
REACT_APP_SERVER_URL=http://your-ubuntu-server-ip:3000
REACT_APP_APP_NAME=ProjectAnonymous
EOF
```

### Step 4: Start Web Application
```bash
# Development mode
npm start

# Production build
npm run build
# Serve build files with nginx or Apache
```

### Step 5: Access Application
- Development: `http://localhost:3000`
- Production: `http://your-domain.com`

---

## 📱 Mobile Application Setup

### Prerequisites
- React Native development environment
- Node.js 18+
- Android Studio (for Android)
- Xcode (for iOS) - Mac only

### Step 1: Install React Native CLI
```bash
npm install -g @react-native-community/cli
```

### Step 2: Setup Mobile Project
```bash
cd mobile
npm install
```

### Step 3: Android Setup
```bash
# Install Android dependencies
cd android
./gradlew build

# Run on Android device/emulator
cd ..
npx react-native run-android
```

### Step 4: iOS Setup (Mac Only)
```bash
# Install iOS dependencies
cd ios
pod install
cd ..

# Run on iOS simulator/device
npx react-native run-ios
```

### Step 5: Configure Mobile App
```bash
# Update server URL in mobile code
# Edit App.tsx or relevant config files
# Update: const SERVER_URL = 'http://your-ubuntu-server-ip:3000';
```

---

## 🖥️ Ubuntu Server Setup

### Prerequisites
- Ubuntu 20.04+ or 22.04+
- Node.js 18+
- PM2 process manager
- Nginx (optional, for reverse proxy)

### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Node.js
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 3: Install PM2
```bash
sudo npm install -g pm2
```

### Step 4: Setup Project Directory
```bash
# Create project directory
sudo mkdir -p /var/www/project-anonymous
sudo chown $USER:$USER /var/www/project-anonymous

# Copy project files
cp -r /path/to/ProjectAnonymous/* /var/www/project-anonymous/
cd /var/www/project-anonymous
```

### Step 5: Install Server Dependencies
```bash
cd server
npm install
```

### Step 6: Configure Environment
```bash
# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*
USE_DATABASE=false
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_anonymous
DB_USER=postgres
DB_PASSWORD=your_password
EOF
```

### Step 7: Start Server with PM2
```bash
# Start server
pm2 start server.js --name "project-anonymous-server"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### Step 8: Configure Firewall
```bash
# Allow port 3000
sudo ufw allow 3000
sudo ufw allow ssh
sudo ufw enable
```

### Step 9: Setup Nginx Reverse Proxy (Optional)
```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx config
sudo tee /etc/nginx/sites-available/project-anonymous << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
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
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/project-anonymous /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔄 VM Data Sharing (SCP Method)

### Prerequisites for SCP Transfer
- Git Bash or OpenSSH for Windows (for scp command)
- SSH access to Ubuntu VM
- SSH keys configured (recommended) or password authentication

### Step 1: Configure Transfer Script
```bash
# Edit transfer script with your VM details
# For Windows: Edit transfer-to-vm.bat
# For Linux/Mac: Edit transfer-to-vm.sh

# Update these values:
VM_IP="your-ubuntu-vm-ip"
VM_USER="your-username"
```

### Step 2: Run Transfer Script

#### Windows (Recommended)
```cmd
# Navigate to project directory
cd "S:\Kepa Work\ProjectAnonymous"

# Run Windows batch script
transfer-to-vm.bat
```

#### Linux/Mac
```bash
# Navigate to project directory
cd /path/to/ProjectAnonymous

# Make script executable
chmod +x transfer-to-vm.sh

# Run transfer script
./transfer-to-vm.sh
```

### Step 3: What the Script Does
1. **Tests SSH connection** to ensure connectivity
2. **Creates clean transfer** with only essential files
3. **Excludes unnecessary files** (node_modules, build, .git, etc.)
4. **Compresses files** for faster transfer
5. **Transfers via SCP** to Ubuntu VM
6. **Extracts and sets up** files in correct location
7. **Cleans up** temporary files

### Step 4: Manual SCP Alternative
```bash
# Create compressed archive manually
tar -czf project-anonymous.tar.gz --exclude=node_modules --exclude=build --exclude=.git client server mobile *.md *.sh README.md

# Transfer to VM
scp project-anonymous.tar.gz user@vm-ip:/tmp/

# Extract on VM
ssh user@vm-ip "cd /tmp && tar -xzf project-anonymous.tar.gz && sudo mkdir -p /var/www/project-anonymous && sudo cp -r * /var/www/project-anonymous/ && sudo chown -R user:user /var/www/project-anonymous"
```

---

## 🌐 Network Configuration

### Port Forwarding (VM)
```bash
# VirtualBox: Port forwarding settings
Host Port: 3000 -> Guest Port: 3000
Host Port: 80 -> Guest Port: 80 (if using Nginx)
```

### Static IP Configuration
```bash
# Configure static IP for Ubuntu VM
sudo nano /etc/netplan/01-netcfg.yaml

# Example configuration:
network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s3:
      dhcp4: no
      addresses: [192.168.1.100/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8,8.8.4.4]

# Apply configuration
sudo netplan apply
```

### DNS Configuration
```bash
# If using domain name
# Update A record to point to your Ubuntu server IP
# Example: project-anonymous.com -> 192.168.1.100
```

---

## 🧪 Testing & Verification

### Step 1: Test Server
```bash
# Test server is running
curl http://localhost:3000

# Test quantum security endpoint
curl http://localhost:3000/quantum-security

# Check PM2 status
pm2 status
pm2 logs project-anonymous-server
```

### Step 2: Test Web Application
```bash
# From client machine
curl http://your-ubuntu-ip:3000

# Access in browser
http://your-ubuntu-ip:3000
```

### Step 3: Test Mobile Application
```bash
# Update server URL in mobile app
# Build and run mobile app
# Test connection to server
```

### Step 4: Test QR Code & URL Access
```bash
# Generate QR code for room
# Test URL access: http://your-ubuntu-ip:3000/room/ABC123
# Scan QR code with mobile app
```

### Step 5: Test Quantum Cryptography
```bash
# Verify quantum security headers
curl -I http://your-ubuntu-ip:3000/quantum-security

# Check for headers:
# X-Quantum-Security: ML-KEM-1024 + ML-DSA-87
# X-Post-Quantum-Ready: true
```

---

## 🔧 Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check logs
pm2 logs project-anonymous-server

# Check port usage
sudo netstat -tlnp | grep :3000

# Kill process on port 3000
sudo kill -9 $(sudo lsof -t -i:3000)
```

#### Mobile App Connection Issues
```bash
# Check network connectivity
ping your-ubuntu-ip

# Check firewall
sudo ufw status

# Test server accessibility
telnet your-ubuntu-ip 3000
```

#### Quantum Cryptography Errors
```bash
# Check Node.js version (must be 18+)
node --version

# Reinstall dependencies
npm install @noble/post-quantum

# Check for memory issues
pm2 monit
```

---

## 📊 Performance Monitoring

### PM2 Monitoring
```bash
# Monitor PM2 processes
pm2 monit

# View detailed logs
pm2 logs --lines 100

# Restart server
pm2 restart project-anonymous-server
```

### System Monitoring
```bash
# Check system resources
htop
df -h
free -h

# Monitor network connections
sudo netstat -an | grep :3000
```

---

## 🚀 Production Deployment Checklist

### Security
- [ ] Configure firewall rules
- [ ] Set up SSL/TLS certificates
- [ ] Enable HTTPS with Nginx
- [ ] Regular security updates
- [ ] Backup strategy implemented

### Performance
- [ ] Enable PM2 clustering
- [ ] Configure Nginx caching
- [ ] Monitor system resources
- [ ] Set up log rotation
- [ ] Database optimization (if using)

### Reliability
- [ ] Set up monitoring alerts
- [ ] Configure automatic restarts
- [ ] Implement health checks
- [ ] Disaster recovery plan
- [ ] Load balancing (if needed)

---

## 📞 Support & Maintenance

### Regular Maintenance
```bash
# Weekly updates
sudo apt update && sudo apt upgrade -y

# Monthly dependency updates
cd /var/www/project-anonymous/server
npm update

# Log rotation
pm2 flush
```

### Backup Strategy
```bash
# Backup project files
tar -czf project-anonymous-backup-$(date +%Y%m%d).tar.gz /var/www/project-anonymous/

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 /backup/location/
```

---

## 🎉 Success Indicators

When everything is working correctly, you should see:

1. **✅ Server**: "Server running on port 3000"
2. **✅ Web App**: Opens at http://your-ubuntu-ip:3000
3. **✅ Mobile App**: Connects to server successfully
4. **✅ Quantum Crypto**: Security headers present
5. **✅ QR Codes**: Generated and scannable
6. **✅ Room Access**: URL and QR code joining works
7. **✅ Cross-Platform**: Web and mobile can communicate

Your Project Anonymous is now fully deployed with quantum cryptography across all platforms! 🛡️⚛️
