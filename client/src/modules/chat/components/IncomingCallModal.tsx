import React from 'react';
import Avatar from '../../../shared/components/Avatar';

interface IncomingCallModalProps {
  caller: {
    username: string;
    display_name?: string;
    avatar_color: string;
  };
  type: 'voice' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({ caller, type, onAccept, onReject }: IncomingCallModalProps) {
  const displayName = caller.display_name || caller.username;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[var(--panel)] p-8 rounded-[32px] shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 border border-[var(--border)] animate-in zoom-in-95 duration-300">
        <div className="relative">
          <Avatar name={displayName} color={caller.avatar_color} size="xl" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--teal)] flex items-center justify-center border-4 border-[var(--panel)]">
            {type === 'video' ? (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{displayName}</h2>
          <p className="text-sm opacity-60" style={{ color: 'var(--text)' }}>Incoming {type} call...</p>
        </div>

        <div className="flex gap-4 w-full mt-4">
          <button
            onClick={onReject}
            className="flex-1 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.26 1.12.32 2.33.49 3.57.49.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.17 2.45.49 3.57.1.35.01.74-.26 1.02l-2.2 2.2z" />
            </svg>
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-4 rounded-2xl bg-[var(--teal)] hover:opacity-90 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 2 3.24 2.41 3.24 2.95c0 9.39 7.63 17.02 17.01 17.02.54 0 .95-.41.95-.95v-3.64c0-.55-.44-.99-.99-.99z" />
            </svg>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
