import React, { useState } from 'react';
import { formatMessageTime } from '../utils/formatTime';
import { Message } from '../types/chat';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const formatFileSize = (bytes?: number | string | null) => {
  if (!bytes) return '';
  const b = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  onDelete?: (msg: Message) => void;
  onReaction?: (msg: Message, emoji: string) => void;
}

export default function MessageBubble({
  message,
  isOwn,
  showSender = false,
  onReply,
  onEdit,
  onDelete,
  onReaction
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleReactionClick = (emoji: string) => {
    onReaction?.(message, emoji);
  };

  // Group reactions by emoji
  const reactionGroups = message.reactions?.reduce((acc: any, r: any) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`flex message-bubble group ${isOwn ? 'justify-end' : 'justify-start'} px-3 py-0.5`}>
      <div className="relative max-w-[68%] min-w-[120px]">

        {/* Action Menu Trigger (Three dots) */}
        {!message.is_deleted && (
          <div className={`absolute top-0 ${isOwn ? 'right-full mr-1' : 'left-full ml-1'} opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-full hover:bg-[var(--hover)] text-[var(--subtext)]"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
              {showMenu && (
                <div 
                  className={`absolute top-full ${isOwn ? 'right-0' : 'left-0'} mt-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg shadow-xl py-1 z-20 min-w-[100px]`}
                  onMouseLeave={() => setShowMenu(false)}
                >
                  <button onClick={() => { onReply?.(message); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Reply</button>
                  {isOwn && (
                    <>
                      <button onClick={() => { onEdit?.(message); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Edit</button>
                      <button onClick={() => { onDelete?.(message); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)] text-red-500">Delete</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reaction hover strip */}
        {!message.is_deleted && (
          <div
            className={`reaction-strip absolute ${isOwn ? 'right-full mr-8' : 'left-full ml-8'} top-1/2 -translate-y-1/2
              flex items-center gap-0.5 bg-[var(--panel)] border border-[var(--border)] rounded-full px-2 py-1 shadow-md z-10`}
          >
            {REACTIONS.map(r => (
              <button
                key={r}
                onClick={() => handleReactionClick(r)}
                className="text-sm hover:scale-125 transition-transform duration-100 cursor-pointer"
                title={`React with ${r}`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

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

          {/* Quoted Message */}
          {message.replied_to_id && !message.is_deleted && (
            <div className="mb-2 p-2 rounded bg-[var(--bg)] border-l-4 border-[var(--teal)] opacity-80 text-[11px]">
              <p className="font-bold mb-0.5" style={{ color: 'var(--teal)' }}>
                {message.parent_message_sender || 'User'}
              </p>
              <p className="truncate" style={{ color: 'var(--subtext)' }}>
                {message.parent_message_content}
              </p>
            </div>
          )}

          {/* Message Content */}
          <div className="flex flex-col">
            {message.is_deleted ? (
               <p className="text-sm italic opacity-60" style={{ color: 'var(--text)' }}>
                  🚫 This message was deleted
               </p>
            ) : (
              <>
                {/* Image Rendering */}
                {message.message_type === 'image' && message.media_url && (
                  <div className="mb-2 overflow-hidden rounded-lg cursor-pointer bg-[var(--bg)] border border-[var(--border)] max-w-full">
                    <a href={message.media_url} target="_blank" rel="noreferrer">
                      <img 
                        src={message.media_thumbnail_url || message.media_url} 
                        alt="Shared media"
                        className="w-full h-auto object-cover max-h-[300px] hover:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                    </a>
                  </div>
                )}

                {/* File Rendering */}
                {message.message_type === 'file' && message.media_url && (
                  <a 
                    href={message.media_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 mb-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--hover)] transition-colors border border-[var(--border)]"
                  >
                    <div className="w-10 h-10 rounded bg-[var(--teal)] flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {message.media_filename || 'Attachment'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--subtext)' }}>
                        {formatFileSize(message.media_size_bytes)}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-[var(--subtext)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                )}

                {/* Text Content */}
                {message.content && (
                  <p className="text-sm leading-relaxed break-words" style={{ color: 'var(--text)' }}>
                    {message.content}
                  </p>
                )}
              </>
            )}
            
            {/* Reactions summary */}
            {reactionGroups && Object.keys(reactionGroups).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(reactionGroups).map(([emoji, count]: [string, any]) => (
                  <div 
                    key={emoji} 
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[10px]"
                    style={{ color: 'var(--text)' }}
                  >
                    <span>{emoji}</span>
                    <span className="font-bold opacity-70">{count > 1 ? count : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp + read receipt */}
          <div className="flex items-center gap-1 mt-1 justify-end">
            {message.is_edited && !message.is_deleted && (
              <span className="text-[9px] italic" style={{ color: 'var(--subtext)' }}>edited</span>
            )}
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
