# Nginx Configuration for Project Anonymous

## 🌐 Nginx Setup for Socket.IO and HTTPS

### Step 1: Create Nginx Configuration

Create this file: `/etc/nginx/sites-available/maxyserver.servehalflife.com`

```nginx
server {
    listen 80;
    server_name maxyserver.servehalflife.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name maxyserver.servehalflife.com;
    
    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/maxyserver.servehalflife.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/maxyserver.servehalflife.com/privkey.pem;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Root directory
    root /var/www/html;
    index index.html;
    
    # Main location
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.IO WebSocket Support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Socket.IO specific headers
        proxy_set_header Access-Control-Allow-Origin *;
        proxy_set_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        proxy_set_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }
    
    # API endpoints
    location /room/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Step 2: Enable Configuration

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/maxyserver.servehalflife.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 3: Update Your Node.js Server

Make sure your server runs on port 3000 (HTTP) since Nginx handles HTTPS:

```javascript
// In your server.js, use HTTP on port 3000
const http = require('http');
const server = http.createServer(app);

server.listen(3000, 'localhost', () => {
  console.log('🚀 Server running on http://localhost:3000');
  console.log('🌐 Nginx handles HTTPS externally');
});
```

### Step 4: Test Configuration

```bash
# Test HTTPS
curl -I https://maxyserver.servehalflife.com

# Test Socket.IO
curl -I https://maxyserver.servehalflife.com/socket.io/

# Test API
curl https://maxyserver.servehalflife.com/room/test
```

## 🎯 Benefits:

### Nginx + Let's Encrypt Setup:
- ✅ **Professional SSL certificate** (trusted by all browsers)
- ✅ **HTTP → HTTPS redirect** (automatic)
- ✅ **WebSocket support** (Socket.IO works perfectly)
- ✅ **Performance optimization** (static file caching)
- ✅ **Security headers** (protection against attacks)
- ✅ **Load balancing** (ready for scaling)
- ✅ **Auto-renewal** (certbot handles it)

### Your Architecture:
```
Browser → HTTPS → Nginx (443) → HTTP → Node.js (3000)
         ↓
    Let's Encrypt SSL
```

## 🚀 Next Steps:

1. **Apply Nginx configuration** above
2. **Restart Nginx** 
3. **Test HTTPS** - should work perfectly
4. **Deploy Vercel** - will connect to your professional HTTPS setup
