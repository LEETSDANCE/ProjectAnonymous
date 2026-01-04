# 🔐 Project Anony - Anonymous Chat Application

A complete end-to-end encrypted chat application with voice/video calling, available on both mobile and web platforms.

## 🚀 Quick Start (3 Steps)

### Step 1: Test Server Connection
```bash
# Double-click this file or run in terminal:
test-server.bat
```

### Step 2: Start Web Application
```bash
# Double-click this file or run in terminal:
start-web.bat
```

### Step 3: Start Mobile Application
```bash
# Double-click this file or run in terminal:
start-mobile.bat
```

## 📱 How to Use

### Creating a Chat Room:
1. **Enter your name** (e.g., "Alice")
2. **Click "Generate Session Key"** → Gets a 6-character code (e.g., "ABC123")
3. **Click "Start Chat Room"** → You're now in the room
4. **Share the session key** with others

### Joining a Chat Room:
1. **Enter your name** (e.g., "Bob")
2. **Enter the session key** (e.g., "ABC123")
3. **Click "Join Chat Room"** → You join Alice's room

### Making Voice/Video Calls:
- **📞 Button** = Start voice call
- **📹 Button** = Start video call
- **Accept/Decline** incoming calls
- **Mute/Camera controls** during calls

## 🎯 Test Scenarios

### Test 1: Basic Chat
1. Open web app → Create room as "WebUser"
2. Open mobile app → Join same room as "MobileUser"  
3. Send messages back and forth
4. ✅ Messages should appear instantly and be encrypted

### Test 2: Voice Calling
1. Both users in same room
2. One user clicks 📞 (voice call)
3. Other user gets incoming call notification
4. Accept call and talk
5. ✅ Clear audio communication

### Test 3: Video Calling
1. Both users in same room
2. One user clicks 📹 (video call)
3. Other user accepts video call
4. ✅ See each other's video + audio

### Test 4: Multiple Rooms
1. Create room "ROOM1" 
2. Create room "ROOM2"
3. Send messages in each room
4. ✅ Messages stay separate per room

## 🔧 Troubleshooting

### ❌ "Server not responding"
**Solution:**
```bash
# On Ubuntu server (192.168.1.85):
cd ~/ProjectAnonymous/server
node server.js
# OR
pm2 restart all
```

### ❌ Web app won't start
**Solution:**
```bash
cd "S:\Kepa Work\ProjectAnonymous\client"
npm install
npm start
```

### ❌ Mobile app build errors
**Solution:**
```bash
cd "S:\Kepa Work\ProjectAnonymous\mobile"
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### ❌ Calls not working
**Solutions:**
- **Browser:** Allow camera/microphone permissions
- **Mobile:** Check app permissions in Settings
- **Network:** Use WiFi for better quality

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │    Web App      │    │  Ubuntu Server  │
│  (React Native) │◄──►│    (React)      │◄──►│   (Node.js)     │
│                 │    │                 │    │                 │
│ • RSA Encrypt   │    │ • RSA Encrypt   │    │ • Room Manager  │
│ • WebRTC Calls  │    │ • WebRTC Calls  │    │ • Socket.IO     │
│ • Dark/Light    │    │ • Dark/Light    │    │ • Auto Cleanup  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔐 Security Features

- **🔒 RSA-2048 Encryption:** Military-grade message encryption
- **🚫 Zero Knowledge:** Server cannot read your messages
- **🏠 Room Isolation:** Each room is completely separate
- **🧹 Auto Cleanup:** Empty rooms automatically deleted
- **👤 Anonymous:** No registration or personal data required

## 📊 Current Status

### ✅ Completed Features:
- [x] End-to-end encrypted messaging
- [x] Room-based chat system
- [x] Voice calling (WebRTC)
- [x] Video calling (WebRTC)
- [x] Dark/Light theme modes
- [x] Mobile app (React Native)
- [x] Web app (React)
- [x] Auto room cleanup
- [x] Leave room functionality
- [x] Username per room
- [x] Real-time messaging
- [x] Modern UI design

### 🎮 Available Platforms:
- **📱 Mobile:** Android (React Native)
- **🌐 Web:** Any modern browser
- **🖥️ Server:** Ubuntu Linux

## 📞 Call Features

### Voice Calls:
- High-quality audio using WebRTC
- Mute/unmute functionality
- Call duration timer
- Accept/decline incoming calls

### Video Calls:
- HD video streaming
- Camera on/off toggle
- Picture-in-picture local video
- Full-screen remote video

## 🎨 UI Features

- **Modern Design:** WhatsApp-inspired interface
- **Responsive:** Works on all screen sizes
- **Animations:** Smooth message animations
- **Themes:** Light and dark modes
- **Emojis:** Full emoji support

## 🌐 Network Requirements

- **Server:** Ubuntu at 192.168.1.85:3000
- **Internet:** Required for WebRTC STUN servers
- **Ports:** 3000 (HTTP), WebRTC ports (automatic)

## 📝 File Structure

```
ProjectAnonymous/
├── mobile/                 # React Native app
│   ├── screens/           # Home, Chat, Settings
│   ├── components/        # CallScreen, MessageItem
│   └── crypto-native.ts   # RSA encryption
├── client/                # React web app
│   ├── src/App.js        # Main web application
│   ├── src/App.css       # Styling
│   └── src/crypto.js     # Web crypto functions
├── server/                # Node.js server
│   └── server.js         # Socket.IO + room management
└── *.bat                 # Windows startup scripts
```

## 🎉 Success Indicators

When everything is working correctly, you should see:

1. **✅ Server:** "Server running on port 3000"
2. **✅ Web App:** Opens at http://localhost:3000
3. **✅ Mobile App:** Builds and installs on Android device
4. **✅ Connection:** Both apps connect to server
5. **✅ Messaging:** Real-time encrypted messages
6. **✅ Calls:** Voice/video calls work between devices

Your Project Anony is ready to use! 🚀🔐
