<div align="center">

# 💬 SyncChat

### A WhatsApp-inspired Real-Time Chat Application

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**SyncChat** is a full-stack, real-time messaging application built with modern web technologies. It features instant messaging, group chats, online presence indicators, typing indicators, and a polished WhatsApp-like experience.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [API Reference](#-api-reference) • [Project Structure](#-project-structure)

</div>

---

## ✨ Features

### 💬 Messaging
- **Real-time messaging** via WebSocket (Socket.io) — no page refresh needed
- **Direct (1-on-1) chats** between users
- **Group chats** — create groups, add members, and chat together
- **Message read receipts** — know when your message has been seen
- **Unread message count** displayed per conversation

### 👥 User Experience
- **User authentication** — secure sign-up & login with JWT tokens
- **Online/Offline status** — see who's currently active
- **Typing indicators** — live "User is typing..." animation
- **User search** — find other users by username or email
- **User profiles** — display name, avatar color, about section, phone number

### 🎨 UI / Design
- **WhatsApp-inspired layout** — sidebar with conversation list + main chat window
- **Dark / Light mode toggle**
- **Color-coded avatars** — unique per user with initials
- **Responsive & modern** design using TailwindCSS
- **Smooth animations** and hover effects

### 🔒 Security
- **Password hashing** with bcryptjs
- **JWT-based authentication** with protected routes
- **CORS configured** for client-server communication

---

## 🛠 Tech Stack

### Frontend (Client)
| Technology | Purpose |
|---|---|
| **React 18** | UI Framework |
| **Vite** | Build tool & dev server |
| **React Router v6** | Client-side routing |
| **Socket.io Client** | Real-time WebSocket communication |
| **Axios** | HTTP API requests |
| **TailwindCSS** | Utility-first CSS styling |
| **date-fns** | Date formatting |

### Backend (Server)
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **Socket.io** | WebSocket server for real-time events |
| **PostgreSQL** | Relational database |
| **pg (node-postgres)** | PostgreSQL client |
| **JWT (jsonwebtoken)** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **dotenv** | Environment variable management |
| **nodemon** | Auto-restart during development |

---

## 📁 Project Structure

```
SyncChat/
├── client/                     # React Frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar.jsx          # User avatar with color initials
│   │   │   ├── ChatWindow.jsx      # Main chat message area
│   │   │   ├── ConversationItem.jsx# Single conversation in sidebar list
│   │   │   ├── MessageBubble.jsx   # Individual message bubble
│   │   │   ├── NewChatModal.jsx    # Modal to start new chat / create group
│   │   │   ├── Sidebar.jsx         # Left panel with conversations list
│   │   │   ├── ThemeToggle.jsx     # Dark/Light mode toggle button
│   │   │   └── TypingIndicator.jsx # Animated typing dots
│   │   ├── context/
│   │   │   └── (auth & socket context)
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx        # Main authenticated chat screen
│   │   │   └── Login.jsx           # Login / Register page
│   │   ├── utils/                  # Helper utilities
│   │   ├── App.jsx                 # Root app with routing
│   │   ├── main.jsx                # React entry point
│   │   └── index.css               # Global styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               # PostgreSQL connection pool
│   │   │   └── initDb.js           # Auto DB schema initialization
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT authentication middleware
│   │   ├── models/
│   │   │   ├── user.model.js       # User DB queries (CRUD + conversations)
│   │   │   ├── message.model.js    # Message DB queries
│   │   │   └── group.model.js      # Group DB queries
│   │   ├── routes/
│   │   │   ├── auth.js             # POST /api/auth/* (login, register)
│   │   │   ├── users.js            # GET /api/users/* (profile, search)
│   │   │   ├── messages.js         # GET/POST /api/messages/*
│   │   │   └── groups.js           # GET/POST /api/groups/*
│   │   ├── socket/
│   │   │   └── socketHandler.js    # Socket.io event handlers
│   │   └── index.js                # Express app entry point
│   ├── .env.example                # Environment variable template
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed:
- **Node.js** v18 or higher → [Download](https://nodejs.org)
- **PostgreSQL** v13 or higher → [Download](https://www.postgresql.org/download)
- **Git** → [Download](https://git-scm.com)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Thiru2115/SyncChat.git
cd SyncChat
```

---

### 2. Setup the Database

Open **pgAdmin** or **psql** and create a new database:

```sql
CREATE DATABASE chatapp;
```

> The server will auto-create all required tables on first start via `initDb.js`.

---

### 3. Configure the Server

```bash
cd server
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
PORT=8000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/chatapp
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
CLIENT_URL=http://localhost:5173
```

> 💡 Set `JWT_SECRET` to a long, random string. You can generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

### 4. Install & Run the Server

```bash
# In the /server directory
npm install
npm run dev
```

Server starts at: **http://localhost:8000**

---

### 5. Install & Run the Client

Open a **new terminal**:

```bash
cd client
npm install
npm run dev
```

Client starts at: **http://localhost:5173**

---

### 6. Open the App

Go to **http://localhost:5173** in your browser.
- **Register** a new account
- Open another tab / browser → register a second user
- Start chatting in real-time! 🎉

---

## 📡 API Reference

### Auth Routes `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and get JWT token |

### User Routes `/api/users` *(Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/me` | Get current user profile |
| `PUT` | `/api/users/profile` | Update profile (name, avatar, about, phone) |
| `GET` | `/api/users/search?q=query` | Search users by username/email |
| `GET` | `/api/users/conversations` | Get all conversations with last message + unread count |
| `GET` | `/api/users/:id/profile` | Get another user's public profile |

### Message Routes `/api/messages` *(Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/messages/:userId` | Get direct message history with a user |
| `POST` | `/api/messages` | Send a direct message |

### Group Routes `/api/groups` *(Protected)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/groups` | Get all groups the user belongs to |
| `POST` | `/api/groups` | Create a new group |
| `GET` | `/api/groups/:id/messages` | Get group message history |
| `POST` | `/api/groups/:id/messages` | Send a message to a group |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Check server status |

---

## ⚡ Real-Time Socket Events

SyncChat uses **Socket.io** for all real-time communication.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `{ userId }` | Register user's socket connection |
| `send_message` | `{ toUserId, message, groupId? }` | Send a real-time message |
| `typing` | `{ toUserId, groupId? }` | Emit typing started |
| `stop_typing` | `{ toUserId, groupId? }` | Emit typing stopped |
| `mark_read` | `{ fromUserId }` | Mark messages as read |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `receive_message` | `{ message }` | Incoming new message |
| `user_online` | `{ userId }` | A user came online |
| `user_offline` | `{ userId }` | A user went offline |
| `typing` | `{ fromUserId }` | Someone started typing |
| `stop_typing` | `{ fromUserId }` | Someone stopped typing |
| `messages_read` | `{ byUserId }` | Messages marked as read |

---

## 🎯 Key Features In-Depth

### Real-Time Architecture
- The Express server and Socket.io share the **same HTTP server instance**
- Each authenticated user joins a **personal socket room** on connection
- Messages are delivered instantly via socket events, and also persisted to PostgreSQL

### Conversation List
- Fetches all users the logged-in user has exchanged messages with
- Shows **last message preview** and **timestamp**
- Shows **unread count badge** for each conversation

### Group Chat
- Create groups with a name and selected members
- All group messages are broadcast to every member's socket room
- Group conversations appear in the same sidebar alongside direct chats

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8000` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Secret key for signing JWT tokens | — |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |

---

## 🚀 Available Scripts

### Server (`/server`)

```bash
npm run dev      # Start with nodemon (auto-restart on changes)
npm start        # Start production server
```

### Client (`/client`)

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # Build production bundle
npm run preview  # Preview production build locally
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. 🍴 Fork the repository
2. 🌿 Create a feature branch: `git checkout -b feature/your-feature`
3. 💾 Commit your changes: `git commit -m "feat: add your feature"`
4. 📤 Push to the branch: `git push origin feature/your-feature`
5. 🔁 Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Thiru** — [@Thiru2115](https://github.com/Thiru2115)

---

<div align="center">

**⭐ If you found this project helpful, please give it a star! ⭐**

Made with ❤️ using React, Node.js, PostgreSQL & Socket.io

</div>
