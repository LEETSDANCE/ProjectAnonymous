// crypto-native.ts
// Legacy RSA cryptography - DEPRECATED in favor of quantum cryptography
// This file is kept for backward compatibility but should not be used

import { RSA } from 'react-native-rsa-native';
import { 
  generateKeyPair as quantumGenerateKeyPair,
  exportPublicKey as quantumExportPublicKey,
  importPublicKey as quantumImportPublicKey,
  encryptMessage as quantumEncryptMessage,
  decryptMessage as quantumDecryptMessage,
  getQuantumSecurityInfo
} from './quantum-crypto-native';

// Generate a new quantum-resistant key pair
export const generateKeyPair = async () => {
  return await quantumGenerateKeyPair();
};

// Export quantum public key
export const exportPublicKey = (publicKey: any) => {
  return quantumExportPublicKey(publicKey);
};

// Import quantum public key
export const importPublicKey = (publicKeyPem: string) => {
  return quantumImportPublicKey(publicKeyPem);
};

// Encrypt a message with quantum cryptography
export const encryptMessage = async (publicKey: any, message: string) => {
  return await quantumEncryptMessage(publicKey, message);
};

// Decrypt a message with quantum cryptography
export const decryptMessage = async (privateKey: any, encryptedMessage: any) => {
  return await quantumDecryptMessage(privateKey, encryptedMessage);
};

// Export quantum security info
export { getQuantumSecurityInfo };
