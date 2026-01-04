import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';

interface CallScreenProps {
  socket: any;
  roomKey: string;
  username: string;
  onEndCall: () => void;
  isIncoming?: boolean;
  callType: 'audio' | 'video';
}

const { width, height } = Dimensions.get('window');

const CallScreen: React.FC<CallScreenProps> = ({
  socket,
  roomKey,
  username,
  onEndCall,
  isIncoming = false,
  callType,
}) => {
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor'>('good');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const callTimer = useRef<number | null>(null);
  const connectionTimeout = useRef<number | null>(null);
  const reconnectTimeout = useRef<number | null>(null);
  const qualityMonitorInterval = useRef<number | null>(null);

  const CONNECTION_TIMEOUT = 30000; // 30 seconds
  const MAX_RECONNECT_ATTEMPTS = 3;
  const QUALITY_MONITOR_INTERVAL = 5000; // 5 seconds

  const pcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
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
      reconnectTimeout.current = setTimeout(() => {
        if (!isConnected) {
          console.log('⏰ Reconnection attempt timed out');
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            attemptReconnection();
          } else {
            Alert.alert(
              'Connection Failed',
              'Unable to reconnect after multiple attempts. Please try again later.',
              [{ text: 'End Call', onPress: onEndCall }]
            );
          }
        }
      }, 10000); // 10 seconds for each reconnection attempt

    } catch (error: any) {
      console.error('Reconnection failed:', error);
      setIsReconnecting(false);
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(() => attemptReconnection(), 2000);
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
        socket.emit('ice-candidate', {
          roomKey,
          candidate: event.candidate,
        });
      }
    };

    (peerConnection.current as any).ontrack = (event: any) => {
      console.log('Received remote track:', event);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setIsConnected(true);
      }
    };

    (peerConnection.current as any).onconnectionstatechange = () => {
      const state = peerConnection.current?.connectionState;
      console.log('Connection state:', state);
      setConnectionStatus(state || 'unknown');
      
      if (state === 'connected') {
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempts(0);
        startCallTimer();
        startQualityMonitoring();
        clearConnectionTimeout();
      } else if (state === 'disconnected' || state === 'failed') {
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
      } else if (state === 'connecting') {
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
      const mediaConstraints = {
        audio: true,
        video: callType === 'video' ? {
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
          frameRate: { min: 15, ideal: 30, max: 60 },
          facingMode: 'user'
        } : false,
      };

      console.log('Media constraints:', mediaConstraints);
      const stream = await mediaDevices.getUserMedia(mediaConstraints);
      console.log('Media stream obtained:', stream);

      setLocalStream(stream);
      
      // Add tracks to peer connection using modern API
      stream.getTracks().forEach(track => {
        console.log('Adding track:', track.kind);
        peerConnection.current?.addTrack(track, stream);
      });

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

  const setupSocketListeners = () => {
    socket.on('call-offer', async (data: any) => {
      try {
        await peerConnection.current?.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        
        const answer = await peerConnection.current?.createAnswer();
        await peerConnection.current?.setLocalDescription(answer);
        
        socket.emit('call-answer', {
          roomKey,
          answer,
        });
      } catch (error) {
        console.error('Error handling call offer:', error);
      }
    });

    socket.on('call-answer', async (data: any) => {
      try {
        await peerConnection.current?.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      } catch (error) {
        console.error('Error handling call answer:', error);
      }
    });

    socket.on('ice-candidate', async (data: any) => {
      try {
        await peerConnection.current?.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
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

  useEffect(() => {
    initializeCall();
    setupSocketListeners();
    
    // Set connection timeout (30 seconds)
    connectionTimeout.current = setTimeout(() => {
      if (!isConnected) {
        console.log('Call connection timeout');
        setConnectionStatus('failed');
        Alert.alert(
          'Connection Timeout',
          'Unable to establish call connection. Please check your internet connection and try again.',
          [{ text: 'OK', onPress: onEndCall }]
        );
      }
    }, 30000);
    
    return () => {
      cleanup();
    };
  }, []);

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
      {/* Remote Video */}
      {callType === 'video' && remoteStream && (
        <RTCView
          style={styles.remoteVideo}
          streamURL={remoteStream.toURL()}
          objectFit="cover"
          zOrder={0}
        />
      )}
      
      {/* Audio-only call background */}
      {callType === 'audio' && (
        <View style={styles.audioCallBackground}>
          <Text style={styles.audioCallIcon}>🎵</Text>
          <Text style={styles.audioCallText}>Audio Call</Text>
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
