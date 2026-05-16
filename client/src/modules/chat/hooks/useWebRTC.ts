import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../../context/SocketContext';
import api from '../../../app/services/axiosClient';

export type CallType = 'voice' | 'video';

interface UseWebRTCProps {
  targetUserId: string;
  isIncoming: boolean;
  initialOffer?: any;
  type: CallType;
  onEnd: () => void;
}

export function useWebRTC({ targetUserId, isIncoming, initialOffer, type, onEnd }: UseWebRTCProps) {
  const { socket } = useSocket();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(type === 'voice');

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [iceServers, setIceServers] = useState<any[] | null>(null);

  // 1. Fetch ICE servers once on mount
  useEffect(() => {
    let isMounted = true;
    const fetchIce = async () => {
      try {
        const res = await api.get('/management/ice-servers');
        if (isMounted && res.data && Array.isArray(res.data)) {
          setIceServers(res.data);
        }
      } catch (err) {
        console.warn('[WebRTC] Failed to fetch ICE servers, using defaults:', err);
        if (isMounted) {
          setIceServers([
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]);
        }
      }
    };
    fetchIce();
    return () => { isMounted = false; };
  }, []);

  const cleanup = useCallback(() => {
    console.log('[WebRTC] Cleaning up connection');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.onconnectionstatechange = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }
    pendingCandidates.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('ended');
  }, []);

  const endCall = useCallback(() => {
    socket?.emit('end_call', { to: targetUserId });
    cleanup();
    onEnd();
  }, [socket, targetUserId, onEnd, cleanup]);

  // 2. Main Call Setup Effect
  useEffect(() => {
    if (!iceServers || !socket) return;

    let isMounted = true;

    const handleAnswer = async ({ answer }: { answer: any }) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
          while (pendingCandidates.current.length > 0) {
            const candidate = pendingCandidates.current.shift();
            if (candidate) await peerConnection.current.addIceCandidate(candidate);
          }
        } catch (err) { console.error('Handle answer error:', err); }
      }
    };

    const handleCandidate = async ({ candidate }: { candidate: any }) => {
      const iceCandidate = new RTCIceCandidate(candidate);
      if (peerConnection.current?.remoteDescription) {
        try { await peerConnection.current.addIceCandidate(iceCandidate); } 
        catch (err) { console.error('Add ice candidate error:', err); }
      } else {
        pendingCandidates.current.push(iceCandidate);
      }
    };

    const handleRemoteEnd = () => { cleanup(); onEnd(); };

    socket.on('call_answered', handleAnswer);
    socket.on('ice_candidate', handleCandidate);
    socket.on('call_ended', handleRemoteEnd);
    socket.on('call_rejected', handleRemoteEnd);

    const initCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video',
          audio: true
        });
        
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setCallStatus('ringing');

        const pc = new RTCPeerConnection({ iceServers });
        peerConnection.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          setRemoteStream(prev => {
            if (prev) {
              const newStream = new MediaStream(prev.getTracks());
              newStream.addTrack(event.track);
              return newStream;
            }
            return new MediaStream([event.track]);
          });
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice_candidate', { to: targetUserId, candidate: event.candidate });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') setCallStatus('active');
          if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
            cleanup();
            onEnd();
          }
        };

        if (isIncoming && initialOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer_call', { to: targetUserId, answer });
          
          while (pendingCandidates.current.length > 0) {
            const candidate = pendingCandidates.current.shift();
            if (candidate) await pc.addIceCandidate(candidate);
          }
        } else {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call_user', { to: targetUserId, offer, type });
        }
      } catch (err) {
        console.error('WebRTC init error:', err);
        if (isMounted) { cleanup(); onEnd(); }
      }
    };

    initCall();

    return () => {
      isMounted = false;
      socket.off('call_answered', handleAnswer);
      socket.off('ice_candidate', handleCandidate);
      socket.off('call_ended', handleRemoteEnd);
      socket.off('call_rejected', handleRemoteEnd);
      cleanup();
    };
  }, [iceServers, socket, targetUserId, isIncoming, type]); // Minimal stable dependencies

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream && type === 'video') {
      localStream.getVideoTracks().forEach(track => (track.enabled = !track.enabled));
      setIsCameraOff(!isCameraOff);
    }
  };

  return {
    localStream,
    remoteStream,
    callStatus,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    endCall
  };
}
