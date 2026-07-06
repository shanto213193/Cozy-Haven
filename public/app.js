// Initialize Socket.io
const socket = io();

// Application State
let currentUser = {
  username: '',
  avatar: '🍂'
};

let currentVoiceChannelId = null;
let localStream = null;
let isMuted = false;
let isCameraOn = false;
let isAiEnabled = localStorage.getItem('isAiEnabled') === 'true';
const peerConnections = {}; // targetSocketId -> RTCPeerConnection

// Admin Session State
let adminToken = localStorage.getItem('adminToken') || null;
let loggedAdminName = localStorage.getItem('loggedAdminName') || null;

// UI Elements
const themeToggle = document.getElementById('theme-toggle');
const userProfileTrigger = document.getElementById('user-profile-trigger');
const userAvatarEl = document.getElementById('user-avatar');
const userDisplayNameEl = document.getElementById('user-display-name');

const voiceChannelsList = document.getElementById('voice-channels-list');
const onlineUsersList = document.getElementById('online-users-list');
const onlineCountBadge = document.getElementById('online-count');
const activeVoiceIndicator = document.getElementById('active-voice-indicator');
const activeChannelNameEl = document.getElementById('active-channel-name');
const disconnectVoiceBtn = document.getElementById('disconnect-voice-btn');

const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const quickEmojis = document.querySelectorAll('.quick-emojis .emoji-btn');

const profileModal = document.getElementById('profile-modal');
const profileModalAvatarPreview = document.getElementById('profile-modal-avatar-preview');
const profileUsernameInput = document.getElementById('profile-username-input');
const saveProfileBtn = document.getElementById('save-profile-btn');
const emojiChoices = document.querySelectorAll('.emoji-grid .avatar-choice-btn');

const adminDashboardBtn = document.getElementById('admin-dashboard-btn');
const adminModal = document.getElementById('admin-modal');
const adminLoginView = document.getElementById('admin-login-view');
const adminDashboardView = document.getElementById('admin-dashboard-view');
const adminUsernameInput = document.getElementById('admin-username');
const adminPasswordInput = document.getElementById('admin-password');
const submitAdminLoginBtn = document.getElementById('submit-admin-login-btn');
const adminLoginError = document.getElementById('admin-login-error');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const loggedAdminNameEl = document.getElementById('logged-admin-name');

// Admin control fields
const adminChannelsList = document.getElementById('admin-channels-list');
const newChannelNameInput = document.getElementById('new-channel-name');
const createChannelBtn = document.getElementById('create-channel-btn');

const adminUsersList = document.getElementById('admin-users-list');
const newAdminUsernameInput = document.getElementById('new-admin-username');
const newAdminPasswordInput = document.getElementById('new-admin-password');
const addAdminBtn = document.getElementById('add-admin-btn');
const addAdminError = document.getElementById('add-admin-error');

const adminModerationList = document.getElementById('admin-moderation-list');

// Chat controls & deletion elements
const chatRetentionSelect = document.getElementById('chat-retention');
const clearChatViewBtn = document.getElementById('clear-chat-view-btn');
const adminClearChatBtn = document.getElementById('admin-clear-chat-btn');

// Close buttons for modals
const closeModalBtns = document.querySelectorAll('.close-modal-btn');

// Cozy Sounds Mixer Elements
const playTrackBtns = document.querySelectorAll('.play-track-btn');
const volumeSliders = document.querySelectorAll('.volume-slider');

// Custom Media Player Elements
const musicEmbedInput = document.getElementById('music-embed-input');
const loadEmbedBtn = document.getElementById('load-embed-btn');
const mediaEmbedContainer = document.getElementById('media-embed-container');

// ==========================================
// GSAP Cute Animations Helpers
// ==========================================

function triggerPageLoadAnimations() {
  // Fade in ambient background
  gsap.fromTo('.ambient-bg', { opacity: 0 }, { opacity: 1, duration: 1.5 });
  
  // Slide header down with bouncy effect
  gsap.fromTo('.app-header', 
    { y: -60, opacity: 0 }, 
    { y: 0, opacity: 1, duration: 1, ease: 'back.out(1.5)' }
  );
  
  // Slide panels in with staggered delays and smooth ease
  gsap.fromTo('.panel-left', 
    { x: -50, opacity: 0 }, 
    { x: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: 'power2.out' }
  );

  gsap.fromTo('.panel-center', 
    { scale: 0.95, opacity: 0 }, 
    { scale: 1, opacity: 1, duration: 0.8, delay: 0.35, ease: 'power2.out' }
  );

  gsap.fromTo('.panel-right', 
    { x: 50, opacity: 0 }, 
    { x: 0, opacity: 1, duration: 0.8, delay: 0.5, ease: 'power2.out' }
  );
  
  // Gentle floating sway for the logo emoji
  gsap.to('.logo-emoji', {
    y: -5,
    rotation: 6,
    duration: 2.2,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });
}

function openModal(modalEl) {
  modalEl.classList.remove('hidden');
  const content = modalEl.querySelector('.modal-content');
  
  gsap.fromTo(modalEl, 
    { opacity: 0 }, 
    { opacity: 1, duration: 0.3, ease: 'power2.out' }
  );
  
  gsap.fromTo(content, 
    { scale: 0.8, y: -40, opacity: 0 }, 
    { scale: 1, y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.4)', delay: 0.05 }
  );
}

