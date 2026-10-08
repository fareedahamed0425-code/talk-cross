import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

import { ENV } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { initSocketIO } from './sockets/socketHandler.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Trust proxy for Render / Cloud hosting
app.set('trust proxy', 1);

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const allowedOrigins = [
  ENV.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/staging to avoid blocking frontend origins
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rate Limiting for general API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Serve local uploads folder (dev fallback)
const uploadsDir = path.join(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
} catch (err) {
  // Fallback to os tmpdir in containerized/restricted permission environments
  try {
    const tmpUploads = path.join(os.tmpdir(), 'talkcross_uploads');
    if (!fs.existsSync(tmpUploads)) {
      fs.mkdirSync(tmpUploads, { recursive: true });
    }
    app.use('/uploads', express.static(tmpUploads));
  } catch {}
}

// Root Welcome Endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'Talk Cross Backend API',
    status: 'online',
    version: '1.0.0',
    healthCheck: '/health',
    repository: 'https://github.com/fareedahamed0425-code/talk-cross',
  });
});

// Health Check Endpoint for Render / Load Balancers
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount Main API Router
app.use('/api', apiRouter);

// Central Error Handler
app.use(errorHandler);

// Initialize Socket.IO
initSocketIO(server, allowedOrigins);

// Start Server
const PORT = ENV.PORT || 5000;

async function startServer() {
  // Automatically run migrations if DATABASE_URL is set
  if (ENV.DATABASE_URL) {
    try {
      await runMigrations();
    } catch (err) {
      console.warn('⚠️ Database migration warning (server will still start):', err);
    }
  } else {
    console.warn('⚠️ No DATABASE_URL found. Please configure your Neon PostgreSQL database in .env');
  }

  server.listen(PORT, () => {
    console.log(`
🚀 Chaton Real-Time Backend is running!
📡 URL: http://localhost:${PORT}
🩺 Health Check: http://localhost:${PORT}/health
⚡ Environment: ${ENV.NODE_ENV}
    `);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
