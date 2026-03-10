// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
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

// Create HTTP server (Nginx handles HTTPS)
const server = http.createServer(app);
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
app.use(express.json());

// CORS for REST endpoints (Socket.IO handles its own CORS separately)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(quantumCryptoMiddleware); // Add quantum security headers

// Routes
app.get('/', (req, res) => {
  res.send('Anonymous Chat Service - Quantum Secure');
});

// Quantum security information endpoint
app.get('/quantum-security', (req, res) => {
  const securityInfo = getQuantumSecurityInfo();
  res.json({
    success: true,
    ...securityInfo,
    serverQuantumReady: true,
    timestamp: new Date().toISOString()
  });
});

// Room access via URL
app.get('/room/:roomKey', (req, res) => {
  const { roomKey } = req.params;
  
  // Validate room key format
  if (!/^[A-Z0-9]{6}$/.test(roomKey)) {
    return res.status(400).json({ error: 'Invalid room key format' });
  }
  
  // Check if room exists and is not locked
  if (rooms[roomKey]) {
    if (rooms[roomKey].locked) {
      return res.status(403).json({ error: 'Room is locked' });
    }
    return res.json({ 
      success: true, 
      roomKey,
      userCount: Object.keys(rooms[roomKey].users).length,
      createdAt: rooms[roomKey].createdAt
    });
  } else {
    // Room doesn't exist yet, but can be created
    return res.json({ 
      success: true, 
      roomKey,
      userCount: 0,
      isNewRoom: true
    });
  }
});

// QR code data endpoint
app.get('/qr/:roomKey', (req, res) => {
  const { roomKey } = req.params;
  const qrData = {
    type: 'chatanony-room',
    roomKey: roomKey.toUpperCase(),
    url: `${req.protocol}://${req.get('host')}/room/${roomKey}`,
    timestamp: Date.now()
  };
  
  res.json(qrData);
});

