import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ConversationItem from './ConversationItem';
import NewChatModal from './NewChatModal';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';
import api from '../utils/api';
import { ChatItem, Conversation, Group, Message, User } from '../types/chat';

interface SidebarProps {
  activeChat: ChatItem | null;
  onSelectChat: (chat: ChatItem) => void;
}

export default function Sidebar({ activeChat, onSelectChat }: SidebarProps) {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const loadConversations = useCallback(async () => {
    try {
      const [convRes, groupRes] = await Promise.all([
        api.get('/users/conversations'),
        api.get('/groups'),
      ]);
      setConversations(convRes.data.map((c: any) => ({ ...c, unread_count: parseInt(c.unread_count || '0', 10) })));
      setGroups(groupRes.data.map((g: any) => ({ ...g, unread_count: parseInt(g.unread_count || '0', 10) })));
    } catch (err) {
      console.error('Load conversations error:', err);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (msg: Message) => {
      setConversations(prev => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const exists = prev.find(c => c.id === otherId);
        if (exists) {
          return prev.map(c => {
            if (c.id !== otherId) return c;
            const isActiveChat = activeChat?.type === 'direct' && activeChat?.id === otherId;
            return {
              ...c,
              last_message: msg.content,
              last_message_time: msg.created_at,
              last_message_sender_id: msg.sender_id,
              unread_count: (msg.sender_id !== user.id && !isActiveChat)
                ? (c.unread_count || 0) + 1
                : c.unread_count,
            };
          }).sort((a, b) =>
            new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
          );
        }
        loadConversations();
        return prev;
      });
    };

    const handleNewGroupMessage = ({ groupId, message }: { groupId: string; message: Message }) => {
      setGroups(prev => prev.map(g => {
        if (g.id !== parseInt(groupId)) return g;
        const isActiveGroup = activeChat?.type === 'group' && activeChat?.id === parseInt(groupId);
        return {
          ...g,
          last_message: message.content,
          last_message_time: message.created_at,
          unread_count: (message.sender_id !== user.id && !isActiveGroup)
            ? (g.unread_count || 0) + 1
            : g.unread_count,
        };
      }).sort((a, b) =>
        new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
      ));
    };

    const handleMessagesRead = ({ byUserId }: { byUserId: number }) => {
      setConversations(prev => prev.map(c =>
        c.id === byUserId ? { ...c, unread_count: 0 } : c
      ));
    };

    const handleGroupMessagesRead = ({ groupId }: { groupId: string }) => {
      setGroups(prev => prev.map(g =>
        g.id === parseInt(groupId) ? { ...g, unread_count: 0 } : g
      ));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleNewMessage);
    socket.on('new_group_message', handleNewGroupMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('group_messages_read', handleGroupMessagesRead);
    socket.on('user_online', ({ userId, isOnline }: { userId: number; isOnline: boolean }) => {
      setConversations(prev => prev.map(c =>
        c.id === userId ? { ...c, is_online: isOnline } : c
      ));
    });

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleNewMessage);
      socket.off('new_group_message', handleNewGroupMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('group_messages_read', handleGroupMessagesRead);
      socket.off('user_online');
    };
  }, [socket, user, activeChat, loadConversations]);

  const handleSelectUser = (u: User) => {
    setShowModal(false);
    onSelectChat({ ...u, type: 'direct', unread_count: 0 });
    setConversations(prev => {
      if (prev.find(c => c.id === u.id)) return prev;
      return [{ ...u, last_message: undefined, last_message_time: undefined, unread_count: 0 } as Conversation, ...prev];
    });
  };

  const handleCreateGroup = async (name: string, memberIds: number[]) => {
    setShowModal(false);
    try {
      const res = await api.post('/groups', { name, memberIds });
      const group: Group = res.data;
      setGroups(prev => [{ ...group, unread_count: 0 }, ...prev]);
      onSelectChat({ ...group, type: 'group' });
      socket?.emit('join_group', group.id);
    } catch (err) {
      console.error('Create group error:', err);
    }
  };

  const handleSelectChat = (chat: ChatItem) => {
    if (chat.type === 'direct') {
      setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c));
    } else {
      setGroups(prev => prev.map(g => g.id === chat.id ? { ...g, unread_count: 0 } : g));
    }
    onSelectChat(chat);
  };

  const allChats: ChatItem[] = [
    ...conversations.map(c => ({ ...c, type: 'direct' as const })),
    ...groups.map(g => ({ ...g, type: 'group' as const })),
  ].sort((a, b) =>
    new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
  );

  const filtered = search.trim()
    ? allChats.filter(c =>
        (c.type === 'group' ? c.name : (c.display_name || c.username || '')).toLowerCase().includes(search.toLowerCase())
      )
    : allChats;

  const totalUnread = allChats.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--panel)', borderRight: '1px solid var(--border)' }}>
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ backgroundColor: 'var(--panel)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={user?.username} color={user?.avatar_color} size="md" />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--panel)] ${
                isConnected ? 'bg-[var(--green)]' : 'bg-gray-400'
              }`}
              title={isConnected ? 'Connected' : 'Reconnecting…'}
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>
              {user?.username}
            </p>
            <p className="text-[10px]" style={{ color: isConnected ? 'var(--teal)' : 'var(--subtext)' }}>
              {isConnected ? 'online' : 'connecting…'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button
            id="new-chat-btn"
            onClick={() => setShowModal(true)}
            className="p-2 rounded-full hover:bg-[var(--hover)] transition-colors duration-150"
            style={{ color: 'var(--subtext)' }}
            title="New chat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <div className="relative">
            <button
              id="sidebar-menu-btn"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-[var(--hover)] transition-colors duration-150"
              style={{ color: 'var(--subtext)' }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
              </svg>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div
                  className="absolute right-0 top-10 rounded-xl shadow-[var(--shadow-modal)] py-1 z-20 min-w-[160px] pop-in"
                  style={{ background: 'var(--modal-bg)', border: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => { setShowModal(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--hover)] transition-colors"
                    style={{ color: 'var(--text)' }}
                  >
                    ✏️ New Chat
                  </button>
                  <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
                  <button
                    onClick={() => { setShowMenu(false); logout(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--hover)] transition-colors"
                  >
                    🚪 Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-3 py-2 flex-shrink-0" style={{ backgroundColor: 'var(--panel)' }}>
        <div className="relative">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--subtext)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="sidebar-search"
            type="text"
            placeholder="Search or start new chat"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl pl-9 pr-4 py-2 text-sm outline-none transition-colors"
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          />
        </div>
      </div>

      {/* ── Section label ── */}
      {!search && allChats.length > 0 && (
        <div className="px-4 pt-2 pb-1 flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--subtext)' }}>
            All Chats
          </span>
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold text-[var(--teal)]">
              {totalUnread} unread
            </span>
          )}
        </div>
      )}

      {/* ── Conversation List ── */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {search ? 'No results found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filtered.map(chatItem => (
            <ConversationItem
              key={`${chatItem.type}-${chatItem.id}`}
              chat={chatItem}
              isActive={activeChat?.id === chatItem.id && activeChat?.type === chatItem.type}
              onClick={() => handleSelectChat(chatItem)}
              currentUserId={user?.id}
            />
          ))
        )}
      </div>

      {/* ── New Chat Modal ── */}
      {showModal && (
        <NewChatModal
          onClose={() => setShowModal(false)}
          onSelectUser={handleSelectUser}
          onCreateGroup={handleCreateGroup}
        />
      )}
    </div>
  );
}