function closeModal(modalEl) {
  const content = modalEl.querySelector('.modal-content');
  
  gsap.to(content, {
    scale: 0.8,
    y: 40,
    opacity: 0,
    duration: 0.25,
    ease: 'power2.in'
  });

  gsap.to(modalEl, {
    opacity: 0,
    duration: 0.25,
    delay: 0.05,
    onComplete: () => {
      modalEl.classList.add('hidden');
    }
  });
}

function setupMicroAnimations() {
  // Springy scale on hovering elements
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.channel-card, .user-profile-pill, .play-track-btn, .emoji-btn, .header-btn, .user-card, .send-btn, .admin-tab-btn, .embed-load-btn');
    if (target) {
      gsap.to(target, { scale: 1.05, duration: 0.2, ease: 'power1.out' });
    }
  });
  
  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('.channel-card, .user-profile-pill, .play-track-btn, .emoji-btn, .header-btn, .user-card, .send-btn, .admin-tab-btn, .embed-load-btn');
    if (target) {
      gsap.to(target, { scale: 1, duration: 0.2, ease: 'power1.out' });
    }
  });

  document.addEventListener('mousedown', (e) => {
    const target = e.target.closest('.channel-card, .user-profile-pill, .play-track-btn, .emoji-btn, .header-btn, .user-card, .send-btn, .admin-tab-btn, .embed-load-btn');
    if (target) {
      gsap.to(target, { scale: 0.94, duration: 0.1 });
    }
  });

  document.addEventListener('mouseup', (e) => {
    const target = e.target.closest('.channel-card, .user-profile-pill, .play-track-btn, .emoji-btn, .header-btn, .user-card, .send-btn, .admin-tab-btn, .embed-load-btn');
    if (target) {
      gsap.to(target, { scale: 1.05, duration: 0.1 });
    }
  });
}

// ==========================================
// 1. Initial Setup & Themes
// ==========================================

// Load theme from localStorage
const savedTheme = localStorage.getItem('theme') || 'classic';
document.documentElement.setAttribute('data-theme', savedTheme);

// Theme selection dropdown handling
const themeSelectorBtn = document.getElementById('theme-selector-btn');
const themeDropdownMenu = document.getElementById('theme-dropdown-menu');

themeSelectorBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isHidden = themeDropdownMenu.classList.contains('hidden');
  if (isHidden) {
    themeDropdownMenu.classList.remove('hidden');
    gsap.fromTo(themeDropdownMenu, { opacity: 0, scale: 0.9, y: -10 }, { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'power2.out' });
  } else {
    gsap.to(themeDropdownMenu, { opacity: 0, scale: 0.9, y: -10, duration: 0.2, onComplete: () => themeDropdownMenu.classList.add('hidden') });
  }
});

// Close menu when clicking outside
document.addEventListener('click', () => {
  if (!themeDropdownMenu.classList.contains('hidden')) {
    gsap.to(themeDropdownMenu, { opacity: 0, scale: 0.9, y: -10, duration: 0.2, onComplete: () => themeDropdownMenu.classList.add('hidden') });
  }
});

// Apply theme when option is clicked
const themeOptBtns = document.querySelectorAll('.theme-opt-btn');
themeOptBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.getAttribute('data-theme-val');
    document.documentElement.setAttribute('data-theme', val);
    localStorage.setItem('theme', val);
  });
});

// Load or Prompt User Profile (Local Storage Only)
function initUserProfile() {
  const storedUser = localStorage.getItem('cozyUser');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    updateProfileUI();
    registerUserSocket();
  } else {
    // Show setup profile modal
    openModal(profileModal);
    // Pre-select first avatar
    emojiChoices[0].classList.add('selected');
    currentUser.avatar = emojiChoices[0].textContent;
  }
}

function updateProfileUI() {
  userAvatarEl.textContent = currentUser.avatar;
  userDisplayNameEl.textContent = currentUser.username;
  profileModalAvatarPreview.textContent = currentUser.avatar;
  profileUsernameInput.value = currentUser.username;
}

function registerUserSocket() {
  socket.emit('register-user', currentUser);
}

// Avatar Choice Logic
emojiChoices.forEach(btn => {
  btn.addEventListener('click', () => {
    emojiChoices.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    currentUser.avatar = btn.textContent;
    profileModalAvatarPreview.textContent = btn.textContent;
  });
});

saveProfileBtn.addEventListener('click', () => {
  const name = profileUsernameInput.value.trim();
  if (!name) {
    alert("Please enter a nickname!");
    return;
  }
  currentUser.username = name;
  localStorage.setItem('cozyUser', JSON.stringify(currentUser));
  updateProfileUI();
  registerUserSocket();
  closeModal(profileModal);
});

userProfileTrigger.addEventListener('click', () => {
  // Highlight active avatar
  emojiChoices.forEach(btn => {
    if (btn.textContent === currentUser.avatar) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
  openModal(profileModal);
});

// Modal close behavior
closeModalBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-modal');
    closeModal(document.getElementById(modalId));
  });
});

// ==========================================
// 2. Socket Events & UI rendering
// ==========================================

socket.on('init-data', (data) => {
  renderChannels(data.channels);
  renderChatHistory(data.chatHistory);
});

socket.on('channels-updated', (channels) => {
  renderChannels(channels);
  if (adminToken) {
    renderAdminChannelsList(channels);
  }
});

socket.on('online-users', (users) => {
  renderOnlineUsers(users);
});

socket.on('error-msg', (msg) => {
  alert("Error: " + msg);
});

