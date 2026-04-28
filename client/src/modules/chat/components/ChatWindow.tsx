import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '../../../app/hooks';
import { useSocket } from '../../../context/SocketContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from '../../../shared/components/TypingIndicator';
import Avatar from '../../../shared/components/Avatar';
import api from '../../../app/services/axiosClient';
import { formatLastSeen } from '../../../shared/utils/formatTime';
import { isToday, isYesterday, format } from 'date-fns';
import { ChatItem, Message, User } from '../../../types/chat';

// ── Date separator helper ──────────────────────────────────────────────────
function getDateLabel(date: string) {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

// ── Skeleton message row ───────────────────────────────────────────────────
function SkeletonBubble({ right = false }: { right?: boolean }) {
  return (
    <div className={`flex ${right ? 'justify-end' : 'justify-start'} px-4 py-1.5`}>
      <div className="flex flex-col gap-1" style={{ maxWidth: '55%' }}>
        <div
          className="skeleton h-4 rounded-full"
          style={{ width: `${Math.floor(Math.random() * 80 + 80)}px` }}
        />
        <div
          className="skeleton h-3 rounded-full"
          style={{ width: `${Math.floor(Math.random() * 60 + 40)}px` }}
        />
      </div>
    </div>
  );
}

interface ChatWindowProps {
  chat: ChatItem;
  onBack: () => void;
}

export default function ChatWindow({ chat, onBack }: ChatWindowProps) {
  const { user } = useAppSelector((state) => state.auth);
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [typing, setTyping] = useState<{ username: string; userId: number } | null>(null);
  const [chatInfo, setChatInfo] = useState<ChatItem>(chat);
  const [showScrollFab, setShowScrollFab] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const prevScrollHeightRef = useRef<number>(0);

  const isGroup = chat.type === 'group';

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = useCallback(async (beforeId: number | null = null) => {
    if (beforeId) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = { limit: 50, beforeId };
      let res;
      if (isGroup) {
        res = await api.get(`/groups/${chat.id}/messages`, { params });
        if (!beforeId) socket?.emit('mark_group_read', { groupId: chat.id });
      } else {
        res = await api.get(`/messages/direct/${chat.id}`, { params });
        if (!beforeId) socket?.emit('mark_read', { senderId: chat.id });
      }

      if (res.data.length < 50) setHasMore(false);
      else setHasMore(true);

      if (beforeId) {
        // Remember scroll height before prepending
        if (messagesContainerRef.current) {
          prevScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
        }
        setMessages(prev => [...res.data, ...prev]);
      } else {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [chat.id, isGroup, socket]);

  // Adjust scroll after loading more
  useEffect(() => {
    if (loadingMore && messagesContainerRef.current && prevScrollHeightRef.current) {
      const newScrollHeight = messagesContainerRef.current.scrollHeight;
      messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
    }
  }, [messages, loadingMore]);

  useEffect(() => {
    loadMessages();
    setInput('');
    setTyping(null);
    if (isGroup) {
      api.get(`/groups/${chat.id}`).then(res => setChatInfo({ ...res.data, type: 'group', username: res.data.name })).catch(() => {});
    } else {
      setChatInfo(chat);
    }
  }, [chat.id, chat.type]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, typing]);

  // Scroll handling
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;

    // Show FAB
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollFab(distFromBottom > 200);

    // Load more if at top
    if (el.scrollTop < 100 && hasMore && !loadingMore && !loading) {
      const oldestId = messages[0]?.id;
      if (oldestId) {
        loadMessages(oldestId);
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (!isGroup && (msg.sender_id === chat.id || msg.receiver_id === chat.id)) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        socket.emit('mark_read', { senderId: msg.sender_id });
      }
    };
    const handleMessageSent = (msg: Message) => {
      if (!isGroup && (msg.sender_id === (user as User).id || msg.receiver_id === chat.id)) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };
    const handleNewGroupMessage = ({ groupId, message }: { groupId: string; message: Message }) => {
      if (isGroup && groupId === chat.id) {
        setMessages(prev => {
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        socket?.emit('mark_group_read', { groupId: chat.id });
      }
    };
    const handleTypingStart = (data: { userId: number; username: string; groupId?: number }) => {
      if (data.userId === (user as User).id) return;
      if (!isGroup && data.userId === chat.id) setTyping({ username: data.username, userId: data.userId });
      if (isGroup && data.groupId === chat.id) setTyping({ username: data.username, userId: data.userId });
    };
    const handleTypingStop = (data: { userId: number; groupId?: number }) => {
      if (!isGroup && data.userId === chat.id) setTyping(null);
      if (isGroup && data.groupId === chat.id) setTyping(null);
    };
    const handleMessagesRead = ({ byUserId }: { byUserId: number }) => {
      if (!isGroup && byUserId === chat.id) {
        setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      }
    };
    const handleUserOnline = ({ userId, isOnline }: { userId: number; isOnline: boolean }) => {
      if (!isGroup && userId === chat.id) {
        setChatInfo(prev => ({ ...prev, is_online: isOnline }));
      }
    };
    const handleMessageEdited = ({ messageId, content }: { messageId: number; content: string }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, is_edited: true } : m));
    };
    const handleMessageDeleted = ({ messageId }: { messageId: number }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: '', is_deleted: true } : m));
    };
    const handleReactionUpdated = ({ messageId, reactions }: { messageId: number; reactions: any[] }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('new_group_message', handleNewGroupMessage);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_online', handleUserOnline);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('reaction_updated', handleReactionUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('new_group_message', handleNewGroupMessage);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_online', handleUserOnline);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('reaction_updated', handleReactionUpdated);
    };
  }, [socket, chat.id, chat.type, isGroup, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket?.emit('typing_start', isGroup ? { groupId: chat.id } : { receiverId: chat.id });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket?.emit('typing_stop', isGroup ? { groupId: chat.id } : { receiverId: chat.id });
    }, 1500);
  };

  const sendMessage = (e?: React.FormEvent, media: any = null) => {
    e?.preventDefault();
    if (!input.trim() && !media) return;
    if (!socket) return;
    const content = input.trim();

    if (editingMessage && !media) {
      socket.emit('edit_message', { messageId: editingMessage.id, content }, (res: any) => {
        if (res.error) console.error(res.error);
        else setEditingMessage(null);
      });
      setInput('');
      return;
    }

    const payload: any = { content: content || null };
    if (replyingTo) payload.repliedToId = replyingTo.id;
    if (media) payload.media = media;

    setInput('');
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    socket.emit('typing_stop', isGroup ? { groupId: chat.id } : { receiverId: chat.id });

    if (isGroup) {
      socket.emit('send_group_message', { ...payload, groupId: chat.id }, (res: { error?: string }) => {
        if (res?.error) console.error(res.error);
        else setReplyingTo(null);
      });
    } else {
      socket.emit('send_message', { ...payload, receiverId: chat.id }, (res: { error?: string; message?: Message }) => {
        if (res?.error) {
          console.error(res.error);
        } else {
          setReplyingTo(null);
        }
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      sendMessage(undefined, res.data);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReply = (msg: Message) => {
    setEditingMessage(null);
    setReplyingTo(msg);
    document.getElementById('message-input')?.focus();
  };

  const handleEdit = (msg: Message) => {
    setReplyingTo(null);
    setEditingMessage(msg);
    setInput(msg.content);
    document.getElementById('message-input')?.focus();
  };

  const handleDelete = (msg: Message) => {
    if (window.confirm('Delete this message for everyone?')) {
      socket?.emit('delete_message', { messageId: msg.id });
    }
  };

  const handleReaction = (msg: Message, emoji: string) => {
    const existing = msg.reactions?.find(r => r.reaction === emoji && r.user_id === user?.id);
    socket?.emit('toggle_reaction', { messageId: msg.id, reaction: emoji, isRemoving: !!existing });
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const name = isGroup ? (chatInfo as any).name : (chatInfo as any).display_name || (chatInfo as any).username;
  const subtitle = isGroup
    ? `${(chatInfo as any).members?.length || (chatInfo as any).member_count || 0} members`
    : formatLastSeen((chatInfo as any).last_seen, (chatInfo as any).is_online);

  const messageRows: any[] = [];
  let lastDate: string | null = null;
  messages.forEach((msg, i) => {
    const dateLabel = getDateLabel(msg.created_at);
    if (dateLabel !== lastDate) {
      messageRows.push({ type: 'separator', id: `sep-${i}`, label: dateLabel });
      lastDate = dateLabel;
    }
    const prevMsg = messages[i - 1];
    const showSender = isGroup && msg.sender_id !== (user as User).id &&
      (!prevMsg || prevMsg.sender_id !== msg.sender_id);
    messageRows.push({ type: 'message', msg, showSender });
  });

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0 shadow-sm"
        style={{ backgroundColor: 'var(--panel)', borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-full hover:bg-[var(--hover)] transition-colors"
          style={{ color: 'var(--subtext)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <Avatar name={name} color={chatInfo.avatar_color} size="md" />

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--text)' }}>
            {name}
          </h2>
          <p className="text-xs truncate"
             style={{ color: (chatInfo as any).is_online && !isGroup ? 'var(--teal)' : 'var(--subtext)' }}>
            {typing ? (
              <span style={{ color: 'var(--teal)' }}>
                {isGroup ? `${typing.username} is typing…` : 'typing…'}
              </span>
            ) : subtitle}
          </p>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3 relative chat-bg"
      >
        {loading ? (
          <div className="flex flex-col gap-2 pt-4">
            {Array.from({ length: 7 }, (_, i) => (
              <SkeletonBubble key={i} right={i % 3 === 0} />
            ))}
          </div>
        ) : (
          <>
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(18,140,126,0.1)' }}
            >
              <svg className="w-10 h-10" style={{ color: 'var(--teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
              No messages yet
            </p>
            <p className="text-xs" style={{ color: 'var(--subtext)' }}>
              Say hi to {name}! 👋
            </p>
          </div>
        ) : (
          <>
            {messageRows.map((row) => {
              if (row.type === 'separator') {
                return (
                  <div key={row.id} className="date-sep">
                    <span className="bg-[var(--panel)] px-3 py-0.5 rounded-full text-[10px]"
                          style={{ color: 'var(--subtext)' }}>
                      {row.label}
                    </span>
                  </div>
                );
              }
              const { msg, showSender } = row;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === (user as User).id}
                  showSender={showSender}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReaction={handleReaction}
                />
              );
            })}
            {typing && <TypingIndicator username={isGroup ? typing.username : null} />}
            <div ref={messagesEndRef} />
          </>
            )}
          </>
        )}

        {showScrollFab && (
          <button
            className="scroll-fab"
            onClick={() => scrollToBottom('smooth')}
            title="Scroll to bottom"
          >
            <svg className="w-4 h-4" style={{ color: 'var(--subtext)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Input Bar ── */}
      <div
        className="flex flex-col flex-shrink-0"
        style={{ backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)' }}
      >
        {/* Reply/Edit Preview */}
        {(replyingTo || editingMessage) && (
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--hover)] border-b border-[var(--border)] animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-1 h-8 bg-[var(--teal)] rounded-full" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--teal)' }}>
                  {editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.sender_username}`}
                </span>
                <span className="text-xs truncate opacity-70" style={{ color: 'var(--text)' }}>
                  {editingMessage ? editingMessage.content : replyingTo?.content}
                </span>
              </div>
            </div>
            <button 
              onClick={() => { setReplyingTo(null); setEditingMessage(null); if (editingMessage) setInput(''); }} 
              className="p-1.5 rounded-full hover:bg-[var(--border)] transition-colors"
            >
              <svg className="w-4 h-4" style={{ color: 'var(--subtext)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 px-4 py-3">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-[var(--hover)] transition-colors flex-shrink-0 disabled:opacity-50"
            style={{ color: 'var(--subtext)' }}
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
          <div
            className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-2"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}
          >
            <textarea
              id="message-input"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              rows={1}
              className="flex-1 outline-none text-sm resize-none max-h-32 overflow-y-auto bg-transparent leading-relaxed"
              style={{ color: 'var(--text)', lineHeight: '1.5' }}
            />
          </div>

          <button
            id="send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              input.trim() ? 'scale-100 shadow-md' : 'scale-95 opacity-80'
            }`}
            style={{
              background: input.trim()
                ? 'linear-gradient(135deg, var(--teal), var(--dark))'
                : 'var(--border)',
              color: input.trim() ? '#fff' : 'var(--subtext)',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
