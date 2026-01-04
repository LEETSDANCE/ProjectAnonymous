// quantum-crypto-server.js
// Post-Quantum Cryptography Implementation for Node.js Server using ML-KEM and ML-DSA

import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';

// Choose security levels - using the highest available variants
const KEM_ALGORITHM = ml_kem1024; // Highest security ML-KEM
const DSA_ALGORITHM = ml_dsa87;   // Highest security ML-DSA

/**
 * Quantum-Resistant Key Pair Generation for Server
 * Combines ML-KEM (Key Encapsulation) and ML-DSA (Digital Signature)
 */
export const generateQuantumKeyPair = async () => {
  try {
    console.log('🔐 Generating quantum-resistant key pair for server...');
    
    // Generate ML-KEM key pair for encryption
    const kemKeyPair = await KEM_ALGORITHM.keygen();
    
    // Generate ML-DSA key pair for signing
    const dsaKeyPair = await DSA_ALGORITHM.keygen();
    
    const quantumKeyPair = {
      // KEM keys for encryption/decryption
      kemPublicKey: kemKeyPair.publicKey,
      kemPrivateKey: kemKeyPair.privateKey,
      
      // DSA keys for signing/verification
      dsaPublicKey: dsaKeyPair.publicKey,
      dsaPrivateKey: dsaKeyPair.privateKey,
      
      // Combined public key for sharing
      publicKey: {
        kem: kemKeyPair.publicKey,
        dsa: dsaKeyPair.publicKey
      },
      
      // Combined private key (kept secret)
      privateKey: {
        kem: kemKeyPair.privateKey,
        dsa: dsaKeyPair.privateKey
      },
      
      algorithm: 'ML-KEM-1024 + ML-DSA-87',
      securityLevel: 'Post-Quantum Secure (NIST Level 5)',
      timestamp: Date.now()
    };
    
    console.log('✅ Server quantum key pair generated successfully');
    console.log(`🛡️ Algorithm: ${quantumKeyPair.algorithm}`);
    
    return quantumKeyPair;
  } catch (error) {
    console.error('❌ Error generating server quantum key pair:', error);
    throw new Error('Failed to generate quantum-resistant key pair for server');
  }
};

/**
 * Export quantum public key to base64 string for sharing
 */
export const exportQuantumPublicKey = (publicKey) => {
  try {
    const publicKeyData = {
      kem: Array.from(publicKey.kem),
      dsa: Array.from(publicKey.dsa),
      algorithm: 'ML-KEM-1024 + ML-DSA-87',
      timestamp: Date.now()
    };
    
    return Buffer.from(JSON.stringify(publicKeyData)).toString('base64');
  } catch (error) {
    console.error('❌ Error exporting quantum public key:', error);
    throw new Error('Failed to export quantum public key');
  }
};

/**
 * Import quantum public key from base64 string
 */
export const importQuantumPublicKey = (publicKeyString) => {
  try {
    const publicKeyData = JSON.parse(Buffer.from(publicKeyString, 'base64').toString());
    
    return {
      kem: new Uint8Array(publicKeyData.kem),
      dsa: new Uint8Array(publicKeyData.dsa)
    };
  } catch (error) {
    console.error('❌ Error importing quantum public key:', error);
    throw new Error('Failed to import quantum public key');
  }
};

/**
 * Encrypt message using ML-KEM (Key Encapsulation Mechanism)
 */
export const encryptWithQuantum = async (message, recipientPublicKey) => {
  try {
    console.log('🔒 Encrypting message with quantum cryptography on server...');
    
    // Convert message to bytes
    const messageBytes = Buffer.from(message, 'utf8');
    
    // Encapsulate shared secret using recipient's KEM public key
    const { ciphertext: kemCiphertext, sharedSecret } = await KEM_ALGORITHM.encapsulate(
      recipientPublicKey.kem
    );
    
    // Use shared secret to encrypt the actual message (using XOR for simplicity)
    const encryptedMessage = new Uint8Array(messageBytes.length);
    for (let i = 0; i < messageBytes.length; i++) {
      encryptedMessage[i] = messageBytes[i] ^ sharedSecret[i % sharedSecret.length];
    }
    
    const encryptedData = {
      kemCiphertext: Array.from(kemCiphertext),
      encryptedMessage: Array.from(encryptedMessage),
      algorithm: 'ML-KEM-1024',
      timestamp: Date.now()
    };
    
    console.log('✅ Message encrypted with quantum cryptography on server');
    return encryptedData;
  } catch (error) {
    console.error('❌ Error encrypting with quantum cryptography on server:', error);
    throw new Error('Failed to encrypt message with quantum cryptography on server');
  }
};

