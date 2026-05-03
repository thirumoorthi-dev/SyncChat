import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import initDatabase from './config/initDb.js';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import messagesRoutes from './routes/messages.js';
import groupsRoutes from './routes/groups.js';
import uploadRoutes from './routes/upload.js';
import managementRoutes from './routes/management.js';
import contactsRoutes from './routes/contacts.js';
import notificationRoutes from './routes/notifications.js';
import { setupSocket } from './socket/socketHandler.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// [Debug] Request Logger for production troubleshooting
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Local uploads are now served via Azure Blob Storage

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'SyncChat API Docs',
  customCss: `
    .swagger-ui .topbar { background: linear-gradient(135deg, #128C7E, #25D366); }
    .swagger-ui .topbar-wrapper img { display: none; }
    .swagger-ui .topbar-wrapper::before {
      content: '💬 SyncChat API';
      color: white;
      font-size: 20px;
      font-weight: bold;
      font-family: Inter, sans-serif;
    }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
    displayRequestDuration: true,
  },
}));

app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Socket.io
setupSocket(io);

const PORT = process.env.PORT || 8000;

async function start() {
  await initDatabase();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket ready on port ${PORT}`);
    console.log(`Swagger API docs: http://localhost:${PORT}/api/docs`);
  });
}

start();
