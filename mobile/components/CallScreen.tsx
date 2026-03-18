import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, PermissionsAndroid, Platform, Dimensions } from 'react-native';
import { RTCView, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
// importPublicKey is available from quantum-crypto-native if needed for key exchange in future


// Define MediaStreamConstraints interface
interface MediaStreamConstraints {
  audio: boolean;
  video?: boolean | {
    width?: { min?: number; ideal?: number; max?: number };
    height?: { min?: number; ideal?: number; max?: number };
    frameRate?: { min?: number; ideal?: number; max?: number };
  };
}

interface CallScreenProps {
  socket: any;
  roomKey: string;
  username: string;
  onEndCall: () => void;
  isIncoming?: boolean;
  callType: 'audio' | 'video';
  pendingOffer?: any; // buffered call-offer from ChatScreen
}

const { width, height } = Dimensions.get('window');

const CallScreen: React.FC<CallScreenProps> = ({
  socket,
  roomKey,
  username,
  onEndCall,
  isIncoming = false,
  callType,
  pendingOffer,
}) => {
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
const [remoteStreamKey, setRemoteStreamKey] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor'>('good');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const bufferedIceCandidates = useRef<RTCIceCandidate[]>([]);
  const isConnectedRef = useRef(false);
  const callTimer = useRef<any>(null);
  const connectionTimeout = useRef<any>(null);
  const reconnectTimeout = useRef<any>(null);
  const qualityMonitorInterval = useRef<any>(null);

  const CONNECTION_TIMEOUT = 30000; // 30 seconds
  const MAX_RECONNECT_ATTEMPTS = 3;
  const QUALITY_MONITOR_INTERVAL = 5000; // 5 seconds

  const TURN_HOST = '15.206.79.158';
  const TURN_USER = 'projectanonymous';
  const TURN_PASS = 'F,7ld@coturn';

  const pcConfig = {
    iceServers: [
      // STUN — discover public IP
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // TURN over UDP — fastest relay path
      { urls: `turn:${TURN_HOST}:3478`, username: TURN_USER, credential: TURN_PASS },
      // TURN over TCP — fallback for networks that block UDP
      { urls: `turn:${TURN_HOST}:3478?transport=tcp`, username: TURN_USER, credential: TURN_PASS },
      // TURNS (TURN over TLS) — fallback for deep-packet-inspection firewalls
      { urls: `turns:${TURN_HOST}:5349`, username: TURN_USER, credential: TURN_PASS },
    ],
  };

  const startConnectionTimeout = () => {
    clearConnectionTimeout();
    connectionTimeout.current = setTimeout(() => {
      if (!isConnected && connectionStatus === 'connecting') {
        console.log('⏰ Connection timeout reached');
        Alert.alert(
          'Connection Timeout',
          'Unable to establish connection. Please check your network and try again.',
          [
            { text: 'Retry', onPress: () => attemptReconnection() },
            { text: 'End Call', onPress: onEndCall }
          ]
        );
      }
    }, CONNECTION_TIMEOUT);
  };

  const clearConnectionTimeout = () => {
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }
  };

  const attemptReconnection = async () => {
    if (isReconnecting || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    console.log(`🔄 Attempting reconnection ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`);
    setIsReconnecting(true);
    setConnectionStatus('reconnecting');
    setReconnectAttempts(prev => prev + 1);

    try {
      // Clean up existing connection
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      // Create new peer connection
      peerConnection.current = new RTCPeerConnection(pcConfig);
      await initializePeerConnection();

      // Restart media if needed
      if (!localStream) {
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video' ? {
            width: { min: 320, ideal: 640, max: 1280 },
            height: { min: 240, ideal: 480, max: 720 },
            frameRate: { min: 15, ideal: 30, max: 60 },
            facingMode: 'user'
          } : false,
        });
        setLocalStream(stream);
        stream.getTracks().forEach(track => {
          peerConnection.current?.addTrack(track, stream);
        });
      }

      // If this is an outgoing call, create new offer
      if (!isIncoming) {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        
        socket.emit('call-offer', {
          roomKey,
          offer,
          callType,
          callerName: username,
        });
      }

      // Set timeout for reconnection attempt
      connectionTimeout.current = setTimeout(() => {
        if (!isConnected) {
          console.log('⏰ Reconnection attempt timed out');
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            attemptReconnection();
          } else {
            Alert.alert(
              'Connection Failed',
              'Unable to reconnect after multiple attempts. Please try again later.',
              [{ text: 'OK' }]
            );
          }
        }
      }, 5000);

    } catch (error: any) {
      console.error('Reconnection failed:', error);
      setIsReconnecting(false);
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(() => attemptReconnection(), 2000) as any;
      } else {
        Alert.alert(
          'Reconnection Failed',
          'Unable to reconnect. Please check your connection and try again.',
          [{ text: 'End Call', onPress: onEndCall }]
        );
      }
    }
  };

  const resetAndRetry = () => {
    setReconnectAttempts(0);
    setIsReconnecting(false);
    setConnectionStatus('connecting');
    initializeCall();
  };

  const startCallTimer = () => {
    if (callTimer.current) return;
    
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
    }
  };

  const startQualityMonitoring = () => {
    if (qualityMonitorInterval.current) return;
    
    qualityMonitorInterval.current = setInterval(() => {
      monitorConnectionQuality();
    }, QUALITY_MONITOR_INTERVAL);
  };

  const stopQualityMonitoring = () => {
    if (qualityMonitorInterval.current) {
      clearInterval(qualityMonitorInterval.current);
      qualityMonitorInterval.current = null;
    }
  };

  const monitorConnectionQuality = async () => {
    if (!peerConnection.current || !isConnected) return;

    try {
      const stats = await peerConnection.current.getStats();
      let packetsLost = 0;
      let rtt = 0;

      stats.forEach((report: any) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          packetsLost = report.packetsLost || 0;
        }
        if (report.type === 'remote-inbound-rtp') {
          rtt = report.roundTripTime || 0;
        }
      });

      const quality = packetsLost > 50 || rtt > 1000 ? 'poor' : 'good';
      setConnectionQuality(quality);

      if (quality === 'poor') {
        console.warn('⚠️ Poor connection quality detected:', { packetsLost, rtt });
      }
    } catch (error) {
      console.error('Error monitoring connection quality:', error);
    }
  };


  const initializePeerConnection = async () => {
    if (!peerConnection.current) return;

    // Set up peer connection event handlers using React Native WebRTC API
    (peerConnection.current as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log('ICE candidate generated:', event.candidate);
        // Buffer ICE candidates if no remote description yet
        if (!peerConnection.current?.remoteDescription) {
          bufferedIceCandidates.current.push(event.candidate);
          console.log('ICE candidate buffered (no remote description yet)');
        } else {
          socket.emit('ice-candidate', {
            roomKey,
            candidate: event.candidate
          });
        }
      }
    };

    // Add ICE connection state monitoring
    (peerConnection.current as any).oniceconnectionstatechange = () => {
      const state = (peerConnection.current as any)?.iceConnectionState;
      console.log('🧊 ICE Connection State:', state);
      
      switch (state) {
        case 'connected':
          console.log('✅ ICE connected - media should be flowing');
          break;
        case 'completed':
          console.log('✅ ICE completed - connection established');
          break;
        case 'failed':
          console.log('❌ ICE failed - call cannot connect');
          setConnectionStatus('failed');
          break;
        case 'disconnected':
          console.log('⚠️ ICE disconnected');
          setConnectionStatus('reconnecting');
          break;
      }
    };

    (peerConnection.current as any).ontrack = (event: any) => {
      const stream = event.streams[0];
      if (stream) {
        console.log('📹 Received remote stream');
        setRemoteStream(stream);
        const hasAudio = stream.getAudioTracks().length > 0;
        const hasVideo = stream.getVideoTracks().length > 0;
        
        console.log('Stream tracks:', stream.getTracks());
        console.log('📹 Video tracks count:', stream.getVideoTracks().length);
        console.log('🎵 Audio tracks count:', stream.getAudioTracks().length);
        
        // If we have any media tracks, mark as connected
        if (hasVideo || hasAudio) {
          console.log('✅ Media received - marking call as connected');
          setIsConnected(true);
          isConnectedRef.current = true;
          setConnectionStatus('connected');
          clearConnectionTimeout();
          startCallTimer();
          startQualityMonitoring();
        }
        
        // Ensure stream has video tracks for video calls
        if (callType === 'video' && stream.getVideoTracks().length === 0) {
          console.warn('⚠️ No video tracks found in remote stream');
          console.warn('📹 Stream details:', {
            id: stream.id,
            active: stream.active,
            tracks: stream.getTracks().map((t: any) => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
              muted: t.muted
            }))
          });
          
          // Try to get video tracks with delay
          setTimeout(() => {
            const videoTracks = stream.getVideoTracks();
            console.log('📹 Delayed video track check:', videoTracks.length);
            if (videoTracks.length > 0) {
              console.log('✅ Video tracks found after delay:', videoTracks.length);
            } else {
              console.warn('⚠️ Still no video tracks after delay');
            }
          }, 1000);
        } else {
          console.log('✅ Video tracks found in remote stream:', stream.getVideoTracks().length);
        }
      }
    };

    (peerConnection.current as any).onconnectionstatechange = () => {
      const connectionState = peerConnection.current?.connectionState;
      const iceState = peerConnection.current?.iceConnectionState;
      const signalingState = peerConnection.current?.signalingState;
      
      // Use the most reliable state indicator
      const state = connectionState || iceState || signalingState;
      console.log('Connection states:', { connectionState, iceState, signalingState, finalState: state });
      setConnectionStatus(state || 'connecting');
      
      // Consider connection successful when we have remote video tracks
      const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0;
      const hasRemoteAudio = remoteStream && remoteStream.getAudioTracks().length > 0;
      const isConnected = (state === 'connected' || state === 'completed') || (hasRemoteVideo || hasRemoteAudio);
      
      if (isConnected) {
        console.log('✅ Call connected successfully!');
        setIsConnected(true);
        isConnectedRef.current = true;
        setIsReconnecting(false);
        setReconnectAttempts(0);
        startCallTimer();
        startQualityMonitoring();
        clearConnectionTimeout();
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        console.log('Call connection failed or disconnected:', state);
        setIsConnected(false);
        stopCallTimer();
        stopQualityMonitoring();
        
        // Attempt reconnection if not already reconnecting and under max attempts
        if (!isReconnecting && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          attemptReconnection();
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          Alert.alert(
            'Call Ended',
            state === 'failed' ? 'Call connection failed after multiple attempts' : 'Call was disconnected',
            [
              { text: 'Try Again', onPress: () => resetAndRetry() },
              { text: 'End Call', onPress: onEndCall }
            ]
          );
        }
      } else if (state === 'connecting' || state === 'checking') {
        setConnectionStatus('connecting');
        startConnectionTimeout();
      }
    };
  };

  const initializeCall = async () => {
    try {
      // Create peer connection
      peerConnection.current = new RTCPeerConnection(pcConfig);

      // Set up peer connection event handlers
      await initializePeerConnection();

      // Request permissions first
      console.log('Requesting media permissions...');
      
      // Get local media with error handling
      const mediaConstraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video' ? {
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
          frameRate: { min: 15, ideal: 30, max: 60 },
        } : false,
      };

      // CRITICAL: Actually get the media stream
      const stream = await mediaDevices.getUserMedia(mediaConstraints);
      setLocalStream(stream);
      
      // CRITICAL: Add tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });
      
      console.log('📹 Local media obtained and tracks added to peer connection');
      console.log('🎵 Audio tracks:', stream.getAudioTracks().length);
      console.log('📹 Video tracks:', stream.getVideoTracks().length);

      // If this is an outgoing call, create offer
      if (!isIncoming) {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        
        socket.emit('call-offer', {
          roomKey,
          offer,
          callType,
          callerName: username,
        });
      }
    } catch (error: any) {
      console.error('Error initializing call:', error);
      
      if (error.name === 'SecurityError' || error.name === 'NotAllowedError') {
        Alert.alert(
          'Permission Required', 
          'Camera and microphone permissions are required for calls. Please enable them in your device settings.',
          [
            { text: 'OK', onPress: onEndCall }
          ]
        );
      } else if (error.name === 'NotFoundError') {
        Alert.alert(
          'Hardware Not Found',
          'Camera or microphone not found on this device.',
          [
            { text: 'OK', onPress: onEndCall }
          ]
        );
      } else {
        Alert.alert(
          'Call Error', 
          `Failed to initialize call: ${error.message}`,
          [
            { text: 'OK', onPress: onEndCall }
          ]
        );
      }
    }
  };

  const processBufferedIceCandidates = async () => {
    if (bufferedIceCandidates.current.length > 0) {
      console.log(`Processing ${bufferedIceCandidates.current.length} buffered ICE candidates`);
      for (const candidate of bufferedIceCandidates.current) {
        try {
          await peerConnection.current?.addIceCandidate(candidate);
          console.log('✅ Buffered ICE candidate added');
        } catch (error) {
          console.error('❌ Error adding buffered ICE candidate:', error);
        }
      }
      bufferedIceCandidates.current = [];
    }
  };

  const setupSocketListeners = () => {
    // Only register call-offer listener if we don't already have a buffered offer.
    // When pendingOffer is set, the offer is processed directly in initializeCall — 
    // registering a listener too would cause double-processing.
    if (!pendingOffer) {
      socket.on('call-offer', async (data: any) => {
        try {
          await peerConnection.current?.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );
          await processBufferedIceCandidates();
          const answer = await peerConnection.current?.createAnswer();
          await peerConnection.current?.setLocalDescription(answer);
          socket.emit('call-answer', { roomKey, answer });
        } catch (error) {
          console.error('Error handling call offer:', error);
        }
      });
    }

    socket.on('call-answer', async (data: any) => {
      try {
        await peerConnection.current?.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        
        // Process any buffered ICE candidates
        await processBufferedIceCandidates();
      } catch (error) {
        console.error('Error handling call answer:', error);
      }
    });

    socket.on('ice-candidate', async (data: any) => {
      try {
        const candidate = new RTCIceCandidate(data.candidate);
        
        if (peerConnection.current?.remoteDescription) {
          await peerConnection.current.addIceCandidate(candidate);
          console.log('🧊 ICE candidate added immediately');
        } else {
          console.log('🧊 Buffering ICE candidate until remote description is set');
          bufferedIceCandidates.current.push(candidate);
        }
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    });

    socket.on('call-ended', () => {
      endCall();
    });
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach((track: any) => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const endCall = () => {
    socket.emit('end-call', { roomKey });
    cleanup();
    onEndCall();
  };

  const cleanup = () => {
    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
    }

    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (qualityMonitorInterval.current) {
      clearInterval(qualityMonitorInterval.current);
      qualityMonitorInterval.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Remove socket listeners
    socket.off('call-offer');
    socket.off('call-answer');
    socket.off('ice-candidate');
    socket.off('call-ended');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const clearAllTimers = () => {
    if (callTimer.current) clearInterval(callTimer.current);
    if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    if (qualityMonitorInterval.current) clearInterval(qualityMonitorInterval.current);
  };

  useEffect(() => {
    if (!socket) return;

    // Set up socket listeners BEFORE initializing call
    setupSocketListeners();
    
    if (isIncoming) {
      console.log('📞 Setting up incoming call');
      // Use pendingOffer if already buffered by ChatScreen
      if (pendingOffer) {
        console.log('📦 Processing pre-buffered call-offer immediately');
        initializeCall().then(() => {
          // Manually trigger the offer handler with the buffered offer
          peerConnection.current && (async () => {
            try {
              await peerConnection.current!.setRemoteDescription(
                new RTCSessionDescription(pendingOffer.offer)
              );
              await processBufferedIceCandidates();
              const answer = await peerConnection.current!.createAnswer();
              await peerConnection.current!.setLocalDescription(answer);
              socket.emit('call-answer', { roomKey, answer });
              console.log('✅ Answer sent from buffered offer');
            } catch (e) { console.error('Error processing buffered offer:', e); }
          })();
        });
      } else {
        // Wait for call-offer via socket (registered in setupSocketListeners)
        setTimeout(() => initializeCall(), 100);
      }
    } else {
      console.log('📞 Setting up outgoing call');
      initializeCall();
    }

    return () => {
      endCall();
      clearAllTimers();
    };
  }, [socket, roomKey, username, isIncoming, callType]);

  useEffect(() => {
    if (isConnected && !callTimer.current) {
      // Clear connection timeout when connected
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current);
        connectionTimeout.current = null;
      }
      setConnectionStatus('connected');
      
      callTimer.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (callTimer.current) {
        clearInterval(callTimer.current);
      }
    };
  }, [isConnected]);

  return (
    <View style={styles.container}>
      {remoteStream ? (
        <View style={styles.remoteVideoContainer}>
          <RTCView
            key={remoteStream.toURL()}
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
            zOrder={0}
          />
        </View>
      ) : (
        <View style={styles.noVideoContainer}>
          <Text style={styles.noVideoText}>
            {callType === 'video' ? '📹 Waiting for video...' : '🎵 Waiting for audio...'}
          </Text>
        </View>
      )}

      {/* Call Info */}
      <View style={styles.callInfo}>
        <Text style={styles.callerName}>{username}</Text>
        <Text style={styles.callStatus}>
          {isConnected ? formatDuration(callDuration) : 
           connectionStatus === 'failed' ? 'Connection Failed' :
           connectionStatus === 'connecting' ? 'Connecting...' :
           connectionStatus === 'connected' ? 'Connected' :
           'Establishing Connection...'}
        </Text>
        <Text style={styles.callType}>
          {callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
        </Text>
      </View>

      {/* Local Video (Picture in Picture) */}
      {callType === 'video' && localStream && isVideoEnabled && (
        <RTCView
          style={styles.localVideo}
          streamURL={localStream.toURL()}
          objectFit="cover"
          mirror={true}
          zOrder={1}
        />
      )}

      {/* Call Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.mutedButton]}
          onPress={toggleMute}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>

        {callType === 'video' && (
          <TouchableOpacity
            style={[styles.controlButton, !isVideoEnabled && styles.mutedButton]}
            onPress={toggleVideo}
          >
            <Text style={styles.controlIcon}>{isVideoEnabled ? '📹' : '📷'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={endCall}
        >
          <Text style={styles.controlIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
    width: width,
    height: height,
  },
  remoteVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  noVideoText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  localVideo: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  remoteAudioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 20,
    borderRadius: 10,
  },
  remoteAudioIcon: {
    fontSize: 48,
    color: '#fff',
    marginBottom: 10,
  },
  remoteAudioText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  callInfo: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  callerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  callType: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.6,
    marginTop: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  mutedButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  endCallButton: {
    backgroundColor: '#ff4444',
  },
  controlIcon: {
    fontSize: 24,
  },
  audioCallBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  audioCallIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  audioCallText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default CallScreen;