// WebSocket connection
io.on('connection', async (socket) => {
  console.log('=== New connection ===');
  console.log('Socket ID:', socket.id);
  
  let currentUserId = null;
  let currentRoomKey = null;
  let currentUsername = null;

  // Assign a unique ID to the user
  const userId = randomUUID();
  currentUserId = userId;
  console.log('Generated userId:', userId);
  socket.emit('user connected', { userId });

  // Handle joining a room
  socket.on('join room', ({ roomKey, username }) => {
    console.log(`User ${userId} (${username}) joining room: ${roomKey}`);
    currentRoomKey = roomKey;
    currentUsername = username;

    // Create room if it doesn't exist
    if (!rooms[roomKey]) {
      rooms[roomKey] = {
        users: {},
        messages: [],
        locked: false,
        createdAt: Date.now()
      };
      console.log(`Created new room: ${roomKey}`);
    }
    
    // Check if room is locked
    if (rooms[roomKey].locked) {
      socket.emit('room locked', { roomKey });
      return;
    }

    // Add user to room
    rooms[roomKey].users[userId] = {
      socketId: socket.id,
      username: username,
      publicKey: null,
      joinedAt: Date.now()
    };

    // Join the socket.io room
    socket.join(roomKey);
    
    // Send system message for user join
    const joinMessage = {
      type: 'system',
      text: `~${username} joined via invite link`,
      timestamp: new Date().toISOString(),
      userId: 'system'
    };
    
    rooms[roomKey].messages.push(joinMessage);
    io.to(roomKey).emit('system message', joinMessage);

    // Send existing room data to the new user
    socket.emit('room joined', {
      roomKey,
      users: rooms[roomKey].users,
      messages: rooms[roomKey].messages
    });

    // Notify others in the room
    socket.to(roomKey).emit('user joined room', {
      userId,
      username
    });

    // Send updated user list to all users in the room
    const userList = Object.entries(rooms[roomKey].users).map(([id, userData]) => ({
      userId: id,
      username: userData.username
    }));
    io.to(roomKey).emit('room users', userList);

    console.log(`Room ${roomKey} now has ${Object.keys(rooms[roomKey].users).length} users`);
  });

  // Handle public key sharing (room-specific)
  socket.on('share public key', ({ roomKey, publicKey }) => {
    if (rooms[roomKey] && rooms[roomKey].users[userId]) {
      rooms[roomKey].users[userId].publicKey = publicKey;
      
      // Send the new user's public key to all other users in the room
      socket.to(roomKey).emit('new user', { userId, publicKey, username: currentUsername });
      
      // Send all existing users' public keys to the new user
      const existingUsers = {};
      for (const [uid, userData] of Object.entries(rooms[roomKey].users)) {
        if (uid !== userId && userData.publicKey) {
          existingUsers[uid] = {
            publicKey: userData.publicKey,
            username: userData.username
          };
        }
      }
      socket.emit('existing users', existingUsers);
    }
  });

  // Handle chat messages (room-specific)
  socket.on('chat message', async (msg) => {
    if (!currentRoomKey) {
      console.error('User tried to send message without joining a room');
      return;
    }

    const messageData = {
      ...msg,
      userId,
      username: currentUsername,
      timestamp: new Date().toISOString()
    };

    // Store message in room
    if (rooms[currentRoomKey]) {
      rooms[currentRoomKey].messages.push(messageData);
      
      // Keep only last 100 messages per room
      if (rooms[currentRoomKey].messages.length > 100) {
        rooms[currentRoomKey].messages.shift();
      }
    }

    // Broadcast to all users in the room
    io.to(currentRoomKey).emit('chat message', { ...messageData, from: userId });
  });

  socket.on('chat message plain', async (msg) => {
    if (!currentRoomKey) {
      console.error('User tried to send message without joining a room');
      return;
    }
    
    console.log('Received plain text message:', msg);
    
    // Preserve ALL fields from the original message (type, file data, etc.)
    const messageData = {
      ...msg,
      from: userId,
      username: currentUsername,
      timestamp: new Date().toISOString(),
    };
    
    // Store and broadcast
    if (rooms[currentRoomKey]) {
      rooms[currentRoomKey].messages.push(messageData);
      if (rooms[currentRoomKey].messages.length > 100) {
        rooms[currentRoomKey].messages.shift();
      }
    }
    
    io.to(currentRoomKey).emit('chat message plain', messageData);
  });


  // Handle room locking
  socket.on('lock room', ({ roomKey }) => {
    if (rooms[roomKey] && rooms[roomKey].users[userId]) {
      rooms[roomKey].locked = true;
      const username = rooms[roomKey].users[userId].username;
      console.log(`Room ${roomKey} locked by ${username}`);
      
      // Notify all users in the room
      const lockMessage = {
        type: 'system',
        text: `Room is now locked. No new users can join.`,
        timestamp: new Date().toISOString(),
        userId: 'system'
      };
      
      rooms[roomKey].messages.push(lockMessage);
      io.to(roomKey).emit('room locked', { roomKey, lockedBy: username });
      io.to(roomKey).emit('system message', lockMessage);
    }
  });
  
  socket.on('unlock room', ({ roomKey }) => {
    if (rooms[roomKey] && rooms[roomKey].users[userId]) {
      rooms[roomKey].locked = false;
      const username = rooms[roomKey].users[userId].username;
      console.log(`Room ${roomKey} unlocked by ${username}`);
      
      // Notify all users in the room
      const unlockMessage = {
        type: 'system',
        text: `Room is now unlocked. New users can join.`,
        timestamp: new Date().toISOString(),
        userId: 'system'
      };
      
      rooms[roomKey].messages.push(unlockMessage);
      io.to(roomKey).emit('room unlocked', { roomKey, unlockedBy: username });
      io.to(roomKey).emit('system message', unlockMessage);
    }
  });

  // Handle leaving a room
  socket.on('leave room', () => {
    if (currentRoomKey && rooms[currentRoomKey]) {
      console.log(`User ${userId} (${currentUsername}) leaving room: ${currentRoomKey}`);
      
      // Remove user from room
      delete rooms[currentRoomKey].users[userId];
      
      // Send system message for user leave
      const leaveMessage = {
        type: 'system',
        text: `~${currentUsername} left`,
        timestamp: new Date().toISOString(),
        userId: 'system'
      };
      
      rooms[currentRoomKey].messages.push(leaveMessage);
      io.to(currentRoomKey).emit('system message', leaveMessage);
      
      // Notify others in the room
      socket.to(currentRoomKey).emit('user left room', {
        userId,
        username: currentUsername
      });

      // Leave the socket.io room
      socket.leave(currentRoomKey);

      // Delete room if empty
      if (Object.keys(rooms[currentRoomKey].users).length === 0) {
        console.log(`Room ${currentRoomKey} is empty, deleting...`);
        delete rooms[currentRoomKey];
      } else {
        // Send updated user list to remaining users
        const userList = Object.entries(rooms[currentRoomKey].users).map(([id, userData]) => ({
          userId: id,
          username: userData.username
        }));
        io.to(currentRoomKey).emit('room users', userList);
        
        console.log(`Room ${currentRoomKey} now has ${Object.keys(rooms[currentRoomKey].users).length} users`);
      }

      currentRoomKey = null;
      currentUsername = null;
    }
  });

  // Handle call signaling with proper peer-to-peer routing
  socket.on('call-user', (data) => {
    console.log(`Call initiated in room ${data.roomKey} by ${data.username}`);
    
    // Initialize call tracking
    if (!activeCalls[data.roomKey]) {
      const roomUsers = rooms[data.roomKey]?.users || {};
      const otherUsers = Object.keys(roomUsers).filter(id => id !== userId);
      
      if (otherUsers.length > 0) {
        const receiverId = otherUsers[0];
        const receiverSocketId = roomUsers[receiverId].socketId;
        
        // Track active call
        activeCalls[data.roomKey] = {
          callerId: userId,
          receiverId: receiverId,
          startTime: Date.now()
        };
        
        // Send directly to specific user
        io.to(receiverSocketId).emit('incoming-call', {
          callType: data.callType,
          callerName: data.username,
          callerId: data.from,
          callId: `call_${Date.now()}`
        });
        
        console.log(`Call routed: ${userId} → ${receiverId}`);
      }
    }
  });

  // WebRTC signaling handlers with direct routing
  socket.on('call-offer', (data) => {
    console.log('Call offer received for room:', data.roomKey);
    
    // If call-user hasn't arrived yet, create the activeCalls entry now
    // (call-offer can arrive before call-user due to event ordering)
    if (!activeCalls[data.roomKey]) {
      const roomUsers = rooms[data.roomKey]?.users || {};
      const otherUsers = Object.keys(roomUsers).filter(id => id !== userId);
      if (otherUsers.length > 0) {
        const receiverId = otherUsers[0];
        activeCalls[data.roomKey] = {
          callerId: userId,
          receiverId,
          startTime: Date.now()
        };
        console.log(`activeCalls created by call-offer: ${userId} → ${receiverId}`);
      }
    }

    const call = activeCalls[data.roomKey];
    if (call) {
      const targetId = call.callerId === userId ? call.receiverId : call.callerId;
      const targetSocketId = rooms[data.roomKey]?.users?.[targetId]?.socketId;
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-offer', {
          offer: data.offer,
          callType: data.callType,
          callerName: data.callerName,
          from: userId
        });
        console.log(`Offer routed: ${userId} → ${targetId}`);
      } else {
        console.warn(`call-offer: no socket found for target ${targetId}`);
      }
    } else {
      console.warn('call-offer: no activeCalls entry and no other users found');
    }
  });

  socket.on('call-answer', (data) => {
    console.log('Call answer received for room:', data.roomKey);
    
    const call = activeCalls[data.roomKey];
    if (call) {
      // Route answer to the other participant only
      const targetId = call.callerId === userId ? call.receiverId : call.callerId;
      const targetSocketId = rooms[data.roomKey]?.users?.[targetId]?.socketId;
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-answer', {
          answer: data.answer,
          from: userId
        });
        console.log(`Answer routed: ${userId} → ${targetId}`);
      }
    }
  });

  socket.on('ice-candidate', (data) => {
    console.log('ICE candidate received for room:', data.roomKey);
    
    const call = activeCalls[data.roomKey];
    if (call) {
      // Route ICE candidate to the other participant only
      const targetId = call.callerId === userId ? call.receiverId : call.callerId;
      const targetSocketId = rooms[data.roomKey]?.users?.[targetId]?.socketId;
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', {
          candidate: data.candidate,
          from: userId
        });
        console.log(`ICE candidate routed: ${userId} → ${targetId}`);
      }
    }
  });

  socket.on('accept-call', (data) => {
    console.log('Call accepted in room:', data.roomKey);
    socket.to(data.roomKey).emit('call-accepted', {
      callId: data.callId,
      from: userId
    });
  });

  socket.on('end-call', (data) => {
    console.log('Call ended in room:', data.roomKey);
    
    // Clean up active call
    if (activeCalls[data.roomKey]) {
      const call = activeCalls[data.roomKey];
      const targetId = call.callerId === userId ? call.receiverId : call.callerId;
      const targetSocketId = rooms[data.roomKey]?.users?.[targetId]?.socketId;
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-ended', {
          from: userId
        });
        console.log(`Call end routed: ${userId} → ${targetId}`);
      }
      
      // Remove active call tracking
      delete activeCalls[data.roomKey];
    }
  });

  // Duplicate handlers removed - using the ones above

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', userId);
    
    // Remove from current room if in one
    if (currentRoomKey && rooms[currentRoomKey]) {
      delete rooms[currentRoomKey].users[userId];
      
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
        userId,
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

    delete users[userId];
  });
});

// Start server (Nginx handles HTTPS)
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`� HTTP Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Nginx handles HTTPS externally`);
  console.log(`📱 Access via: https://maxyserver.servehalflife.com`);
  console.log(`� Make sure Nginx is configured to proxy to this server`);
});
