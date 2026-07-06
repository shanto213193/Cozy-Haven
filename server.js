const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Helper functions for reading/writing DB
function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Initialize with default
      const defaultData = {
        admins: [{ username: "Shanto", password: "ShantolovesRasa" }],
        channels: [
          { id: "channel-1", name: "🍂 Cozy Cabin" },
          { id: "channel-2", name: "☕ Coffee Shop" },
          { id: "channel-3", name: "🌧️ Rainy Night" }
        ],
        chatHistory: []
      };
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return { admins: [], channels: [], chatHistory: [] };
  }
}

function writeDb(data) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store active voice state: channelId -> Set of socketIds
// And socketId -> { channelId, username, avatar }
const voiceRooms = {};
const socketToUser = {};
const adminTokens = new Set(); // store active admin session tokens (simplified)

function generateCozyResponse(prompt, username) {
  const p = prompt.toLowerCase();
  
  if (p.includes('hello') || p.includes('hi') || p.includes('hey') || p.includes('greeting')) {
    return `Hey there, ${username}! 🍃 I was just sitting here with a warm cup of jasmine tea. How is your day going?`;
  }
  if (p.includes('tea') || p.includes('coffee') || p.includes('matcha') || p.includes('drink') || p.includes('cocoa')) {
    return `Ah, tea is my absolute favorite! 🍵 I'm currently sipping chamomile. There's something so peaceful about watching the steam rise. What's your favorite go-to drink?`;
  }
  if (p.includes('music') || p.includes('lofi') || p.includes('song') || p.includes('track')) {
    return `Lofi music is like a warm blanket for the mind. 🎵 Sometimes I just loop a track and watch the rain. Are you enjoying the atmosphere mixer here?`;
  }
  if (p.includes('rain') || p.includes('weather') || p.includes('storm') || p.includes('cozy') || p.includes('wind')) {
    return `Rainy days are the perfect excuse to bundle up in a warm blanket and stay indoors. 🌧️ Do you prefer stormy rainy nights or quiet sunny afternoons?`;
  }
  if (p.includes('how are you') || p.includes('how\'s it going') || p.includes('doing ok')) {
    return `I'm doing wonderfully! Just enjoying this little cozy space we've built. How are you holding up today, ${username}? I'm here to listen.`;
  }
  if (p.includes('sad') || p.includes('down') || p.includes('lonely') || p.includes('tired') || p.includes('stressed') || p.includes('bad')) {
    return `I hear you, friend. 🧸 It's completely okay to feel tired, stressed, or out of sorts. Take a deep breath, and remember to go easy on yourself today. You are doing your best, and I'm really glad we can share this cozy moment.`;
  }
  if (p.includes('happy') || p.includes('excited') || p.includes('good') || p.includes('great')) {
    return `That makes me so incredibly happy! ☀️ Hearing that you're doing well warms my heart. What's the best thing that happened to you today?`;
  }
  if (p.includes('joke') || p.includes('funny')) {
    const jokes = [
      "Why did the tea leaf go to the doctor? Because it was feeling a bit steep! 🍵",
      "What do you call a sleeping dinosaur? A dino-snore! 💤",
      "Why do mushrooms get invited to all the parties? Because they're fun-gi! 🍄"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)] + " Hope that brings a little smile to your face!";
  }
  if (p.includes('story') || p.includes('tale') || p.includes('forest')) {
    return `Imagine a tiny wooden cabin nestled deep inside a mossy forest. Outside, a gentle rain is drumming against the glass. Inside, there's a fireplace crackling warmly, a soft cat curled up on the rug, and a hot cup of cocoa waiting on the table just for you. You don't have to worry about a thing here. 🌲`;
  }
  if (p.includes('book') || p.includes('read') || p.includes('novel')) {
    return `I love books! 📚 Stumbling into another world while the weather outside is stormy is magical. What's the last good book you read?`;
  }
  if (p.includes('help') || p.includes('commands') || p.includes('about')) {
    return `I'm Rasa, your cozy AI companion! 🌸 You can talk to me by starting your message with \`/talktome\`. We can talk about how your day went, books, lofi beats, or tea!`;
  }
  
  // Default pool of friendly answers
  const defaults = [
    `That's really interesting, ${username}. 🍂 Tell me more about it? I'd love to hear your thoughts.`,
    `I was just thinking about how nice it is that we can connect and chat from different corners of the world. What else is on your mind?`,
    `Thanks for sharing that, ${username}. 🌸 It's little conversations like this that make my day. What are you up to right now?`,
    `Hmm, that sounds cozy! ☕ What kind of music are you listening to while we talk?`
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send initial data (channels and chat history)
  const db = readDb();
  socket.emit('init-data', {
    channels: db.channels,
    chatHistory: db.chatHistory || []
  });

  // Track active users globally
  socket.on('register-user', (userProfile) => {
    socketToUser[socket.id] = {
      socketId: socket.id,
      username: userProfile.username || 'Anonymous',
      avatar: userProfile.avatar || '🍂',
      channelId: null
    };
    io.emit('online-users', Object.values(socketToUser));
  });

  // Chat message handling
  socket.on('send-chat', (msgData) => {
    const user = socketToUser[socket.id] || { username: 'Anonymous', avatar: '🍂' };
    const rawMsg = msgData.message || '';
    const chatMsg = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      username: user.username,
      avatar: user.avatar,
      message: rawMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampMs: Date.now()
    };

    const db = readDb();
    db.chatHistory = db.chatHistory || [];
    db.chatHistory.push(chatMsg);
    // Keep last 100 messages
    if (db.chatHistory.length > 100) {
      db.chatHistory.shift();
    }
    writeDb(db);

    io.emit('new-chat', chatMsg);

    // Check if user is invoking the chatbot /talktome or has toggled AI on
    if (rawMsg.trim().startsWith('/talktome') || msgData.askAi) {
      const prompt = rawMsg.replace('/talktome', '').trim();
      
      // Notify clients AI is typing
      io.emit('ai-typing', { active: true, username: user.username });

      setTimeout(() => {
        const responseText = generateCozyResponse(prompt, user.username);
        const aiMsg = {
          id: Date.now().toString() + 'ai',
          username: '🌸 Rasa (AI)',
          avatar: '🌸',
          message: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestampMs: Date.now()
        };

        const currentDb = readDb();
        currentDb.chatHistory = currentDb.chatHistory || [];
        currentDb.chatHistory.push(aiMsg);
        if (currentDb.chatHistory.length > 100) {
          currentDb.chatHistory.shift();
        }
        writeDb(currentDb);

        io.emit('ai-typing', { active: false });
        io.emit('new-chat', aiMsg);
      }, 1500);
    }
  });

  // Delete individual message (Only own messages allowed)
  socket.on('delete-message', (data) => {
    const user = socketToUser[socket.id];
    if (!user) return;

    const db = readDb();
    db.chatHistory = db.chatHistory || [];
    const msgIdx = db.chatHistory.findIndex(m => m.id === data.messageId);
    if (msgIdx !== -1) {
      const msg = db.chatHistory[msgIdx];
      // Verify user is author
      if (msg.username === user.username) {
        db.chatHistory.splice(msgIdx, 1);
        writeDb(db);
        io.emit('message-deleted', data.messageId);
      }
    }
  });

  // Admin Clear Chat History
  socket.on('admin-clear-chat-history', (data) => {
    if (!adminTokens.has(data.token)) {
      return socket.emit('error-msg', 'Unauthorized action');
    }
    const db = readDb();
    db.chatHistory = [];
    writeDb(db);
    io.emit('chat-history-cleared');
  });

  // Admin Login
  socket.on('admin-login', (credentials) => {
    const db = readDb();
    const admin = db.admins.find(a => a.username === credentials.username && a.password === credentials.password);
    if (admin) {
      const token = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
      adminTokens.add(token);
      socket.emit('admin-login-result', { success: true, token, admins: db.admins.map(a => a.username) });
    } else {
      socket.emit('admin-login-result', { success: false, message: 'Invalid username or password.' });
    }
  });

  // Admin: Create Channel
  socket.on('create-channel', (data) => {
    if (!adminTokens.has(data.token)) {
      return socket.emit('error-msg', 'Unauthorized action');
    }
    const db = readDb();
    const newChannel = {
      id: 'channel-' + Date.now(),
      name: data.name
    };
    db.channels.push(newChannel);
    writeDb(db);

    io.emit('channels-updated', db.channels);
  });

  // Admin: Delete Channel
  socket.on('delete-channel', (data) => {
    if (!adminTokens.has(data.token)) {
      return socket.emit('error-msg', 'Unauthorized action');
    }
    const db = readDb();
    db.channels = db.channels.filter(c => c.id !== data.channelId);
    writeDb(db);

    // If users are in this voice channel, kick them out
    if (voiceRooms[data.channelId]) {
      const usersInChannel = [...voiceRooms[data.channelId]];
      usersInChannel.forEach(sid => {
        const clientSocket = io.sockets.sockets.get(sid);
        if (clientSocket) {
          clientSocket.emit('voice-channel-deleted', data.channelId);
        }
      });
      delete voiceRooms[data.channelId];
    }

    io.emit('channels-updated', db.channels);
  });

  // Admin: Manage Admins (Add Admin)
  socket.on('add-admin', (data) => {
    if (!adminTokens.has(data.token)) {
      return socket.emit('error-msg', 'Unauthorized action');
    }
    const db = readDb();
    if (db.admins.some(a => a.username === data.newUsername)) {
      return socket.emit('admin-action-result', { success: false, message: 'Admin username already exists.' });
    }
    db.admins.push({ username: data.newUsername, password: data.newPassword });
    writeDb(db);
    socket.emit('admin-action-result', { success: true, message: 'Admin added successfully.', admins: db.admins.map(a => a.username) });
  });

  // Admin: Manage Admins (Delete Admin)
  socket.on('delete-admin', (data) => {
    if (!adminTokens.has(data.token)) {
      return socket.emit('error-msg', 'Unauthorized action');
    }
    if (data.usernameToDelete === 'Shanto') {
      return socket.emit('admin-action-result', { success: false, message: 'Cannot delete the super admin (Shanto).' });
    }
    const db = readDb();
    db.admins = db.admins.filter(a => a.username !== data.usernameToDelete);
    writeDb(db);
    socket.emit('admin-action-result', { success: true, message: 'Admin deleted successfully.', admins: db.admins.map(a => a.username) });
  });

  // Admin: Kick user
  socket.on('kick-user', (data) => {
    if (!adminTokens.has(data.token)) {
      return socket.emit('error-msg', 'Unauthorized action');
    }
    const targetSocket = io.sockets.sockets.get(data.targetSocketId);
    if (targetSocket) {
      targetSocket.emit('kicked-from-server');
      targetSocket.disconnect(true);
    }
  });

  // Voice Channel WebRTC Joining
  socket.on('join-voice', (channelId) => {
    const user = socketToUser[socket.id];
    if (!user) return;

    // Leave current voice room if any
    const oldChannelId = user.channelId;
    if (oldChannelId) {
      handleLeaveVoice(socket, oldChannelId);
    }

    // Join new room
    user.channelId = channelId;
    user.isMuted = false;
    socket.join(channelId);

    if (!voiceRooms[channelId]) {
      voiceRooms[channelId] = new Set();
    }
    
    // Get list of other users in this room
    const otherUsers = Array.from(voiceRooms[channelId]).map(sid => ({
      socketId: sid,
      user: socketToUser[sid]
    }));

    voiceRooms[channelId].add(socket.id);

    // Notify others in room
    socket.to(channelId).emit('user-joined-voice', {
      socketId: socket.id,
      user: user
    });

    // Send back current room state to the user who joined
    socket.emit('voice-room-users', {
      channelId,
      users: otherUsers
    });

    io.emit('online-users', Object.values(socketToUser));
  });

  // Leave Voice Room
  socket.on('leave-voice', () => {
    const user = socketToUser[socket.id];
    if (user && user.channelId) {
      handleLeaveVoice(socket, user.channelId);
      user.channelId = null;
      user.isMuted = false;
      io.emit('online-users', Object.values(socketToUser));
    }
  });

  // Toggle Mute Status
  socket.on('toggle-mute', (data) => {
    const user = socketToUser[socket.id];
    if (user) {
      user.isMuted = data.isMuted;
      io.emit('online-users', Object.values(socketToUser));
    }
  });

  // WebRTC Signaling Relay
  socket.on('signal', (data) => {
    // data: { to: targetSocketId, signal: rtcSignalData }
    const relayData = {
      from: socket.id,
      signal: data.signal
    };
    io.to(data.to).emit('signal', relayData);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const user = socketToUser[socket.id];
    if (user && user.channelId) {
      handleLeaveVoice(socket, user.channelId);
    }
    delete socketToUser[socket.id];
    io.emit('online-users', Object.values(socketToUser));
  });
});

function handleLeaveVoice(socket, channelId) {
  if (voiceRooms[channelId]) {
    voiceRooms[channelId].delete(socket.id);
    if (voiceRooms[channelId].size === 0) {
      delete voiceRooms[channelId];
    }
  }
  socket.leave(channelId);
  socket.to(channelId).emit('user-left-voice', {
    socketId: socket.id
  });
}

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Cozy server is humming at http://localhost:${PORT}`);
});
