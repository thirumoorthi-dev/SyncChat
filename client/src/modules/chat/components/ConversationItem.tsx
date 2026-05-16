import React, { useState } from 'react';
import Avatar from '../../../shared/components/Avatar';
import { formatConversationTime } from '../../../shared/utils/formatTime';
import { ChatItem } from '../../../types/chat';

interface ConversationItemProps {
  chat: ChatItem;
  isActive: boolean;
  onClick: () => void;
  currentUserId?: string;
  isArchived?: boolean;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onBlock?: () => void;
  isBlocked?: boolean;
  onUnblock?: () => void;
  onLeave?: () => void;
}

export default function ConversationItem({ 
  chat, 
  isActive, 
  onClick, 
  currentUserId,
  isArchived,
  onArchive,
  onUnarchive,
  onBlock ,
  isBlocked,
  onUnblock,
  onLeave,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const name = chat.type === 'group' ? chat.name : (chat.display_name || chat.username || '?');
  const lastMsg = chat.last_message;
  const unread = chat.unread_count || 0;
  const isGroup = chat.type === 'group';

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`
        slide-item group relative flex items-center gap-3 px-4 py-3 cursor-pointer
        transition-all duration-200 border-b border-[var(--border)]
        ${isActive
          ? 'bg-[var(--active-bg)] shadow-sm'
          : 'hover:bg-[var(--hover)]'}
      `}
    >
      {isActive && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--active-bar)]" 
          style={{ transition: 'height 0.3s ease' }} 
        />
      )}
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar
          name={name}
          color={chat.avatar_color}
          size="md"
        />
        {chat.type === 'direct' && (chat as any).is_online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--green)] border-2 border-[var(--panel)] rounded-full pulse-ring" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[var(--text)] text-sm truncate leading-tight">
            {name}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs flex-shrink-0 ${
                unread > 0 ? 'text-[var(--teal)] font-medium' : 'text-[var(--subtext)]'
              }`}
            >
              {formatConversationTime(chat.last_message_time)}
            </span>
            
            {/* Context Menu Trigger */}
            <div className="relative">
              <button 
                onClick={handleMenuClick}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-[var(--hover)] transition-all duration-150"
                title="Options"
              >
                <svg className="w-4 h-4 text-[var(--subtext)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                  <div className="absolute right-0 top-6 w-36 py-1 rounded-lg shadow-xl z-40 bg-[var(--modal-bg)] border border-[var(--border)] pop-in">
                    {isArchived ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUnarchive?.(); setShowMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)] text-[var(--text)]"
                      >
                        📥 Unarchive
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onArchive?.(); setShowMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)] text-[var(--text)]"
                      >
                        📁 Archive
                      </button>
                    )}
                    
                    {!isGroup ? (
                      isBlocked ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onUnblock?.(); setShowMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)] text-green-500"
                        >
                          ✅ Unblock User
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onBlock?.(); setShowMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)] text-red-500"
                        >
                          🚫 Block User
                        </button>
                      )
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onLeave?.(); setShowMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)] text-red-500"
                      >
                        🚪 Leave Group
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
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
