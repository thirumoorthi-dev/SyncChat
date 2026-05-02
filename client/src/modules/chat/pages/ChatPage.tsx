import React from 'react';
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
  return (
    <div
      className="flex flex-col items-center justify-center h-full text-center px-8 select-none"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-28 h-28 rounded-full flex items-center justify-center mb-6 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(18,140,126,0.15), rgba(37,211,102,0.1))',
          border: '2px solid rgba(18,140,126,0.2)',
          animation: 'breathe 3s ease-in-out infinite',
        }}
      >
        <style>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(18,140,126,0.3); }
            50% { transform: scale(1.04); box-shadow: 0 0 0 12px rgba(18,140,126,0); }
          }
        `}</style>
        <svg viewBox="0 0 48 48" className="w-14 h-14" style={{ fill: 'var(--teal)' }}>
          <path d="M24 4C12.95 4 4 12.95 4 24c0 3.57.93 6.91 2.55 9.8L4 44l10.47-2.52C17.2 43.11 20.52 44 24 44c11.05 0 20-8.95 20-20S35.05 4 24 4zm9.35 23.2c-.51-.25-3.02-1.49-3.49-1.66-.47-.17-.81-.25-1.15.25-.34.51-1.32 1.66-1.62 2-.3.34-.59.38-1.1.13-3.14-1.57-5.2-2.8-7.28-6.35-.55-.95.55-.88 1.57-2.92.17-.34.08-.63-.04-.88-.13-.25-1.15-2.77-1.57-3.79-.41-.99-.84-.85-1.15-.87-.3-.02-.64-.02-.98-.02-.34 0-.89.13-1.36.63-.47.51-1.78 1.74-1.78 4.25 0 2.51 1.82 4.93 2.07 5.27.25.34 3.58 5.47 8.68 7.67 5.1 2.2 5.1 1.47 6.02 1.38.92-.09 2.98-1.22 3.4-2.4.42-1.18.42-2.19.3-2.4-.13-.21-.47-.34-.98-.59z"/>
        </svg>
      </div>

      <h2 className="text-2xl font-light mb-2" style={{ color: 'var(--text)' }}>
        WhatsApp Clone
      </h2>
      <p className="text-sm leading-relaxed mb-8 max-w-xs" style={{ color: 'var(--subtext)' }}>
        Select a conversation or start a new one from the sidebar.
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-sm w-full">
        {FEATURES.map(f => (
          <div
            key={f.icon}
            className="flex flex-col items-start gap-1.5 p-3.5 rounded-xl text-left"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <span className="text-xl">{f.icon}</span>
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{f.title}</p>
            <p className="text-[10px]" style={{ color: 'var(--subtext)' }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mt-8">
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--subtext)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-[10px]" style={{ color: 'var(--subtext)' }}>
          Your conversations are private and secure
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
    // Request notification permission on mount
    requestNotificationPermission();
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
