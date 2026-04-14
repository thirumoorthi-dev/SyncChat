-- =============================================================
--  WhatsApp Clone – Enhanced Database Schema
--  Portfolio-grade PostgreSQL design
--  Author  : Thirumoorthi S
--  Version : 2.0  (Day-1 Enhancement)
-- =============================================================

-- ── ENUM Types ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE message_type_enum AS ENUM (
    'text', 'image', 'video', 'audio', 'file', 'location', 'sticker'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_role_enum AS ENUM ('member', 'admin', 'owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reaction_type_enum AS ENUM ('👍','❤️','😂','😮','😢','🙏');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Users ─────────────────────────────────────────────────────
-- Stores user accounts, profile data, and preferences.
CREATE TABLE IF NOT EXISTS users (
  id                   SERIAL PRIMARY KEY,

  -- Identity
  username             VARCHAR(50)  UNIQUE NOT NULL CHECK (length(username) >= 3),
  email                VARCHAR(100) UNIQUE NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,

  -- Profile
  display_name         VARCHAR(100),                        -- optional friendly name
  avatar_color         VARCHAR(7)   DEFAULT '#25D366',      -- hex color for letter avatar
  avatar_url           TEXT,                                -- future: uploaded profile picture
  about                VARCHAR(139) DEFAULT 'Hey there! I am using ChatApp',
  phone_number         VARCHAR(20),                         -- optional E.164 format

  -- Presence
  is_online            BOOLEAN      DEFAULT FALSE,
  last_seen            TIMESTAMP    DEFAULT NOW(),

  -- Preferences (stored as JSONB for extensibility)
  -- Example: { "theme": "dark", "notifications": true, "enterToSend": true }
  preferences          JSONB        DEFAULT '{"theme":"light","notifications":true,"enterToSend":true}'::jsonb,

  -- Timestamps
  created_at           TIMESTAMP    DEFAULT NOW(),
  updated_at           TIMESTAMP    DEFAULT NOW()
);

-- Auto-update updated_at on users
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Groups ────────────────────────────────────────────────────
-- Chat groups; can be created by any authenticated user.
CREATE TABLE IF NOT EXISTS groups (
  id                   SERIAL PRIMARY KEY,

  name                 VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
  description          TEXT,
  created_by           INTEGER      REFERENCES users(id) ON DELETE SET NULL,

  -- Visual
  avatar_color         VARCHAR(7)   DEFAULT '#128C7E',
  avatar_url           TEXT,

  -- Settings stored as JSONB
  -- Example: { "maxMembers": 256, "onlyAdminsCanMessage": false }
  settings             JSONB        DEFAULT '{"maxMembers":256,"onlyAdminsCanMessage":false}'::jsonb,

  -- Invite link (nullable until generated)
  invite_link          VARCHAR(64)  UNIQUE,
  invite_link_expires  TIMESTAMP,

  -- Timestamps
  created_at           TIMESTAMP    DEFAULT NOW(),
  updated_at           TIMESTAMP    DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_groups_updated_at ON groups;
CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Group Members ─────────────────────────────────────────────
-- Membership table with role, mute, and nickname support.
CREATE TABLE IF NOT EXISTS group_members (
  id                   SERIAL PRIMARY KEY,
  group_id             INTEGER      NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id              INTEGER      NOT NULL REFERENCES users(id)  ON DELETE CASCADE,

  role                 member_role_enum DEFAULT 'member',  -- member | admin | owner
  nickname             VARCHAR(60),                        -- group-specific display name
  is_admin             BOOLEAN      DEFAULT FALSE,         -- kept for backwards compat
  muted_until          TIMESTAMP,                          -- NULL = not muted

  joined_at            TIMESTAMP    DEFAULT NOW(),

  UNIQUE (group_id, user_id)
);

-- ── Messages ─────────────────────────────────────────────────
-- Unified table for direct and group messages.
CREATE TABLE IF NOT EXISTS messages (
  id                   SERIAL PRIMARY KEY,

  -- Participants
  sender_id            INTEGER      REFERENCES users(id)  ON DELETE SET NULL,
  receiver_id          INTEGER      REFERENCES users(id)  ON DELETE CASCADE,   -- NULL for group msg
  group_id             INTEGER      REFERENCES groups(id) ON DELETE CASCADE,   -- NULL for direct msg

  -- Content
  content              TEXT,                                                   -- NULL for media-only
  message_type         message_type_enum DEFAULT 'text',

  -- Media (applicable when message_type != 'text')
  media_url            TEXT,
  media_mime_type      VARCHAR(80),
  media_size_bytes     BIGINT,
  media_filename       VARCHAR(255),
  media_thumbnail_url  TEXT,

  -- Threading
  replied_to_id        INTEGER      REFERENCES messages(id) ON DELETE SET NULL,

  -- Status
  is_read              BOOLEAN      DEFAULT FALSE,         -- used for direct DMs only
  is_deleted           BOOLEAN      DEFAULT FALSE,         -- soft delete ("This message was deleted")
  deleted_at           TIMESTAMP,
  is_edited            BOOLEAN      DEFAULT FALSE,
  edited_at            TIMESTAMP,

  -- Timestamps
  created_at           TIMESTAMP    DEFAULT NOW(),

  -- Constraint: must be either direct or group, not both
  CHECK (
    (receiver_id IS NOT NULL AND group_id IS NULL) OR
    (receiver_id IS NULL     AND group_id IS NOT NULL)
  ),
  -- Content or media must exist
  CHECK (content IS NOT NULL OR media_url IS NOT NULL)
);

-- ── Message Read Receipts (Group) ────────────────────────────
-- Per-user read tracking for group messages (WhatsApp 'seen by' feature).
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id                   SERIAL PRIMARY KEY,
  message_id           INTEGER      NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id              INTEGER      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  read_at              TIMESTAMP    DEFAULT NOW(),

  UNIQUE (message_id, user_id)
);

-- ── Message Reactions ─────────────────────────────────────────
-- Normalized emoji reactions on messages.
CREATE TABLE IF NOT EXISTS message_reactions (
  id                   SERIAL PRIMARY KEY,
  message_id           INTEGER      NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id              INTEGER      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  reaction             VARCHAR(8)   NOT NULL,              -- emoji or short string
  created_at           TIMESTAMP    DEFAULT NOW(),

  UNIQUE (message_id, user_id)                             -- one reaction per user per message
);

-- ── User Blocks ───────────────────────────────────────────────
-- Allows users to block/unblock each other.
CREATE TABLE IF NOT EXISTS user_blocks (
  id                   SERIAL PRIMARY KEY,
  blocker_id           INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id           INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at           TIMESTAMP    DEFAULT NOW(),

  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- ── Archived Chats ────────────────────────────────────────────
-- Users can archive direct or group conversations.
CREATE TABLE IF NOT EXISTS archived_chats (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER      NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  target_user_id       INTEGER      REFERENCES users(id)           ON DELETE CASCADE,  -- for DMs
  group_id             INTEGER      REFERENCES groups(id)          ON DELETE CASCADE,  -- for groups
  archived_at          TIMESTAMP    DEFAULT NOW(),

  UNIQUE (user_id, target_user_id),
  UNIQUE (user_id, group_id),
  CHECK (
    (target_user_id IS NOT NULL AND group_id IS NULL) OR
    (target_user_id IS NULL     AND group_id IS NOT NULL)
  )
);

-- ── User Devices / Sessions ───────────────────────────────────
-- Tracks active sessions for multi-device awareness.
CREATE TABLE IF NOT EXISTS user_devices (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name          VARCHAR(100),                       -- e.g. "Chrome on Windows"
  socket_id            VARCHAR(100),                       -- current Socket.IO socket id
  push_token           TEXT,                               -- for future push notifications
  last_active          TIMESTAMP    DEFAULT NOW(),
  created_at           TIMESTAMP    DEFAULT NOW()
);

-- ── Performance Indexes ───────────────────────────────────────

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_sender      ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver    ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_group       ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_created     ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_replied_to  ON messages(replied_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_type        ON messages(message_type);

-- Group members
CREATE INDEX IF NOT EXISTS idx_group_members_group  ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user   ON group_members(user_id);

-- Read receipts
CREATE INDEX IF NOT EXISTS idx_receipts_message     ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user        ON message_read_receipts(user_id);

-- Reactions
CREATE INDEX IF NOT EXISTS idx_reactions_message    ON message_reactions(message_id);

-- Blocks
CREATE INDEX IF NOT EXISTS idx_blocks_blocker       ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked       ON user_blocks(blocked_id);

-- Devices
CREATE INDEX IF NOT EXISTS idx_devices_user         ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_socket       ON user_devices(socket_id);

-- Users presence
CREATE INDEX IF NOT EXISTS idx_users_online         ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_users_username       ON users(username);

-- JSONB GIN indexes for preference querying
CREATE INDEX IF NOT EXISTS idx_users_prefs          ON users USING GIN (preferences);
CREATE INDEX IF NOT EXISTS idx_groups_settings      ON groups USING GIN (settings);
