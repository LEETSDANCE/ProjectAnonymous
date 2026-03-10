import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  Alert, Modal, FlatList, DeviceEventEmitter,
} from 'react-native';
import { launchImageLibrary, MediaType } from 'react-native-image-picker';
import { generateKeyPair } from '../quantum-crypto-native';

import MessageItem from '../MessageItem';
import CallScreen from '../components/CallScreen';
import { useSocketMobile } from '../hooks/useSocketMobile';
import { useCallMobile } from '../hooks/useCallMobile';

interface ChatScreenProps { route: any; navigation: any; }

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { roomKey, username } = route.params || {};
  const [message, setMessage] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [keys, setKeys] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Stable refs bridging the two hooks
  const socketRef    = useRef<any>(null);
  const userIdRef    = useRef<string | null>(null);
  const wasIncomingRef = useRef(false); // tracks if current call started as incoming

  // Call hook — uses stable refs so all actions read live socket/userId
  const call = useCallMobile({ socketRef, userIdRef, roomKey, username });

  // Socket hook — passes call signal events into call hook via callback refs
  const { socket, userId, isConnected, messages, roomUsers, keys: socketKeys, setKeys: socketSetKeys, sendMessage, sendFile, leaveRoom } =
    useSocketMobile({
      roomKey, username,
      onCallOffer:    call.handleCallOffer,
      onIncomingCall: call.handleIncomingCall,
      onCallEnded:    call.handleCallEnded,
    });

  // Keep bridge refs in sync
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Generate PQC keys on mount and share with socket hook
  useEffect(() => {
    generateKeyPair()
      .then(kp => { setKeys(kp); socketSetKeys(kp); })
      .catch(e => console.error('Key gen error:', e));
  }, []);

  useEffect(() => { if (!isConnected) setShowOfflineBanner(true); }, [isConnected]);

  // Screenshot detection (Android)
  useEffect(() => {
    let listener: any;
    if (Platform.OS === 'android') {
      listener = DeviceEventEmitter.addListener('ScreenshotTaken', () => {
        sendFile({ text: `🚨 ${username} took a screenshot`, type: 'screenshot-notification' });
        Alert.alert('Screenshot Detected', 'Other users have been notified.');
      });
    }
    return () => listener?.remove();
  }, [socket, userId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSend = () => { if (!message.trim()) return; sendMessage(message); setMessage(''); };
  const handleLeave = () => { leaveRoom(); navigation.goBack(); };

  const handleAcceptCall = () => {
    wasIncomingRef.current = true;
    call.acceptCall();
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    wasIncomingRef.current = false;
    call.startCall(type);
  };

  const handleEndCall = () => {
    wasIncomingRef.current = false;
    call.endCall();
  };

  const shareFile = () =>
    Alert.alert('Share File', 'Choose media', [
      { text: 'Photo/Image', onPress: selectImage },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const selectImage = () => {
    launchImageLibrary(
      { mediaType: 'photo' as MediaType, includeBase64: true, maxWidth: 800, maxHeight: 600, quality: 0.8 as any },
      (res) => {
        if (res.didCancel || !res.assets?.[0]) return;
        const asset = res.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { Alert.alert('Error', 'Max 5MB'); return; }
        const fileSize = asset.fileSize ? (asset.fileSize / (1024 * 1024)).toFixed(1) + ' MB' : '?';
        sendFile({
          type: 'file', text: '',
          fileName: asset.fileName || `img_${Date.now()}.jpg`,
          fileType: 'image', fileSize,
          mimeType: asset.type || 'image/jpeg',
          fileData: `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`,
        });
      }
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerInfo}>
            <Text style={s.title}>Room: {roomKey}</Text>
            <Text style={s.subtitle}>
              {username} • {isConnected ? (userId ? `ID: ${userId.substring(0, 8)}` : 'Connected') : '⚠️ Offline'}
            </Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.iconBtn} onPress={() => setShowUserList(true)}>
              <Text style={s.icon}>👥</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.callBtn} onPress={() => handleStartCall('audio')}>
              <Text style={s.icon}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.callBtn} onPress={() => handleStartCall('video')}>
              <Text style={s.icon}>📹</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.leaveBtn} onPress={handleLeave}>
              <Text style={s.leaveTxt}>Leave</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={s.messages}
          contentContainerStyle={s.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, i) => (
            <MessageItem key={i} msg={msg} userId={userId} keys={keys} isMyMessage={msg.from === userId} />
          ))}
        </ScrollView>

        {/* Input */}
        <View style={s.inputRow}>
          <TouchableOpacity style={s.fileBtn} onPress={shareFile}>
            <Text style={s.icon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={s.input} value={message} onChangeText={setMessage}
            placeholder="Type your message..." placeholderTextColor="#999"
            returnKeyType="send" onSubmitEditing={handleSend} blurOnSubmit={false}
          />
          <TouchableOpacity style={s.sendBtn} onPress={handleSend}>
            <Text style={s.sendTxt}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={call.isInCall} animationType="slide" presentationStyle="fullScreen">
        <CallScreen
          socket={socket} roomKey={roomKey} username={username}
          onEndCall={handleEndCall} callType={call.callType}
          isIncoming={wasIncomingRef.current}
          pendingOffer={call.pendingOfferRef.current}
        />
      </Modal>

      {/* Incoming Call */}
      <Modal visible={!!call.incomingCall} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.incomingCard}>
            <Text style={s.incomingTitle}>Incoming Call</Text>
            <Text style={s.incomingName}>{call.incomingCall?.callerName || 'Unknown'}</Text>
            <Text style={s.incomingType}>
              {call.incomingCall?.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
            </Text>
            <View style={s.callActions}>
              <TouchableOpacity style={[s.callActionBtn, s.declineBtn]} onPress={call.rejectCall}>
                <Text style={s.callActionTxt}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.callActionBtn, s.acceptBtn]} onPress={handleAcceptCall}>
                <Text style={s.callActionTxt}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* User List */}
      <Modal visible={showUserList} animationType="slide" transparent>
        <View style={s.sheetOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Users ({roomUsers.length + 1})</Text>
              <TouchableOpacity onPress={() => setShowUserList(false)}>
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ userId, username, isCurrentUser: true }, ...roomUsers.filter(u => u.userId !== userId)]}
              keyExtractor={item => item.userId || item.username}
              renderItem={({ item }) => (
                <View style={s.userRow}>
                  <Text style={s.icon}>👤</Text>
                  <Text style={s.userName}>{item.username} {item.isCurrentUser ? '(You)' : ''}</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Offline Banner */}
      <Modal visible={showOfflineBanner && !isConnected} animationType="fade" transparent>
        <View style={s.overlay}>
          <View style={s.offlineCard}>
            <Text style={s.offlineIcon}>⚠️</Text>
            <Text style={s.offlineTitle}>Server Disconnected</Text>
            <Text style={s.offlineMsg}>Unable to reach server. The app will work in offline mode.</Text>
            <View style={s.offlineActions}>
              <TouchableOpacity style={s.retryBtn} onPress={() => socket?.connect()}>
                <Text style={s.retryTxt}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.dismissBtn} onPress={() => setShowOfflineBanner(false)}>
                <Text style={s.dismissTxt}>Continue Offline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f5f5f5' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 2 },
  headerInfo:     { flex: 1 },
  title:          { fontSize: 18, fontWeight: 'bold', color: '#333' },
  subtitle:       { fontSize: 12, color: '#666', marginTop: 2 },
  headerActions:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:        { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
  callBtn:        { padding: 8, backgroundColor: '#007bff', borderRadius: 8 },
  icon:           { fontSize: 18 },
  leaveBtn:       { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#dc3545', borderRadius: 8 },
  leaveTxt:       { color: 'white', fontWeight: '600', fontSize: 14 },
  messages:       { flex: 1 },
  messagesContent:{ padding: 15, paddingBottom: 10 },
  inputRow:       { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  fileBtn:        { padding: 10 },
  input:          { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, fontSize: 16, backgroundColor: '#fafafa', marginHorizontal: 8 },
  sendBtn:        { backgroundColor: '#007bff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  sendTxt:        { color: 'white', fontWeight: '600' },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  incomingCard:   { backgroundColor: 'white', borderRadius: 20, padding: 30, width: '80%', alignItems: 'center' },
  incomingTitle:  { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  incomingName:   { fontSize: 26, fontWeight: 'bold', color: '#007bff', marginBottom: 6 },
  incomingType:   { fontSize: 16, color: '#666', marginBottom: 28 },
  callActions:    { flexDirection: 'row', gap: 20 },
  callActionBtn:  { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  declineBtn:     { backgroundColor: '#dc3545' },
  acceptBtn:      { backgroundColor: '#28a745' },
  callActionTxt:  { color: 'white', fontWeight: 'bold', fontSize: 16 },
  sheetOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  sheetHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle:     { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeX:         { fontSize: 20, color: '#666', padding: 5 },
  userRow:        { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  userName:       { fontSize: 16, color: '#333' },
  offlineCard:    { backgroundColor: 'white', borderRadius: 15, padding: 25, width: '85%', alignItems: 'center' },
  offlineIcon:    { fontSize: 48, marginBottom: 10 },
  offlineTitle:   { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  offlineMsg:     { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  offlineActions: { width: '100%', gap: 10 },
  retryBtn:       { backgroundColor: '#007bff', borderRadius: 8, padding: 12, alignItems: 'center' },
  retryTxt:       { color: 'white', fontWeight: '600' },
  dismissBtn:     { backgroundColor: '#6c757d', borderRadius: 8, padding: 12, alignItems: 'center' },
  dismissTxt:     { color: 'white', fontWeight: '600' },
});

export default ChatScreen;
