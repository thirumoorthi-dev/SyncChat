import React from 'react';
import Avatar from './Avatar';
import { formatConversationTime } from '../utils/formatTime';

export default function ConversationItem({ chat, isActive, onClick, currentUserId }) {
  const name = chat.name || chat.username || '?';
  const lastMsg = chat.last_message;
  const unread = parseInt(chat.unread_count || 0);
  const isGroup = chat.type === 'group';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`
        slide-item relative flex items-center gap-3 px-4 py-3 cursor-pointer
        transition-colors duration-150
        ${isActive
          ? 'bg-[var(--active-bg)] border-l-[3px] border-[var(--active-bar)]'
          : 'hover:bg-[var(--hover)] border-l-[3px] border-transparent'}
      `}
    >
      {/* Avatar */}
      <Avatar
        name={name}
        color={chat.avatar_color}
        size="md"
        isOnline={!isGroup && chat.is_online}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[var(--text)] text-sm truncate leading-tight">
            {name}
          </span>
          <span
            className={`text-xs flex-shrink-0 ml-2 ${
              unread > 0 ? 'text-[var(--teal)] font-medium' : 'text-[var(--subtext)]'
            }`}
          >
            {formatConversationTime(chat.last_message_time)}
          </span>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-[var(--subtext)] truncate flex items-center gap-1">
            {/* Group indicator */}
            {isGroup && (
              <svg className="w-3 h-3 flex-shrink-0 text-[var(--subtext)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            )}
            {isGroup && chat.last_message_sender_id === currentUserId ? (
              <span className="text-[var(--teal)] font-medium mr-0.5">You:</span>
            ) : null}
            {lastMsg || (isGroup ? 'Group created' : 'Start a conversation')}
          </p>

          {unread > 0 && (
            <span className="ml-2 flex-shrink-0 bg-[var(--green)] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-[popIn_.2s_ease]">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
