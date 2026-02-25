# Project Anonymous EC2 Deployment Guide

## Prerequisites
- Ubuntu EC2 instance (t3.medium or larger recommended)
- SSH access to the instance
- Project Anonymous files uploaded to `ProjectAnonymous/` on EC2

## Quick Setup

### 1. Upload Files to EC2
```bash
# From your local machine, upload project files
scp -r /path/to/ProjectAnonymous ubuntu@your-ec2-ip:ProjectAnonymous
```

### 2. Run Setup Script
```bash
# SSH into your EC2 instance
ssh ubuntu@your-ec2-ip

# Make the setup script executable and run it
chmod +x ProjectAnonymous/setup-ubuntu-ec2.sh
cd ProjectAnonymous
./setup-ubuntu-ec2.sh
```

### 3. Access Your Application
After setup completes, your application will be available at:
- **Web App**: `http://your-ec2-ip`
- **API Endpoints**: `http://your-ec2-ip/api/`
- **WebSocket**: `http://your-ec2-ip/socket.io/`

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Node.js       │    │   PM2           │
│   (Port 80)     │───▶│   Server        │───▶│   Process       │
│   Reverse Proxy │    │   (Port 3000)   │    │   Manager       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Static Files  │    │   Socket.IO     │
│   (React Build) │    │   WebSocket     │
└─────────────────┘    └─────────────────┘
```

## Directory Structure on EC2

```
/var/www/project-anonymous/
├── server/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   ├── ecosystem.config.js
│   └── logs/
├── client/
│   ├── build/          # React build output
│   ├── package.json
│   ├── src/
│   └── public/
└── setup-ubuntu-ec2.sh
```

## Service Management

### PM2 Commands
```bash
# Monitor all processes
pm2 monit

# View logs
pm2 logs project-anonymous-server

# Restart server
pm2 restart project-anonymous-server

# Stop server
pm2 stop project-anonymous-server

# List all processes
pm2 list
```

### Nginx Commands
```bash
# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t
```

## Environment Configuration

Edit the server environment file:
```bash
nano /var/www/project-anonymous/server/.env
```

Key settings:
```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*
USE_DATABASE=false
```

## SSL/HTTPS Setup (Optional)

### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Update Nginx for HTTPS
The setup script creates HTTP configuration. For production, use HTTPS with the SSL certificate.

## Monitoring and Logs

### Application Logs
- **Server Logs**: `/var/www/project-anonymous/server/logs/`
- **PM2 Logs**: `pm2 logs project-anonymous-server`
- **Nginx Logs**: `/var/log/nginx/`

### System Monitoring
```bash
# Check system resources
htop
df -h
free -h

# Check PM2 processes
pm2 list
pm2 monit
```

## Troubleshooting

### Common Issues

1. **Port 80 already in use**
   ```bash
   sudo lsof -i :80
   sudo systemctl stop apache2  # If Apache is running
   ```

2. **Nginx configuration error**
   ```bash
   sudo nginx -t
   # Fix any configuration errors
   sudo systemctl restart nginx
   ```

3. **Server not starting**
   ```bash
   cd /var/www/project-anonymous/server
   pm2 logs project-anonymous-server
   # Check for errors in logs
   ```

4. **WebSocket connection issues**
   - Check Nginx configuration for `/socket.io/` proxy
   - Verify CORS settings in `.env` file

### Performance Optimization

1. **Enable Gzip Compression**
   Add to Nginx config:
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **Configure PM2 Cluster Mode**
   Already enabled in `ecosystem.config.js` with `instances: 'max'`

3. **Enable Caching**
   Add to Nginx config for static assets:
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

## Security Considerations

1. **Firewall Rules**: Only ports 22, 80, and 443 are open
2. **Regular Updates**: Keep system and packages updated
3. **SSL Certificate**: Use HTTPS in production
4. **Environment Variables**: Keep sensitive data in `.env` file
5. **Log Rotation**: Set up log rotation to prevent disk space issues

## Scaling Considerations

For higher traffic:
1. Use larger EC2 instance (t3.large or better)
2. Enable database persistence (PostgreSQL)
3. Add Redis for session management
4. Consider load balancer for multiple instances
5. Use CDN for static assets

## Backup Strategy

```bash
# Backup application files
tar -czf project-anonymous-backup.tar.gz /var/www/project-anonymous

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 ~/dump.pm2.backup
```