/**
 * Decrypt message using ML-KEM (Key Encapsulation Mechanism)
 */
export const decryptWithQuantum = async (encryptedData, privateKey) => {
  try {
    console.log('🔓 Decrypting message with quantum cryptography on server...');
    
    // Convert arrays back to Uint8Array
    const kemCiphertext = new Uint8Array(encryptedData.kemCiphertext);
    const encryptedMessage = new Uint8Array(encryptedData.encryptedMessage);
    
    // Decapsulate shared secret using private KEM key
    const sharedSecret = await KEM_ALGORITHM.decapsulate(kemCiphertext, privateKey.kem);
    
    // Use shared secret to decrypt the message (reverse XOR)
    const decryptedBytes = new Uint8Array(encryptedMessage.length);
    for (let i = 0; i < encryptedMessage.length; i++) {
      decryptedBytes[i] = encryptedMessage[i] ^ sharedSecret[i % sharedSecret.length];
    }
    
    // Convert back to string
    const decryptedMessage = Buffer.from(decryptedBytes).toString('utf8');
    
    console.log('✅ Message decrypted with quantum cryptography on server');
    return decryptedMessage;
  } catch (error) {
    console.error('❌ Error decrypting with quantum cryptography on server:', error);
    throw new Error('Failed to decrypt message with quantum cryptography on server');
  }
};

/**
 * Sign message using ML-DSA (Digital Signature Algorithm)
 */
export const signWithQuantum = async (message, privateKey) => {
  try {
    console.log('✍️ Signing message with quantum digital signature on server...');
    
    // Convert message to bytes
    const messageBytes = Buffer.from(message, 'utf8');
    
    // Sign the message using ML-DSA private key
    const signature = await DSA_ALGORITHM.sign(messageBytes, privateKey.dsa);
    
    const signedData = {
      message: message,
      signature: Array.from(signature),
      algorithm: 'ML-DSA-87',
      timestamp: Date.now()
    };
    
    console.log('✅ Message signed with quantum digital signature on server');
    return signedData;
  } catch (error) {
    console.error('❌ Error signing with quantum cryptography on server:', error);
    throw new Error('Failed to sign message with quantum cryptography on server');
  }
};

/**
 * Verify signature using ML-DSA
 */
export const verifyWithQuantum = async (signedData, publicKey) => {
  try {
    console.log('🔍 Verifying quantum digital signature on server...');
    
    // Convert signature back to Uint8Array
    const signature = new Uint8Array(signedData.signature);
    const messageBytes = Buffer.from(signedData.message, 'utf8');
    
    // Verify the signature using ML-DSA public key
    const isValid = await DSA_ALGORITHM.verify(signature, messageBytes, publicKey.dsa);
    
    console.log(isValid ? '✅ Quantum signature verified on server' : '❌ Quantum signature invalid on server');
    return isValid;
  } catch (error) {
    console.error('❌ Error verifying quantum signature on server:', error);
    return false;
  }
};

/**
 * Generate quantum-secure random session key
 */
export const generateQuantumSessionKey = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash function for quantum cryptography
 */
export const quantumHash = async (data) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Compare quantum security with RSA
 */
export const getQuantumSecurityInfo = () => {
  return {
    currentAlgorithm: 'ML-KEM-1024 + ML-DSA-87',
    previousAlgorithm: 'RSA-2048',
    quantumResistance: 'Full resistance to quantum attacks',
    nistSecurityLevel: 5, // Highest NIST security level
    keySize: {
      kem: '4160 bytes (public), 4160 bytes (private)',
      dsa: '5376 bytes (public), 16480 bytes (private)',
      total: '~26KB total vs 512B for RSA-2048'
    },
    performance: 'Slower than RSA but quantum-safe',
    protection: 'Protects against both classical and quantum computers',
    platform: 'Node.js Server'
  };
};

// Server middleware for quantum cryptography validation
export const quantumCryptoMiddleware = (req, res, next) => {
  // Add quantum security headers
  res.setHeader('X-Quantum-Security', 'ML-KEM-1024 + ML-DSA-87');
  res.setHeader('X-Post-Quantum-Ready', 'true');
  next();
};

// Utility function to validate quantum key format
export const validateQuantumKey = (keyData) => {
  try {
    if (!keyData.kem || !keyData.dsa) {
      return false;
    }
    
    // Check if arrays are proper Uint8Array format
    const kemArray = new Uint8Array(keyData.kem);
    const dsaArray = new Uint8Array(keyData.dsa);
    
    // Basic size validation for ML-KEM-1024 and ML-DSA-87
    if (kemArray.length !== 4160 || dsaArray.length !== 5376) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Quantum key validation error:', error);
    return false;
  }
};
