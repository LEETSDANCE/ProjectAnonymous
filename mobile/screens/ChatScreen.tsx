import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  PermissionsAndroid,
  AppState,
  DeviceEventEmitter,
} from 'react-native';
import io from 'socket.io-client';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  encryptMessage,
  decryptMessage,
} from '../quantum-crypto-native';
import MessageItem from '../MessageItem';
import CallScreen from '../components/CallScreen';
import { launchImageLibrary, MediaType } from 'react-native-image-picker';
import { Buffer } from 'buffer';
import forge from 'node-forge';

// Helper function to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  return Buffer.from(buffer).toString('base64');
};

// IMPORTANT: Replace with your server's local IP address
// On Windows, run `ipconfig` in cmd. On macOS/Linux, run `ifconfig`.
const SERVER_IP = 'https://3.110.215.75:3000';
const SERVER_IP_WITH_CACHE = `${SERVER_IP}?t=${Date.now()}`;

interface ChatScreenProps {
  route: any;
  navigation: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { roomKey, isCreator, username } = route.params || {};
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [keys, setKeys] = useState<any>(null);
  const [userPublicKeys, setUserPublicKeys] = useState<{ [key: string]: any }>({});
  const [socket, setSocket] = useState<any>(null);
  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Call state
  const [isInCall, setIsInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  const connectionRetryCount = useRef(0);

  console.log('ChatScreen loaded with:', { roomKey, username, isCreator });

  // Initialize socket connection and join room
  useEffect(() => {
    console.log('=== Initializing socket connection ===');
    console.log('Server IP:', SERVER_IP);
    console.log('Room Key:', roomKey);
    console.log('Username:', username);
    
    const handleConnectError = (error: any) => {
      console.error('Socket connection error:', error.message || error);
      setIsConnected(false);
      setShowConnectionStatus(true);
      connectionRetryCount.current += 1;
    };
    
    const newSocket = io(SERVER_IP_WITH_CACHE, { 
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected! ID:', newSocket.id);
      setIsConnected(true);
      setShowConnectionStatus(false);
      connectionRetryCount.current = 0;
      
      // Join the room immediately after connection
      if (roomKey && username) {
        console.log(`Joining room: ${roomKey} as ${username}`);
        newSocket.emit('join room', { roomKey, username });
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      handleConnectError(error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
      setShowConnectionStatus(true);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        setTimeout(() => {
          newSocket.connect();
        }, 2000);
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection failed:', error.message);
    });

    // Handle room joined confirmation
    newSocket.on('room joined', (data) => {
      console.log('✅ Successfully joined room:', data.roomKey);
      // Load existing messages
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      }
    });

    // Handle user connected event (sets userId)
    newSocket.on('user connected', (data) => {
      console.log('✅ User connected event received:', data);
      setUserId(data.userId);
    });

    // Handle user joining room
    newSocket.on('user joined room', (data) => {
      console.log(`User ${data.username} joined the room`);
      setRoomUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
    });

    // Handle user leaving room
    newSocket.on('user left room', (data) => {
      console.log(`User ${data.username} left the room`);
      setRoomUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    // Handle room users list
    newSocket.on('room users', (users) => {
      console.log('Room users updated:', users);
      setRoomUsers(users);
    });

    // Handle incoming calls
    newSocket.on('incoming-call', (data) => {
      console.log('Incoming call from:', data.callerName);
      setIncomingCall(data);
    });

    // Handle call ended
    newSocket.on('call-ended', () => {
      setIsInCall(false);
      setIncomingCall(null);
    });

    // Handle new user joining (for key exchange)
    newSocket.on('new user', ({ userId, publicKey, username }) => {
      console.log('New user joined:', username);
      try {
        const importedKey = importPublicKey(publicKey);
        setUserPublicKeys((prev: { [key: string]: any }) => ({ ...prev, [userId]: importedKey }));
      } catch (error) {
        console.error('Error importing public key:', error);
      }
    });

    // Handle existing users (for key exchange)
    newSocket.on('existing users', (users: { [key: string]: any }) => {
      console.log('Received existing users:', Object.keys(users));
      const importedKeys = {};
      for (const id in users) {
        if (id !== userId && users[id].publicKey) {
          try {
            importedKeys[id] = importPublicKey(users[id].publicKey);
          } catch (error) {
            console.error('Error importing key for user', id, error);
          }
        }
      }
      setUserPublicKeys((prev: { [key: string]: any }) => importedKeys);
    });

    // Handle chat messages
    newSocket.on('chat message', (msg: any) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    newSocket.on('chat message plain', (msg: any) => {
      console.log('Received plain text message:', msg);
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    // Handle user disconnected
    newSocket.on('user disconnected', ({ userId }: { userId: string }) => {
      setUserPublicKeys((prevKeys: { [key: string]: any }) => {
        const newKeys = { ...prevKeys };
        delete newKeys[userId];
        return newKeys;
      });
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket connection');
      if (newSocket && roomKey) {
        newSocket.emit('leave room');
      }
      newSocket.disconnect();
    };
  }, [roomKey, username]);

  // Generate keys on component mount
  useEffect(() => {
    console.log('App mounted');
    const init = async () => {
      try {
        console.log('Generating keys...');
        const keyPair = await generateKeyPair();
        setKeys(keyPair);
        console.log('Keys generated successfully');
      } catch (error) {
        console.error('Error generating keys:', error);
      }
    };
    init();
  }, []);

  // Share public key when both keys and socket are ready
  useEffect(() => {
    if (keys && socket && roomKey && userId) {
      console.log('Sharing public key with room');
      try {
        const publicKeyPem = exportPublicKey(keys.publicKey);
        socket.emit('share public key', { roomKey, publicKey: publicKeyPem });
      } catch (error) {
        console.error('Error sharing public key:', error);
      }
    }
  }, [keys, socket, roomKey, userId]);

  // Screenshot detection
  useEffect(() => {
    let screenshotListener: any;
    let appStateListener: any;

    const handleScreenshotDetected = () => {
      console.log('📸 Screenshot detected!');
      
      // Send screenshot notification to chat
      if (socket && roomKey) {
        const screenshotNotification = {
          text: `🚨 ${username} took a screenshot`,
          type: 'screenshot-notification',
          from: userId,
          username: username,
          timestamp: Date.now()
        };
        socket.emit('chat message plain', screenshotNotification);
      }

      // Show alert to user
      Alert.alert(
        'Screenshot Detected',
        'Other users have been notified that you took a screenshot.',
        [{ text: 'OK' }]
      );
    };

    const handleAppStateChange = (nextAppState: string) => {
      // Detect potential screenshot by monitoring app state changes
      // This is a fallback method for screenshot detection
      if (nextAppState === 'background') {
        // User might have taken a screenshot and switched apps
        setTimeout(() => {
          if (AppState.currentState === 'active') {
            // User came back quickly, might indicate screenshot
            console.log('Potential screenshot detected via app state');
          }
        }, 1000);
      }
    };

    // Set up screenshot detection
    if (Platform.OS === 'android') {
      // For Android, we'll use a combination of methods
      screenshotListener = DeviceEventEmitter.addListener(
        'ScreenshotTaken',
        handleScreenshotDetected
      );
      
      // Also monitor app state changes as fallback
      appStateListener = AppState.addEventListener('change', handleAppStateChange);
    } else if (Platform.OS === 'ios') {
      // For iOS, monitor app state changes and user capture events
      appStateListener = AppState.addEventListener('change', handleAppStateChange);
      
      // iOS specific screenshot detection would require native module
      // For now, we'll use app state monitoring
    }

    return () => {
      if (screenshotListener) {
        screenshotListener.remove();
      }
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [socket, roomKey, userId, username]);

  const sendMessage = async () => {
    if (message.trim() && userId && socket) {
      try {
        // Send plain text for testing (no encryption)
        const messageData = {
          text: message,
          from: userId,
          username: username,
          timestamp: Date.now()
        };

        console.log('Sending plain text message:', messageData);
        socket.emit('chat message plain', messageData);
        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.log('Cannot send message - missing:', {
        message: !!message.trim(),
        userId: !!userId,
        socket: !!socket
      });
    }
  };

  const leaveRoom = () => {
    if (socket && roomKey) {
      console.log('Leaving room:', roomKey);
      socket.emit('leave room');
      navigation.goBack();
    }
  };

  // Call functions
  const startCall = async (type: 'audio' | 'video') => {
    console.log(`Starting ${type} call...`);
    
    if (!socket || !roomKey || !userId) {
      Alert.alert('Error', 'Not connected to room');
      return;
    }
    
    // Request permissions first on Android
    if (Platform.OS === 'android') {
      try {
        const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
        if (type === 'video') {
          permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
        }
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
        const cameraGranted = type === 'audio' || granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
        
        if (!audioGranted || !cameraGranted) {
          Alert.alert(
            'Permissions Required',
            'Camera and microphone permissions are required for calls. Please enable them in settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (err) {
        console.warn('Permission request error:', err);
        Alert.alert('Error', 'Failed to request permissions');
        return;
      }
    }
    
    // Start the call
    setCallType(type);
    setIsInCall(true);
    
    // Send call notification to other users (matching web app format)
    console.log('📞 SENDING CALL-USER EVENT:', {
      roomKey,
      callType: type,
      from: userId,
      username: username
    });
    
    socket.emit('call-user', {
      roomKey,
      callType: type,
      from: userId,
      username: username
    });
    
    console.log(`${type} call initiated`);
  };

  const acceptCall = () => {
    if (incomingCall) {
      setCallType(incomingCall.callType);
      setIsInCall(true);
      setIncomingCall(null);
      
      // Notify server that call was accepted
      socket.emit('accept-call', {
        roomKey,
        callId: incomingCall.callId,
      });
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      // Notify server that call was rejected
      socket.emit('reject-call', {
        roomKey,
        callId: incomingCall.callId,
      });
      
      Alert.alert('Call Rejected', 'You rejected the call.');
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    // Notify server that call ended
    if (socket && roomKey) {
      socket.emit('end-call', { roomKey });
    }
    
    setIsInCall(false);
    setIncomingCall(null);
  };

  // File sharing functions
  const shareFile = () => {
    Alert.alert(
      'Share File',
      'Choose what to share',
      [
        { text: 'Photo/Image', onPress: () => selectImage() },
        { text: 'Text File', onPress: () => createTextFile() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const selectImage = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: true,
      maxWidth: 800,
      maxHeight: 600,
      quality: 0.8 as any,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        const fileSize = asset.fileSize ? (asset.fileSize / (1024 * 1024)).toFixed(1) + ' MB' : 'Unknown size';
        
        Alert.alert(
          'Image Selected',
          `${asset.fileName || 'image.jpg'} (${fileSize})\n\nWould you like to share this image?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Share', onPress: () => shareImageFile(asset) }
          ]
        );
      }
    });
  };

  const createTextFile = () => {
    Alert.prompt(
      'Create Text File',
      'Enter the text content for your file:',
      (text) => {
        if (text && text.trim()) {
          const fileName = `text_${Date.now()}.txt`;
          const textData = `data:text/plain;base64,${Buffer.from(text).toString('base64')}`;
          
          const fileMessage = {
            type: 'file',
            fileName: fileName,
            fileType: 'document',
            fileSize: `${(text.length / 1024).toFixed(1)} KB`,
            mimeType: 'text/plain',
            fileData: textData,
            from: userId,
            username: username,
            timestamp: Date.now()
          };

          socket.emit('chat message plain', fileMessage);
          Alert.alert('Success', `Text file "${fileName}" shared successfully!`);
        }
      },
      'plain-text',
      '',
      'default'
    );
  };

  const shareImageFile = (asset: any) => {
    if (!socket || !roomKey || !userId) {
      Alert.alert('Error', 'Not connected to room');
      return;
    }

    try {
      // Check file size limit (5MB for images)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Error', 'Image size must be less than 5MB');
        return;
      }

      const fileName = asset.fileName || `image_${Date.now()}.jpg`;
      const fileSize = asset.fileSize ? (asset.fileSize / (1024 * 1024)).toFixed(1) + ' MB' : 'Unknown size';
      const dataUri = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
      
      const fileMessage = {
        type: 'file',
        fileName: fileName,
        fileType: 'image',
        fileSize: fileSize,
        mimeType: asset.type || 'image/jpeg',
        fileData: dataUri,
        from: userId,
        username: username,
        timestamp: Date.now()
      };

      console.log('Sharing image file:', fileName, fileSize);
      socket.emit('chat message plain', fileMessage);
      
      Alert.alert('Success', `Image "${fileName}" shared successfully!`);
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Failed to share image. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Room: {roomKey}</Text>
            <Text style={styles.subtitle}>
              {username} • {isConnected ? (userId ? `ID: ${userId.substring(0, 8)}` : 'Connected') : '⚠️ Offline Mode'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => setShowUserList(true)}
            >
              <Text style={styles.callIcon}>👥</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.callButton} 
              onPress={() => startCall('audio')}
            >
              <Text style={styles.callIcon}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.callButton} 
              onPress={() => startCall('video')}
            >
              <Text style={styles.callIcon}>📹</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.leaveButton} onPress={leaveRoom}>
              <Text style={styles.leaveButtonText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.contentContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg, index) => (
              <MessageItem
                key={index}
                msg={msg}
                userId={userId}
                keys={keys}
                isMyMessage={msg.from === userId}
              />
            ))}
          </ScrollView>
        </View>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.fileButton} onPress={shareFile}>
            <Text style={styles.fileIcon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Call Screen Modal */}
      <Modal
        visible={isInCall}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <CallScreen
          socket={socket}
          roomKey={roomKey}
          username={username}
          onEndCall={endCall}
          callType={callType}
          isIncoming={!!incomingCall}
        />
      </Modal>

      {/* Incoming Call Modal */}
      <Modal
        visible={!!incomingCall}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.incomingCallOverlay}>
          <View style={styles.incomingCallContainer}>
            <Text style={styles.incomingCallTitle}>Incoming Call</Text>
            <Text style={styles.incomingCallName}>
              {incomingCall?.callerName || 'Unknown'}
            </Text>
            <Text style={styles.incomingCallType}>
              {incomingCall?.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
            </Text>
            
            <View style={styles.incomingCallActions}>
              <TouchableOpacity
                style={[styles.incomingCallButton, styles.rejectButton]}
                onPress={rejectCall}
              >
                <Text style={styles.incomingCallButtonText}>Decline</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.incomingCallButton, styles.acceptButton]}
                onPress={acceptCall}
              >
                <Text style={styles.incomingCallButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* User List Modal */}
      <Modal
        visible={showUserList}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.userListContainer}>
            <View style={styles.userListHeader}>
              <Text style={styles.userListTitle}>Users in Room ({roomUsers.length + 1})</Text>
              <TouchableOpacity onPress={() => setShowUserList(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                { userId: userId, username: username, isCurrentUser: true },
                ...roomUsers.filter(user => user.userId !== userId)
              ]}
              keyExtractor={(item) => item.userId || item.username}
              renderItem={({ item }) => (
                <View style={styles.userItem}>
                  <Text style={styles.userIcon}>👤</Text>
                  <Text style={styles.userName}>
                    {item.username} {item.isCurrentUser ? '(You)' : ''}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Connection Status Modal */}
      <Modal
        visible={showConnectionStatus}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.connectionModalOverlay}>
          <View style={styles.connectionModalContainer}>
            <Text style={styles.connectionModalIcon}>
              {isConnected ? '✅' : '⚠️'}
            </Text>
            <Text style={styles.connectionModalTitle}>
              {isConnected ? 'Connected' : 'Server Disconnected'}
            </Text>
            <Text style={styles.connectionModalMessage}>
              {isConnected 
                ? 'Successfully connected to server' 
                : `Unable to connect to server at ${SERVER_IP}\n\nThe app will work in offline mode. Some features may be limited.`
              }
            </Text>
            
            <View style={styles.connectionModalActions}>
              {!isConnected && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    connectionRetryCount.current = 0;
                    socket?.connect();
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry Connection</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setShowConnectionStatus(false)}
              >
                <Text style={styles.dismissButtonText}>
                  {isConnected ? 'OK' : 'Continue Offline'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
    justifyContent: 'space-between'
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  callButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callIcon: {
    fontSize: 16,
  },
  leaveButton: { 
    backgroundColor: '#ff4444', 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  leaveButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  contentContainer: {
    flex: 1,
  },
  messagesContainer: { 
    flex: 1, 
    padding: 10,
    paddingBottom: 0
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 10
  },
  message: { padding: 12, borderRadius: 10, marginVertical: 4, maxWidth: '80%' },
  myMessage: { backgroundColor: '#007bff', alignSelf: 'flex-end' },
  otherMessage: { backgroundColor: '#e5e5ea', alignSelf: 'flex-start' },
  myMessageText: { color: 'white' },
  otherMessageText: { color: 'black' },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 10, 
    borderTopWidth: 1, 
    borderColor: '#ddd', 
    backgroundColor: 'white',
    alignItems: 'center',
    minHeight: 60,
    position: 'relative',
    bottom: 0
  },
  input: { 
    flex: 1, 
    height: 40, 
    maxHeight: 40,
    backgroundColor: '#f0f0f0', 
    borderRadius: 20, 
    paddingHorizontal: 15,
    marginHorizontal: 8,
    textAlignVertical: 'center',
    includeFontPadding: false
  },
  sendButton: { 
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  sendButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  // Incoming call modal styles
  incomingCallOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingCallContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 300,
  },
  incomingCallTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  incomingCallName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007bff',
  },
  incomingCallType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  incomingCallActions: {
    flexDirection: 'row',
    gap: 20,
  },
  incomingCallButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#ff4444',
  },
  acceptButton: {
    backgroundColor: '#00cc44',
  },
  incomingCallButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // New UI element styles
  iconButton: {
    backgroundColor: '#6c757d',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  fileButton: {
    backgroundColor: '#6c757d',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fileIcon: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userListContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '80%',
    maxHeight: '60%',
    padding: 20,
  },
  userListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  userListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    color: '#333',
  },
  
  // Connection Modal Styles
  connectionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 300,
    maxWidth: '90%',
  },
  connectionModalIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  connectionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  connectionModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  connectionModalActions: {
    flexDirection: 'row',
    gap: 15,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dismissButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  dismissButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChatScreen;
