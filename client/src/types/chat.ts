export interface User {
  id: number;
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
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';

export interface Reaction {
  id: number;
  message_id: number;
  user_id: number;
  reaction: string;
  created_at: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id?: number;
  group_id?: number;
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
  replied_to_id?: number;
  parent_message_content?: string;
  reactions?: Reaction[];
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  avatar_color: string;
  avatar_url?: string;
  unread_count: number;
  last_message?: string;
  last_message_time?: string;
  last_message_sender_id?: number;
  created_at: string;
}

export interface Conversation extends User {
  last_message?: string;
  last_message_time?: string;
  last_message_sender_id?: number;
  unread_count: number;
}

export type ChatItem = 
  | (Conversation & { type: 'direct' }) 
  | (Group & { type: 'group' });
