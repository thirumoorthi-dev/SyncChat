import React, { useState } from 'react';
import { useAppSelector } from '../../../app/hooks';
import Avatar from '../../../shared/components/Avatar';
import { ChatItem, Message } from '../../../types/chat';

interface ForwardModalProps {
  message: Message;
  conversations: ChatItem[];
  onClose: () => void;
  onForward: (chats: ChatItem[]) => void;
}

export default function ForwardModal({ message, conversations, onClose, onForward }: ForwardModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c => {
    const name = c.type === 'group' ? c.name : (c.display_name || c.username || '');
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const selectedChats = conversations.filter(c => selectedIds.includes(c.id));
    onForward(selectedChats);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div 
        className="pop-in relative w-full max-w-md bg-[var(--modal-bg)] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Forward Message</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--hover)]" style={{ color: 'var(--subtext)' }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border)] bg-[var(--hover)]">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--teal)' }}>Message Preview</p>
          <div className="p-2 rounded bg-[var(--bg)] border-l-4 border-[var(--teal)]">
             <p className="text-xs truncate opacity-70" style={{ color: 'var(--text)' }}>
                {message.message_type === 'text' ? message.content : `[${message.message_type}] ${message.media_filename || ''}`}
             </p>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <input
              autoFocus
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl outline-none text-sm"
              style={{ background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--subtext)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {filtered.map(chat => {
            const isSelected = selectedIds.includes(chat.id);
            const name = chat.type === 'group' ? chat.name : (chat.display_name || chat.username);
            return (
              <button
                key={chat.id}
                onClick={() => toggleSelect(chat.id)}
                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-[var(--hover)] transition-colors"
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--teal)] border-[var(--teal)]' : 'border-[var(--border)]'}`}>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <Avatar name={name} color={chat.avatar_color} size="sm" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--subtext)' }}>
                    {chat.type === 'group' ? 'Group' : `@${chat.username}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="w-full py-3 rounded-xl font-bold bg-[var(--teal)] text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
          >
            Forward to {selectedIds.length} chat{selectedIds.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
