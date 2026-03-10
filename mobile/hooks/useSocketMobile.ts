import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { importPublicKey, exportPublicKey, encryptMessage, decryptMessage } from '../quantum-crypto-native';

const SERVER_URL = 'https://maxyserver.servehalflife.com';
const socketOptions = { transports: ['polling', 'websocket'], reconnection: true };

interface UseSocketMobileOptions {
  roomKey: string;
  username: string;
  onCallOffer?: (data: any) => void;
  onIncomingCall?: (data: any) => void;
  onCallEnded?: () => void;
}

export function useSocketMobile({ roomKey, username, onCallOffer, onIncomingCall, onCallEnded }: UseSocketMobileOptions) {
  const [socket, setSocket]               = useState<any>(null);
  const [userId, setUserId]               = useState<string | null>(null);
  const [isConnected, setIsConnected]     = useState(false);
  const [messages, setMessages]           = useState<any[]>([]);
  const [roomUsers, setRoomUsers]         = useState<any[]>([]);
  const [userPublicKeys, setUserPublicKeys] = useState<{ [id: string]: any }>({});
  const [keys, setKeys]                   = useState<any>(null);

  // Stable refs — socket handlers must read latest values, not stale closure captures
  const socketRef         = useRef<any>(null);
  const userIdRef         = useRef<string | null>(null);
  const keysRef           = useRef<any>(null);
  const userPublicKeysRef = useRef<{ [id: string]: any }>({});

  // Callback refs for call signal handlers
  const onCallOfferRef    = useRef(onCallOffer);
  const onIncomingCallRef = useRef(onIncomingCall);
  const onCallEndedRef    = useRef(onCallEnded);

  useEffect(() => { socketRef.current         = socket; },         [socket]);
  useEffect(() => { userIdRef.current         = userId; },         [userId]);
  useEffect(() => { keysRef.current           = keys;   },         [keys]);
  useEffect(() => { userPublicKeysRef.current = userPublicKeys; }, [userPublicKeys]);
  useEffect(() => { onCallOfferRef.current    = onCallOffer; },    [onCallOffer]);
  useEffect(() => { onIncomingCallRef.current = onIncomingCall; }, [onIncomingCall]);
  useEffect(() => { onCallEndedRef.current    = onCallEnded; },    [onCallEnded]);

  // ── Socket lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomKey || !username) return;
    const s = io(SERVER_URL, socketOptions);

    s.on('connect', () => {
      console.log('✅ Socket connected:', s.id);
      setIsConnected(true);
      s.emit('join room', { roomKey, username });
    });

    s.on('connect_error', (err: any) => {
      console.error('❌ Connection error:', err.message);
      setIsConnected(false);
    });

    s.on('disconnect', (reason: string) => {
      console.log('🔌 Disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') setTimeout(() => s.connect(), 2000);
    });

    s.on('user connected', (data: any) => {
      setUserId(data.userId);
      userIdRef.current = data.userId;
      // Share our public key once we have an ID and keys
      const k = keysRef.current;
      if (k) {
        const pem = exportPublicKey(k.publicKey);
        s.emit('share public key', { roomKey, publicKey: pem });
      }
    });

    s.on('room joined', (data: any) => { if (data.messages?.length) setMessages(data.messages); });
    s.on('room users',   (users: any[]) => setRoomUsers(users));
    s.on('user joined room', (data: any) => setRoomUsers(p => [...p.filter(u => u.userId !== data.userId), data]));
    s.on('user left room',   (data: any) => setRoomUsers(p => p.filter(u => u.userId !== data.userId)));
    s.on('system message',   (msg: any) => setMessages(p => [...p, msg]));
    s.on('chat message plain', (msg: any) => setMessages(p => [...p, msg]));

    // Encrypted messages — decrypt with ML-KEM + verify ML-DSA signature
    s.on('chat message', async (msg: any) => {
      const myKeys  = keysRef.current;
      const myId    = userIdRef.current;
      const pubKeys = userPublicKeysRef.current;

      if (myKeys && myId && msg.encrypted?.[myId]) {
        try {
          const senderPub = pubKeys[msg.from] || null;
          const plaintext = await decryptMessage(myKeys.privateKey, msg.encrypted[myId], senderPub);
          setMessages(p => [...p, { ...msg, text: plaintext, decrypted: true }]);
          return;
        } catch (err: any) {
          console.error('❌ Decryption failed:', err.message);
        }
      }
      setMessages(p => [...p, { ...msg, text: '[encrypted]', decrypted: false }]);
    });

    // Key exchange
    s.on('new user', ({ userId: uid, publicKey }: any) => {
      try {
        setUserPublicKeys(p => ({ ...p, [uid]: importPublicKey(publicKey) }));
      } catch (e) { console.error('import key error', e); }
    });

    s.on('existing users', (users: { [id: string]: any }) => {
      const imported: { [id: string]: any } = {};
      for (const id in users) {
        if (users[id].publicKey) {
          try { imported[id] = importPublicKey(users[id].publicKey); }
          catch (e) { console.error('import key error for', id, e); }
        }
      }
      setUserPublicKeys(imported);
    });

    s.on('user disconnected', ({ userId: uid }: { userId: string }) =>
      setUserPublicKeys(p => { const n = { ...p }; delete n[uid]; return n; })
    );

    // Call signaling — use callback refs to always call the latest handler
    s.on('call-offer',    (data: any) => { console.log('📦 call-offer buffered'); onCallOfferRef.current?.(data); });
    s.on('incoming-call', (data: any) => { console.log('📞 incoming-call', data.callerName); onIncomingCallRef.current?.(data); });
    s.on('call-ended',    ()           => { onCallEndedRef.current?.(); });

    setSocket(s);
    socketRef.current = s;

    return () => { s.emit('leave room'); s.disconnect(); };
  }, [roomKey, username]);

  // Share public key when keys arrive after socket is already connected
  useEffect(() => {
    const s   = socketRef.current;
    const uid = userIdRef.current;
    if (keys && s && roomKey && uid) {
      try {
        const pem = exportPublicKey(keys.publicKey);
        s.emit('share public key', { roomKey, publicKey: pem });
      } catch (e) { console.error('share public key error', e); }
    }
  }, [keys, roomKey]);

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Send a message — encrypts per-recipient if public keys are available */
  const sendMessage = async (text: string) => {
    const s       = socketRef.current;
    const uid     = userIdRef.current;
    const myKeys  = keysRef.current;
    const pubKeys = userPublicKeysRef.current;
    if (!text.trim() || !s || !uid) return;

    const recipients = Object.keys(pubKeys).filter(id => id !== uid);

    if (myKeys && recipients.length > 0) {
      try {
        // Encrypt per-recipient — no plaintext 'text' field in the payload
        const encryptedPerUser: { [id: string]: any } = {};
        await Promise.all(recipients.map(async targetId => {
          encryptedPerUser[targetId] = await encryptMessage(pubKeys[targetId], text, myKeys.privateKey);
        }));
        s.emit('chat message', { encrypted: encryptedPerUser, from: uid, username, timestamp: Date.now() });
      } catch (err) {
        console.error('Encryption failed, sending plain:', err);
        s.emit('chat message plain', { text, from: uid, username, timestamp: Date.now() });
      }
    } else {
      // No recipients yet (solo in room) — fall back to plain
      s.emit('chat message plain', { text, from: uid, username, timestamp: Date.now() });
    }

    // Echo own message locally
    setMessages(p => [...p, { text, from: uid, username, timestamp: Date.now(), isOwn: true, decrypted: true }]);
  };

  const sendFile = (payload: any) => {
    const s = socketRef.current, uid = userIdRef.current;
    if (!s || !uid) return;
    s.emit('chat message plain', { ...payload, from: uid, username, timestamp: Date.now() });
    setMessages(p => [...p, { ...payload, from: uid, username, timestamp: Date.now(), isOwn: true }]);
  };

  const leaveRoom = () => { socketRef.current?.emit('leave room'); };

  return { socket, userId, isConnected, messages, roomUsers, userPublicKeys, keys, setKeys, sendMessage, sendFile, leaveRoom };
}
