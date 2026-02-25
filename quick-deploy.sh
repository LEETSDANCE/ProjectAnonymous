#!/bin/bash

# Quick deployment script for Project Anonymous on Ubuntu EC2
# Run this after uploading files to /tmp/project-anonymous/

echo "🚀 Quick Deploy Project Anonymous to EC2..."

# Navigate to project files
cd /tmp/project-anonymous

# Make setup script executable
chmod +x setup-ubuntu-ec2.sh

# Run the setup
./setup-ubuntu-ec2.sh

echo "✅ Deployment complete!"
echo "🌐 Access your app at: http://$(curl -s ifconfig.me)"
