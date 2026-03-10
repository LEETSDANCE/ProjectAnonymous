// quantum-crypto-native.ts
// Post-Quantum Cryptography for React Native
// Encryption: ML-KEM-1024 key exchange → AES-256-GCM (via node-forge)
// Signing:    ML-DSA-87 over ciphertext

import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa87 }   from '@noble/post-quantum/ml-dsa.js';
import { Buffer }      from 'buffer';
import forge           from 'node-forge';

// Polyfill guard — react-native-get-random-values MUST be imported in index.js BEFORE this module.
// If crypto is still missing at this point, it's a setup error — fail loudly rather than
// silently using Math.random() which would make all keys predictable.
if (typeof (global as any).crypto?.getRandomValues !== 'function') {
  throw new Error(
    'crypto.getRandomValues is not available. ' +
    'Ensure "import \'react-native-get-random-values\';" is the FIRST import in index.js.'
  );
}

const KEM = ml_kem1024;
const DSA = ml_dsa87;

// ─── Key Generation ──────────────────────────────────────────────────────────

export const generateKeyPair = async () => {
  console.log('🔐 Generating quantum-resistant key pair (mobile)...');
  const kemKp = KEM.keygen();
  const dsaKp = DSA.keygen();
  const pair = {
    kemPublicKey:  kemKp.publicKey,
    kemPrivateKey: kemKp.secretKey,
    dsaPublicKey:  dsaKp.publicKey,
    dsaPrivateKey: dsaKp.secretKey,
    publicKey:  { kem: kemKp.publicKey,  dsa: dsaKp.publicKey  },
    privateKey: { kem: kemKp.secretKey,  dsa: dsaKp.secretKey  },
    algorithm:     'ML-KEM-1024 + ML-DSA-87',
    securityLevel: 'Post-Quantum Secure (NIST Level 5)',
    timestamp:     Date.now(),
  } as {
    kemPublicKey: Uint8Array; kemPrivateKey: Uint8Array;
    dsaPublicKey: Uint8Array; dsaPrivateKey: Uint8Array;
    publicKey:  { kem: Uint8Array; dsa: Uint8Array };
    privateKey: { kem: Uint8Array; dsa: Uint8Array };
    algorithm: string; securityLevel: string; timestamp: number;
  };
  console.log('✅ Mobile quantum key pair generated  |  Algorithm:', pair.algorithm);
  return pair;
};

// ─── Key Export / Import ─────────────────────────────────────────────────────

