<div align="center">

# 💬 TALK CROSS
### *Fast, Private & End-to-End Encrypted Real-Time Messaging*

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.8-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_6.4-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Neon PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Supabase](https://img.shields.io/badge/Supabase_Storage-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Firebase](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![E2EE](https://img.shields.io/badge/Security-AES--256--GCM-881337?style=for-the-badge&logo=auth0&logoColor=white)](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
[![Timezone](https://img.shields.io/badge/Timezone-IST_(UTC%2B5:30)-FF9933?style=for-the-badge&logo=googleearth&logoColor=white)](https://en.wikipedia.org/wiki/Indian_Standard_Time)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable_App-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

<br/>

<p align="center">
  <b>Talk Cross</b> is a state-of-the-art real-time messaging application engineered with a focus on privacy, responsiveness, and refined aesthetics. Featuring client-side <b>End-to-End Encryption (AES-256-GCM)</b>, Pitch Black & Burgundy modular floating interface, real-time WebSockets, Indian Standard Time precision, and native PWA desktop/mobile installation.
</p>

[✨ Features](#-key-features) • [🏗️ Architecture](#️-system-architecture) • [🔒 Security & E2EE](#-end-to-end-encryption-e2ee) • [🗄️ Database](#️-database-schema) • [⚙️ Setup](#️-quick-start--local-setup) • [☁️ Deployment](#-deployment-guide)

---

</div>

## ✨ Key Features

### 🔒 End-to-End Encryption (E2EE)
- **AES-256-GCM Cryptographic Engine**: All message contents are encrypted directly in the browser using the Web Crypto API before transmission.
- **Zero-Knowledge Storage**: Only ciphertexts (`enc:v1:<iv>:<ciphertext>`) traverse WebSockets and are stored in Neon PostgreSQL. Plaintext never touches servers or databases.

### 🎨 Modular Floating Aesthetic & Theme System
- **Individual Floating Cards**: Clean, floating panels without rigid horizontal dividing strips or bars.
- **Dark Mode**: Full Pitch Black (`#000000`) background paired with rich, velvety Burgundy accents (`#881337` / `#9f1239`).
- **Light Mode**: Crisp Pure White (`#ffffff`) with Burgundy highlights and live theme toggle switch.
- **Adaptive Slim Chat Bubbles**: Bubbles hug the text snugly and adaptively resize with compact micro-timestamps.

### 🇮🇳 Indian Standard Time (IST / Asia/Kolkata)
- All message timestamps, conversation list previews, last-seen indicators, and date dividers format natively in **IST (UTC+5:30)**.

### 📱 Progressive Web App (PWA)
- Installable directly to desktop, iOS home screen, or Android as a standalone application.
- Includes Web App Manifest, Service Worker caching, and an unobtrusive floating installation prompt.

### ⚡ Real-Time WebSockets Engine
- **Instant Messaging**: Real-time bi-directional message delivery with Socket.IO.
- **Live Presence & Typing**: Real-time online/offline indicators and active typing feedback.
- **Read Receipts**: Double tick indicators (`✓` sent, `✓✓` delivered/read) with instant status synchronization.
- **Message Controls**: Edit sent messages with `(edited)` history tags, quote/reply, and soft deletion.

### 🎨 Interactive Sticker Studio & Media
- Upload images to an interactive canvas editor to crop, erase backgrounds, and create custom stickers saved directly to Supabase Storage.
- Fast photo sharing with lightbox modal zoom and image preview.

### 🔗 Deep-Linking & Protected Route System
- Full React Router implementation with strict route guards:
  - `/login` & `/auth`: Public-only entry points (authenticated users are auto-redirected to `/chat`).
  - `/chat` & `/chat/:conversationId`: Protected direct conversation links.
  - `/contacts`, `/requests`, `/search`, `/stickers`, `/profile`: Direct sub-routes.
  - Zero unauthenticated jumping: Unauthorized attempts bounce straight to login.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React 18 + Vite)"]
        UI["Modern Floating UI (Pitch Black & Burgundy)"]
        CryptoEngine["Web Crypto API (AES-256-GCM)"]
        Router["React Router (Sub-links & Route Guards)"]
        PWA["PWA Service Worker & Manifest"]
    end

    subgraph Backend["Backend (Node.js + Express + Socket.IO)"]
        API["REST API (/api)"]
        SocketServer["Real-Time Socket Server"]
        AuthMiddleware["Firebase Token Verification"]
        ConfigServer["Centralized Auth Config Server"]
    end

    subgraph CloudServices["Cloud & Data Infrastructure"]
        NeonDB[("Neon PostgreSQL\n(Encrypted Messages & Metadata)")]
        SupabaseStorage[("Supabase Storage\n(Media & Stickers)")]
        FirebaseAuth["Firebase Authentication\n(Google & GitHub OAuth)"]
    end

    UI --> Router
    UI --> CryptoEngine
    CryptoEngine -->|Ciphertext| SocketServer
    CryptoEngine -->|Ciphertext| API
    API --> NeonDB
    SocketServer --> NeonDB
    API --> SupabaseStorage
    AuthMiddleware --> FirebaseAuth
    API --> ConfigServer
```

---

## 🔒 End-to-End Encryption (E2EE)

Talk Cross implements cryptographic privacy using standard browser primitives:

```
[Sender Browser]
  Plaintext Message: "Hey! Let's catch up!"
  Key Derivation: PBKDF2 with unique shared conversation salt
  Cipher Algorithm: AES-256-GCM (12-byte IV + Auth Tag)
  Payload: "enc:v1:9a8f7c...:d83e2a9b..."
         │
         ▼ (Sent over TLS & WebSockets)
[Backend / Neon PostgreSQL]
  Stores ONLY the ciphertext payload
         │
         ▼ (Delivered to Receiver)
[Receiver Browser]
  Decrypts ciphertext locally with derived conversation key
  Displays: "Hey! Let's catch up!"
```

---

## 🗄️ Database Schema

Talk Cross uses **Neon PostgreSQL** with indexed relational models:

```mermaid
erDiagram
    USERS ||--o{ CONVERSATION_MEMBERS : joins
    USERS ||--o{ MESSAGES : sends
    USERS ||--o{ FRIENDSHIPS : friends
    USERS ||--o{ FRIEND_REQUESTS : requests
    USERS ||--o{ STICKERS : creates
    CONVERSATIONS ||--o{ CONVERSATION_MEMBERS : contains
    CONVERSATIONS ||--o{ MESSAGES : has
    MESSAGES ||--o{ MESSAGE_READS : tracks
```

| Table | Description |
| :--- | :--- |
| `users` | Primary user identity, unique `@username`, display name, avatar, bio, and online presence. |
| `friend_requests` | Directional friend requests with statuses (`pending`, `accepted`, `rejected`). |
| `friendships` | Symmetric bidirectional friendships. |
| `conversations` | Conversation channels and last message activity. |
| `conversation_members` | Many-to-many relationship mapping participants to conversations. |
| `messages` | E2EE ciphertexts, message types (`text`, `image`, `sticker`), reply links, edit timestamps. |
| `message_reads` | Read receipts tracking per-user read timestamps. |
| `stickers` | Custom user-created stickers stored in Supabase Storage. |

---

## ⚙️ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Neon PostgreSQL** database account
- **Supabase** project (Storage enabled)
- **Firebase** project (Google & GitHub Authentication enabled)

### 2. Clone the Repository
```bash
git clone https://github.com/fareedahamed0425-code/talk-cross.git
cd talk-cross
```

### 3. Backend Configuration (`backend/.env`)
Create `backend/.env` with your cloud credentials:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# 1. Neon PostgreSQL Database
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-example.neon.tech/neondb?sslmode=require

# 2. Firebase Client Config (Served securely via GET /api/auth/config)
FIREBASE_PROJECT_ID=talk-cross
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=talk-cross.firebaseapp.com
FIREBASE_STORAGE_BUCKET=talk-cross.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id

# 3. Firebase Admin SDK
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@talk-cross.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# 4. Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 4. Frontend Configuration (`frontend/.env`)
The frontend only needs the backend API URL:

```env
VITE_API_URL=http://localhost:5000
```

### 5. Install & Run Migrations

```bash
# Install backend dependencies & run database migration
cd backend
npm install
npm run migrate

# Install frontend dependencies
cd ../frontend
npm install
```

### 6. Start Development Servers

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open **`http://localhost:3000`** in your browser to start messaging!

---

## ☁️ Deployment Guide

### Backend Deployment (Render)
1. In the [Render Dashboard](https://dashboard.render.com/), create a new **Web Service** and connect your repository.
2. Configure settings:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Health Check Path:** `/health`
3. Add all variables from `backend/.env` in the **Environment** tab.

### Frontend Deployment (Vercel)
1. Import your repository into [Vercel](https://vercel.com/).
2. Set **Root Directory** to `frontend`.
3. Under **Environment Variables**, add:
   ```env
   VITE_API_URL=https://your-talk-cross-backend.onrender.com
   ```
4. Deploy!

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Built with ❤️ for secure, modern, real-time communication.</sub>
</div>
