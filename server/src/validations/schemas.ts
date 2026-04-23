import * as yup from 'yup';

// Shared UUID schema
const uuidSchema = yup.string().uuid('Invalid ID format');

export const authSchemas = {
  register: yup.object({
    username: yup.string().required('Username is required').min(3, 'Username must be at least 3 characters'),
    email: yup.string().email('Invalid email format').required('Email is required'),
    password: yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
  }),
  login: yup.object({
    email: yup.string().email('Invalid email format').required('Email is required'),
    password: yup.string().required('Password is required'),
  }),
};

export const userSchemas = {
  updateProfile: yup.object({
    display_name: yup.string().max(50, 'Display name too long'),
    avatar_url: yup.string().url('Invalid URL format'),
    about: yup.string().max(200, 'About section too long'),
    phone_number: yup.string(),
    avatar_color: yup.string().matches(/^#[0-9a-fA-F]{6}$/, 'Invalid color format'),
  }),
  search: yup.object({
    q: yup.string().required('Search query is required').min(1),
  }),
};

export const messageSchemas = {
  sendDirect: yup.object({
    content: yup.string().when('media', {
      is: (media: any) => !media || Object.keys(media).length === 0,
      then: (schema) => schema.required('Message content or media is required'),
    }),
    media: yup.object().optional(),
    repliedToId: uuidSchema.optional().nullable(),
  }),
  pagination: yup.object({
    limit: yup.number().integer().positive().max(100).default(50),
    beforeId: uuidSchema.optional().nullable(),
  }),
  idParam: yup.object({
    userId: uuidSchema.required('Valid User ID required'),
  }),
};

export const groupSchemas = {
  create: yup.object({
    name: yup.string().required('Group name is required').min(1).max(50),
    description: yup.string().max(200),
    memberIds: yup.array().of(uuidSchema),
  }),
  addMember: yup.object({
    userId: uuidSchema.required('User ID is required to add them to a group'),
  }),
  groupIdParam: yup.object({
    groupId: uuidSchema.required('Valid Group ID required'),
  }),
};

export const managementSchemas = {
  archive: yup.object({
    targetUserId: uuidSchema.optional().nullable(),
    groupId: uuidSchema.optional().nullable(),
  }).test('one-of', 'Either targetUserId or groupId must be provided', (val) => !!val.targetUserId || !!val.groupId),
  block: yup.object({
    userId: uuidSchema.required('User ID to block/unblock is required'),
  }),
};

export const contactSchemas = {
  add: yup.object({
    contactId: uuidSchema.required('Contact user ID is required'),
  }),
  remove: yup.object({
    contactId: uuidSchema.required('Contact user ID is required'),
  }),
  findByEmail: yup.object({
    email: yup.string().email('Invalid email format').required('Email is required'),
  }),
};
