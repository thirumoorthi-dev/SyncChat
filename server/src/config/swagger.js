const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger / OpenAPI configuration.
 *
 * HOW TO ADD A NEW ROUTE TO SWAGGER:
 * ------------------------------------
 * Just add a JSDoc block with @swagger above your route handler in ANY file
 * under server/src/routes/*.js — it will be auto-detected here.
 *
 * Example:
 *
 *   /**
 *    * @swagger
 *    * /api/example:
 *    *   get:
 *    *     tags: [Example]
 *    *     summary: My new route
 *    *     security:
 *    *       - BearerAuth: []
 *    *     responses:
 *    *       200:
 *    *         description: Success
 *    *\/
 *   router.get('/example', authenticateToken, async (req, res) => { ... });
 *
 * No changes to this file needed. swagger-jsdoc scans all route files automatically.
 */

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SyncChat API',
      version: '1.0.0',
      description: `
## SyncChat REST API

A WhatsApp-inspired real-time chat application API.

### Authentication
Most endpoints require a **Bearer token** in the Authorization header.
Obtain the token by calling \`POST /api/auth/login\` or \`POST /api/auth/register\`.

\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

### Adding New Routes to Swagger
Simply add a **\`@swagger\`** JSDoc comment above your route handler in any route file.
swagger-jsdoc auto-scans \`src/routes/*.js\` — no changes to this file needed.

### Real-Time Events
In addition to REST endpoints, SyncChat uses **Socket.io** for real-time messaging.
Connect at \`ws://localhost:8000\` with \`{ auth: { token } }\`.
      `,
      contact: {
        name: 'Thiru',
        url: 'https://github.com/Thiru2115/SyncChat',
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from /api/auth/login or /api/auth/register',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'thiru' },
            email: { type: 'string', example: 'thiru@example.com' },
            display_name: { type: 'string', example: 'Thiru', nullable: true },
            avatar_color: { type: 'string', example: '#25D366' },
            about: { type: 'string', example: 'Hey there! I am using ChatApp' },
            is_online: { type: 'boolean', example: true },
            last_seen: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 42 },
            sender_id: { type: 'integer', example: 1 },
            receiver_id: { type: 'integer', example: 2, nullable: true },
            group_id: { type: 'integer', example: null, nullable: true },
            content: { type: 'string', example: 'Hello there!' },
            is_read: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
            sender_username: { type: 'string', example: 'thiru' },
            sender_avatar_color: { type: 'string', example: '#25D366' },
          },
        },
        Group: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 5 },
            name: { type: 'string', example: 'Dev Team' },
            description: { type: 'string', example: 'Dev group', nullable: true },
            created_by: { type: 'integer', example: 1 },
            avatar_color: { type: 'string', example: '#128C7E' },
            member_count: { type: 'string', example: '4' },
            last_message: { type: 'string', example: 'Meeting at 5pm', nullable: true },
            last_message_time: { type: 'string', format: 'date-time', nullable: true },
            unread_count: { type: 'string', example: '3' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 2 },
            username: { type: 'string', example: 'alice' },
            avatar_color: { type: 'string', example: '#FF6B6B' },
            is_online: { type: 'boolean', example: false },
            last_seen: { type: 'string', format: 'date-time' },
            last_message: { type: 'string', example: 'See you tomorrow!' },
            last_message_time: { type: 'string', format: 'date-time' },
            unread_count: { type: 'string', example: '2' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Error description' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Register, login, and get current user' },
      { name: 'Users', description: 'User search and conversation list' },
      { name: 'Messages', description: 'Direct messaging between users' },
      { name: 'Groups', description: 'Group chat management and messaging' },
      { name: 'Health', description: 'Server health check' },
    ],
  },

  // ✅ AUTO-SCAN: swagger-jsdoc reads @swagger JSDoc comments from all route files.
  // Add @swagger annotations to any new route file and it's instantly included.
  apis: [
    './src/routes/*.js',   // picks up auth.js, users.js, messages.js, groups.js
    './src/index.js',      // picks up /api/health
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
