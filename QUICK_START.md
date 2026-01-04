# 🚀 Project Anonymous - Quick Start Guide

## 📋 Quick Start Commands

### 🌐 Web Application (Windows)
```cmd
# Navigate to project directory
cd "S:\Kepa Work\ProjectAnonymous\client"

# Install dependencies
npm install

# Start web application
npm start

# Access at: http://localhost:3000
```

### 📱 Mobile Application (Windows)
```cmd
# Navigate to mobile directory
cd "S:\Kepa Work\ProjectAnonymous\mobile"

# Install dependencies
npm install

# Run on Android (ensure Android Studio is installed)
npx react-native run-android

# Run on iOS (Mac only with Xcode)
npx react-native run-ios
```

### 🖥️ Ubuntu Server Deployment

#### Option 1: Manual Deployment
```bash
# Copy files to Ubuntu server
scp -r /path/to/ProjectAnonymous user@ubuntu-server:/home/user/

# SSH into Ubuntu server
ssh user@ubuntu-server

# Run deployment script
cd ProjectAnonymous
chmod +x deploy-server.sh
./deploy-server.sh
```

#### Option 2: Automated Transfer
```bash
# On Windows machine
cd "S:\Kepa Work\ProjectAnonymous"
# Edit transfer-to-vm.sh with your VM IP and username
# Run: bash transfer-to-vm.sh
```

## 🔧 Server Configuration

### Ubuntu Server Setup
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Deploy server
cd /var/www/project-anonymous/server
npm install
pm2 start server.js --name "project-anonymous-server"
pm2 save
pm2 startup
```

### Network Configuration
```bash
# Allow ports
sudo ufw allow 3000
sudo ufw allow ssh
sudo ufw enable

# Test server
curl http://localhost:3000
curl http://localhost:3000/quantum-security
```

## 📱 Mobile App Configuration

### Update Server URL
Edit mobile app files to point to your Ubuntu server:
```typescript
// In mobile App.tsx or config files
const SERVER_URL = 'http://your-ubuntu-server-ip:3000';
```

### Build and Run
```bash
# Android
cd mobile
npx react-native run-android

# iOS (Mac only)
cd mobile
npx react-native run-ios
```

## 🌐 Web App Configuration

### Update Server URL
```javascript
// In client/.env file
REACT_APP_SERVER_URL=http://your-ubuntu-server-ip:3000
```

### Start Web App
```bash
cd client
npm start
```

## 🔄 VM Data Sharing Options

### Option 1: SCP Transfer
```bash
# From Windows to Ubuntu VM
scp -r "S:\Kepa Work\ProjectAnonymous" user@vm-ip:/home/user/
```

### Option 2: Git Repository
```bash
# On Windows
cd "S:\Kepa Work\ProjectAnonymous"
git init
git add .
git commit -m "Initial commit"
git remote add origin <git-repo-url>
git push

# On Ubuntu VM
git clone <git-repo-url> /var/www/project-anonymous
```

### Option 3: Shared Folder (VirtualBox)
1. Configure shared folder in VM settings
2. Mount in Ubuntu: `sudo mount -t vboxsf shared-folder /mnt/shared`
3. Copy files: `sudo cp -r /mnt/shared/ProjectAnonymous /var/www/`

## 🧪 Testing & Verification

### Test Server
```bash
# Test basic connection
curl http://your-server-ip:3000

# Test quantum cryptography
curl http://your-server-ip:3000/quantum-security

# Expected headers:
# X-Quantum-Security: ML-KEM-1024 + ML-DSA-87
# X-Post-Quantum-Ready: true
```

### Test Web Application
1. Open browser: `http://your-server-ip:3000`
2. Generate quantum keys
3. Create/join rooms
4. Test QR code generation
5. Test URL sharing

### Test Mobile Application
1. Build and run mobile app
2. Update server URL to point to Ubuntu server
3. Test room creation/joining
4. Test quantum encryption
5. Test cross-platform communication

## 📊 Success Indicators

✅ **Working Setup Shows:**
- Server running on port 3000
- Web app accessible at `http://your-server-ip:3000`
- Mobile app connects to server
- Quantum security badges displayed
- QR codes generated and scannable
- Cross-platform messaging works
- Room locking functionality works
- System messages displayed correctly

## 🛡️ Quantum Cryptography Verification

All platforms should show:
- **Algorithm**: ML-KEM-1024 + ML-DSA-87
- **Security Level**: NIST Level 5
- **Quantum Resistance**: Full protection
- **Key Size**: ~26KB total
- **Platform**: Web/Mobile/Server specific

## 🔧 Troubleshooting

### Common Issues
1. **Port 3000 blocked**: Configure firewall
2. **Mobile connection fails**: Check server URL and network
3. **Quantum crypto errors**: Ensure Node.js 18+
4. **VM transfer fails**: Check SSH keys and permissions

### Get Help
```bash
# Check server logs
pm2 logs project-anonymous-server

# Check system status
pm2 status

# Restart server
pm2 restart project-anonymous-server
```

## 🎉 You're Ready!

Your Project Anonymous with quantum cryptography is now running across all platforms:
- 🌐 **Web Application**: Quantum-secure chat
- 📱 **Mobile Application**: Quantum-secure messaging  
- 🖥️ **Ubuntu Server**: Quantum-resistant backend
- 🛡️ **Security**: ML-KEM + ML-DSA encryption
- 🔄 **Cross-Platform**: Seamless communication

Enjoy your quantum-secure anonymous chat application! ⚛️🔐
