import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../../context/SocketContext';

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

  const endCall = useCallback(() => {
    socket?.emit('end_call', { to: targetUserId });
    cleanup();
    onEnd();
  }, [socket, targetUserId, onEnd]);

  const cleanup = () => {
    localStream?.getTracks().forEach(track => track.stop());
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setCallStatus('ended');
  };

  const setupPeerConnection = useCallback(async (stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('ice_candidate', { to: targetUserId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallStatus('active');
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanup();
        onEnd();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [socket, targetUserId, onEnd]);

  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video',
          audio: true
        });
        setLocalStream(stream);
        setCallStatus('ringing');

        const pc = await setupPeerConnection(stream);

        if (isIncoming && initialOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket?.emit('answer_call', { to: targetUserId, answer });
          setCallStatus('active');
        } else {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('call_user', { to: targetUserId, offer, type });
        }
      } catch (err) {
        console.error('WebRTC init error:', err);
        onEnd();
      }
    };

    init();

    const handleAnswer = async ({ answer }: { answer: any }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallStatus('active');
      }
    };

    const handleCandidate = async ({ candidate }: { candidate: any }) => {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleEndCall = () => {
      cleanup();
      onEnd();
    };

    const handleRejected = () => {
      cleanup();
      onEnd();
    };

    socket?.on('call_answered', handleAnswer);
    socket?.on('ice_candidate', handleCandidate);
    socket?.on('call_ended', handleEndCall);
    socket?.on('call_rejected', handleRejected);

    return () => {
      socket?.off('call_answered', handleAnswer);
      socket?.off('ice_candidate', handleCandidate);
      socket?.off('call_ended', handleEndCall);
      socket?.off('call_rejected', handleRejected);
      cleanup();
    };
  }, [socket, targetUserId, isIncoming, initialOffer, type, setupPeerConnection, onEnd]);

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
