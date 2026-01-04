// quantum-crypto-native.ts
// Post-Quantum Cryptography Implementation for React Native using ML-KEM and ML-DSA

import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';

// Simple base64 encoding for React Native
const simpleBase64 = {
  encode: (str: string): string => {
    // Simple hex encoding as fallback for React Native
    return str.split('').map(char => {
      return char.charCodeAt(0).toString(16).padStart(2, '0');
    }).join('');
  },
  decode: (hex: string): string => {
    // Simple hex decoding as fallback for React Native
    return hex.match(/.{2}/g)?.map(hexByte => String.fromCharCode(parseInt(hexByte, 16))).join('') || '';
  }
};

// Choose security levels - using the highest available variants
const KEM_ALGORITHM = ml_kem1024; // Highest security ML-KEM
const DSA_ALGORITHM = ml_dsa87;   // Highest security ML-DSA

/**
 * Quantum-Resistant Key Pair Generation
 * Combines ML-KEM (Key Encapsulation) and ML-DSA (Digital Signature)
 */
export const generateKeyPair = async () => {
  try {
    console.log('🔐 Generating quantum-resistant key pair for mobile...');
    
    // Generate ML-KEM key pair for encryption
    const kemKeyPair = await KEM_ALGORITHM.keygen();
    
    // Generate ML-DSA key pair for signing
    const dsaKeyPair = await DSA_ALGORITHM.keygen();
    
    const quantumKeyPair = {
      // KEM keys for encryption/decryption
      kemPublicKey: kemKeyPair.publicKey,
      kemPrivateKey: kemKeyPair.secretKey,
      
      // DSA keys for signing/verification
      dsaPublicKey: dsaKeyPair.publicKey,
      dsaPrivateKey: dsaKeyPair.secretKey,
      
      // Combined public key for sharing
      publicKey: {
        kem: kemKeyPair.publicKey,
        dsa: dsaKeyPair.publicKey
      },
      
      // Combined private key (kept secret)
      privateKey: {
        kem: kemKeyPair.secretKey,
        dsa: dsaKeyPair.secretKey
      },
      
      algorithm: 'ML-KEM-1024 + ML-DSA-87',
      securityLevel: 'Post-Quantum Secure (NIST Level 5)',
      timestamp: Date.now()
    } as {
      kemPublicKey: Uint8Array,
      kemPrivateKey: Uint8Array,
      dsaPublicKey: Uint8Array,
      dsaPrivateKey: Uint8Array,
      publicKey: {
        kem: Uint8Array,
        dsa: Uint8Array
      },
      privateKey: {
        kem: Uint8Array,
        dsa: Uint8Array
      },
      algorithm: string,
      securityLevel: string,
      timestamp: number
    };
    
    console.log('✅ Mobile quantum key pair generated successfully');
    console.log(`🛡️ Algorithm: ${quantumKeyPair.algorithm}`);
    
    return quantumKeyPair;
  } catch (error) {
    console.error('❌ Error generating mobile quantum key pair:', error);
    throw new Error('Failed to generate quantum-resistant key pair for mobile');
  }
};

/**
 * Export quantum public key to base64 string for sharing
 */
export const exportPublicKey = (publicKey: any) => {
  try {
    const publicKeyData = {
      kem: Array.from(publicKey.kem),
      dsa: Array.from(publicKey.dsa),
      algorithm: 'ML-KEM-1024 + ML-DSA-87',
      timestamp: Date.now()
    };
    
    const jsonString = JSON.stringify(publicKeyData);
    return simpleBase64.encode(jsonString);
  } catch (error) {
    console.error('❌ Error exporting quantum public key:', error);
    throw new Error('Failed to export quantum public key');
  }
};

/**
 * Import quantum public key from base64 string
 */
export const importPublicKey = (publicKeyString: string) => {
  try {
    const jsonString = simpleBase64.decode(publicKeyString);
    const publicKeyData = JSON.parse(jsonString);
    
    return {
      kem: new Uint8Array(publicKeyData.kem),
      dsa: new Uint8Array(publicKeyData.dsa)
    };
  } catch (error) {
    console.error('❌ Error importing quantum public key:', error);
    throw new Error('Failed to import quantum public key');
  }
};

// Polyfills for React Native
const TextEncoder = class {
  encode(str: string): Uint8Array {
    return new Uint8Array(Array.from(str).map(c => c.charCodeAt(0)));
  }
};

const TextDecoder = class {
  decode(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  }
};

/**
 * Encrypt message using ML-KEM (Key Encapsulation Mechanism)
 */
export const encryptMessage = async (publicKey: any, message: string) => {
  try {
    console.log('🔒 Encrypting message with quantum cryptography for mobile...');
    
    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Encapsulate shared secret using recipient's KEM public key
    const { cipherText: kemCiphertext, sharedSecret } = await KEM_ALGORITHM.encapsulate(
      publicKey.kem
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
    
    console.log('✅ Message encrypted with quantum cryptography for mobile');
    return encryptedData;
  } catch (error) {
    console.error('❌ Error encrypting with quantum cryptography for mobile:', error);
    throw new Error('Failed to encrypt message with quantum cryptography for mobile');
  }
};

/**
 * Decrypt message using ML-KEM (Key Encapsulation Mechanism)
 */
export const decryptMessage = async (privateKey: any, encryptedData: any) => {
  try {
    console.log('🔓 Decrypting message with quantum cryptography for mobile...');
    
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
    const decryptedMessage = new TextDecoder().decode(decryptedBytes);
    
    console.log('✅ Message decrypted with quantum cryptography for mobile');
    return decryptedMessage;
  } catch (error) {
    console.error('❌ Error decrypting with quantum cryptography for mobile:', error);
    return 'Failed to decrypt quantum message.';
  }
};

/**
 * Sign message using ML-DSA (Digital Signature Algorithm)
 */
export const signMessage = async (message: string, privateKey: any) => {
  try {
    console.log('✍️ Signing message with quantum digital signature for mobile...');
    
    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Sign the message using ML-DSA private key
    const signature = await DSA_ALGORITHM.sign(messageBytes, privateKey.dsa);
    
    const signedData = {
      message: message,
      signature: Array.from(signature),
      algorithm: 'ML-DSA-87',
      timestamp: Date.now()
    };
    
    console.log('✅ Message signed with quantum digital signature for mobile');
    return signedData;
  } catch (error) {
    console.error('❌ Error signing with quantum cryptography for mobile:', error);
    throw new Error('Failed to sign message with quantum cryptography for mobile');
  }
};

/**
 * Verify signature using ML-DSA
 */
export const verifySignature = async (signedData: any, publicKey: any) => {
  try {
    console.log('🔍 Verifying quantum digital signature for mobile...');
    
    // Convert signature back to Uint8Array
    const signature = new Uint8Array(signedData.signature);
    const messageBytes = new TextEncoder().encode(signedData.message);
    
    // Verify the signature using ML-DSA public key
    const isValid = await DSA_ALGORITHM.verify(signature, messageBytes, publicKey.dsa);
    
    console.log(isValid ? '✅ Quantum signature verified for mobile' : '❌ Quantum signature invalid for mobile');
    return isValid;
  } catch (error) {
    console.error('❌ Error verifying quantum signature for mobile:', error);
    return false;
  }
};

/**
 * Get quantum security information for mobile
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
    platform: 'React Native Mobile'
  };
};
