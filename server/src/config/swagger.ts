import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
swagger-jsdoc auto-scans \`src/routes/*.ts\` — no changes to this file needed.

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
      {
        url: 'http://192.168.1.35:8000',
        description: 'Local Network Server (Mobile Testing)',
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
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
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
            id: { type: 'string', format: 'uuid', example: '7e5568d6-4e56-42bb-85e3-4660ebde2490' },
            sender_id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            receiver_id: { type: 'string', format: 'uuid', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', nullable: true },
            group_id: { type: 'string', format: 'uuid', example: null, nullable: true },
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
            id: { type: 'string', format: 'uuid', example: 'c9bf9e57-1685-4c89-bafb-6d60ea8d2402' },
            name: { type: 'string', example: 'Dev Team' },
            description: { type: 'string', example: 'Dev group', nullable: true },
            created_by: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
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
            id: { type: 'string', format: 'uuid', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
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
      { name: 'Management', description: 'User blocking and chat archiving' },
      { name: 'Health', description: 'Server health check' },
    ],
  },
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../index.ts'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
