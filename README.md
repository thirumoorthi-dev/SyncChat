<div align="center">

# 💬 SyncChat

### A Premium WhatsApp-inspired Real-Time Chat Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![PWA](https://img.shields.io/badge/PWA-Ready-FF69B4?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Active-blueviolet?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)

**SyncChat** is a state-of-the-art, full-stack messaging platform. It delivers a premium communication experience with real-time text, voice/video calls, push notifications, and PWA support, all wrapped in a sleek, responsive interface.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [API Reference](#-api-reference) • [Socket Events](#-real-time-socket-events) • [Project Structure](#-project-structure)

</div>

---

## ✨ Features

### 📞 Advanced Communication
- **WebRTC 1-to-1 Calls**: High-quality Peer-to-Peer voice and video calls with a premium full-screen interface.
- **Push Notifications**: Receive real-time alerts even when the app is closed, powered by Web-Push and VAPID.
- **PWA Support**: Install SyncChat on your mobile or desktop as a native app with offline capabilities.

### 💬 Messaging Excellence
- **Real-time Messaging**: Instant delivery via Socket.io with typing indicators and online presence.
- **Delivery Receipts**: Detailed message statuses — **Sent** (single tick), **Delivered** (double tick), and **Read** (blue double tick).
- **Message Reactions**: Express yourself by adding emoji reactions to any message.
- **Search & Discovery**: Powerful real-time message search with "jump-to-message" and temporary highlighting.
- **Forwarding**: Easily share text and media messages with multiple recipients simultaneously.

### 🖼️ Media & UI
- **Media Preview Lightbox**: Premium full-screen preview for images and videos with zoom and download options.
- **Smart Attachment Menu**: WhatsApp-style menu for quick sharing of Photos, Videos, and Documents.
- **Contact Info Panel**: Slide-in panel for user profiles, group details, and a dedicated **Shared Media Gallery**.
- **Dark / Light Mode**: Fully optimized theme support for any environment.
- **Responsive Design**: Tailored experience for both desktop and mobile devices.

### 👥 User Experience & Security
- **User Authentication**: Secure sign-up & login with JWT tokens and bcrypt hashing.
- **Online/Offline Status**: Real-time presence tracking.
- **Typing Indicators**: Visual feedback when someone is composing a message.
- **Block & Archive**: Advanced privacy controls to block users or archive chats.

---

## 🛠 Tech Stack

### Frontend (Client)
| Technology | Purpose |
|---|---|
| **React 18** | Core UI Library |
| **Vite** | Modern build tool and development server |
| **Redux Toolkit** | Centralized state management |
| **Vite PWA** | Service worker and manifest management |
| **WebRTC API** | Direct Peer-to-Peer streaming |
| **Socket.io Client** | Real-time event handling |
| **TailwindCSS** | Utility-first responsive styling |
| **Emoji Mart** | High-quality emoji picker |
| **React Toastify** | Elegant notification popups |

### Backend (Server)
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API and WebSocket host |
| **Socket.io** | Real-time bidirectional event engine |
| **PostgreSQL** | Reliable relational database |
| **Web-Push** | VAPID-based push notification delivery |
| **JWT (jsonwebtoken)** | Stateless user authentication |
| **Bcryptjs** | Secure password hashing |
| **pg (node-postgres)** | Non-blocking PostgreSQL client |

---

## 📁 Project Structure

```
SyncChat/
├── client/                     # React Frontend (Vite)
│   ├── public/                 # Icons, PWA manifest, and static assets
│   ├── src/
│   │   ├── app/                # Redux store and global services
│   │   ├── context/            # Auth and Socket context providers
│   │   ├── modules/
│   │   │   ├── chat/           # Chat logic, components (CallModal, Lightbox)
│   │   │   └── auth/           # Login, Register, and Profile logic
│   │   ├── shared/             # Reusable UI elements (Avatar, etc.)
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # Helper functions
├── server/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── config/             # DB connection and schema
│   │   ├── middleware/         # Auth guards and validation
│   │   ├── models/             # Database access layer
│   │   ├── routes/             # REST API endpoints (Messages, Groups, Notifications)
│   │   ├── socket/             # Signalling and messaging handlers
│   │   └── utils/              # Push notifications and error loggers
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **PostgreSQL** v13 or higher
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Thiru2115/SyncChat.git
cd SyncChat
```

### 2. Setup the Database
Create a new database named `chatapp` in PostgreSQL. The application will handle table creation automatically on the first start.
```sql
CREATE DATABASE chatapp;
```

### 3. Server Configuration
```bash
cd server
cp .env.example .env
```
Update `.env` with your credentials:
```env
PORT=8000
DATABASE_URL=postgresql://postgres:password@localhost:5432/chatapp
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
VAPID_PUBLIC_KEY=your_key
VAPID_PRIVATE_KEY=your_key
VAPID_EMAIL=mailto:admin@syncchat.com
```

### 4. Run the Application
```bash
# In /server
npm install
npm run dev

# In /client (new terminal)
npm install
npm run dev
```
Open **http://localhost:5173** and start chatting!

---

## 📡 API Reference

### 🔐 Authentication `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Create a new user account |
| `POST` | `/login` | Authenticate and receive JWT |

### 👤 User Management `/api/users`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/me` | Get current user profile |
| `PUT` | `/profile` | Update profile details (Name, About, etc.) |
| `GET` | `/search` | Search for users by username or email |
| `GET` | `/conversations` | Get user's conversation list with unread counts |

### 💬 Messaging `/api/messages`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/:userId` | Get 1-on-1 message history |
| `POST` | `/` | Send a direct message |
| `GET` | `/search` | Search message history globally |
| `GET` | `/media/:id` | Get all shared media items for a chat |

### 👥 Group Management `/api/groups`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Get all groups user belongs to |
| `POST` | `/` | Create a new group |
| `GET` | `/:id/messages` | Get group message history |

### 🛡️ System & Management `/api/management`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/block` | Block a specific user |
| `DELETE` | `/archive` | Unarchive a conversation |
| `POST` | `/notifications/subscribe` | Register for Web Push notifications |

---

## ⚡ Real-Time Socket Events

SyncChat leverages Socket.io for all bidirectional events, including the WebRTC signalling process.

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `{ userId }` | Connect user to their personal room |
| `send_message` | `{ to, message, type }` | Dispatch a text or media message |
| `typing_start` | `{ to, groupId? }` | User started typing |
| `call_user` | `{ to, offer, type }` | Initiate a WebRTC call |
| `answer_call` | `{ to, answer }` | Respond to a WebRTC call |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `receive_message`| `{ message }` | Incoming real-time message |
| `user_online` | `{ userId }` | Contact has come online |
| `call_received` | `{ from, offer, type }` | Incoming voice/video call |
| `messages_read` | `{ byUserId }` | Contact has read your messages |

---

## 🎯 Key Features In-Depth

### Real-Time Architecture
The platform uses a unified Express and Socket.io instance to ensure data consistency. Every message is simultaneously persisted to PostgreSQL and broadcast to the relevant user rooms, ensuring no data loss even during network fluctuations.

### WebRTC Signalling
SyncChat implements a custom signalling protocol over WebSockets. It manages the exchange of ICE candidates and Session Descriptions (SDP) to establish secure, low-latency Peer-to-Peer media streams.

### Push Notification Logic
When a user is offline, the server triggers a `web-push` notification using the VAPID protocol. This ensures that users are notified of new messages even when the PWA is closed or running in the background.

---

## 🚀 Available Scripts

### Server (`/server`)
- `npm run dev`: Start with `tsx watch` for auto-reloading.
- `npm start`: Launch the production server.

### Client (`/client`)
- `npm run dev`: Launch Vite development server.
- `npm run build`: Generate the production PWA bundle.
- `npm run preview`: Test the production build locally.

---

## 🤝 Contributing
Contributions are always welcome! Please fork the repository and use a feature branch.

---

## 📄 License
This project is licensed under the **MIT License**.

---

## 👨‍💻 Author
**Thiru** — [@Thiru2115](https://github.com/Thiru2115)

---

<div align="center">

**⭐ If you found this project helpful, please give it a star! ⭐**

Made with ❤️ using React, Node.js, PostgreSQL & WebRTC

</div>
