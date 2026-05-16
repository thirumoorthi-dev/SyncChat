import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { useAppSelector } from '../../../app/hooks';
import { useSocket } from '../../../context/SocketContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from '../../../shared/components/TypingIndicator';
import Avatar from '../../../shared/components/Avatar';
import api from '../../../app/services/axiosClient';
import { formatLastSeen, formatMessageTime } from '../../../shared/utils/formatTime';
import { isToday, isYesterday, format } from 'date-fns';
import { ChatItem, Message, User } from '../../../types/chat';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import ForwardModal from './ForwardModal';
import ContactInfoPanel from './ContactInfoPanel';
import Lightbox from './Lightbox';
import { toast } from 'react-toastify';

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
  onStartCall: (type: 'voice' | 'video') => void;
}

export default function ChatWindow({ chat, onBack, onStartCall }: ChatWindowProps) {
  const { user } = useAppSelector((state) => state.auth);
  const { socket } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [typing, setTyping] = useState<{ username: string; userId: string } | null>(null);
  const [chatInfo, setChatInfo] = useState<ChatItem>(chat);
  const [showScrollFab, setShowScrollFab] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState<boolean>(false);
  const [fileAccept, setFileAccept] = useState<string>('*/*');
  const [unreadInChat, setUnreadInChat] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [chatsForForward, setChatsForForward] = useState<ChatItem[]>([]);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [activeLightbox, setActiveLightbox] = useState<{ url: string; type: 'image' | 'video' | 'document' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const prevScrollHeightRef = useRef<number>(0);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  const isGroup = chat.type === 'group';
  const name = isGroup ? (chatInfo as any).name : (chatInfo as any).display_name || (chatInfo as any).username;
  const subtitle = isGroup 
    ? `${(chatInfo as any).member_count || (chatInfo as any).members?.length || 0} members` 
    : formatLastSeen((chatInfo as any).last_seen, (chatInfo as any).is_online);
  const isArchived = (chat as any).is_archived;
  const isBlocked = (chat as any).is_blocked;

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = useCallback(async (beforeId: string | null = null) => {
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
    setShowInfo(false);
    if (isGroup) {
      api.get(`/groups/${chat.id}`).then(res => {
        setChatInfo({ ...res.data, type: 'group', username: res.data.name });
      }).catch(() => { });
    } else {
      setChatInfo(chat);
    }
  }, [chat.id, chat.type, loadMessages]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, typing]);

  useLayoutEffect(() => {
    if (showEmojiPicker && emojiPickerRef.current) {
      gsap.fromTo(emojiPickerRef.current, 
        { opacity: 0, y: 20, scale: 0.9, transformOrigin: 'bottom left' },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
  }, [showEmojiPicker]);

  useLayoutEffect(() => {
    if (showAttachmentMenu && attachmentMenuRef.current) {
      gsap.fromTo(attachmentMenuRef.current, 
        { opacity: 0, y: 20, scale: 0.9, transformOrigin: 'bottom left' },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
  }, [showAttachmentMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      // Close attachment menu if clicked outside
      // We check if it's not the plus button itself and not within the menu
      const plusBtn = document.querySelector('[data-plus-btn]');
      const isInsideMenu = attachmentMenuRef.current?.contains(event.target as Node);
      if (showAttachmentMenu && plusBtn && !plusBtn.contains(event.target as Node) && !isInsideMenu) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachmentMenu]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = distFromBottom < 50;
    setShowScrollFab(distFromBottom > 200);
    if (isAtBottom) setUnreadInChat(0);
    if (el.scrollTop < 100 && hasMore && !loadingMore && !loading) {
      const oldestId = messages[0]?.id;
      if (oldestId) loadMessages(oldestId);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (!isGroup && (msg.sender_id === chat.id || msg.receiver_id === chat.id)) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        socket.emit('mark_read', { senderId: msg.sender_id });
        const el = messagesContainerRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight > 100) {
          setUnreadInChat(prev => prev + 1);
        }
      }
    };

    const handleMessageSent = (msg: Message) => {
      if (!isGroup && (msg.sender_id === (user as User).id || msg.receiver_id === chat.id)) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
    };

    const handleNewGroupMessage = ({ groupId, message }: { groupId: string; message: Message }) => {
      if (isGroup && groupId === chat.id) {
        setMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
        socket?.emit('mark_group_read', { groupId: chat.id });
        const el = messagesContainerRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight > 100) {
          setUnreadInChat(prev => prev + 1);
        }
      }
    };

    const handleTypingStart = (data: { userId: string; username: string; groupId?: string }) => {
      if (data.userId === (user as User).id) return;
      if (!isGroup && data.userId === chat.id) setTyping({ username: data.username, userId: data.userId });
      if (isGroup && data.groupId === chat.id) setTyping({ username: data.username, userId: data.userId });
    };

    const handleTypingStop = (data: { userId: string; groupId?: string }) => {
      if (!isGroup && data.userId === chat.id) setTyping(null);
      if (isGroup && data.groupId === chat.id) setTyping(null);
    };

    const handleMessagesRead = ({ byUserId }: { byUserId: string }) => {
      if (!isGroup && byUserId === chat.id) {
        setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      }
    };

    const handleUserOnline = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      if (!isGroup && userId === chat.id) setChatInfo(prev => ({ ...prev, is_online: isOnline }));
    };

    const handleMessageEdited = ({ messageId, content }: { messageId: string; content: string }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, is_edited: true } : m));
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: '', is_deleted: true } : m));
    };

    const handleReactionUpdated = ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    };

    const handleMessageDelivered = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_delivered: true } : m));
    };

    const handleMessagesDelivered = ({ byUserId }: { byUserId: string }) => {
      if (!isGroup && byUserId === chat.id) {
        setMessages(prev => prev.map(m => ({ ...m, is_delivered: true })));
      }
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
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('messages_delivered', handleMessagesDelivered);

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
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('messages_delivered', handleMessagesDelivered);
    };
  }, [socket, chat.id, isGroup, user]);

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
        if (!res.error) setEditingMessage(null);
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
      socket.emit('send_group_message', { ...payload, groupId: chat.id }, (res: any) => {
        if (!res?.error) setReplyingTo(null);
      });
    } else {
      socket.emit('send_message', { ...payload, receiverId: chat.id }, (res: any) => {
        if (!res?.error) setReplyingTo(null);
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
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      sendMessage(undefined, res.data);
    } catch (err) {
      toast.error('Upload failed');
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
    if (window.confirm('Delete message?')) {
      socket?.emit('delete_message', { messageId: msg.id });
    }
  };

  const handleReaction = (msg: Message, emoji: string) => {
    const existing = msg.reactions?.find(r => r.reaction === emoji && r.user_id === user?.id);
    socket?.emit('toggle_reaction', { messageId: msg.id, reaction: emoji, isRemoving: !!existing });
  };

  const handleEmojiSelect = (emoji: any) => {
    setInput(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const triggerFileSelect = (accept: string) => {
    setFileAccept(accept);
    setShowAttachmentMenu(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get('/messages/search', {
        params: { q: query, chatId: chat.id, isGroup }
      });
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const jumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-flash');
      setTimeout(() => el.classList.remove('highlight-flash'), 2000);
    }
  };

  const handleForwardClick = async (msg: Message) => {
    setForwardingMessage(msg);
    try {
      const [convRes, groupRes] = await Promise.all([
        api.get('/contacts'),
        api.get('/groups')
      ]);
      const all = [
        ...convRes.data.map((c: any) => ({ ...c, type: 'direct' as const })),
        ...groupRes.data.map((g: any) => ({ ...g, type: 'group' as const }))
      ];
      setChatsForForward(all);
    } catch (err) {
      console.error(err);
    }
  };

  const executeForward = (selectedChats: ChatItem[]) => {
    if (!forwardingMessage || !socket) return;
    selectedChats.forEach(targetChat => {
      socket.emit('send_message', {
        receiverId: targetChat.type === 'direct' ? targetChat.id : undefined,
        groupId: targetChat.type === 'group' ? targetChat.id : undefined,
        content: forwardingMessage.content,
        media: forwardingMessage.media_url ? {
          url: forwardingMessage.media_url,
          mimeType: forwardingMessage.media_mime_type,
          size: forwardingMessage.media_size_bytes,
          filename: forwardingMessage.media_filename,
          thumbnailUrl: forwardingMessage.media_thumbnail_url
        } : undefined
      });
    });
    setForwardingMessage(null);
    toast.success(`Forwarded to ${selectedChats.length} chats`);
  };

  const handleBlockInPanel = async () => {
    if (confirm(`Block ${name}?`)) {
      try {
        await api.post(`/management/block/${chat.id}`);
        toast.success('Blocked');
        onBack();
      } catch (err) {
        toast.error('Error');
      }
    }
  };

  const handleArchiveInPanel = async () => {
    try {
      await api.post('/management/archive', {
        targetUserId: !isGroup ? chat.id : undefined,
        groupId: isGroup ? chat.id : undefined
      });
      toast.success('Archived');
      onBack();
    } catch (err) {
      toast.error('Error');
    }
  };

  const handleUnarchive = async () => {
    try {
      await api.delete('/management/archive', {
        data: { targetUserId: !isGroup ? chat.id : undefined, groupId: isGroup ? chat.id : undefined }
      });
      toast.success('Unarchived');
      onBack();
    } catch (err) { toast.error('Error'); }
  };

  const handleUnblock = async () => {
    try {
      await api.delete(`/management/block/${chat.id}`);
      toast.success('Unblocked');
      onBack();
    } catch (err) { toast.error('Error'); }
  };

  const messageRows: any[] = [];
  let lastDate: string | null = null;
  messages.forEach((msg, i) => {
    const dateLabel = getDateLabel(msg.created_at);
    if (dateLabel !== lastDate) {
      messageRows.push({ type: 'separator', id: `sep-${i}`, label: dateLabel });
      lastDate = dateLabel;
    }
    const prevMsg = messages[i - 1];
    const showSender = isGroup && msg.sender_id !== (user as User).id && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
    messageRows.push({ type: 'message', msg, showSender });
  });

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0 shadow-sm z-20"
        style={{ backgroundColor: 'var(--header)', borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onBack}
          className="md:hidden p-2 rounded-full hover:bg-[var(--hover)] transition-colors"
          style={{ color: 'var(--subtext)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <Avatar name={name} color={chatInfo.avatar_color} size="md" />

        <div className="flex-1 min-w-0 cursor-pointer group" onClick={() => setShowInfo(!showInfo)}>
          <h2 className="font-bold text-[15px] tracking-tight leading-tight group-hover:text-[var(--teal)] transition-colors" style={{ color: 'var(--text)' }}>
            {name}
          </h2>
          <p className="text-[11px] font-medium truncate" style={{ color: (chatInfo as any).is_online && !isGroup ? 'var(--teal)' : 'var(--subtext)' }}>
            {typing ? (
              <span className="animate-pulse" style={{ color: 'var(--teal)' }}>
                {isGroup ? `${typing.username} is typing…` : 'typing…'}
              </span>
            ) : subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {!isGroup && (
            <>
              <button
                onClick={() => onStartCall('voice')}
                className="p-2 rounded-full hover:bg-[var(--hover)] transition-colors"
                style={{ color: 'var(--subtext)' }}
                title="Voice Call"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button
                onClick={() => onStartCall('video')}
                className="p-2 rounded-full hover:bg-[var(--hover)] transition-colors"
                style={{ color: 'var(--subtext)' }}
                title="Video Call"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={() => setIsSearching(!isSearching)}
            className="p-2 rounded-full hover:bg-[var(--hover)] transition-colors"
            style={{ color: isSearching ? 'var(--teal)' : 'var(--subtext)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-full hover:bg-[var(--hover)] transition-colors"
            style={{ color: showInfo ? 'var(--teal)' : 'var(--subtext)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      {isSearching && (
        <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--panel)] z-10 animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <input
              autoFocus
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl outline-none text-sm"
              style={{ background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--subtext)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto divide-y divide-[var(--border)]">
              {searchResults.map(m => (
                <button
                  key={m.id}
                  onClick={() => jumpToMessage(m.id)}
                  className="w-full text-left px-2 py-2 hover:bg-[var(--hover)] transition-colors rounded-lg overflow-hidden"
                >
                  <p className="text-[10px] font-bold" style={{ color: 'var(--teal)' }}>
                    {m.sender_username} • {formatMessageTime(m.created_at)}
                  </p>
                  <p className="text-xs truncate opacity-70" style={{ color: 'var(--text)' }}>
                    {m.content}
                  </p>
                </button>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <p className="text-[10px] text-center mt-2" style={{ color: 'var(--subtext)' }}>No results found</p>
          )}
        </div>
      )}

      {/* ── Main Content Container ── */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* ── Messages area ── */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar chat-bg"
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No messages yet</p>
                    <p className="text-xs" style={{ color: 'var(--subtext)' }}>Say hi to {name}! 👋</p>
                  </div>
                ) : (
                  <>
                    {messageRows.map((row, idx) => {
                      if (row.type === 'separator') {
                        return (
                          <div key={row.id} className="date-sep my-4">
                            <span className="bg-[var(--panel)] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-[var(--border)]" style={{ color: 'var(--subtext)' }}>
                              {row.label}
                            </span>
                          </div>
                        );
                      }
                      const { msg, showSender } = row;
                      const prevMsg = idx > 0 && messageRows[idx - 1].type === 'message' ? messageRows[idx - 1].msg : null;
                      const isNewGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                      return (
                        <div 
                          key={msg.id} 
                          id={`msg-${msg.id}`}
                          className={isNewGroup ? 'mt-4' : 'mt-1'}
                        >
                          <MessageBubble
                            message={msg}
                            isOwn={msg.sender_id === (user as User).id}
                            showSender={showSender}
                            onReply={handleReply}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onReaction={handleReaction}
                            onForward={handleForwardClick}
                            onMediaClick={(url, type) => setActiveLightbox({ url, type })}
                            highlight={searchQuery}
                          />
                        </div>
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
                onClick={() => {
                  scrollToBottom('smooth');
                  setUnreadInChat(0);
                }}
              >
                {unreadInChat > 0 && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[var(--teal)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
                    {unreadInChat}
                  </span>
                )}
                <svg className="w-4 h-4" style={{ color: 'var(--subtext)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* ── Status Banner (Archived/Blocked) ── */}
          {(isArchived || isBlocked) && (
            <div className="px-4 py-2 bg-[var(--hover)] border-t border-[var(--border)] flex items-center justify-between animate-in slide-in-from-bottom-2">
              <p className="text-xs font-medium" style={{ color: 'var(--subtext)' }}>
                {isArchived ? 'This chat is archived' : 'This contact is blocked'}
              </p>
              <button
                onClick={isArchived ? handleUnarchive : handleUnblock}
                className="text-xs font-bold px-3 py-1 rounded-lg bg-[var(--teal)] text-white hover:opacity-90"
              >
                {isArchived ? 'Unarchive' : 'Unblock'}
              </button>
            </div>
          )}

          {/* ── Input Bar ── */}
          {!isBlocked && (
            <div
              className="flex flex-col flex-shrink-0"
              style={{ backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)' }}
            >
              {(replyingTo || editingMessage) && (
                <div className="flex items-center justify-between px-4 py-2 bg-[var(--hover)] border-b border-[var(--border)] animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-1 h-8 bg-[var(--teal)] rounded-full" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--teal)' }}>
                        {editingMessage ? 'Editing Message' : 'Replying'}
                      </span>
                      <span className="text-xs truncate opacity-70" style={{ color: 'var(--text)' }}>
                        {editingMessage ? editingMessage.content : replyingTo?.content}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setEditingMessage(null);
                      if (editingMessage) setInput('');
                    }}
                    className="p-1.5 rounded-full hover:bg-[var(--border)] transition-colors"
                  >
                    <svg className="w-4 h-4" style={{ color: 'var(--subtext)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Input Area */}
              <div 
                className="flex items-end gap-2 px-4 py-3 relative"
                style={{ backgroundColor: 'var(--received)' }}
              >
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute bottom-full left-4 z-50 mb-2 shadow-2xl">
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                      previewPosition="none"
                      skinTonePosition="none"
                    />
                  </div>
                )}

                {showAttachmentMenu && (
                  <div
                    ref={attachmentMenuRef}
                    className="absolute bottom-full left-4 z-50 mb-4 bg-[var(--panel)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden"
                    style={{ width: '220px' }}
                  >
                    <div className="p-2 flex flex-col gap-1">
                      <button
                        onClick={() => triggerFileSelect('image/*,video/*')}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--hover)] transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Photos & Videos</p>
                          <p className="text-[10px]" style={{ color: 'var(--subtext)' }}>Send media from gallery</p>
                        </div>
                      </button>

                      <button
                        onClick={() => triggerFileSelect('.pdf,.doc,.docx,.txt,.zip')}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--hover)] transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Document</p>
                          <p className="text-[10px]" style={{ color: 'var(--subtext)' }}>Send files and archives</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowAttachmentMenu(false);
                          toast.info('Feature coming soon!');
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--hover)] transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Contact</p>
                          <p className="text-[10px]" style={{ color: 'var(--subtext)' }}>Share contact info</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} accept={fileAccept} />
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    data-plus-btn
                    onClick={() => {
                      setShowAttachmentMenu(!showAttachmentMenu);
                      setShowEmojiPicker(false);
                    }}
                    disabled={uploading}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 disabled:opacity-50 ${showAttachmentMenu ? 'bg-[var(--teal)] text-white rotate-45 shadow-lg shadow-teal-500/30' : 'hover:bg-[var(--hover)]'}`}
                    style={{ color: showAttachmentMenu ? '#fff' : 'var(--subtext)' }}
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowAttachmentMenu(false);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--hover)] transition-all duration-200 flex-shrink-0"
                    style={{ color: showEmojiPicker ? 'var(--teal)' : 'var(--subtext)' }}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                <div
                  className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-2 transition-all duration-200 focus-within:shadow-inner"
                  style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}
                >
                  <textarea
                    id="message-input"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 outline-none text-[14.5px] resize-none max-h-32 overflow-y-auto bg-transparent leading-relaxed"
                    style={{ color: 'var(--text)', lineHeight: '1.5' }}
                  />
                </div>

                 <button
                  id="send-btn"
                  onClick={() => input.trim() ? sendMessage() : null}
                  className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 flex-shrink-0 ${input.trim() ? 'bg-[var(--teal)] text-white shadow-lg shadow-teal-500/20 scale-100' : 'text-[var(--subtext)] hover:bg-[var(--hover)]'}`}
                >
                  {input.trim() ? (
                    <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Info Panel ── */}
        {showInfo && (
          <ContactInfoPanel
            chat={chat}
            onClose={() => setShowInfo(false)}
            onBlock={handleBlockInPanel}
            onArchive={handleArchiveInPanel}
            onMediaClick={(url, type) => setActiveLightbox({ url, type })}
          />
        )}
      </div>

      {/* ── Forward Modal ── */}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          conversations={chatsForForward}
          onClose={() => setForwardingMessage(null)}
          onForward={executeForward}
        />
      )}

      {activeLightbox && (
        <Lightbox
          url={activeLightbox.url}
          type={activeLightbox.type}
          onClose={() => setActiveLightbox(null)}
        />
      )}
    </div>
  );
}
