import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import QRCode from 'react-native-qrcode-svg';

interface HomeScreenProps {
  navigation: any;
  route: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  useEffect(() => {
    if (route.params?.scannedData) {
      setSessionKey(route.params.scannedData);
    }
  }, [route.params?.scannedData]);

  const { theme, isDark } = useTheme();
  const [sessionKey, setSessionKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [username, setUsername] = useState('');
  const [showQR, setShowQR] = useState(false);

  const generateSessionKey = () => {
    // Generate a random 6-character session key
    const key = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedKey(key);
  };

  const startChatRoom = () => {
    if (!generatedKey) {
      Alert.alert('Error', 'Please generate a session key first');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    navigation.navigate('Chat', { 
      roomKey: generatedKey, 
      isCreator: true,
      username: username.trim()
    });
  };

  const joinChatRoom = () => {
    if (!sessionKey.trim()) {
      Alert.alert('Error', 'Please enter a session key');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    navigation.navigate('Chat', { 
      roomKey: sessionKey.toUpperCase(), 
      isCreator: false,
      username: username.trim()
    });
  };

  const copyToClipboard = () => {
    // Copy functionality would go here
    Alert.alert('Copied', 'Session key copied to clipboard');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        {/* Header with Settings Button */}
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>PQEncrypt</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Anonymous, quantum-secure messaging
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Username Input */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Name</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.inputBackground,
              color: theme.text,
              borderColor: theme.border
            }]}
            placeholder="Enter your name..."
            placeholderTextColor={theme.textSecondary}
            value={username}
            onChangeText={setUsername}
            maxLength={20}
          />
        </View>

        {/* Create Room Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔑</Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Create Room</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Generate a session key to start a new anonymous chat room
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={generateSessionKey}
          >
            <Text style={styles.primaryButtonText}>Generate Session Key</Text>
          </TouchableOpacity>

          {generatedKey && (
            <>
              <View style={[styles.keyContainer, { backgroundColor: theme.inputBackground }]}>
                <Text style={[styles.keyText, { color: theme.text }]}>{generatedKey}</Text>
                <TouchableOpacity onPress={copyToClipboard}>
                  <Text style={styles.copyIcon}>📋</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowQR(true)}>
                  <Text style={styles.copyIcon}>📱</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={startChatRoom}
              >
                <Text style={styles.primaryButtonText}>Start Chat Room</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Join Room Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>👥</Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Join Room</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Enter a session key to join an existing chat room
          </Text>

          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.inputBackground,
              color: theme.text,
              borderColor: theme.border
            }]}
            placeholder="Enter session key..."
            placeholderTextColor={theme.textSecondary}
            value={sessionKey}
            onChangeText={setSessionKey}
            autoCapitalize="characters"
            maxLength={6}
          />

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.primary }]}
            onPress={joinChatRoom}
          >
            <Text style={styles.secondaryButtonText}>Join Chat Room</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.secondary, marginTop: 10 }]}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <Text style={styles.secondaryButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* QR Code Modal */}
      <Modal
        visible={showQR}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Share Room Key</Text>
            {generatedKey ? (
              <QRCode
                value={generatedKey}
                size={250}
                backgroundColor={theme.card}
                color={theme.text}
              />
            ) : null}
            <Text style={[styles.modalKeyText, { color: theme.text }]}>{generatedKey}</Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary, marginTop: 20 }]}
              onPress={() => setShowQR(false)}
            >
              <Text style={styles.primaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 30,
  },
  header: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 28,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#6c9cff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  keyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  keyText: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#333',
  },
  copyIcon: {
    fontSize: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalKeyText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginTop: 20,
    textAlign: 'center',
  },
});

export default HomeScreen;
