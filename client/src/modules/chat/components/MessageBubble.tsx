import React, { useState, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { formatMessageTime } from '../../../shared/utils/formatTime';
import { Message } from '../../../types/chat';
import Avatar from '../../../shared/components/Avatar';

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
  onForward?: (msg: Message) => void;
  onMediaClick?: (url: string, type: 'image' | 'video' | 'document') => void;
  highlight?: string;
}

export default function MessageBubble({
  message,
  isOwn,
  showSender = false,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onForward,
  onMediaClick,
  highlight,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionStrip, setShowReactionStrip] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const isOnlyEmojis = (text: string): number | false => {
    if (!text) return false;
    const emojiRegex =
      /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+(\ufe0f|\u200d)?$/u;
    const cleanText = text.replace(/\s/g, '');
    if (!emojiRegex.test(cleanText)) return false;
    const count = [...cleanText].length;
    return count <= 3 ? count : false;
  };

  const emojiCount = message.content ? isOnlyEmojis(message.content) : false;
  const isImageOnly = message.message_type === 'image' && !message.content;

  useLayoutEffect(() => {
    if (bubbleRef.current) {
      gsap.from(bubbleRef.current, {
        scale: 0.95,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out',
        clearProps: 'all',
      });
    }
  }, []);

  const reactionGroups = message.reactions?.reduce(
    (acc: Record<string, number>, r: any) => {
      acc[r.reaction] = (acc[r.reaction] || 0) + 1;
      return acc;
    },
    {}
  );
  const hasReactions = reactionGroups && Object.keys(reactionGroups).length > 0;

  const highlightText = (text: string, hl?: string) => {
    if (!hl || !hl.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${hl})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === hl.toLowerCase() ? (
            <mark key={i} className="bg-yellow-400 text-black rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className={`message-row ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[90%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOwn && (
          <div className="mt-6 flex-shrink-0">
            <Avatar name={message.sender_username} color={message.sender_avatar_color} size="md" />
          </div>
        )}

        <div className={`flex flex-col min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-2 mb-1 px-1 w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {!isOwn && (
              <span className="text-[12px] font-bold tracking-tight" style={{ color: 'var(--teal)' }}>
                {message.sender_username}
              </span>
            )}
            <span className="text-[11px] font-medium opacity-60 flex-shrink-0" style={{ color: 'var(--text)' }}>
              {formatMessageTime(message.created_at)}
            </span>
          </div>
          
          <div className="relative group max-w-full">
            {!message.is_deleted && (
              <div
                className={`
                  absolute top-0 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150
                  ${isOwn ? 'right-[calc(100%+12px)]' : 'left-[calc(100%+12px)]'}
                `}
              >
                <div className="flex items-center gap-1 rounded-lg px-2 py-1 shadow-md bg-white border border-gray-200">
                  {REACTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => onReaction?.(message, r)}
                      className="text-[18px] leading-none hover:scale-125 transition-transform duration-100"
                    >
                      {r}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowMenu((v) => !v)}
                    className="p-1 rounded-md hover:bg-gray-100 ml-1 text-gray-500"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>
                </div>

                {showMenu && (
                  <div
                    className={`absolute top-full mt-1 ${isOwn ? 'right-0' : 'left-0'} rounded-lg shadow-xl py-1 z-30`}
                    style={{ background: 'var(--panel)', border: '1px solid var(--border)', minWidth: 140 }}
                    onMouseLeave={() => setShowMenu(false)}
                  >
                    <button onClick={() => { onReply?.(message); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Reply</button>
                    {isOwn && (
                      <>
                        <button onClick={() => { onEdit?.(message); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Edit</button>
                        <button onClick={() => { onDelete?.(message); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--hover)] text-red-500">Delete</button>
                      </>
                    )}
                    <button onClick={() => { onForward?.(message); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Forward</button>
                  </div>
                )}
              </div>
            )}

            <div
              ref={bubbleRef}
              className={`bubble-base ${isOwn ? 'bubble-sent' : 'bubble-received'} ${emojiCount ? 'text-[32px]' : ''}`}
              style={{ 
                padding: isImageOnly ? '4px' : undefined,
                marginBottom: hasReactions ? '14px' : '0'
              }}
            >
              {message.replied_to_id && !message.is_deleted && (
                <div className="flex overflow-hidden mb-2 shadow-sm border-l-[3px] rounded-sm bg-black/5 border-[var(--teal)]">
                  <div className="px-3 py-1.5 min-w-0">
                    <p className="text-[11px] font-bold leading-tight mb-0.5" style={{ color: 'var(--teal)' }}>
                      {message.parent_message_sender || 'User'}
                    </p>
                    <p className="text-[11px] truncate leading-tight opacity-70" style={{ color: 'var(--text)' }}>
                      {message.parent_message_content}
                    </p>
                  </div>
                </div>
              )}

              {message.is_deleted ? (
                <p className="text-[13.5px] italic opacity-50">🚫 This message was deleted</p>
              ) : (
                <>
                  {message.message_type === 'image' && message.media_url && (
                    <div
                      onClick={() => onMediaClick?.(message.media_url!, 'image')}
                      className={`overflow-hidden cursor-pointer relative ${message.content ? 'mb-2' : ''}`}
                      style={{ borderRadius: 4, maxWidth: 400 }}
                    >
                      <img
                        src={message.media_thumbnail_url || message.media_url}
                        alt="Shared media"
                        className="w-full h-auto max-h-[500px] object-cover block"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {message.message_type === 'file' && message.media_url && (
                    <div
                      onClick={() => onMediaClick?.(message.media_url!, 'document')}
                      className="flex items-center gap-4 mb-1 cursor-pointer hover:bg-black/5 transition-colors p-3 rounded bg-black/5"
                    >
                      <div className="flex items-center justify-center flex-shrink-0 shadow-sm bg-[var(--teal)] w-10 h-10 rounded">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold truncate">{message.media_filename || 'Attachment'}</p>
                        <p className="text-[11px] opacity-60">{formatFileSize(message.media_size_bytes)}</p>
                      </div>
                    </div>
                  )}

                  {message.content && (
                    <p className={`text-[15px] leading-[1.5] break-words whitespace-pre-wrap`}>
                      {highlightText(message.content, highlight)}
                      {message.is_edited && !message.is_deleted && (
                        <span className="text-[11px] italic opacity-50 ml-2">(edited)</span>
                      )}
                    </p>
                  )}
                </>
              )}
            </div>

            {hasReactions && (
              <>
                <div className={`reaction-pill-teams ${isOwn ? 'own' : 'received'}`}>
                  {Object.entries(reactionGroups!).map(([emoji, count]: [string, any]) => (
                    <div key={emoji} className="flex items-center gap-1 py-1 text-[15px] leading-none">
                      <span>{emoji}</span>
                      <span className="text-[11px] font-bold text-gray-600">{count}</span>
                    </div>
                  ))}
                </div>
                
                {/* <button 
                  className={`add-reaction-btn ${isOwn ? 'own' : 'received'}`}
                  title="Add reaction"
                  onClick={() => setShowReactionStrip(true)}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                    <circle cx="18" cy="18" r="4" fill="white" stroke="#6264a7" strokeWidth="1.5"/>
                    <line x1="18" y1="16.5" x2="18" y2="19.5" stroke="#6264a7" strokeWidth="1.5"/>
                    <line x1="16.5" y1="18" x2="19.5" y2="18" stroke="#6264a7" strokeWidth="1.5"/>
                  </svg>
                </button> */}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}