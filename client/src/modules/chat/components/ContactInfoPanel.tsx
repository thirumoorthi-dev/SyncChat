import React, { useState, useEffect } from 'react';
import Avatar from '../../../shared/components/Avatar';
import api from '../../../app/services/axiosClient';
import { ChatItem, Message } from '../../../types/chat';

interface ContactInfoPanelProps {
  chat: ChatItem;
  onClose: () => void;
  onBlock?: () => void;
  onArchive?: () => void;
  onMediaClick?: (url: string, type: 'image' | 'video' | 'document') => void;
}

export default function ContactInfoPanel({ chat, onClose, onBlock, onArchive, onMediaClick }: ContactInfoPanelProps) {
  const [media, setMedia] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const isGroup = chat.type === 'group';

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await api.get(`/messages/media/${chat.id}`, {
          params: { isGroup }
        });
        setMedia(res.data);
      } catch (err) {
        console.error('Fetch media error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [chat.id, isGroup]);

  const name = isGroup ? chat.name : (chat.display_name || chat.username);

  return (
    <div
      className="fixed inset-0 z-[60] md:relative md:inset-auto md:z-0 w-full md:w-[320px] lg:w-[380px] h-full flex flex-col bg-[var(--panel)] border-l border-[var(--border)] animate-in slide-in-from-right duration-300"
    >
      {/* Header */}
      <div className="h-[60px] px-6 flex items-center justify-between border-b border-[var(--border)] bg-[var(--panel)]">
        <h3 className="font-bold" style={{ color: 'var(--text)' }}>{isGroup ? 'Group Info' : 'Contact Info'}</h3>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--hover)]" style={{ color: 'var(--subtext)' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* Profile Section */}
        <div className="flex flex-col items-center p-8 bg-[var(--bg)] mb-2 shadow-sm">
          <Avatar name={name} color={chat.avatar_color} size="xl" />
          <h2 className="text-xl font-bold text-center" style={{ color: 'var(--text)' }}>{name}</h2>
          {!isGroup && <p className="text-sm opacity-60 mt-1" style={{ color: 'var(--text)' }}>@{chat.username}</p>}
        </div>

        {/* About / Description */}
        <div className="p-6 bg-[var(--bg)] mb-2 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--teal)' }}>
            {isGroup ? 'Description' : 'About'}
          </h4>
          <p className="text-sm" style={{ color: 'var(--text)' }}>
            {isGroup ? (chat as any).description || 'No description' : (chat as any).about || 'Hey there! I am using ChatApp'}
          </p>
        </div>

        {/* Shared Media */}
        <div className="p-6 bg-[var(--bg)] mb-2 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--teal)' }}>Shared Media</h4>
            <span className="text-[10px]" style={{ color: 'var(--subtext)' }}>{media.length} items</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => <div key={i} className="aspect-square rounded bg-[var(--hover)] animate-pulse" />)}
            </div>
          ) : media.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {media.slice(0, 6).map(m => (
                <div key={m.id} className="aspect-square rounded overflow-hidden bg-[var(--hover)] border border-[var(--border)] group relative">
                  {m.message_type === 'image' ? (
                    <img
                      src={m?.media_thumbnail_url || m?.media_url || ""}
                      alt="media"
                      onClick={() => onMediaClick?.(m.media_url!, m.message_type === 'image' ? 'image' : 'document')}
                      className="w-full h-auto object-cover group-hover:scale-110 transition-transform cursor-pointer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--panel)]" onClick={() => onMediaClick?.(m.media_url!, 'document')}>
                      <svg className="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] italic text-center py-4" style={{ color: 'var(--subtext)' }}>No shared media yet</p>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 flex flex-col gap-2">
          <button
            onClick={onArchive}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--hover)] transition-colors text-sm"
            style={{ color: 'var(--text)' }}
          >
            <svg className="w-5 h-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Archive Chat
          </button>
          {!isGroup && (
            <button
              onClick={onBlock}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm text-red-500"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Block Contact
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
