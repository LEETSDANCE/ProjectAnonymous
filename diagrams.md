# Project Anonymous - System Architecture and Flow Diagrams

## System Architecture Overview
```mermaid
graph TB
    subgraph "Client Applications"
        A["Web Client<br/>React + WebRTC"]
        B["Mobile Client<br/>React Native + WebRTC"]
    end
    
    subgraph "Signaling Server"
        C["Node.js Server<br/>Socket.IO"]
        D["WebSocket Handler"]
        E["Key Exchange Manager"]
    end
    
    subgraph "Cryptographic Layer"
        F["ML-KEM-1024<br/>Key Encapsulation"]
        G["ML-DSA-87<br/>Digital Signatures"]
        H["@noble/post-quantum<br/>Library"]
    end
    
    subgraph "Communication Layer"
        I["WebRTC Peer-to-Peer<br/>Audio/Video"]
        J["SRTP Media<br/>Encryption"]
        K["ICE/STUN<br/>NAT Traversal"]
    end
    
    A --> C
    B --> C
    C --> D
    C --> E
    E --> F
    E --> G
    F --> H
    G --> H
    A --> I
    B --> I
    I --> J
    I --> K
```

## Quantum Key Exchange Flow
```mermaid
sequenceDiagram
    participant Alice as "Alice Client"
    participant Server as "Signaling Server"
    participant Bob as "Bob Client"
    
    Note over Alice,Bob: Quantum-Resistant Key Exchange
    
    Alice->>Alice: Generate ML-KEM/ML-DSA Keys
    Alice->>Server: Join Room + Share Public Key
    Server->>Bob: Notify User Connected + Alice's Public Key
    Bob->>Bob: Generate ML-KEM/ML-DSA Keys
    Bob->>Server: Share Public Key
    Server->>Alice: Bob's Public Key
    
    Note over Alice,Bob: Encrypted Communication
    Alice->>Alice: Encapsulate Secret with Bob's KEM
    Alice->>Bob: Send Encrypted Message + Signature
    Bob->>Bob: Verify Signature + Decrypt Message
    Bob->>Bob: Encapsulate Secret with Alice's KEM
    Bob->>Alice: Send Encrypted Message + Signature
    Alice->>Alice: Verify Signature + Decrypt Message
```

## WebRTC Call Establishment Flow
```mermaid
sequenceDiagram
    participant Caller as "Caller Client"
    participant Server as "Signaling Server"
    participant Callee as "Callee Client"
    
    Note over Caller,Callee: WebRTC Call Setup with Quantum Security
    
    Caller->>Server: Initiate Call Request
    Server->>Callee: Incoming Call Notification
    Callee->>Caller: Accept Call Response
    
    Note over Caller,Callee: ICE Candidate Exchange
    Caller->>Caller: Create RTCPeerConnection
    Caller->>Server: Send Offer SDP
    Server->>Callee: Relay Offer SDP
    Callee->>Callee: Create RTCPeerConnection
    Callee->>Server: Send Answer SDP
    Server->>Caller: Relay Answer SDP
    
    Note over Caller,Callee: ICE Connection
    Caller->>Server: ICE Candidates
    Server->>Callee: Relay ICE Candidates
    Callee->>Server: ICE Candidates
    Server->>Caller: Relay ICE Candidates
    
    Note over Caller,Callee: Media Stream
    Caller->>Callee: Encrypted Audio/Video
    Callee->>Caller: Encrypted Audio/Video
```

## Cryptographic Protocol Flow
```mermaid
flowchart TD
    A["User Input: Message"] --> B["Generate Session Key"]
    B --> C["Get Recipient's ML-KEM Public Key"]
    C --> D["ML-KEM-1024 Encapsulation"]
    D --> E["Ciphertext + Shared Secret"]
    E --> F["AES-256-GCM Encryption"]
    F --> G["Encrypted Message"]
    G --> H["ML-DSA-87 Signature"]
    H --> I["Final Cryptographic Package"]
    
    I --> J["Transmission via Socket.IO"]
    J --> K["Recipient Verification"]
    K --> L["ML-DSA-87 Signature Verification"]
    L --> M{"Signature Valid?"}
    M -->|Yes| N["ML-KEM-1024 Decapsulation"]
    M -->|No| O["Reject Message"]
    N --> P["Retrieve Shared Secret"]
    P --> Q["AES-256-GCM Decryption"]
    Q --> R["Original Message"]
    R --> S["Display to User"]
```

