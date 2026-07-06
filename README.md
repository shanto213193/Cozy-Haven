# 🍃 Cozy Haven — Realtime Voice, Video, Chat & AI Companion

A premium, highly aesthetic, and relaxing lounge room web application where people can hang out, chat, make high-quality WebRTC audio/video calls, mix ambient lofi sounds, and speak with a friendly AI companion. 

---

## 🎨 Vibe Themes (Choose Your Aesthetic)
Cozy Haven features 5 unique themes designed to match your mood:
* ☕ **Espresso:** Classic dark mode with warm gold and wood-brown details.
* 🌧️ **Rainy Storm:** Cool slate grey and deep ocean blue with neon cyan highlights.
* 🌸 **Sakura:** A soft warm pink and white cherry blossom light theme.
* 🍃 **Forest Moss:** Organic dark forest greens with gold-green highlights.
* 🍊 **Sunset Peach:** A vibrant, soft peachy light theme with terracotta accents.

---

## ✨ Key Features

* **📹 WebRTC Video & Voice Rooms:** Stacked side-by-side `16:9` camera streams on the left sidebar. Connects instantly with browser WebRTC APIs, automatically falling back to audio-only if a webcam is missing.
* **🎙️ Audio & Video Controls:** Self-mute microphone and camera toggle buttons built right into the call status indicator.
* **🌸 Floating AI Companion (Rasa):** A bottom-left floating bot toggle. When active, Rasa responds to *every* chat message with warm, genuine, and friendly dialogue about tea, lofi beats, rainy days, books, or jokes.
* **💬 Realtime Lobby Chat:** A shared room chat featuring historic logs, bouncy GSAP speech bubbles, quick-picker emojis, and individual message deletion (trash icon for own messages). Includes local "Clear View" and auto-deletion policy settings (Stay Forever, Delete After Viewing, 24 Hours, 7 Days).
* **🎵 Local Sound board Mixer:** Play and blend 4 local loop streams (Rain, Campfire, Forest Whisper birdsong, and Lofi Beats) with individual volume sliders.
* **🛡️ Admin Control Panel:** Complete server control (add/remove channels, manage admin access, kick socket connections, clear all server chat history) using a secure login.
* **🔒 100% Privacy:** User profiles, avatar selections, and settings are saved strictly in `localStorage` in the browser. No tracking or database logins required for guests.
* **🍃 Footer Lock:** A permanent footer at the bottom noting "Developed by Shanto" that is locked against modifications.

---

## 🛠️ Tech Stack
* **Frontend:** Vanilla HTML5, CSS3 Variables, Javascript (ES6), GSAP (GreenSock Animation Platform)
* **Backend:** Node.js, Express, Socket.io (WebSockets)
* **Realtime Media:** Native browser WebRTC APIs (P2P mesh connection with Socket.io signaling)
* **Assets:** Local MP3 sound loops (Noctune & Soundhelix)

---

## 🚀 Local Installation

Make sure you have [Node.js](https://nodejs.org) installed on your system.

1. Clone or download this project folder.
2. Open your terminal in the directory and install the dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm start
   ```
4. Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🔑 Admin Credentials
Access the administrator dashboard via the **Admin** button in the top right:
* **Username:** `Shanto`
* **Password:** `ShantolovesRasa`

---

## 🌐 Free Cloud Deployment (Render.com)

1. Create a blank repository on your GitHub account and push this directory to it.
2. Go to [Render.com](https://render.com) and log in with GitHub.
3. Create a new **Web Service** and connect your repository.
4. Set the following configurations:
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
5. Select the **Free Tier** and deploy! 
