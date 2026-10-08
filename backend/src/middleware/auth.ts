import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseIdToken } from '../config/firebase.js';
import { query } from '../config/db.js';
import { AuthUserContext } from '../types/index.js';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserContext;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const decodedToken = await verifyFirebaseIdToken(token);
    if (!decodedToken || !decodedToken.uid) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired Firebase ID token' });
      return;
    }

    const firebaseUid = decodedToken.uid;

    // Fetch user from Neon PostgreSQL
    const userResult = await query(
      `SELECT id, firebase_uid, username, display_name, email, profile_image, bio
       FROM users
       WHERE firebase_uid = $1`,
      [firebaseUid]
    );

    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0] as AuthUserContext;
      next();
      return;
    }

    // If user is hitting the auth sync route, let it pass with minimal context
    if (req.path === '/api/auth/sync' || req.originalUrl.includes('/auth/sync')) {
      req.user = {
        id: '',
        firebase_uid: firebaseUid,
        username: '',
        display_name: decodedToken.name || 'User',
        email: decodedToken.email || null,
        profile_image: decodedToken.picture || null,
        bio: 'Hey there! I am using Talk Cross.',
      };
      next();
      return;
    }

    // User not registered in database yet
    res.status(403).json({
      error: 'User account not initialized in database. Please call /auth/sync first.',
      requiresSync: true,
      firebase_uid: firebaseUid,
    });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1]?.trim();
      if (token) {
        const decodedToken = await verifyFirebaseIdToken(token);
        if (decodedToken && decodedToken.uid) {
          const userResult = await query(
            `SELECT id, firebase_uid, username, display_name, email, profile_image, bio
             FROM users
             WHERE firebase_uid = $1`,
            [decodedToken.uid]
          );
          if (userResult.rows.length > 0) {
            req.user = userResult.rows[0] as AuthUserContext;
          }
        }
      }
    }
  } catch (err) {
    // Ignore optional auth error
  }
  next();
}
