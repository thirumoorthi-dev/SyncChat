import React from 'react';
import { formatMessageTime } from '../utils/formatTime';
import { Message } from '../types/chat';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
}

export default function MessageBubble({ message, isOwn, showSender = false }: MessageBubbleProps) {
  return (
    <div className={`flex message-bubble group ${isOwn ? 'justify-end' : 'justify-start'} px-3 py-0.5`}>
      <div className="relative max-w-[68%] min-w-[80px]">

        {/* Reaction hover strip */}
        <div
          className={`reaction-strip absolute ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2
            flex items-center gap-0.5 bg-[var(--panel)] border border-[var(--border)] rounded-full px-2 py-1 shadow-md z-10`}
        >
          {REACTIONS.map(r => (
            <button
              key={r}
              className="text-sm hover:scale-125 transition-transform duration-100 cursor-pointer"
              title={`React with ${r}`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Bubble */}
        <div className={isOwn ? 'bubble-sent' : 'bubble-received'} style={{ padding: '6px 10px 4px' }}>
          {/* Group sender name */}
          {showSender && !isOwn && (
            <p
              className="text-xs font-semibold mb-1 truncate"
              style={{ color: message.sender_avatar_color || 'var(--teal)' }}
            >
              {message.sender_username}
            </p>
          )}

          {/* Message text */}
          <p className="text-sm leading-relaxed break-words" style={{ color: 'var(--text)' }}>
            {message.content}
          </p>

          {/* Timestamp + read receipt */}
          <div className="flex items-center gap-1 mt-1 justify-end">
            <span className="text-[10px]" style={{ color: 'var(--subtext)' }}>
              {formatMessageTime(message.created_at)}
            </span>
            {isOwn && (
              <svg
                className={`w-[14px] h-[14px] flex-shrink-0 ${message.is_read ? 'text-blue-400' : ''}`}
                style={{ color: message.is_read ? '#53BDEB' : 'var(--subtext)' }}
                fill="currentColor"
                viewBox="0 0 16 15"
                aria-label={message.is_read ? 'Read' : 'Delivered'}
              >
                {message.is_read ? (
                  <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.503zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                ) : (
                  <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                )}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
