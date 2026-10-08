# 💬 Chaton — Modern Real-Time Chatting Application

**Chaton** is a modern, fast, private real-time messaging application designed with a focused communication interface (reminiscent of Telegram and WhatsApp). It provides rich instant messaging, friends and contacts management, live typing indicators, read receipts, media uploads, and a custom interactive **Sticker Studio**.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, Custom CSS Design System | Responsive Desktop & Mobile messaging UI, Web Audio API sound feedback, Canvas sticker studio |
| **Backend** | Node.js, Express, TypeScript, Socket.IO | REST API, WebSocket server, rate limiting, helmet security |
| **Database** | **Neon PostgreSQL** | Normalized schema, relational data, messages, conversations, friendships, indexing |
| **Media Storage** | **Supabase Storage** | Image attachments, avatars, custom sticker graphics |
| **Authentication** | **Firebase Authentication** | Google OAuth popup sign-in, ID token verification via Firebase Admin |
| **Deployment** | **Render** | Production Web Service deployment with zero-downtime health probes |

---

## 📂 Project Structure

```text
chaton/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection pool (Neon), Firebase Admin, Supabase client, Env
│   │   ├── db/              # schema.sql (PostgreSQL schema & indexes), migrate.ts runner
│   │   ├── middleware/      # auth (Firebase ID token verification), upload (multer), error handler
│   │   ├── controllers/     # auth, users, friends, conversations, messages, stickers, media
│   │   ├── routes/          # Express REST routers
│   │   ├── sockets/         # Socket.IO event handler & presence tracking
│   │   ├── types/           # TypeScript interfaces
│   │   └── index.ts         # Server entrypoint
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── config/          # Firebase client config
│   │   ├── context/         # AuthContext, SocketContext, ChatContext
│   │   ├── services/        # API client, Web Audio API sound synthesizer
│   │   ├── utils/           # Time formatting, color hashing, message grouping
│   │   ├── components/      # Auth, Sidebar, Contacts, Requests, Search, StickersStudio, Profile, ChatArea, Composer
│   │   ├── index.css        # Pure modern CSS design tokens & responsive styles
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
├── package.json             # Root monorepo scripts
└── README.md
```

---

## 🗄️ Database Schema (Neon PostgreSQL)

Chaton uses a normalized PostgreSQL schema designed for high-throughput real-time chats:

1. **`users`**: UUID primary key, `firebase_uid`, unique `@username`, display name, avatar, bio, online status, last seen.
2. **`friend_requests`**: `sender_id`, `receiver_id`, status (`pending`, `accepted`, `rejected`), unique constraints to prevent duplicates.
3. **`friendships`**: Symmetrical connected friend pairs `(user_id, friend_id)`.
4. **`conversations`**: Conversation thread entities.
5. **`conversation_members`**: Many-to-many relationship connecting users to conversations.
6. **`messages`**: Text, image, sticker messages with support for replies (`reply_to_message_id`), edits, and soft deletes (`deleted_at`).
7. **`message_reads`**: Per-user read receipt tracking `(message_id, user_id, read_at)`.
8. **`stickers`**: Custom user-created stickers metadata and Supabase storage URLs.

Indexes are created on `LOWER(username)`, `firebase_uid`, `(conversation_id, created_at DESC)`, and `(sender_id, status)`.

---

## ⚙️ Environment Variables Setup

### 1. Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# 1. Neon PostgreSQL Database Connection String
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require

# 2. Firebase Admin SDK (From Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-firebase-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# 3. Supabase Storage (From Supabase -> Project Settings -> API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 2. Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api

# Firebase Web Client (From Firebase Console -> Project Settings -> General -> Your apps -> Web app)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

---

## 🚀 Local Development

### 1. Install Dependencies

In the project root:

```bash
# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

### 2. Run Database Migrations

Automatically create all tables, foreign keys, and indexes in your Neon database:

```bash
npm run migrate
```

### 3. Start Development Servers

Start backend and frontend concurrently:

```bash
# Terminal 1: Backend (Runs on http://localhost:5000)
cd backend && npm run dev

# Terminal 2: Frontend (Runs on http://localhost:3000)
cd frontend && npm run dev
```

Visit **http://localhost:3000** in your browser.

> **💡 Instant Demo Sign-In:** In local development, you can sign in with Google or click the quick demo profile buttons (e.g. `@fareed` and `@rahul`) to immediately test two-user real-time chats across two browser tabs!

---

## ☁️ Deployment on Render

### Backend Web Service Setup

1. Push your code to your GitHub / GitLab repository.
2. Log into [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your repository.
4. Set the following build and start configurations:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Health Check Path:** `/health`
5. Under **Environment Variables**, add:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `FIREBASE_PROJECT_ID`: Firebase project ID.
   - `FIREBASE_CLIENT_EMAIL`: Firebase service account email.
   - `FIREBASE_PRIVATE_KEY`: Firebase service account private key (ensure newlines are preserved).
   - `SUPABASE_URL`: Supabase URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role secret.
   - `FRONTEND_URL`: Your deployed frontend URL (e.g., `https://chaton.vercel.app` or Render static site).
6. Click **Deploy Web Service**.

---

## ✨ Features Checklist

- [x] **Firebase Google Authentication** (OAuth popup with ID token backend verification)
- [x] **Unique @Username System** with real-time uniqueness validation
- [x] **Debounced User Search** with relationship status indicators
- [x] **Friend Request System** (Send, Accept, Reject, Cancel, Reciprocal friendship creation)
- [x] **Real-Time WebSockets / Socket.IO**:
  - Instant message delivery
  - Typing indicators
  - Live online / offline presence tracking
  - Multi-tab presence synchronization
  - Message read receipts (`✓`, `✓✓`, blue `✓✓`)
- [x] **Interactive Sticker Studio**:
  - Upload image -> Crop / erase background on canvas -> Save to Supabase Storage -> Send in conversation
- [x] **Media Attachments**:
  - Send photos with instant preview and zoom modal
- [x] **Message Interactions**:
  - Reply to messages with context preview
  - Edit sent messages with `(edited)` tag
  - Soft delete messages
  - Date dividers ("Today", "Yesterday", "Oct 8")
- [x] **Mobile-First Responsive UX**:
  - Fullscreen conversation transition with native-feeling back navigation on mobile
- [x] **Zero-Dependency Audio Feedback**:
  - Procedural Web Audio API sound chimes for sent messages, incoming chats, and friend requests