export const exportPublicKey = (publicKey: any): string => {
  const data = {
    kem:       Array.from(publicKey.kem as Uint8Array),
    dsa:       Array.from(publicKey.dsa as Uint8Array),
    algorithm: 'ML-KEM-1024 + ML-DSA-87',
    timestamp: Date.now(),
  };
  // Use Buffer for reliable Base64 on React Native (btoa can fail on binary data)
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

export const importPublicKey = (b64: string): { kem: Uint8Array; dsa: Uint8Array } => {
  const data = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  return { kem: new Uint8Array(data.kem), dsa: new Uint8Array(data.dsa) };
};

// ─── AES-256-GCM helpers (node-forge) ────────────────────────────────────────

/** Convert Uint8Array to forge binary string */
const toBin = (arr: Uint8Array): string => Buffer.from(arr).toString('binary');
/** Convert forge binary string to Uint8Array */
const fromBin = (bin: string): Uint8Array => new Uint8Array(Buffer.from(bin, 'binary'));

function aesGcmEncrypt(plaintext: string, keyBytes: Uint8Array): {
  ciphertext: number[]; iv: number[]; tag: number[];
} {
  const ivBin  = forge.random.getBytesSync(12);
  const keyBin = toBin(keyBytes);
  const cipher = forge.cipher.createCipher('AES-GCM', keyBin);
  cipher.start({ iv: ivBin, tagLength: 128 });
  cipher.update(forge.util.createBuffer(plaintext, 'utf8'));
  cipher.finish();
  return {
    ciphertext: Array.from(fromBin(cipher.output.getBytes())),
    iv:         Array.from(fromBin(ivBin)),
    tag:        Array.from(fromBin((cipher.mode as any).tag.getBytes())),
  };
}

function aesGcmDecrypt(
  ciphertextBytes: Uint8Array,
  ivBytes: Uint8Array,
  tagBytes: Uint8Array,
  keyBytes: Uint8Array
): string {
  const keyBin = toBin(keyBytes);
  const decipher = forge.cipher.createDecipher('AES-GCM', keyBin);
  decipher.start({
    iv:        forge.util.createBuffer(toBin(ivBytes)),
    tagLength: 128,
    tag:       forge.util.createBuffer(toBin(tagBytes)),
  } as any);
  decipher.update(forge.util.createBuffer(toBin(ciphertextBytes)));
  const ok = decipher.finish();
  if (!ok) throw new Error('AES-GCM authentication tag verification failed — message rejected');
  return forge.util.decodeUtf8(decipher.output.getBytes());
}

// ─── Concat helper ────────────────────────────────────────────────────────────

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

// ─── Encrypt (ML-KEM + AES-256-GCM + ML-DSA sign) ───────────────────────────

/**
 * Encrypt a message for a recipient.
 * Identical wire-format to the web quantum-crypto.js so cross-platform decryption works.
 */
export const encryptMessage = async (
  publicKey: any,
  message: string,
  senderPrivateKey?: any
): Promise<any> => {
  // 1. ML-KEM encapsulate
  const { cipherText: kemCiphertext, sharedSecret } = KEM.encapsulate(publicKey.kem);

  // 2. AES-256-GCM encrypt (sharedSecret is the AES key)
  const { ciphertext, iv, tag } = aesGcmEncrypt(message, sharedSecret);

  // 3. ML-DSA sign (kemCiphertext ‖ iv ‖ ciphertext)
  let signature: number[] | null = null;
  if (senderPrivateKey?.dsa) {
    const toSign = concat(kemCiphertext, new Uint8Array(iv), new Uint8Array(ciphertext));
    signature = Array.from(DSA.sign(toSign, senderPrivateKey.dsa));
  }

  return {
    kemCiphertext: Array.from(kemCiphertext),
    iv, ciphertext, tag, signature,
    algorithm: 'ML-KEM-1024 + AES-256-GCM + ML-DSA-87',
    timestamp:  Date.now(),
  };
};

// ─── Decrypt (ML-KEM + AES-256-GCM + ML-DSA verify) ─────────────────────────

export const decryptMessage = async (
  privateKey: any,
  encryptedData: any,
  senderPublicKey?: any
): Promise<string> => {
  const kemCiphertext  = new Uint8Array(encryptedData.kemCiphertext);
  const iv             = new Uint8Array(encryptedData.iv);
  const ciphertext     = new Uint8Array(encryptedData.ciphertext);
  const tag            = new Uint8Array(encryptedData.tag);

  // 1. ML-DSA verify before decrypting
  if (encryptedData.signature && senderPublicKey?.dsa) {
    const toVerify = concat(kemCiphertext, iv, ciphertext);
    const sig = new Uint8Array(encryptedData.signature);
    const valid = DSA.verify(toVerify, sig, senderPublicKey.dsa);
    if (!valid) throw new Error('⛔ ML-DSA signature verification failed — message rejected');
    console.log('✅ ML-DSA signature verified (mobile)');
  }

  // 2. ML-KEM decapsulate → shared secret (AES key)
  const sharedSecret = KEM.decapsulate(kemCiphertext, privateKey.kem);

  // 3. AES-256-GCM decrypt
  return aesGcmDecrypt(ciphertext, iv, tag, sharedSecret);
};

// ─── Stand-alone sign / verify ────────────────────────────────────────────────

export const signMessage = async (message: string, privateKey: any) => {
  const bytes = new Uint8Array(Buffer.from(message, 'utf8'));
  const signature = DSA.sign(bytes, privateKey.dsa);
  return { message, signature: Array.from(signature), algorithm: 'ML-DSA-87', timestamp: Date.now() };
};

export const verifySignature = async (signedData: any, publicKey: any): Promise<boolean> => {
  try {
    const bytes = new Uint8Array(Buffer.from(signedData.message, 'utf8'));
    const sig   = new Uint8Array(signedData.signature);
    const valid = DSA.verify(bytes, sig, publicKey.dsa);
    console.log(valid ? '✅ Signature verified (mobile)' : '❌ Signature invalid (mobile)');
    return valid;
  } catch { return false; }
};

// ─── Security info ────────────────────────────────────────────────────────────

export const getQuantumSecurityInfo = () => ({
  currentAlgorithm: 'ML-KEM-1024 + AES-256-GCM + ML-DSA-87',
  encryption:       'ML-KEM-1024 key exchange → AES-256-GCM authenticated encryption',
  signing:          'ML-DSA-87 over (kemCiphertext ‖ iv ‖ ciphertext)',
  nistSecurityLevel: 5,
  quantumResistance: 'Full resistance to quantum attacks',
  platform:          'React Native Mobile',
});
