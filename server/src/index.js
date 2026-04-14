require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const initDatabase = require('./config/initDb');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const messagesRoutes = require('./routes/messages');
const groupsRoutes = require('./routes/groups');
const { setupSocket } = require('./socket/socketHandler');

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
app.use(express.json());

// Swagger UI — available at /api/docs
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

// Swagger JSON spec endpoint
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/groups', groupsRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Check server health status
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
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
