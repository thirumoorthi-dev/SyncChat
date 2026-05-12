import React, { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { logout as logoutAction } from '../../auth/store/auth.slice';
import { useSocket } from '../../../context/SocketContext';
import ConversationItem from './ConversationItem';
import NewChatModal from './NewChatModal';
import { setActiveChat, resetChat } from '../store/chat.slice';
import ProfileModal from '../../auth/components/ProfileModal';
import Avatar from '../../../shared/components/Avatar';
import ThemeToggle from '../../../shared/components/ThemeToggle';
import api from '../../../app/services/axiosClient';
import { ChatItem, Conversation, Group, Message, User } from '../../../types/chat';
import { toast } from 'react-toastify';

interface SidebarProps {
  activeChat: ChatItem | null;
  onSelectChat: (chat: ChatItem) => void;
}

export default function Sidebar({ activeChat, onSelectChat }: SidebarProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const logout = () => {
    dispatch(logoutAction());
    dispatch(resetChat());
  };
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [archivedIds, setArchivedIds] = useState<{ userId?: string, groupId?: string }[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const listRef = useRef<HTMLDivElement>(null);


  const loadConversations = useCallback(async () => {
    try {
      const [convRes, groupRes, archRes, blockRes] = await Promise.all([
        api.get('/contacts'),
        api.get('/groups'),
        api.get('/management/archived'),
        api.get('/management/blocks'),
      ]);
      setConversations(convRes.data.map((c: any) => ({ ...c, unread_count: parseInt(c.unread_count || '0', 10) })));
      setGroups(groupRes.data.map((g: any) => ({ ...g, unread_count: parseInt(g.unread_count || '0', 10) })));
      setArchivedIds(archRes.data.map((a: any) => ({ userId: a.target_user_id, groupId: a.group_id })));
      setBlockedIds(blockRes.data.map((b: any) => b.id));
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
        if (g.id !== groupId) return g;
        const isActiveGroup = activeChat?.type === 'group' && activeChat?.id === groupId;
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

    const handleMessagesRead = ({ byUserId }: { byUserId: string }) => {
      setConversations(prev => prev.map(c =>
        c.id === byUserId ? { ...c, unread_count: 0 } : c
      ));
    };

    const handleGroupMessagesRead = ({ groupId }: { groupId: string }) => {
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, unread_count: 0 } : g
      ));
    };

    // When another user adds YOU as a contact, add them to your sidebar instantly
    const handleNewContact = (newContact: Conversation) => {
      setConversations(prev => {
        if (prev.find(c => c.id === newContact.id)) return prev; // already exists
        return [{ ...newContact, unread_count: 0 } as Conversation, ...prev];
      });
    };

    const handleNewGroup = (newGroup: Group) => {
      setGroups(prev => {
        if (prev.find(g => g.id === newGroup.id)) return prev;
        return [{ ...newGroup, unread_count: 0 } as Group, ...prev];
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleNewMessage);
    socket.on('new_group_message', handleNewGroupMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('group_messages_read', handleGroupMessagesRead);
    socket.on('new_contact', handleNewContact);
    socket.on('new_group', handleNewGroup);
    socket.on('user_online', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
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
      socket.off('new_contact', handleNewContact);
      socket.off('new_group', handleNewGroup);
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
      setGroups(prev => [{ ...group, unread_count: 0, last_message_time: new Date().toISOString() }, ...prev]);
      onSelectChat({ ...group, type: 'group' });
      socket?.emit('join_group', group.id);
    } catch (err) {
      console.error('Create group error:', err);
    }
  };

  const handleSelectChat = (chat: ChatItem) => {
    onSelectChat(chat);
    // Immediately clear unread badge — don't wait for the server socket round-trip
    if (chat.type === 'direct') {
      setConversations(prev =>
        prev.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c)
      );
    } else {
      setGroups(prev =>
        prev.map(g => g.id === chat.id ? { ...g, unread_count: 0 } : g)
      );
    }
  };

  const handleArchiveChat = async (chat: ChatItem) => {
    try {
      await api.post('/management/archive', chat.type === 'direct' ? { targetUserId: chat.id } : { groupId: chat.id });
      setArchivedIds(prev => [...prev, chat.type === 'direct' ? { userId: chat.id } : { groupId: chat.id }]);
      if (activeChat?.id === chat.id && activeChat?.type === chat.type) onSelectChat(null as any);
      toast.success('Chat archived');
    } catch (err) {
      console.error('Archive error:', err);
      toast.error('Failed to archive chat');
    }
  };

  const handleUnarchiveChat = async (chat: ChatItem) => {
    try {
      await api.post('/management/unarchive', chat.type === 'direct' ? { targetUserId: chat.id } : { groupId: chat.id });
      setArchivedIds(prev => prev.filter(a => chat.type === 'direct' ? a.userId !== chat.id : a.groupId !== chat.id));
      toast.success('Chat unarchived');
    } catch (err) {
      console.error('Unarchive error:', err);
      toast.error('Failed to unarchive chat');
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      await api.post(`/management/block/${userId}`);
      setBlockedIds(prev => [...prev, userId]);
      toast.success('User blocked successfully');
    } catch (err) {
      console.error('Block error:', err);
      toast.error('Failed to block user');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await api.delete(`/management/block/${userId}`);
      setBlockedIds(prev => prev.filter(id => id !== userId));
      toast.success('User unblocked successfully');
    } catch (err) {
      console.error('Unblock error:', err);
      toast.error('Failed to unblock user');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.post(`/groups/${groupId}/leave`);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (activeChat?.id === groupId && activeChat?.type === 'group') onSelectChat(null as any);
      toast.success('Left group');
    } catch (err) {
      console.error('Leave group error:', err);
      toast.error('Failed to leave group');
    }
  };

  const isChatArchived = (chat: ChatItem) => {
    return archivedIds.some(a => chat.type === 'direct' ? a.userId === chat.id : a.groupId === chat.id);
  };

  const isChatBlocked = (chat: ChatItem) => {
    return blockedIds.includes(chat.id);
  };

  const allChats: ChatItem[] = [
    ...conversations.map(c => ({ ...c, type: 'direct' as const })),
    ...groups.map(g => ({ ...g, type: 'group' as const })),
  ].sort((a, b) =>
    new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
  );

  // ── Always visible: unarchived, non-blocked chats ────────────────────
  const unarchivedChats = allChats.filter(c => {
    const matchesSearch = (c.type === 'group' ? c.name : (c.display_name || c.username || ''))
      .toLowerCase().includes(search.toLowerCase());
    return !isChatArchived(c) && !isChatBlocked(c) && matchesSearch;
  });

  // ── Only visible when toggle is on: archived chats ────────────────────
  const archivedChats = allChats.filter(c => {
    const matchesSearch = (c.type === 'group' ? c.name : (c.display_name || c.username || ''))
      .toLowerCase().includes(search.toLowerCase());
    return isChatArchived(c) && !isChatBlocked(c) && matchesSearch;
  });

  // ── Blocked users (for ProfileModal blocked contacts section) ─────
  const blockedUsers = conversations.filter(c => blockedIds.includes(c.id));

  const totalUnread = allChats.reduce((sum, c) => {
    if (isChatArchived(c) || isChatBlocked(c)) return sum;
    return sum + (c.unread_count || 0);
  }, 0);
  useEffect(() => {
    if (listRef.current && (unarchivedChats.length > 0 || archivedChats.length > 0)) {
      gsap.fromTo(listRef.current.querySelectorAll('.slide-item'),
        {
          opacity: 0,
          x: -30,
          scale: 0.95
        },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          stagger: 0.06,
          duration: 0.6,
          ease: 'elastic.out(1, 0.8)',
          clearProps: 'all'
        }
      );
    }
  }, [unarchivedChats.length, archivedChats.length, search, showArchived]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--panel)', borderRight: '1px solid var(--border)' }}>
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ backgroundColor: 'var(--header)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={user?.username} color={user?.avatar_color} size="md" />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--panel)] ${isConnected ? 'bg-[var(--green)]' : 'bg-gray-400'
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
                <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
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
                  <button
                    onClick={() => { setShowProfile(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--hover)] transition-colors"
                    style={{ color: 'var(--text)' }}
                  >
                    👤 Profile
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
      {!search && (
        <div className="px-4 pt-2 pb-1 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors hover:text-[var(--teal)]"
            style={{ color: showArchived ? 'var(--teal)' : 'var(--subtext)' }}
          >
            {showArchived ? '📂 Showing Archived' : '📁 Archived Chats'}
            <span className="opacity-60">({archivedIds.length})</span>
          </button>
          {totalUnread > 0 && !showArchived && (
            <span className="text-[10px] font-bold text-[var(--teal)]">
              {totalUnread} unread
            </span>
          )}
        </div>
      )}

      {/* ── Conversation List (always visible) ── */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {/* Regular chats — always shown */}
        {unarchivedChats.length === 0 && !showArchived ? (
          <div className="flex flex-col items-center justify-center py-12 text-center p-6">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {search ? 'No results found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          unarchivedChats.map(chatItem => (
            <ConversationItem
              key={`${chatItem.type}-${chatItem.id}`}
              chat={chatItem}
              isActive={activeChat?.id === chatItem.id && activeChat?.type === chatItem.type}
              onClick={() => handleSelectChat(chatItem)}
              currentUserId={user?.id}
              isArchived={false}
              onArchive={() => handleArchiveChat(chatItem)}
              onUnarchive={() => handleUnarchiveChat(chatItem)}
              onBlock={chatItem.type === 'direct' ? () => handleBlockUser(chatItem.id) : undefined}
              isBlocked={isChatBlocked(chatItem)}
              onUnblock={chatItem.type === 'direct' ? () => handleUnblockUser(chatItem.id) : undefined}
              onLeave={chatItem.type === 'group' ? () => handleLeaveGroup(chatItem.id) : undefined}
            />
          ))
        )}

        {/* Archived chats — shown as a separate section below when toggled */}
        {showArchived && (
          <>
            <div
              className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--subtext)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--hover)' }}
            >
              📂 Archived Chats
            </div>
            {archivedChats.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs" style={{ color: 'var(--subtext)' }}>No archived chats</p>
              </div>
            ) : (
              archivedChats.map(chatItem => (
                <ConversationItem
                  key={`${chatItem.type}-${chatItem.id}`}
                  chat={chatItem}
                  isActive={activeChat?.id === chatItem.id && activeChat?.type === chatItem.type}
                  onClick={() => handleSelectChat(chatItem)}
                  currentUserId={user?.id}
                  isArchived={true}
                  onArchive={() => handleArchiveChat(chatItem)}
                  onUnarchive={() => handleUnarchiveChat(chatItem)}
                  onBlock={chatItem.type === 'direct' ? () => handleBlockUser(chatItem.id) : undefined}
                  isBlocked={isChatBlocked(chatItem)}
                  onUnblock={chatItem.type === 'direct' ? () => handleUnblockUser(chatItem.id) : undefined}
                  onLeave={chatItem.type === 'group' ? () => handleLeaveGroup(chatItem.id) : undefined}
                />
              ))
            )}
          </>
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

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          blockedUsers={blockedUsers}
          onUnblock={handleUnblockUser}
        />
      )}
    </div>
  );
}