## Network Communication Architecture
```mermaid
graph LR
    subgraph "Client Side"
        A["React Native/Web App"]
        B["Quantum Crypto Module"]
        C["WebRTC Engine"]
        D["Socket.IO Client"]
    end
    
    subgraph "Network Layer"
        E["WebSocket/TCP"]
        F["UDP for WebRTC Media"]
        G["HTTPS/WSS for Signaling"]
    end
    
    subgraph "Server Side"
        H["Node.js Express Server"]
        I["Socket.IO Server"]
        J["Room Management"]
        K["Message Relay"]
    end
    
    subgraph "Security Layer"
        L["ML-KEM Encryption"]
        M["ML-DSA Signatures"]
        N["DTLS Handshake"]
        O["SRTP Media Encryption"]
    end
    
    A --> B
    A --> C
    A --> D
    B --> L
    B --> M
    C --> N
    C --> O
    D --> E
    D --> G
    C --> F
    E --> I
    G --> I
    F --> H
    I --> J
    I --> K
```

## Key Management Lifecycle
```mermaid
stateDiagram-v2
    [*] --> KeyGeneration
    KeyGeneration --> MLKEMKeyPair: Generate KEM Keys
    KeyGeneration --> MLDSAKeyPair: Generate DSA Keys
    MLKEMKeyPair --> KeyStorage: Store Securely
    MLDSAKeyPair --> KeyStorage: Store Securely
    KeyStorage --> ActiveKeys: Ready for Use
    ActiveKeys --> KeyExchange: Share Public Keys
    KeyExchange --> EncryptedComm: Establish Session
    EncryptedComm --> KeyRotation: 24h Timer
    KeyRotation --> KeyGeneration: Generate New Keys
    ActiveKeys --> KeyRevocation: Compromise Detected
    KeyRevocation --> KeyGeneration: Generate Replacement
    EncryptedComm --> SessionEnd: Call Complete
    SessionEnd --> ActiveKeys: Return to Pool
```

## Security Threat Model
```mermaid
graph TB
    subgraph "Potential Attack Vectors"
        A["Eavesdropping<br/>Network Interception"]
        B["Man-in-the-Middle<br/>Active Attack"]
        C["Quantum Attack<br/>Future Threat"]
        D["Replay Attack<br/>Message Resend"]
        E["Key Compromise<br/>Device Theft"]
    end
    
    subgraph "Defense Mechanisms"
        F["End-to-End Encryption<br/>ML-KEM + AES"]
        G["Digital Signatures<br/>ML-DSA Verification"]
        H["Post-Quantum Algorithms<br/>Lattice-Based Crypto"]
        I["Timestamps + Nonces<br/>Anti-Replay"]
        J["Secure Storage<br/>Device Encryption"]
    end
    
    subgraph "Security Properties"
        K["Confidentiality<br/>Message Privacy"]
        L["Integrity<br/>Message Authenticity"]
        M["Quantum Resistance<br/>Future-Proof Security"]
        N["Freshness<br/>No Replay"]
        O["Key Security<br/>Protected Storage"]
    end
    
    A --> F
    B --> G
    C --> H
    D --> I
    E --> J
    
    F --> K
    G --> L
    H --> M
    I --> N
    J --> O
```

## Additional Performance Metrics Diagram
```mermaid
graph TD
    A["Performance Metrics"] --> B["Key Generation"]
    A --> C["Communication Latency"]
    A --> D["Network Performance"]
    
    B --> E["ML-KEM-1024: 245ms (Web)"]
    B --> F["ML-KEM-1024: 312ms (Mobile)"]
    B --> G["ML-DSA-87: 189ms (Web)"]
    B --> H["ML-DSA-87: 267ms (Mobile)"]
    
    C --> I["Encryption: 15ms"]
    C --> J["Decryption: 18ms"]
    C --> K["Call Setup: 1250ms"]
    C --> L["ICE Connection: 850ms"]
    
    D --> M["Throughput Calculation"]
    D --> N["Packet Loss Rate"]
    D --> O["Latency Monitoring"]
```

## User Experience Flow
```mermaid
flowchart LR
    A["User Launches App"] --> B["Auto-Generate Keys"]
    B --> C["Join/Create Room"]
    C --> D["Secure Connection"]
    D --> E["Quantum Key Exchange"]
    E --> F["Ready to Communicate"]
    
    F --> G["Send Message"]
    F --> H["Initiate Call"]
    
    G --> I["Encrypt + Sign"]
    I --> J["Transmit"]
    J --> K["Receive + Verify"]
    K --> L["Decrypt + Display"]
    
    H --> M["WebRTC Setup"]
    M --> N["Media Exchange"]
    N --> O["Secure Call"]
    
    L --> P["Message History"]
    O --> Q["Call Recording"]
```

## Technology Stack Overview
```mermaid
mindmap
  root((Project Anonymous))
    Frontend
      React Web
      React Native
      WebRTC
      Socket.IO Client
    Backend
      Node.js
      Express
      Socket.IO Server
      WebSocket
    Cryptography
      ML-KEM-1024
      ML-DSA-87
      "@noble/post-quantum"
      AES-256-GCM
    Security
      End-to-End Encryption
      Digital Signatures
      Post-Quantum Resistance
      Forward Secrecy
    Infrastructure
      STUN/ICE Servers
      UDP/TCP Protocols
      HTTPS/WSS
      Cloud Deployment
```
