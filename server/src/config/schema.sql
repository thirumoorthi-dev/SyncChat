-- =============================================================
--  WhatsApp Clone – Enhanced Database Schema
--  Portfolio-grade PostgreSQL design
--  Author  : Thirumoorthi S
--  Version : 2.0  (Day-1 Enhancement)
-- =============================================================

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username             VARCHAR(50)  UNIQUE NOT NULL CHECK (length(username) >= 3),
  email                VARCHAR(100) UNIQUE NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  display_name         VARCHAR(100),
  avatar_color         VARCHAR(7)   DEFAULT '#25D366',
  avatar_url           TEXT,
  about                VARCHAR(139) DEFAULT 'Hey there! I am using ChatApp',
  phone_number         VARCHAR(20),
  is_online            BOOLEAN      DEFAULT FALSE,
  last_seen            TIMESTAMP    DEFAULT NOW(),
  preferences          JSONB        DEFAULT '{"theme":"light","notifications":true,"enterToSend":true}'::jsonb,
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
CREATE TABLE IF NOT EXISTS groups (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
  description          TEXT,
  created_by           UUID         REFERENCES users(id) ON DELETE SET NULL,
  avatar_color         VARCHAR(7)   DEFAULT '#128C7E',
  avatar_url           TEXT,
  settings             JSONB        DEFAULT '{"maxMembers":256,"onlyAdminsCanMessage":false}'::jsonb,
  invite_link          VARCHAR(64)  UNIQUE,
  invite_link_expires  TIMESTAMP,
  created_at           TIMESTAMP    DEFAULT NOW(),
  updated_at           TIMESTAMP    DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_groups_updated_at ON groups;
CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Group Members ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id             UUID         NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id              UUID         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  role                 member_role_enum DEFAULT 'member',
  nickname             VARCHAR(60),
  is_admin             BOOLEAN      DEFAULT FALSE,
  muted_until          TIMESTAMP,
  joined_at            TIMESTAMP    DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- ── Messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id            UUID         REFERENCES users(id)  ON DELETE SET NULL,
  receiver_id          UUID         REFERENCES users(id)  ON DELETE CASCADE,
  group_id             UUID         REFERENCES groups(id) ON DELETE CASCADE,
  content              TEXT,
  message_type         message_type_enum DEFAULT 'text',
  media_url            TEXT,
  media_mime_type      VARCHAR(80),
  media_size_bytes     BIGINT,
  media_filename       VARCHAR(255),
  media_thumbnail_url  TEXT,
  replied_to_id        UUID         REFERENCES messages(id) ON DELETE SET NULL,
  is_read              BOOLEAN      DEFAULT FALSE,
  is_deleted           BOOLEAN      DEFAULT FALSE,
  deleted_at           TIMESTAMP,
  is_edited            BOOLEAN      DEFAULT FALSE,
  edited_at            TIMESTAMP,
  created_at           TIMESTAMP    DEFAULT NOW(),
  CHECK (
    (receiver_id IS NOT NULL AND group_id IS NULL) OR
    (receiver_id IS NULL     AND group_id IS NOT NULL)
  ),
  CHECK (content IS NOT NULL OR media_url IS NOT NULL)
);

-- ── Message Read Receipts (Group) ────────────────────────────
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id           UUID         NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id              UUID         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  read_at              TIMESTAMP    DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

-- ── Message Reactions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reactions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id           UUID         NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id              UUID         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  reaction             VARCHAR(8)   NOT NULL,
  created_at           TIMESTAMP    DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

-- ── User Blocks ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_blocks (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at           TIMESTAMP    DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- ── Archived Chats ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS archived_chats (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  target_user_id       UUID         REFERENCES users(id)           ON DELETE CASCADE,
  group_id             UUID         REFERENCES groups(id)          ON DELETE CASCADE,
  archived_at          TIMESTAMP    DEFAULT NOW(),
  UNIQUE (user_id, target_user_id),
  UNIQUE (user_id, group_id),
  CHECK (
    (target_user_id IS NOT NULL AND group_id IS NULL) OR
    (target_user_id IS NULL     AND group_id IS NOT NULL)
  )
);

-- ── Contacts ──────────────────────────────────────────────────
-- Stores explicit contact relationships (one-directional)
-- A adds B → B shows in A's sidebar even before first message
CREATE TABLE IF NOT EXISTS contacts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname     VARCHAR(60),
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (owner_id, contact_id),
  CHECK (owner_id != contact_id)
);

-- ── User Devices / Sessions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_devices (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name          VARCHAR(100),
  socket_id            VARCHAR(100),
  push_token           TEXT,
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

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_owner       ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact     ON contacts(contact_id);
