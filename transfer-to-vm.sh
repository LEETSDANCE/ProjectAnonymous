#!/bin/bash
# Optimized SCP Transfer Script for Project Anonymous

echo "🔄 Project Anonymous SCP Transfer to Ubuntu VM"

# Configuration - UPDATE THESE VALUES
VM_IP="your-ubuntu-vm-ip"
VM_USER="your-username"
VM_DEST="/var/www/project-anonymous"
PROJECT_DIR="$(pwd)"

echo "📋 Current Configuration:"
echo "🖥️  VM IP: $VM_IP"
echo "👤 VM User: $VM_USER"
echo "📁 Destination: $VM_DEST"
echo "📂 Source: $PROJECT_DIR"
echo ""

# Validate configuration
if [ "$VM_IP" = "your-ubuntu-vm-ip" ] || [ "$VM_USER" = "your-username" ]; then
    echo "❌ Please update VM_IP and VM_USER in this script"
    echo "📝 Edit this file and update the configuration section"
    exit 1
fi

# Test SSH connection
echo "🔍 Testing SSH connection to $VM_USER@$VM_IP..."
if ! ssh -o ConnectTimeout=10 "$VM_USER@$VM_IP" "echo 'SSH connection successful'" 2>/dev/null; then
    echo "❌ SSH connection failed. Please check:"
    echo "   - VM IP address is correct"
    echo "   - SSH service is running on VM"
    echo "   - Firewall allows SSH connections"
    echo "   - SSH keys are properly configured"
    exit 1
fi

echo "✅ SSH connection successful"

# Create clean transfer directory
TEMP_DIR="/tmp/project-anonymous-transfer-$(date +%s)"
echo "📁 Creating clean transfer directory: $TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy only essential files (excluding node_modules, build, etc.)
echo "📋 Copying essential files for transfer..."
cp -r client "$TEMP_DIR/"
cp -r server "$TEMP_DIR/"
cp -r mobile "$TEMP_DIR/"
cp *.md "$TEMP_DIR/"
cp *.sh "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"

# Exclude unnecessary files
echo "🧹 Cleaning up unnecessary files..."
find "$TEMP_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null
find "$TEMP_DIR" -name "build" -type d -exec rm -rf {} + 2>/dev/null
find "$TEMP_DIR" -name ".git" -type d -exec rm -rf {} + 2>/dev/null
find "$TEMP_DIR" -name "package-lock.json" -delete 2>/dev/null
find "$TEMP_DIR" -name ".DS_Store" -delete 2>/dev/null

# Create compressed archive for faster transfer
echo "📦 Creating compressed archive..."
ARCHIVE_NAME="project-anonymous-clean-$(date +%Y%m%d-%H%M%S).tar.gz"
cd "/tmp"
tar -czf "$ARCHIVE_NAME" "project-anonymous-transfer-"*/

# Transfer archive to VM
echo "📤 Transferring archive to VM..."
scp "$ARCHIVE_NAME" "$VM_USER@$VM_IP:/tmp/"

if [ $? -eq 0 ]; then
    echo "✅ Archive transferred successfully"
else
    echo "❌ Transfer failed"
    rm -f "$ARCHIVE_NAME"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Extract and setup on VM
echo "📥 Setting up files on VM..."
ssh "$VM_USER@$VM_IP" << EOF
    echo "📂 Extracting archive..."
    cd /tmp
    tar -xzf "$ARCHIVE_NAME"
    
    echo "📁 Creating project directory..."
    sudo mkdir -p $VM_DEST
    
    echo "📋 Copying files to destination..."
    sudo cp -r project-anonymous-transfer-*/* $VM_DEST/
    sudo chown -R $VM_USER:$VM_USER $VM_DEST
    
    echo "🧹 Cleaning up temporary files..."
    rm -f "$ARCHIVE_NAME"
    rm -rf project-anonymous-transfer-*
    
    echo "✅ Files setup completed on VM"
EOF

# Clean up local files
echo "🧹 Cleaning up local temporary files..."
rm -f "$ARCHIVE_NAME"
rm -rf "$TEMP_DIR"

# Display next steps
echo ""
echo "🎉 Transfer completed successfully!"
echo ""
echo "🔧 Next steps on Ubuntu VM:"
echo "1. SSH into VM: ssh $VM_USER@$VM_IP"
echo "2. Navigate to project: cd $VM_DEST"
echo "3. Make deployment script executable: chmod +x deploy-server.sh"
echo "4. Run deployment: ./deploy-server.sh"
echo "5. Test server: curl http://localhost:3000"
echo ""
echo "🌐 After deployment, test from your machine:"
echo "   curl http://$VM_IP:3000"
echo "   curl http://$VM_IP:3000/quantum-security"
echo ""
echo "📱 Update mobile app server URL to: http://$VM_IP:3000"
echo "🌐 Update web app .env file to: REACT_APP_SERVER_URL=http://$VM_IP:3000"
echo ""
echo "🛡️ Your quantum-secure Project Anonymous will be running on Ubuntu VM!"
