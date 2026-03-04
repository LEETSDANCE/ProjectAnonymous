import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { useTheme } from '../context/ThemeContext';

interface QRScannerScreenProps {
  navigation: any;
}

const QRScannerScreen: React.FC<QRScannerScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [isScanning, setIsScanning] = useState(true);
  const lastScannedRef = useRef<string | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onBarCodeRead = (e: any) => {
    const qrData = e.data;
    
    if (!qrData || !isScanning) return;
    
    // Prevent multiple scans of the same QR code
    if (lastScannedRef.current === qrData) return;
    
    lastScannedRef.current = qrData;
    setIsScanning(false);
    
    // Provide haptic feedback
    Vibration.vibrate(100);
    
    // Clean and validate the QR data
    let cleanedData = qrData.trim();
    
    console.log('Raw QR Data:', qrData);
    console.log('Cleaned QR Data:', cleanedData);
    
    // Remove any potential JSON formatting or extra characters
    if (cleanedData.includes('{') || cleanedData.includes('Type') || cleanedData.includes('"')) {
      // Try to extract just the session key if it's wrapped in JSON or other format
      const keyMatch = cleanedData.match(/([A-Z0-9]{4,8})/);
      if (keyMatch && keyMatch[1]) {
        cleanedData = keyMatch[1];
        console.log('Extracted Key:', cleanedData);
      } else {
        // If no clear match found, alert user
        Alert.alert('Invalid QR Code', 'The QR code does not contain a valid session key.');
        resetScanner();
        return;
      }
    }
    
    // Validate that we have a clean session key
    if (cleanedData.length >= 4 && cleanedData.length <= 8 && /^[A-Z0-9]+$/.test(cleanedData)) {
      console.log('Valid QR Code detected:', cleanedData);
      navigation.navigate('Home', { scannedData: cleanedData });
    } else {
      console.log('Invalid QR Code format:', cleanedData);
      Alert.alert('Invalid QR Code', `The QR code contains: "${cleanedData}" which is not a valid session key. Session keys should be 4-8 alphanumeric characters.`);
      resetScanner();
    }
  };
  
  const resetScanner = () => {
    // Clear any existing timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    // Reset scanning after a delay
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(true);
      lastScannedRef.current = null;
    }, 2000);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <RNCamera
        style={styles.preview}
        onBarCodeRead={isScanning ? onBarCodeRead : undefined}
        captureAudio={false}
        barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
      >
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.centerOverlay}>
            <View style={styles.leftOverlay} />
            <View style={styles.scannerFrame} />
            <View style={styles.rightOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            <Text style={styles.scanText}>Scan QR Code</Text>
          </View>
        </View>
      </RNCamera>
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: theme.primary }]} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  centerOverlay: {
    flexDirection: 'row',
    height: 250,
  },
  leftOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  rightOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanText: {
    fontSize: 18,
    color: 'white',
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QRScannerScreen;
