export interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  avatar_color: string;
  avatar_url?: string;
  about?: string;
  phone_number?: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  is_blocked: boolean;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  content: string;
  message_type: MessageType;
  created_at: string;
  sender_username: string;
  sender_avatar_color: string;
  is_read: boolean;
  is_deleted: boolean;
  deleted_at?: string;
  is_edited: boolean;
  edited_at?: string;
  replied_to_id?: string | null;
  parent_message_content?: string;
  parent_message_sender?: string;
  media_url?: string | null;
  media_mime_type?: string | null;
  media_size_bytes?: string | number | null;
  media_filename?: string | null;
  media_thumbnail_url?: string | null;
  reactions?: any[];
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  avatar_color: string;
  avatar_url?: string;
  unread_count: number;
  last_message?: string;
  last_message_time?: string;
  last_message_sender_id?: string;
  created_at: string;
  is_blocked: boolean;
}

export interface Conversation extends User {
  last_message?: string;
  last_message_time?: string;
  last_message_sender_id?: string;
  unread_count: number;
  is_blocked: boolean;
}

export type ChatItem =
  | (Conversation & { type: 'direct' })
  | (Group & { type: 'group' });