// Render voice channels list
function renderChannels(channels) {
  voiceChannelsList.innerHTML = '';
  
  if (channels.length === 0) {
    voiceChannelsList.innerHTML = '<div class="loading-placeholder">No voice channels active.</div>';
    return;
  }

  channels.forEach(ch => {
    const isJoined = currentVoiceChannelId === ch.id;
    const card = document.createElement('div');
    card.className = `channel-card ${isJoined ? 'active' : ''}`;
    
    // Count active participants
    const participants = getChannelParticipantsCount(ch.id);

    card.innerHTML = `
      <div class="channel-info">
        <span class="channel-icon"><i class="fas fa-headset"></i></span>
        <span class="channel-title">${ch.name}</span>
      </div>
      <div class="participant-count">
        <i class="fas fa-users-viewfinder"></i>
        <span>${participants}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      if (currentVoiceChannelId === ch.id) return; // already in this channel
      joinVoiceChannel(ch.id, ch.name);
    });

    voiceChannelsList.appendChild(card);
  });
}

// Retrieve participants count in voice channels
let lastUsersList = [];
function getChannelParticipantsCount(channelId) {
  return lastUsersList.filter(u => u.channelId === channelId).length;
}

function renderOnlineUsers(users) {
  lastUsersList = users;
  onlineCountBadge.textContent = users.length;
  onlineUsersList.innerHTML = '';

  users.forEach(u => {
    const card = document.createElement('div');
    card.className = 'user-card';

    // Find channel name if in voice
    let channelName = '';
    if (u.channelId) {
      const activeChCard = document.querySelector(`.channel-card`); // simple lookup
      channelName = 'In Voice Room';
    }

    card.innerHTML = `
      <span class="avatar-emoji">${u.avatar}</span>
      <div class="user-details">
        <span class="user-name">${u.username}</span>
        ${u.channelId ? (
          u.isMuted ? 
          `<span class="user-activity" style="color:var(--text-muted)"><i class="fas fa-microphone-slash"></i> muted</span>` : 
          `<span class="user-activity" style="color:var(--online-green)"><i class="fas fa-microphone"></i> talking</span>`
        ) : ''}
      </div>
      <div class="user-status-dot"></div>
    `;
    onlineUsersList.appendChild(card);
  });

  // Re-render voice channels counts
  const storedChannels = document.querySelectorAll('.channel-card');
  // Refresh counts
  const storedInitData = document.querySelector('#voice-channels-list');
  // Refresh channels internally using stored list
  socket.emit('request-channels-refresh'); // optional helper or trigger locally
  refreshChannelsCount();
}

function refreshChannelsCount() {
  const cards = voiceChannelsList.querySelectorAll('.channel-card');
  cards.forEach(card => {
    // Quick parse titles to count
    const title = card.querySelector('.channel-title').textContent;
    // Just find active counts again
    const matches = lastUsersList.filter(u => {
      // Find matching channels dynamically based on active indicators
      // We will match based on class
      return false; 
    });
  });
}

// WebRTC refresh triggering rendering
socket.on('request-channels-refresh', () => {
  // Let the client know it can refresh channels list
});

// ==========================================
// 3. WebRTC Voice Room Call Logic (Mesh)
// ==========================================

async function joinVoiceChannel(channelId, channelName) {
  try {
    // If already in a room, leave it first
    if (currentVoiceChannelId) {
      leaveVoiceChannel();
    }

    isMuted = false;
    isCameraOn = false;

    // Reset mute/video UI buttons
    document.getElementById('toggle-mute-btn').classList.remove('active');
    document.getElementById('toggle-mute-btn').innerHTML = '<i class="fas fa-microphone"></i>';
    document.getElementById('toggle-video-btn').classList.remove('active');
    document.getElementById('toggle-video-btn').innerHTML = '<i class="fas fa-video-slash"></i>';

    // Request both audio and video streams. Fallback to audio only if webcam is missing/blocked.
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 320, height: 240 } });
      // Disable video track initially
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = false;
    } catch (err) {
      console.log("No webcam found or blocked. Falling back to audio only.");
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    // Show indicator
    activeVoiceIndicator.classList.remove('hidden');
    gsap.fromTo(activeVoiceIndicator, 
      { scale: 0, opacity: 0 }, 
      { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.5)' }
    );
    activeChannelNameEl.textContent = `Speaking in: ${channelName}`;
    currentVoiceChannelId = channelId;

    // Show and update video grid
    document.getElementById('video-grid-container').classList.remove('hidden');
    updateVideoGrid();

    // Join room on Socket server
    socket.emit('join-voice', channelId);

    // Refresh UI highlights
    const cards = voiceChannelsList.querySelectorAll('.channel-card');
    cards.forEach(c => c.classList.remove('active'));
    
    // Find matching card and activate
    const activeCard = Array.from(cards).find(c => c.querySelector('.channel-title').textContent === channelName);
    if (activeCard) activeCard.classList.add('active');

  } catch (err) {
    console.error("Failed to access media devices:", err);
    alert("Could not access microphone. Please check your browser permissions.");
    leaveVoiceChannel();
  }
}

function leaveVoiceChannel() {
  if (!currentVoiceChannelId) return;

  socket.emit('leave-voice');

  // Close all peer connections
  Object.keys(peerConnections).forEach(sid => {
    closePeerConnection(sid);
  });

  // Release media tracks
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  currentVoiceChannelId = null;
  gsap.to(activeVoiceIndicator, {
    scale: 0,
    opacity: 0,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => {
      activeVoiceIndicator.classList.add('hidden');
    }
  });

  // Hide video grid container and clear feeds
  document.getElementById('video-grid-container').classList.add('hidden');
  document.getElementById('video-grid').innerHTML = '';

  // Remove active highlight from channel list
  const cards = voiceChannelsList.querySelectorAll('.channel-card');
  cards.forEach(c => c.classList.remove('active'));
}

disconnectVoiceBtn.addEventListener('click', () => {
  leaveVoiceChannel();
});

// Handle voice room response (list of current users in room)
socket.on('voice-room-users', async ({ channelId, users }) => {
  // We initiate connections with everyone already in the room
  for (const item of users) {
    const targetSocketId = item.socketId;
    await createPeerConnection(targetSocketId, true);
  }
});

// Handle another user joining our voice room
socket.on('user-joined-voice', async ({ socketId, user }) => {
  console.log(`User joined voice room: ${user.username} (${socketId})`);
  // We wait for them to initiate the connection (or we create PC, wait for signal)
  await createPeerConnection(socketId, false);
});

// Handle user leaving our voice room
socket.on('user-left-voice', ({ socketId }) => {
  console.log(`User left voice room: ${socketId}`);
  closePeerConnection(socketId);
});

// Handle signaling message relay
socket.on('signal', async ({ from, signal }) => {
  let pc = peerConnections[from];
  if (!pc) {
    pc = await createPeerConnection(from, false);
  }

  try {
    if (signal.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      if (signal.sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', { to: from, signal: pc.localDescription });
      }
    } else if (signal.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  } catch (err) {
    console.error("Signaling error:", err);
  }
});

socket.on('voice-channel-deleted', (channelId) => {
  if (currentVoiceChannelId === channelId) {
    alert("The voice channel you were in has been deleted by the administrator.");
    leaveVoiceChannel();
  }
});

socket.on('kicked-from-server', () => {
  alert("You have been kicked from the server by the administrator.");
  leaveVoiceChannel();
  localStorage.removeItem('cozyUser');
  window.location.reload();
});

// Setup Peer Connection
async function createPeerConnection(targetSocketId, isInitiator) {
  if (peerConnections[targetSocketId]) {
    return peerConnections[targetSocketId];
  }

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  });

  peerConnections[targetSocketId] = pc;

  // Add our tracks to the connection
  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
  }

  // Handle ice candidate discovery
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { to: targetSocketId, signal: { candidate: event.candidate } });
    }
  };

  // Handle incoming media track
  pc.ontrack = (event) => {
    const stream = event.streams[0];
    
    // Find or create participant feed box in video grid
    const grid = document.getElementById('video-grid');
    let feedEl = document.getElementById(`video-feed-${targetSocketId}`);
    if (!feedEl) {
      feedEl = document.createElement('div');
      feedEl.id = `video-feed-${targetSocketId}`;
      feedEl.className = 'video-feed';
      grid.appendChild(feedEl);
    }
    
    const peerUser = lastUsersList.find(u => u.socketId === targetSocketId) || { username: 'Companion', avatar: '🦊' };
    const videoTrack = stream.getVideoTracks()[0];
    
    if (videoTrack) {
      // Play video feed
      let videoEl = feedEl.querySelector('video');
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        feedEl.appendChild(videoEl);
      }
      videoEl.srcObject = stream;
      
      let label = feedEl.querySelector('.video-feed-label');
      if (!label) {
        label = document.createElement('div');
        label.className = 'video-feed-label';
        feedEl.appendChild(label);
      }
      label.textContent = peerUser.username;

      const placeholder = feedEl.querySelector('.video-placeholder-avatar');
      if (placeholder) placeholder.remove();

      // Listen to mute/unmute of video tracks
      videoTrack.onmute = () => {
        showVideoPlaceholder(feedEl, peerUser);
      };
      videoTrack.onunmute = () => {
        hideVideoPlaceholder(feedEl, stream, peerUser);
      };
      
      if (!videoTrack.enabled || videoTrack.muted) {
        showVideoPlaceholder(feedEl, peerUser);
      }
    } else {
      // Audio only track, show avatar placeholder
      showVideoPlaceholder(feedEl, peerUser);
    }

    // Always ensure audio is routed and playing
    let audio = document.getElementById(`audio-remote-${targetSocketId}`);
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = `audio-remote-${targetSocketId}`;
      audio.autoplay = true;
      document.getElementById('remote-audios-container').appendChild(audio);
    }
    audio.srcObject = stream;
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      closePeerConnection(targetSocketId);
    }
  };

  // If initiator, create and send offer
  if (isInitiator) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('signal', { to: targetSocketId, signal: pc.localDescription });
    } catch (err) {
      console.error("Error creating RTC Offer:", err);
    }
  }

  return pc;
}

function closePeerConnection(socketId) {
  if (peerConnections[socketId]) {
    peerConnections[socketId].close();
    delete peerConnections[socketId];
  }

  const audio = document.getElementById(`audio-remote-${socketId}`);
  if (audio) {
    audio.srcObject = null;
    audio.remove();
  }

  const feed = document.getElementById(`video-feed-${socketId}`);
  if (feed) {
    feed.remove();
  }
}

// Video grid helpers
function updateVideoGrid() {
  const grid = document.getElementById('video-grid');
  let localFeed = document.getElementById('local-video-feed');
  
  if (!localFeed) {
    localFeed = document.createElement('div');
    localFeed.id = 'local-video-feed';
    localFeed.className = 'video-feed';
    grid.appendChild(localFeed);
  }

  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (isCameraOn && videoTrack && videoTrack.enabled) {
      let videoEl = localFeed.querySelector('video');
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        localFeed.appendChild(videoEl);
      }
      if (videoEl.srcObject !== localStream) {
        videoEl.srcObject = localStream;
      }
      let label = localFeed.querySelector('.video-feed-label');
      if (!label) {
        label = document.createElement('div');
        label.className = 'video-feed-label';
        localFeed.appendChild(label);
      }
      label.textContent = `${currentUser.username} (You)`;
      
      const placeholder = localFeed.querySelector('.video-placeholder-avatar');
      if (placeholder) placeholder.remove();
    } else {
      localFeed.innerHTML = `
        <span class="video-placeholder-avatar">${currentUser.avatar}</span>
        <div class="video-feed-label">${currentUser.username} (You)</div>
      `;
    }
  }
}

function showVideoPlaceholder(feedEl, peerUser) {
  let videoEl = feedEl.querySelector('video');
  if (videoEl) videoEl.remove();
  
  if (!feedEl.querySelector('.video-placeholder-avatar')) {
    feedEl.innerHTML = `
      <span class="video-placeholder-avatar">${peerUser.avatar}</span>
      <div class="video-feed-label">${peerUser.username}</div>
    `;
  }
}

function hideVideoPlaceholder(feedEl, stream, peerUser) {
  const placeholder = feedEl.querySelector('.video-placeholder-avatar');
  if (placeholder) placeholder.remove();
  
  let videoEl = feedEl.querySelector('video');
  if (!videoEl) {
    videoEl = document.createElement('video');
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    feedEl.appendChild(videoEl);
  }
  videoEl.srcObject = stream;
  
  let label = feedEl.querySelector('.video-feed-label');
  if (!label) {
    label = document.createElement('div');
    label.className = 'video-feed-label';
    feedEl.appendChild(label);
  }
  label.textContent = peerUser.username;
}

// Media Mute/Video Click Handlers
const toggleMuteBtn = document.getElementById('toggle-mute-btn');
toggleMuteBtn.addEventListener('click', () => {
  if (!localStream) return;
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    isMuted = !isMuted;
    audioTrack.enabled = !isMuted;
    
    if (isMuted) {
      toggleMuteBtn.classList.add('active');
      toggleMuteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    } else {
      toggleMuteBtn.classList.remove('active');
      toggleMuteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }

    // Emit to server so online users list updates
    socket.emit('toggle-mute', { isMuted: isMuted });
  }
});

const toggleVideoBtn = document.getElementById('toggle-video-btn');
toggleVideoBtn.addEventListener('click', () => {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    isCameraOn = !isCameraOn;
    videoTrack.enabled = isCameraOn;
    
    if (isCameraOn) {
      toggleVideoBtn.classList.add('active');
      toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';
    } else {
      toggleVideoBtn.classList.remove('active');
      toggleVideoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
    }
    
    // Update local grid view
    updateVideoGrid();
  } else {
    alert("No webcam found on this device to share video.");
  }
});

// ==========================================
// 4. Lobby Chat Module
// ==========================================

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  socket.emit('send-chat', { message: text, askAi: isAiEnabled });
  chatInput.value = '';
});

// Quick Emojis
quickEmojis.forEach(btn => {
  btn.addEventListener('click', () => {
    chatInput.value += btn.textContent;
    chatInput.focus();
  });
});

socket.on('new-chat', (chatMsg) => {
  appendChatMessage(chatMsg);
});

// Listener for message deletion
socket.on('message-deleted', (messageId) => {
  const msgRow = chatMessages.querySelector(`[data-msg-id="${messageId}"]`);
  if (msgRow) {
    gsap.to(msgRow, {
      opacity: 0,
      scale: 0.9,
      height: 0,
      padding: 0,
      marginTop: 0,
      marginBottom: 0,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => msgRow.remove()
    });
  }
});

// Listener for full chat history clear
socket.on('chat-history-cleared', () => {
  chatMessages.innerHTML = `
    <div class="welcome-message">
      <span class="welcome-emoji">🧹</span>
      <h3>Chat Cleared</h3>
      <p>The lobby chat history was cleared by the administrator.</p>
    </div>
  `;
});

let typingIndicatorEl = null;

socket.on('ai-typing', (data) => {
  if (data.active) {
    if (!typingIndicatorEl) {
      typingIndicatorEl = document.createElement('div');
      typingIndicatorEl.className = 'typing-indicator-chat';
      typingIndicatorEl.innerHTML = `
        <span>🌸 Rasa (AI) is brewing tea and thinking...</span>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      `;
      chatMessages.appendChild(typingIndicatorEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  } else {
    if (typingIndicatorEl) {
      typingIndicatorEl.remove();
      typingIndicatorEl = null;
    }
  }
});

// Local Clear View Action
clearChatViewBtn.addEventListener('click', () => {
  chatMessages.innerHTML = `
    <div class="welcome-message">
      <span class="welcome-emoji">🧹</span>
      <h3>Screen Cleared</h3>
      <p>Your local chat screen was cleared. New messages will still appear.</p>
    </div>
  `;
});

// Admin Clear All Chat History Action
adminClearChatBtn.addEventListener('click', () => {
  if (!adminToken) {
    alert("Please log in as an administrator first.");
    return;
  }
  if (confirm("Are you absolutely sure you want to delete ALL chat history from the server database? This cannot be undone!")) {
    socket.emit('admin-clear-chat-history', { token: adminToken });
  }
});

// Load saved chat retention policy
const savedRetention = localStorage.getItem('chatRetention') || 'forever';
chatRetentionSelect.value = savedRetention;

// Save chat retention policy preference
chatRetentionSelect.addEventListener('change', () => {
  const val = chatRetentionSelect.value;
  localStorage.setItem('chatRetention', val);
  if (val === 'view') {
    alert("Chat retention set to 'After Viewing'. Messages will self-destruct 8 seconds after appearing.");
  }
});

// Periodic retention check routine (24h or 7d)
setInterval(() => {
  const policy = chatRetentionSelect.value;
  if (policy === 'forever' || policy === 'view') return;

  const thresholdMs = policy === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const msgRows = chatMessages.querySelectorAll('.chat-msg-row');
  msgRows.forEach(row => {
    const ts = parseInt(row.getAttribute('data-timestamp-ms'));
    if (ts && (now - ts) > thresholdMs) {
      gsap.to(row, {
        opacity: 0,
        scale: 0.9,
        height: 0,
        padding: 0,
        marginTop: 0,
        marginBottom: 0,
        duration: 0.35,
        onComplete: () => row.remove()
      });
    }
  });
}, 10000);

function renderChatHistory(history) {
  chatMessages.innerHTML = '';
  if (history.length === 0) {
    chatMessages.innerHTML = `
      <div class="welcome-message">
        <span class="welcome-emoji">☕</span>
        <h3>Welcome to Cozy Haven!</h3>
        <p>Pull up a chair, make some tea, and start chatting with the community.</p>
      </div>
    `;
    return;
  }
  history.forEach(appendChatMessage);
}

function appendChatMessage(msg) {
  // Remove welcome message if there
  const welcome = chatMessages.querySelector('.welcome-message');
  if (welcome) welcome.remove();

  const isMe = msg.username === currentUser.username;
  const msgRow = document.createElement('div');
  msgRow.className = `chat-msg-row ${isMe ? 'me' : ''}`;
  msgRow.setAttribute('data-msg-id', msg.id);
  msgRow.setAttribute('data-timestamp-ms', msg.timestampMs || Date.now());

  // Show delete button only if it's my own message
  const deleteBtnHtml = isMe ? `<button class="delete-msg-btn" data-msg-id="${msg.id}" title="Delete Message"><i class="fas fa-trash-can"></i></button>` : '';

  msgRow.innerHTML = `
    <div class="chat-msg-avatar">${msg.avatar}</div>
    <div class="chat-msg-content">
      <div class="chat-msg-meta">
        <span class="chat-msg-sender">${msg.username}</span>
        <span class="chat-msg-time">${msg.timestamp}</span>
      </div>
      <div class="chat-msg-bubble">${escapeHTML(msg.message)}</div>
    </div>
    ${deleteBtnHtml}
  `;

  // Bind click event if delete button exists
  const deleteBtn = msgRow.querySelector('.delete-msg-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      socket.emit('delete-message', { messageId: msg.id });
    });
  }

  chatMessages.appendChild(msgRow);
  
  // GSAP bubble entry animation
  gsap.fromTo(msgRow, 
    { y: 15, opacity: 0, scale: 0.93 }, 
    { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.3)' }
  );

  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Apply "Delete after viewing" policy locally
  const currentPolicy = chatRetentionSelect.value;
  if (currentPolicy === 'view') {
    setTimeout(() => {
      gsap.to(msgRow, {
        opacity: 0,
        scale: 0.9,
        height: 0,
        padding: 0,
        marginTop: 0,
        marginBottom: 0,
        duration: 0.35,
        onComplete: () => msgRow.remove()
      });
    }, 8000); // self-destruct after 8 seconds
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ==========================================
// 5. Cozy Atmosphere Music Mixer (Lofi Radio)
// ==========================================

playTrackBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const soundType = btn.getAttribute('data-sound');
    const audioEl = document.getElementById(`audio-${soundType}`);
    const slider = document.querySelector(`.volume-slider[data-sound="${soundType}"]`);
    
    if (audioEl.paused) {
      // Play audio
      audioEl.volume = slider.value / 100;
      audioEl.play().then(() => {
        btn.classList.add('playing');
        btn.innerHTML = '<i class="fas fa-pause"></i>';
        slider.disabled = false;
      }).catch(err => {
        console.error("Playback error:", err);
        alert("Lofi tracks are streaming online. Interrupted, click play again!");
      });
    } else {
      // Pause audio
      audioEl.pause();
      btn.classList.remove('playing');
      btn.innerHTML = '<i class="fas fa-play"></i>';
      slider.disabled = true;
    }
  });
});

volumeSliders.forEach(slider => {
  slider.addEventListener('input', () => {
    const soundType = slider.getAttribute('data-sound');
    const audioEl = document.getElementById(`audio-${soundType}`);
    audioEl.volume = slider.value / 100;
  });
});

// ==========================================
// 6. Custom Music Player (YouTube & Spotify)
// ==========================================

loadEmbedBtn.addEventListener('click', () => {
  const url = musicEmbedInput.value.trim();
  if (!url) return;

  loadEmbed(url);
  musicEmbedInput.value = '';
});

function loadEmbed(url) {
  let embedHtml = '';
  mediaEmbedContainer.classList.remove('empty');

  // Match YouTube URLs
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = url.match(youtubeRegex);

  // Match Spotify URLs
  const spotifyRegex = /open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/;
  const spotMatch = url.match(spotifyRegex);

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    embedHtml = `
      <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen></iframe>
    `;
  } else if (spotMatch && spotMatch[1] && spotMatch[2]) {
    const type = spotMatch[1];
    const id = spotMatch[2];
    embedHtml = `
      <iframe src="https://open.spotify.com/embed/${type}/${id}" 
              width="100%" height="100%" frameBorder="0" allowtransparency="true" 
              allow="encrypted-media"></iframe>
    `;
  } else {
    // Generic fallback: Try using the input value as an iframe directly if it contains <iframe>
    if (url.toLowerCase().includes('<iframe')) {
      embedHtml = url;
    } else {
      mediaEmbedContainer.classList.add('empty');
      mediaEmbedContainer.innerHTML = `
        <div class="embed-placeholder">
          <i class="fas fa-exclamation-triangle"></i>
          <span style="color:var(--accent-danger)">Unsupported link format</span>
        </div>
      `;
      return;
    }
  }

  mediaEmbedContainer.innerHTML = embedHtml;
}

// ==========================================
// 7. Admin Authentication & Dashboard
// ==========================================

adminDashboardBtn.addEventListener('click', () => {
  openModal(adminModal);
  checkAdminAuthentication();
});

function checkAdminAuthentication() {
  if (adminToken && loggedAdminName) {
    // Already authenticated
    showAdminDashboardPanel();
  } else {
    // Show login view
    adminLoginView.classList.remove('hidden');
    adminDashboardView.classList.add('hidden');
    gsap.fromTo(adminLoginView, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
  }
}

submitAdminLoginBtn.addEventListener('click', () => {
  const username = adminUsernameInput.value.trim();
  const password = adminPasswordInput.value.trim();

  if (!username || !password) {
    showAdminLoginError("Username and password are required.");
    return;
  }

  socket.emit('admin-login', { username, password });
});

socket.on('admin-login-result', (data) => {
  if (data.success) {
    adminToken = data.token;
    loggedAdminName = adminUsernameInput.value.trim();
    localStorage.setItem('adminToken', adminToken);
    localStorage.setItem('loggedAdminName', loggedAdminName);

    adminUsernameInput.value = '';
    adminPasswordInput.value = '';
    adminLoginError.classList.add('hidden');

    showAdminDashboardPanel();
    renderAdminAdminsList(data.admins);
  } else {
    showAdminLoginError(data.message);
  }
});

function showAdminLoginError(msg) {
  adminLoginError.textContent = msg;
  adminLoginError.classList.remove('hidden');
}

function showAdminDashboardPanel() {
  adminLoginView.classList.add('hidden');
  adminDashboardView.classList.remove('hidden');
  gsap.fromTo(adminDashboardView, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
  loggedAdminNameEl.textContent = loggedAdminName;

  // Retrieve current active channels & online sockets for moderation
  // Trigger rendering of channels
  socket.emit('request-admin-sync');
}

// Admin Tab Switching
const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

adminTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    adminTabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

// Logout
adminLogoutBtn.addEventListener('click', () => {
  adminToken = null;
  loggedAdminName = null;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('loggedAdminName');
  adminDashboardView.classList.add('hidden');
  adminLoginView.classList.remove('hidden');
});

// ==========================================
// 8. Admin Control Operations
// ==========================================

// Create voice channel
createChannelBtn.addEventListener('click', () => {
  const chName = newChannelNameInput.value.trim();
  if (!chName) return;

  socket.emit('create-channel', { token: adminToken, name: chName });
  newChannelNameInput.value = '';
});

// Sync data for admin panel
socket.on('init-data', (data) => {
  if (adminToken) {
    renderAdminChannelsList(data.channels);
  }
});

// Trigger channels refresh in admin panel when updated
socket.on('channels-updated', (channels) => {
  if (adminToken) {
    renderAdminChannelsList(channels);
  }
});

function renderAdminChannelsList(channels) {
  adminChannelsList.innerHTML = '';
  if (channels.length === 0) {
    adminChannelsList.innerHTML = '<div class="loading-placeholder">No voice channels.</div>';
    return;
  }

  channels.forEach(ch => {
    const item = document.createElement('div');
    item.className = 'admin-list-item';
    item.innerHTML = `
      <span>${ch.name}</span>
      <button class="admin-delete-btn" data-channel-id="${ch.id}" title="Delete Channel">
        <i class="fas fa-trash-can"></i>
      </button>
    `;

    // Handle delete channel
    item.querySelector('.admin-delete-btn').addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete channel "${ch.name}"?`)) {
        socket.emit('delete-channel', { token: adminToken, channelId: ch.id });
      }
    });

    adminChannelsList.appendChild(item);
  });
}

