import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { setActiveChat } from '../store/chat.slice';
import { requestNotificationPermission } from '../../../app/services/notification.service';
import { useEffect, useState } from 'react';
import { useSocket } from '../../../context/SocketContext';
import CallModal from '../components/CallModal';
import IncomingCallModal from '../components/IncomingCallModal';
import { toast } from 'react-toastify';

const FEATURES = [
  { icon: '💬', title: 'Real-time messaging', desc: 'Instant delivery via WebSocket' },
  { icon: '👥', title: 'Groups & direct chats', desc: 'Create groups or chat 1-on-1' },
  { icon: '✅', title: 'Read receipts', desc: 'Know when your messages are seen' },
  { icon: '🌙', title: 'Dark mode', desc: 'Easy on the eyes, day or night' },
];

function EmptyState() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      const q = gsap.utils.selector(containerRef.current);
      gsap.from(q('.logo-animate'), {
        y: -50,
        opacity: 0,
        duration: 1,
        ease: 'elastic.out(1, 0.75)'
      });
      gsap.from(q('.feature-card'), {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        delay: 0.2,
        ease: 'power3.out'
      });
      gsap.from(q('.footer-animate'), {
        opacity: 0,
        duration: 1,
        delay: 0.8
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center h-full text-center px-8 select-none"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="logo-animate w-32 h-32 rounded-full flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--teal), var(--dark))',
          animation: 'breathe 4s ease-in-out infinite',
        }}
      >
        <div className="absolute inset-0 bg-white/10 blur-xl animate-pulse" />
        <svg viewBox="0 0 48 48" className="w-16 h-16 relative z-10" style={{ fill: '#fff' }}>
          <path d="M24 4C12.95 4 4 12.95 4 24c0 3.57.93 6.91 2.55 9.8L4 44l10.47-2.52C17.2 43.11 20.52 44 24 44c11.05 0 20-8.95 20-20S35.05 4 24 4zm9.35 23.2c-.51-.25-3.02-1.49-3.49-1.66-.47-.17-.81-.25-1.15.25-.34.51-1.32 1.66-1.62 2-.3.34-.59.38-1.1.13-3.14-1.57-5.2-2.8-7.28-6.35-.55-.95.55-.88 1.57-2.92.17-.34.08-.63-.04-.88-.13-.25-1.15-2.77-1.57-3.79-.41-.99-.84-.85-1.15-.87-.3-.02-.64-.02-.98-.02-.34 0-.89.13-1.36.63-.47.51-1.78 1.74-1.78 4.25 0 2.51 1.82 4.93 2.07 5.27.25.34 3.58 5.47 8.68 7.67 5.1 2.2 5.1 1.47 6.02 1.38.92-.09 2.98-1.22 3.4-2.4.42-1.18.42-2.19.3-2.4-.13-.21-.47-.34-.98-.59z"/>
        </svg>
      </div>

      <h2 className="text-3xl font-bold mb-3 tracking-tight" style={{ color: 'var(--text)' }}>
        Connect Instantly
      </h2>
      <p className="text-[15px] leading-relaxed mb-10 max-w-sm opacity-70" style={{ color: 'var(--subtext)' }}>
        Select a conversation from the sidebar to start messaging. Your chats are encrypted and secure.
      </p>

      <div className="grid grid-cols-2 gap-4 max-w-md w-full">
        {FEATURES.map(f => (
          <div
            key={f.icon}
            className="feature-card flex flex-col items-center gap-2 p-5 rounded-2xl text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-default border border-[var(--border)] shadow-sm"
            style={{ background: 'var(--panel)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-1 shadow-sm" style={{ background: 'var(--bg)' }}>
              {f.icon}
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{f.title}</p>
            <p className="text-[11px] leading-snug opacity-70" style={{ color: 'var(--subtext)' }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="footer-animate flex items-center gap-2 mt-12 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--panel)]">
        <svg className="w-4 h-4" style={{ color: 'var(--teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-[11px] font-medium" style={{ color: 'var(--subtext)' }}>
          End-to-end encrypted messaging
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const dispatch = useAppDispatch();
  const activeChat = useAppSelector((state) => state.chat.activeChat);
  const { socket } = useSocket();

  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [outgoingCall, setOutgoingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);

  useEffect(() => {
    // We no longer request notification permission on mount to avoid browser violations.
    // Permission should be requested in response to a user gesture.
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleCallReceived = (data: any) => {
      setIncomingCall(data);
    };

    const handleCallError = ({ message }: { message: string }) => {
      toast.error(message);
      setOutgoingCall(null);
    };

    socket.on('call_received', handleCallReceived);
    socket.on('call_error', handleCallError);

    return () => {
      socket.off('call_received', handleCallReceived);
      socket.off('call_error', handleCallError);
    };
  }, [socket]);

  const startCall = (type: 'voice' | 'video') => {
    if (!activeChat || activeChat.type === 'group') return;
    setOutgoingCall({
      targetUser: activeChat,
      type
    });
  };

  const handleAcceptCall = () => {
    const caller = {
      id: incomingCall.from,
      username: incomingCall.fromName,
      avatar_color: '#128c7e' // Fallback
    };
    setActiveCall({
      targetUser: caller,
      isIncoming: true,
      initialOffer: incomingCall.offer,
      type: incomingCall.type
    });
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    socket?.emit('reject_call', { to: incomingCall.from });
    setIncomingCall(null);
  };

  const handleSelectChat = (chat: any) => {
    dispatch(setActiveChat(chat));
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <div
        className={`${activeChat ? 'hidden md:flex' : 'flex'} md:w-[340px] lg:w-[380px] w-full flex-col flex-shrink-0`}
      >
        <Sidebar activeChat={activeChat} onSelectChat={handleSelectChat} />
      </div>

      {/* Chat Panel */}
      <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {activeChat ? (
          <ChatWindow
            key={`${activeChat.type}-${activeChat.id}`}
            chat={activeChat}
            onBack={() => dispatch(setActiveChat(null))}
            onStartCall={startCall}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Call Modals */}
      {incomingCall && (
        <IncomingCallModal
          caller={{
            username: incomingCall.fromName,
            avatar_color: '#128c7e'
          }}
          type={incomingCall.type}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {outgoingCall && (
        <CallModal
          targetUser={outgoingCall.targetUser}
          isIncoming={false}
          type={outgoingCall.type}
          onEnd={() => setOutgoingCall(null)}
        />
      )}

      {activeCall && (
        <CallModal
          targetUser={activeCall.targetUser}
          isIncoming={true}
          initialOffer={activeCall.initialOffer}
          type={activeCall.type}
          onEnd={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
