// https-server.js - HTTPS version with proper SSL setup
require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

// Import quantum cryptography
const { 
  generateQuantumKeyPair,
  exportQuantumPublicKey,
  importQuantumPublicKey,
  encryptWithQuantum,
  decryptWithQuantum,
  signWithQuantum,
  verifyWithQuantum,
  quantumCryptoMiddleware,
  validateQuantumKey,
  getQuantumSecurityInfo
} = require('./quantum-crypto-server');

const app = express();

// SSL Certificate paths
const certPath = path.join(__dirname, 'server.cert');
const keyPath = path.join(__dirname, 'server.key');

// Generate self-signed certificate if it doesn't exist
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log('🔐 Generating SSL certificate for HTTPS...');
  try {
    const { execSync } = require('child_process');
    execSync(`openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`, { stdio: 'inherit' });
    console.log('✅ SSL certificate generated successfully');
  } catch (error) {
    console.log('❌ Error generating SSL certificate:', error.message);
    console.log('💡 Make sure OpenSSL is installed or use HTTP instead');
    process.exit(1);
  }
}

// Create HTTPS server
const server = https.createServer({
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
}, app);

const users = {}; // Store { userId: publicKey }
const rooms = {}; // Store { roomKey: { users: {}, messages: [], locked: false, createdAt: Date.now() } }
const activeCalls = {}; // Store { roomKey: { callerId: string, receiverId: string, startTime: Date } }

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// PostgreSQL connection (optional)
const USE_DATABASE = process.env.USE_DATABASE === 'true';
let pool = null;

if (USE_DATABASE) {
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });
  console.log('Database connection enabled');
} else {
  console.log('Running without database - messages will not be persisted');
}