// Add admin user
addAdminBtn.addEventListener('click', () => {
  const username = newAdminUsernameInput.value.trim();
  const password = newAdminPasswordInput.value.trim();

  if (!username || !password) {
    addAdminError.textContent = "All fields are required.";
    addAdminError.classList.remove('hidden');
    return;
  }

  socket.emit('add-admin', { token: adminToken, newUsername: username, newPassword: password });
});

socket.on('admin-action-result', (data) => {
  if (data.success) {
    newAdminUsernameInput.value = '';
    newAdminPasswordInput.value = '';
    addAdminError.classList.add('hidden');
    alert(data.message);
    if (data.admins) {
      renderAdminAdminsList(data.admins);
    }
  } else {
    addAdminError.textContent = data.message;
    addAdminError.classList.remove('hidden');
  }
});

function renderAdminAdminsList(adminUsernames) {
  adminUsersList.innerHTML = '';
  adminUsernames.forEach(username => {
    const item = document.createElement('div');
    item.className = 'admin-list-item';
    item.innerHTML = `
      <span><i class="fas fa-user-circle"></i> ${username}</span>
      ${username !== 'Shanto' ? `
        <button class="admin-delete-btn" data-username="${username}" title="Remove Admin">
          <i class="fas fa-user-minus"></i>
        </button>
      ` : `<span class="badge" style="background:#ffb86c;color:#000;">Owner</span>`}
    `;

    if (username !== 'Shanto') {
      item.querySelector('.admin-delete-btn').addEventListener('click', () => {
        if (confirm(`Remove admin privileges for "${username}"?`)) {
          socket.emit('delete-admin', { token: adminToken, usernameToDelete: username });
        }
      });
    }

    adminUsersList.appendChild(item);
  });
}

