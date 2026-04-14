const swaggerJsdoc = require('swagger-jsdoc');

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
          description: 'JWT token obtained from /api/auth/login or /api/auth/register',
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
            description: { type: 'string', example: 'Development team group', nullable: true },
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
      { name: 'Auth', description: 'Authentication — register, login, profile' },
      { name: 'Users', description: 'User management — search, conversations' },
      { name: 'Messages', description: 'Direct messaging between users' },
      { name: 'Groups', description: 'Group chat management and messaging' },
      { name: 'Health', description: 'Server health check' },
    ],
    paths: {
      // ── AUTH ──────────────────────────────────────────────────
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'email', 'password'],
                  properties: {
                    username: { type: 'string', minLength: 3, example: 'thiru' },
                    email: { type: 'string', format: 'email', example: 'thiru@example.com' },
                    password: { type: 'string', minLength: 6, example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'User registered successfully',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
            },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Email or username already taken', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'thiru@example.com' },
                    password: { type: 'string', example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
            },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current authenticated user',
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: 'Current user profile',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
            },
            401: { description: 'No token provided' },
            403: { description: 'Invalid or expired token' },
          },
        },
      },

      // ── USERS ─────────────────────────────────────────────────
      '/api/users': {
        get: {
          tags: ['Users'],
          summary: 'Get all users (excluding self)',
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: 'List of users',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } },
            },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/users/search': {
        get: {
          tags: ['Users'],
          summary: 'Search users by username or email',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: 'query',
              name: 'q',
              required: true,
              schema: { type: 'string' },
              description: 'Search query (username or email)',
              example: 'alice',
            },
          ],
          responses: {
            200: {
              description: 'Matched users',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } },
            },
          },
        },
      },
      '/api/users/conversations': {
        get: {
          tags: ['Users'],
          summary: 'Get all direct conversations for logged-in user',
          description: 'Returns conversations sorted by most recent message, with unread counts.',
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: 'List of conversations',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Conversation' } } } },
            },
          },
        },
      },

      // ── MESSAGES ──────────────────────────────────────────────
      '/api/messages/direct/{userId}': {
        get: {
          tags: ['Messages'],
          summary: 'Get direct message history with a user',
          description: 'Fetches messages and automatically marks them as read.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'userId', required: true, schema: { type: 'integer' }, description: 'The other user\'s ID' },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
            { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            200: {
              description: 'Array of messages (chronological order)',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } },
            },
          },
        },
        post: {
          tags: ['Messages'],
          summary: 'Send a direct message (REST fallback)',
          description: 'Prefer sending via Socket.io `send_message` event for real-time delivery.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'userId', required: true, schema: { type: 'integer' }, description: 'Recipient user ID' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    content: { type: 'string', example: 'Hello!' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Message sent',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } },
            },
            400: { description: 'Content is required' },
          },
        },
      },

      // ── GROUPS ────────────────────────────────────────────────
      '/api/groups': {
        post: {
          tags: ['Groups'],
          summary: 'Create a new group',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', example: 'Dev Team' },
                    description: { type: 'string', example: 'Our dev group', nullable: true },
                    memberIds: { type: 'array', items: { type: 'integer' }, example: [2, 3, 4] },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Group created with members',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Group' } } },
            },
            400: { description: 'Group name is required' },
          },
        },
        get: {
          tags: ['Groups'],
          summary: 'Get all groups the logged-in user belongs to',
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: 'List of groups with unread counts',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Group' } } } },
            },
          },
        },
      },
      '/api/groups/{groupId}/messages': {
        get: {
          tags: ['Groups'],
          summary: 'Get group message history',
          description: 'Fetches messages and marks them as read for the authenticated user.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'groupId', required: true, schema: { type: 'integer' } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
            { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            200: {
              description: 'Array of group messages in chronological order',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } },
            },
            403: { description: 'Not a member of this group' },
          },
        },
      },
      '/api/groups/{groupId}/read': {
        post: {
          tags: ['Groups'],
          summary: 'Mark all group messages as read',
          description: 'Inserts read receipts for all unread messages in the group for the current user.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'groupId', required: true, schema: { type: 'integer' } },
          ],
          responses: {
            200: { description: 'Messages marked as read', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
            403: { description: 'Not a member of this group' },
          },
        },
      },
      '/api/groups/{groupId}': {
        get: {
          tags: ['Groups'],
          summary: 'Get group info with members list',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'groupId', required: true, schema: { type: 'integer' } },
          ],
          responses: {
            200: {
              description: 'Group details including members array',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Group' } } },
            },
            404: { description: 'Group not found' },
          },
        },
      },
      '/api/groups/{groupId}/members': {
        post: {
          tags: ['Groups'],
          summary: 'Add a member to the group (admin only)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'groupId', required: true, schema: { type: 'integer' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId'],
                  properties: {
                    userId: { type: 'integer', example: 5 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Member added successfully' },
            403: { description: 'Only admins can add members' },
          },
        },
      },

      // ── HEALTH ────────────────────────────────────────────────
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Server health check',
          responses: {
            200: {
              description: 'Server is running',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
