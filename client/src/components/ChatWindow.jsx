import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import Avatar from './Avatar';
import api from '../utils/api';
import { formatLastSeen, formatConversationTime } from '../utils/formatTime';
import { isToday, isYesterday, format } from 'date-fns';

// ── Date separator helper ──────────────────────────────────────────────────
function getDateLabel(date) {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

// ── Skeleton message row ───────────────────────────────────────────────────
function SkeletonBubble({ right = false }) {
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

export default function ChatWindow({ chat, onBack }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(null);
  const [chatInfo, setChatInfo] = useState(chat);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const isGroup = chat.type === 'group';

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (isGroup) {
        res = await api.get(`/groups/${chat.id}/messages`);
      } else {
        res = await api.get(`/messages/direct/${chat.id}`);
        socket?.emit('mark_read', { senderId: chat.id });
      }
      setMessages(res.data);
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  }, [chat.id, isGroup, socket]);

  useEffect(() => {
    loadMessages();
    setInput('');
    setTyping(null);
    if (isGroup) {
      api.get(`/groups/${chat.id}`).then(res => setChatInfo(res.data)).catch(() => {});
    } else {
      setChatInfo(chat);
    }
  }, [chat.id, chat.type]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, typing]);

  // Scroll FAB visibility
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollFab(distFromBottom > 200);
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (!isGroup && (msg.sender_id === chat.id || msg.receiver_id === chat.id)) {
        setMessages(prev => [...prev, msg]);
        socket.emit('mark_read', { senderId: msg.sender_id });
      }
    };
    const handleMessageSent = (msg) => {
      if (!isGroup && (msg.sender_id === user.id || msg.receiver_id === chat.id)) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };
    const handleNewGroupMessage = ({ groupId, message }) => {
      if (isGroup && parseInt(groupId) === chat.id) {
        setMessages(prev => {
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };
    const handleTypingStart = (data) => {
      if (data.userId === user.id) return;
      if (!isGroup && data.userId === chat.id) setTyping(data);
      if (isGroup && data.groupId === chat.id) setTyping(data);
    };
    const handleTypingStop = (data) => {
      if (!isGroup && data.userId === chat.id) setTyping(null);
      if (isGroup && data.groupId === chat.id) setTyping(null);
    };
    const handleMessagesRead = ({ byUserId }) => {
      if (!isGroup && byUserId === chat.id) {
        setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      }
    };
    const handleUserOnline = ({ userId, isOnline }) => {
      if (!isGroup && userId === chat.id) {
        setChatInfo(prev => ({ ...prev, is_online: isOnline }));
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('new_group_message', handleNewGroupMessage);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_online', handleUserOnline);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('new_group_message', handleNewGroupMessage);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_online', handleUserOnline);
    };
  }, [socket, chat.id, chat.type, isGroup, user.id]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket?.emit('typing_start', isGroup ? { groupId: chat.id } : { receiverId: chat.id });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket?.emit('typing_stop', isGroup ? { groupId: chat.id } : { receiverId: chat.id });
    }, 1500);
  };

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!input.trim() || !socket) return;
    const content = input.trim();
    setInput('');
    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    socket.emit('typing_stop', isGroup ? { groupId: chat.id } : { receiverId: chat.id });
    if (isGroup) {
      // Group: server broadcasts new_group_message to the room (including sender)
      socket.emit('send_group_message', { groupId: chat.id, content }, (res) => {
        if (res?.error) console.error(res.error);
      });
    } else {
      // Direct: server emits message_sent to sender socket.
      // Callback (res.message) is a safety fallback in case the event is missed.
      socket.emit('send_message', { receiverId: chat.id, content }, (res) => {
        if (res?.error) {
          console.error(res.error);
        } else if (res?.message) {
          // Fallback: add message if message_sent event hasn't already added it
          setMessages(prev => {
            if (prev.find(m => m.id === res.message.id)) return prev;
            return [...prev, res.message];
          });
        }
      });
    }
  };


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const name = isGroup ? chatInfo.name : chatInfo.username;
  const subtitle = isGroup
    ? `${chatInfo.members?.length || chatInfo.member_count || 0} members`
    : formatLastSeen(chatInfo.last_seen, chatInfo.is_online);

  // Build messages with date separators
  const messageRows = [];
  let lastDate = null;
  messages.forEach((msg, i) => {
    const dateLabel = getDateLabel(msg.created_at);
    if (dateLabel !== lastDate) {
      messageRows.push({ type: 'separator', id: `sep-${i}`, label: dateLabel });
      lastDate = dateLabel;
    }
    const prevMsg = messages[i - 1];
    const showSender = isGroup && msg.sender_id !== user.id &&
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
        {/* Back btn (mobile) */}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-full hover:bg-[var(--hover)] transition-colors"
          style={{ color: 'var(--subtext)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <Avatar name={name} color={chatInfo.avatar_color} size="md" isOnline={!isGroup && chatInfo.is_online} />

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--text)' }}>
            {name}
          </h2>
          <p className={`text-xs truncate ${chatInfo.is_online && !isGroup ? '' : ''}`}
             style={{ color: chatInfo.is_online && !isGroup ? 'var(--teal)' : 'var(--subtext)' }}>
            {typing ? (
              <span style={{ color: 'var(--teal)' }}>
                {isGroup ? `${typing.username} is typing…` : 'typing…'}
              </span>
            ) : subtitle}
          </p>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 ml-2">
          {/* Search placeholder */}
          <button
            className="p-2 rounded-full hover:bg-[var(--hover)] transition-colors hidden sm:flex"
            style={{ color: 'var(--subtext)' }}
            title="Search in chat (coming soon)"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:18,height:18}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {/* Video call placeholder */}
          <button
            className="p-2 rounded-full hover:bg-[var(--hover)] transition-colors hidden sm:flex"
            style={{ color: 'var(--subtext)' }}
            title="Video call (coming soon)"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:18,height:18}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </button>
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
        ) : messages.length === 0 ? (
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
                  isOwn={msg.sender_id === user.id}
                  showSender={showSender}
                />
              );
            })}
            {typing && <TypingIndicator username={isGroup ? typing.username : null} />}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Scroll-to-bottom FAB */}
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
        className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
        style={{ backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)' }}
      >
        {/* Attachment placeholder */}
        <button
          className="p-2 rounded-full hover:bg-[var(--hover)] transition-colors flex-shrink-0 hidden sm:flex"
          style={{ color: 'var(--subtext)' }}
          title="Attach file (coming soon)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Text input */}
        <div
          className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-2"
          style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}
        >
          {/* Emoji placeholder */}
          <button
            className="flex-shrink-0 mb-0.5"
            style={{ color: 'var(--subtext)' }}
            title="Emoji (coming soon)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
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

        {/* Send / Mic button */}
        <button
          id="send-btn"
          onClick={sendMessage}
          disabled={!input.trim()}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            input.trim()
              ? 'scale-100 shadow-md'
              : 'scale-95 opacity-80'
          }`}
          style={{
            background: input.trim()
              ? 'linear-gradient(135deg, var(--teal), var(--dark))'
              : 'var(--border)',
            color: input.trim() ? '#fff' : 'var(--subtext)',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
          }}
          title={input.trim() ? 'Send message' : 'Voice message (coming soon)'}
        >
          {input.trim() ? (
            <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