// Middleware
app.use(quantumCryptoMiddleware);
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Routes
app.get('/room/:roomCode', async (req, res) => {
  try {
    const roomCode = req.params.roomCode.toUpperCase();
    
    if (rooms[roomCode]) {
      res.json({
        exists: true,
        room: rooms[roomCode],
        quantumSecurity: getQuantumSecurityInfo()
      });
    } else {
      res.json({
        exists: false,
        error: 'Room not found'
      });
    }
  } catch (error) {
    console.error('Error checking room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.IO handlers (same as original server.js)
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  users[socket.id] = null;
  let currentRoomKey = null;
  let currentUsername = null;

  // Handle quantum key exchange
  socket.on('share public key', (data) => {
    try {
      const publicKey = importQuantumPublicKey(data.publicKey);
      users[socket.id] = publicKey;
      console.log(`Public key stored for user ${socket.id}`);
      
      socket.emit('public key stored', { success: true });
    } catch (error) {
      console.error('Error storing public key:', error);
      socket.emit('public key stored', { success: false, error: error.message });
    }
  });

  // Handle room creation
  socket.on('create room', (data) => {
    try {
      const roomKey = data.roomKey.toUpperCase();
      
      if (!rooms[roomKey]) {
        rooms[roomKey] = {
          users: {},
          messages: [],
          locked: false,
          createdAt: Date.now()
        };
      }
      
      currentRoomKey = roomKey;
      currentUsername = data.username.trim();
      rooms[roomKey].users[socket.id] = {
        username: currentUsername,
        publicKey: users[socket.id],
        isCreator: true
      };
      
      socket.emit('room created', { 
        roomKey, 
        quantumSecurity: getQuantumSecurityInfo()
      });
      
      socket.join(roomKey);
      console.log(`Room created: ${roomKey} by ${currentUsername}`);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // Handle room joining
  socket.on('join room', (data) => {
    try {
      const roomKey = data.roomKey.toUpperCase();
      
      if (!rooms[roomKey]) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      if (rooms[roomKey].locked) {
        socket.emit('error', { message: 'Room is locked' });
        return;
      }
      
      currentRoomKey = roomKey;
      currentUsername = data.username.trim();
      rooms[roomKey].users[socket.id] = {
        username: currentUsername,
        publicKey: users[socket.id],
        isCreator: false
      };
      
      socket.join(roomKey);
      socket.emit('room joined', {
        roomKey,
        messages: rooms[roomKey].messages,
        users: Object.values(rooms[roomKey].users),
        quantumSecurity: getQuantumSecurityInfo()
      });
      
      // Notify others in room
      socket.to(roomKey).emit('user joined room', {
        userId: socket.id,
        username: currentUsername
      });
      
      console.log(`User joined room: ${roomKey} as ${currentUsername}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle message sending
  socket.on('chat message', async (data) => {
    try {
      if (!currentRoomKey || !currentUsername) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }
      
      const room = rooms[currentRoomKey];
      const sender = room.users[socket.id];
      
      if (!sender) {
        socket.emit('error', { message: 'Sender information not found' });
        return;
      }
      
      // Encrypt message for each recipient
      const encryptedMessages = {};
      
      for (const [userId, recipient] of Object.entries(room.users)) {
        if (userId !== socket.id) {
          try {
            const encryptedData = encryptWithQuantum(data.message, recipient.publicKey, sender.publicKey);
            encryptedMessages[userId] = {
              encryptedData,
              senderId: socket.id,
              senderUsername: currentUsername,
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            console.error(`Error encrypting message for user ${userId}:`, error);
            encryptedMessages[userId] = {
              error: error.message,
              senderId: socket.id,
              senderUsername: currentUsername,
              timestamp: new Date().toISOString()
            };
          }
        }
      }
      
      // Store message
      const messageEntry = {
        id: randomUUID(),
        senderId: socket.id,
        senderUsername: currentUsername,
        message: data.message,
        encryptedMessages,
        timestamp: new Date().toISOString(),
        type: 'user'
      };
      
      room.messages.push(messageEntry);
      
      // Broadcast to all users in room
      io.to(currentRoomKey).emit('chat message', messageEntry);
      
      console.log(`Message sent in room ${currentRoomKey}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle room locking
  socket.on('lock room', () => {
    try {
      if (!currentRoomKey || !rooms[currentRoomKey]) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }
      
      const user = rooms[currentRoomKey].users[socket.id];
      if (!user || !user.isCreator) {
        socket.emit('error', { message: 'Only room creator can lock the room' });
        return;
      }
      
      rooms[currentRoomKey].locked = true;
      io.to(currentRoomKey).emit('room locked', { locked: true });
      console.log(`Room locked: ${currentRoomKey}`);
    } catch (error) {
      console.error('Error locking room:', error);
      socket.emit('error', { message: 'Failed to lock room' });
    }
  });

  // Handle room unlocking
  socket.on('unlock room', () => {
    try {
      if (!currentRoomKey || !rooms[currentRoomKey]) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }
      
      const user = rooms[currentRoomKey].users[socket.id];
      if (!user || !user.isCreator) {
        socket.emit('error', { message: 'Only room creator can unlock the room' });
        return;
      }
      
      rooms[currentRoomKey].locked = false;
      io.to(currentRoomKey).emit('room locked', { locked: false });
      console.log(`Room unlocked: ${currentRoomKey}`);
    } catch (error) {
      console.error('Error unlocking room:', error);
      socket.emit('error', { message: 'Failed to unlock room' });
    }
  });

  // Handle WebRTC signaling
  socket.on('webrtc-offer', (data) => {
    try {
      if (!currentRoomKey || !rooms[currentRoomKey]) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }
      
      const targetUser = Object.values(rooms[currentRoomKey].users).find(user => user.username === data.targetUsername);
      if (!targetUser) {
        socket.emit('error', { message: 'User not found in room' });
        return;
      }
      
      // Find target user's socket ID
      const targetSocketId = Object.keys(rooms[currentRoomKey].users).find(userId => 
        rooms[currentRoomKey].users[userId].username === data.targetUsername
      );
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-offer', {
          offer: data.offer,
          from: currentUsername,
          fromId: socket.id
        });
        console.log(`WebRTC offer sent from ${currentUsername} to ${data.targetUsername}`);
      }
    } catch (error) {
      console.error('Error sending WebRTC offer:', error);
      socket.emit('error', { message: 'Failed to send call offer' });
    }
  });

  socket.on('webrtc-answer', (data) => {
    try {
      const targetSocketId = Object.keys(rooms[currentRoomKey].users).find(userId => 
        rooms[currentRoomKey].users[userId].username === data.targetUsername
      );
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-answer', {
          answer: data.answer,
          from: currentUsername,
          fromId: socket.id
        });
        console.log(`WebRTC answer sent from ${currentUsername} to ${data.targetUsername}`);
      }
    } catch (error) {
      console.error('Error sending WebRTC answer:', error);
      socket.emit('error', { message: 'Failed to send call answer' });
    }
  });

  socket.on('webrtc-ice-candidate', (data) => {
    try {
      const targetSocketId = Object.keys(rooms[currentRoomKey].users).find(userId => 
        rooms[currentRoomKey].users[userId].username === data.targetUsername
      );
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-ice-candidate', {
          candidate: data.candidate,
          from: currentUsername,
          fromId: socket.id
        });
      }
    } catch (error) {
      console.error('Error sending ICE candidate:', error);
    }
  });

  // Handle call signaling
  socket.on('start-call', (data) => {
    try {
      if (!currentRoomKey || !rooms[currentRoomKey]) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }
      
      const targetUser = Object.values(rooms[currentRoomKey].users).find(user => user.username === data.targetUsername);
      if (!targetUser) {
        socket.emit('error', { message: 'User not found in room' });
        return;
      }
      
      // Find target user's socket ID
      const targetSocketId = Object.keys(rooms[currentRoomKey].users).find(userId => 
        rooms[currentRoomKey].users[userId].username === data.targetUsername
      );
      
      if (targetSocketId) {
        // Track active call
        activeCalls[currentRoomKey] = {
          callerId: socket.id,
          receiverId: targetSocketId,
          startTime: Date.now()
        };
        
        io.to(targetSocketId).emit('incoming-call', {
          from: currentUsername,
          fromId: socket.id,
          callType: data.callType
        });
        
        console.log(`Call initiated: ${currentUsername} → ${data.targetUsername}`);
      }
    } catch (error) {
      console.error('Error starting call:', error);
      socket.emit('error', { message: 'Failed to start call' });
    }
  });

  socket.on('call-response', (data) => {
    try {
      if (!activeCalls[currentRoomKey]) {
        socket.emit('error', { message: 'No active call' });
        return;
      }
      
      const call = activeCalls[currentRoomKey];
      if (data.response === 'accept') {
        io.to(call.callerId).emit('call-accepted', {
          from: call.receiverId,
          response: data.response
        });
        console.log(`Call accepted: ${call.receiverId}`);
      } else {
        io.to(call.callerId).emit('call-rejected', {
          from: call.receiverId,
          response: data.response
        });
        console.log(`Call rejected: ${call.receiverId}`);
      }
      
      // Remove active call tracking
      delete activeCalls[currentRoomKey];
    } catch (error) {
      console.error('Error handling call response:', error);
      socket.emit('error', { message: 'Failed to handle call response' });
    }
  });

  socket.on('end-call', (data) => {
    try {
      if (!activeCalls[currentRoomKey]) {
        socket.emit('error', { message: 'No active call to end' });
        return;
      }
      
      const call = activeCalls[currentRoomKey];
      
      // Notify both parties
      io.to(call.callerId).emit('call-ended');
      io.to(call.receiverId).emit('call-ended');
      
      // Remove active call tracking
      delete activeCalls[currentRoomKey];
      
      console.log(`Call ended: ${call.callerId} → ${call.receiverId}`);
    } catch (error) {
      console.error('Error ending call:', error);
      socket.emit('error', { message: 'Failed to end call' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from current room if in one
    if (currentRoomKey && rooms[currentRoomKey]) {
      delete rooms[currentRoomKey].users[socket.id];
      
      // Send system message for user disconnect
      const disconnectMessage = {
        type: 'system',
        text: `~${currentUsername} left`,
        timestamp: new Date().toISOString(),
        userId: 'system'
      };
      
      rooms[currentRoomKey].messages.push(disconnectMessage);
      socket.to(currentRoomKey).emit('system message', disconnectMessage);
      
      socket.to(currentRoomKey).emit('user left room', {
        userId: socket.id,
        username: currentUsername
      });
      
      // End any ongoing calls
      socket.to(currentRoomKey).emit('call-ended');

      // Delete room if empty
      if (Object.keys(rooms[currentRoomKey].users).length === 0) {
        console.log(`Room ${currentRoomKey} is empty after disconnect, deleting...`);
        delete rooms[currentRoomKey];
      }
    }

    delete users[socket.id];
  });
});

// Start HTTPS server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🔐 HTTPS Server running on https://${HOST}:${PORT}`);
  console.log(`📱 Access from mobile devices: https://192.168.78.5:${PORT}`);
  console.log(`🌐 Access from web browser: https://localhost:${PORT}`);
  console.log(`🔑 SSL Certificate: ${certPath}`);
  console.log(`🔑 SSL Key: ${keyPath}`);
});
