import { useState, useRef } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

interface UseCallMobileOptions {
  /** Ref to the live socket — always current, avoids stale closures */
  socketRef: React.MutableRefObject<any>;
  /** Ref to the live userId — always current */
  userIdRef: React.MutableRefObject<string | null>;
  roomKey: string;
  username: string;
}

export function useCallMobile({ socketRef, userIdRef, roomKey, username }: UseCallMobileOptions) {
  const [isInCall, setIsInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const pendingOfferRef = useRef<any>(null);

  // ── Callbacks for useSocketMobile ─────────────────────────────────────────
  const handleCallOffer   = (data: any) => { pendingOfferRef.current = data; };
  const handleIncomingCall = (data: any) => { setIncomingCall(data); };
  const handleCallEnded   = () => {
    setIsInCall(false);
    setIncomingCall(null);
    pendingOfferRef.current = null;
  };

  // ── Permission helper ─────────────────────────────────────────────────────
  const requestAndroidPermissions = async (type: 'audio' | 'video') => {
    if (Platform.OS !== 'android') return true;
    try {
      const perms = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      if (type === 'video') perms.push(PermissionsAndroid.PERMISSIONS.CAMERA);
      const granted = await PermissionsAndroid.requestMultiple(perms);
      const ok =
        granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED &&
        (type === 'audio' || granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED);
      if (!ok) Alert.alert('Permissions Required', 'Camera and microphone access is needed for calls.');
      return ok;
    } catch {
      Alert.alert('Error', 'Failed to request permissions');
      return false;
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const startCall = async (type: 'audio' | 'video') => {
    const s = socketRef.current;
    const uid = userIdRef.current;
    if (!s || !uid) { Alert.alert('Error', 'Not connected to room'); return; }
    if (!(await requestAndroidPermissions(type))) return;

    // Emit call-user FIRST so server routes incoming-call before the offer arrives
    s.emit('call-user', { roomKey, callType: type, from: uid, username });
    pendingOfferRef.current = null;

    setCallType(type);
    setIsInCall(true);
  };

  const acceptCall = () => {
    if (!incomingCall) return;
    socketRef.current?.emit('accept-call', { roomKey, callId: incomingCall.callId });
    setCallType(incomingCall.callType);
    setIncomingCall(null);
    setIsInCall(true);
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    socketRef.current?.emit('reject-call', { roomKey, callId: incomingCall.callId });
    setIncomingCall(null);
    pendingOfferRef.current = null;
  };

  const endCall = () => {
    socketRef.current?.emit('end-call', { roomKey });
    setIsInCall(false);
    setIncomingCall(null);
    pendingOfferRef.current = null;
  };

  return {
    isInCall, incomingCall, callType, pendingOfferRef,
    startCall, acceptCall, rejectCall, endCall,
    handleCallOffer, handleIncomingCall, handleCallEnded,
  };
}
