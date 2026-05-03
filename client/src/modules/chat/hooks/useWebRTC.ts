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

  const setupPeerConnection = useCallback(async (stream: MediaStream, iceServers: any[]) => {
    const pc = new RTCPeerConnection({ iceServers });

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      console.log('WebRTC: Remote track received');
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('ice_candidate', { to: targetUserId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC: Connection state changed to:', pc.connectionState);
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
    let isInitialized = false;

    const init = async () => {
      if (isInitialized) return;
      try {
        // [Fix] Handle cases where camera might be missing or blocked
        const constraints = {
          video: type === 'video' ? { width: 1280, height: 720 } : false,
          audio: true
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (deviceErr: any) {
          console.warn('WebRTC: Camera requested but failed, falling back to audio only', deviceErr);
          // Fallback to audio only if video fails (e.g., no camera)
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsCameraOff(true);
        }

        setLocalStream(stream);
        setCallStatus('ringing');

        // Fetch ICE Servers from backend (Secure Metered.ca integration)
        let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
        try {
          const iceRes = await api.get('/management/ice-servers');
          iceServers = iceRes.data;
        } catch (iceErr) {
          console.warn('WebRTC: Could not fetch ICE servers, using fallback STUN');
        }

        const pc = await setupPeerConnection(stream, iceServers);
        isInitialized = true;

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
        console.error('WebRTC: Failed to initialize call:', err);
        onEnd();
      }
    };

    init();

    const handleAnswer = async ({ answer }: { answer: any }) => {
      if (peerConnection.current && peerConnection.current.signalingState !== 'stable') {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallStatus('active');
        } catch (err) {
          console.error('WebRTC: Error setting remote answer:', err);
        }
      }
    };

    const handleCandidate = async ({ candidate }: { candidate: any }) => {
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('WebRTC: Error adding ICE candidate:', err);
        }
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