// Moderation / Online sockets listing
socket.on('online-users', (users) => {
  if (adminToken) {
    renderAdminModerationList();
  }
});

// Hook for synchronizing admin view data
socket.on('admin-sync-data', (data) => {
  // Handle sync response if any
});

function renderAdminModerationList() {
  adminModerationList.innerHTML = '';
  // Since we need to match user lists back to sockets, the online-users triggers this.
  // In our app.js, we don't have direct access to raw socket IDs of others unless they are exposed in online-users.
  // Let's modify the register-user event in server.js to map socket.id to userProfile.
  // Wait! In server.js we had:
  // socketToUser[socket.id] = { username, avatar, channelId, socketId: socket.id }
  // Let's check server.js. In server.js we wrote:
  // socketToUser[socket.id] = { username: userProfile.username || 'Anonymous', avatar: userProfile.avatar || '🍂', channelId: null };
  // Let's update server.js to include socketId: socket.id in socketToUser, OR we can read it. Let's make sure it's read.
  // Wait, in server.js we sent Object.values(socketToUser). If we didn't include socketId, how can we kick them?
  // Let's check server.js. In server.js we registered:
  // socketToUser[socket.id] = { username: ..., avatar: ..., channelId: null };
  // Wait, did we map the socketId? Let's check line:
  // "online-users", Object.values(socketToUser)
  // Let's review if socketToUser values contain the socketId.
  // Ah! It would be safer if server.js included the socketId in the object:
  // socketToUser[socket.id] = { socketId: socket.id, username: ..., avatar: ..., channelId: ... }
  // Let's check my write of server.js. Yes, we did:
  // socketToUser[socket.id] = { username: userProfile.username, avatar: userProfile.avatar, channelId: null }
  // Wait, that means the client receives the username and avatar but not the socketId!
  // To allow kicking, let's update server.js to include the socketId in register-user and send-online-users.
  // Wait, let's verify if we need to modify server.js. Yes, let's edit server.js using replace_file_content to add socketId to the user profile object!
  // But wait, let's finish app.js first. In app.js, we can write the code assuming the socketId is available on the user object.
  
  if (lastUsersList.length === 0) {
    adminModerationList.innerHTML = '<div class="loading-placeholder">No companions online.</div>';
    return;
  }

  lastUsersList.forEach(u => {
    // Don't show myself
    if (u.username === currentUser.username) return;

    const item = document.createElement('div');
    item.className = 'admin-list-item';
    item.innerHTML = `
      <div class="admin-list-item-moderation">
        <span>${u.avatar} <strong>${u.username}</strong></span>
        <span class="admin-list-item-moderation-sub">${u.channelId ? `Talking in channel` : 'Idle'}</span>
      </div>
      <button class="admin-kick-btn" data-socket-id="${u.socketId}">Kick</button>
    `;

    item.querySelector('.admin-kick-btn').addEventListener('click', () => {
      if (confirm(`Kick user "${u.username}" from the server?`)) {
        socket.emit('kick-user', { token: adminToken, targetSocketId: u.socketId });
      }
    });

    adminModerationList.appendChild(item);
  });
}

// Request admin data sync after authentication
socket.on('admin-login-result', (data) => {
  if (data.success) {
    // Admin list rendered
    renderAdminAdminsList(data.admins);
    renderAdminModerationList();
  }
});

// ==========================================
// 9. Startup & Initialization
// ==========================================
initUserProfile();
triggerPageLoadAnimations();
setupMicroAnimations();

// Initialize AI Floating Button state and events
const aiToggleBtn = document.getElementById('ai-toggle-btn');
if (isAiEnabled) {
  aiToggleBtn.classList.add('active');
}

aiToggleBtn.addEventListener('click', () => {
  isAiEnabled = !isAiEnabled;
  localStorage.setItem('isAiEnabled', isAiEnabled);
  
  if (isAiEnabled) {
    aiToggleBtn.classList.add('active');
  } else {
    aiToggleBtn.classList.remove('active');
  }
  
  // Cute GSAP bounce effect
  gsap.fromTo(aiToggleBtn, { scale: 0.8 }, { scale: isAiEnabled ? 1.05 : 1, duration: 0.3, ease: 'back.out(2)' });
});
