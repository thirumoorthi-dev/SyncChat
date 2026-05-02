import React, { useEffect, useRef } from 'react';
import { useWebRTC, CallType } from '../hooks/useWebRTC';
import Avatar from '../../../shared/components/Avatar';

interface CallModalProps {
  targetUser: {
    id: string;
    username: string;
    display_name?: string;
    avatar_color: string;
  };
  isIncoming: boolean;
  initialOffer?: any;
  type: CallType;
  onEnd: () => void;
}

export default function CallModal({ targetUser, isIncoming, initialOffer, type, onEnd }: CallModalProps) {
  const {
    localStream,
    remoteStream,
    callStatus,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    endCall
  } = useWebRTC({
    targetUserId: targetUser.id,
    isIncoming,
    initialOffer,
    type,
    onEnd
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const displayName = targetUser.display_name || targetUser.username;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full h-full max-w-4xl max-h-[800px] flex flex-col items-center justify-between p-8 overflow-hidden">

        {/* Remote Video (Background) */}
        {type === 'video' && remoteStream && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* User Info (Overlay when not connected or voice call) */}
        {(callStatus !== 'active' || type === 'voice') && (
          <div className="z-10 flex flex-col items-center gap-4 mt-20 animate-in zoom-in duration-500">
            <Avatar name={displayName} color={targetUser.avatar_color} size="xl" />
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">{displayName}</h2>
              <p className="text-teal-400 font-medium tracking-widest uppercase text-xs animate-pulse">
                {callStatus === 'ringing' ? 'Ringing...' :
                  callStatus === 'connecting' ? 'Connecting...' :
                    callStatus === 'active' ? 'Active Call' : 'Call Ended'}
              </p>
            </div>
          </div>
        )}

        {/* Local Video (PiP) */}
        {type === 'video' && localStream && (
          <div className="absolute top-8 right-8 w-48 h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 z-20">
            {isCameraOff ? (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <Avatar name="Me" color="#6366f1" size="lg" />
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        {/* Controls */}
        <div className="z-30 flex items-center gap-6 mb-12 animate-in slide-in-from-bottom-10 duration-500 delay-200">
          <button
            onClick={toggleMute}
            className={`p-5 rounded-full transition-all duration-300 ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isMuted ? (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {type === 'video' && (
            <button
              onClick={toggleCamera}
              className={`p-5 rounded-full transition-all duration-300 ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {isCameraOff ? (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={endCall}
            className="p-6 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300 shadow-xl scale-110"
          >
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.26 1.12.32 2.33.49 3.57.49.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.17 2.45.49 3.57.1.35.01.74-.26 1.02l-2.2 2.2z" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
