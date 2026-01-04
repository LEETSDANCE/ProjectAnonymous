import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { decryptMessage } from './crypto-native';

interface MessageItemProps {
  msg: any;
  userId: string | null;
  keys: any;
  isMyMessage: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ msg, userId, keys, isMyMessage }) => {
  const [decryptedMessage, setDecryptedMessage] = useState('Decrypting...');

  useEffect(() => {
    const decrypt = async () => {
      // Handle file messages
      if (msg.type === 'file') {
        const fileIcon = msg.fileType === 'document' ? '📄' : '🖼️';
        setDecryptedMessage(`${fileIcon} ${msg.fileName}\n${msg.fileSize}`);
        return;
      }
      
      // Handle plain text messages (for testing)
      if (msg.text) {
        setDecryptedMessage(msg.text);
        return;
      }
      
      // Handle encrypted messages
      if (userId && keys && msg[userId]) {
        try {
          const decrypted = await decryptMessage(keys.privateKey, msg[userId]);
          setDecryptedMessage(decrypted);
        } catch (e) {
          setDecryptedMessage('Failed to decrypt message.');
        }
      } else {
        // If no text property and no encrypted data, check if it's a system message
        if (msg.username && msg.timestamp && !msg.text && !msg.type && !msg.fileName) {
          // This appears to be a user join/leave message or similar system event
          setDecryptedMessage(`${msg.username} joined the room`);
        } else {
          setDecryptedMessage('Message could not be displayed');
        }
      }
    };
    decrypt();
  }, [msg, userId, keys]);

  const downloadFile = () => {
    if (!msg.fileData) {
      Alert.alert('Error', 'No file data available');
      return;
    }

    Alert.alert(
      'File Available',
      `${msg.fileName} (${msg.fileSize})\n\nThis file can be viewed on the web version or saved by copying the data.`,
      [
        { 
          text: 'Copy Data', 
          onPress: () => {
            // For now, just show the file info
            Alert.alert('File Info', `File: ${msg.fileName}\nType: ${msg.mimeType}\nSize: ${msg.fileSize}\n\nUse the web version to download files.`);
          }
        },
        { text: 'OK', style: 'cancel' }
      ]
    );
  };

  const isFileMessage = msg.type === 'file';

  return (
    <TouchableOpacity 
      style={[styles.message, isMyMessage ? styles.myMessage : styles.otherMessage]}
      onPress={isFileMessage && msg.fileData ? downloadFile : undefined}
      disabled={!isFileMessage || !msg.fileData}
    >
      <Text style={isMyMessage ? styles.myMessageText : styles.otherMessageText}>
        {decryptedMessage}
      </Text>
      {isFileMessage && msg.fileData && (
        <Text style={[styles.downloadHint, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
          📥 Tap to download
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  message: { padding: 12, borderRadius: 10, marginVertical: 4, maxWidth: '80%' },
  myMessage: { backgroundColor: '#007bff', alignSelf: 'flex-end' },
  otherMessage: { backgroundColor: '#e5e5ea', alignSelf: 'flex-start' },
  myMessageText: { color: 'white' },
  otherMessageText: { color: 'black' },
  downloadHint: { fontSize: 12, marginTop: 4, opacity: 0.8, fontStyle: 'italic' },
});

export default MessageItem;
