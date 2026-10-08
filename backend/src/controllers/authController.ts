import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { ENV } from '../config/env.js';
import { DbUser } from '../types/index.js';

const syncSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  profileImage: z.string().url().optional().nullable(),
});

function sanitizeUsername(input: string): string {
  let clean = input.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (clean.length < 3) clean = `user_${clean}`;
  if (clean.length > 20) clean = clean.substring(0, 20);
  return clean;
}

async function generateUniqueUsername(baseName: string): Promise<string> {
  let candidate = sanitizeUsername(baseName);
  let counter = 1;

  while (true) {
    const existing = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [candidate]);
    if (existing.rows.length === 0) {
      return candidate;
    }
    const suffix = Math.floor(1000 + Math.random() * 9000);
    candidate = `${sanitizeUsername(baseName).substring(0, 15)}_${suffix}`;
    counter++;
    if (counter > 10) {
      return `user_${Date.now().toString().slice(-6)}`;
    }
  }
}

export async function syncUser(req: Request, res: Response): Promise<void> {
  try {
    const userContext = req.user;
    if (!userContext || !userContext.firebase_uid) {
      res.status(401).json({ error: 'Unauthenticated or missing Firebase context' });
      return;
    }

    const { firebase_uid } = userContext;
    const { username: requestedUsername, displayName, email, profileImage } = req.body || {};

    // Check if user already exists
    const existingResult = await query<DbUser>(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (existingResult.rows.length > 0) {
      const existingUser = existingResult.rows[0]!;
      // Update fields if provided and changed
      const newDisplayName = displayName || existingUser.display_name;
      const newProfileImage = profileImage !== undefined ? profileImage : existingUser.profile_image;
      const newEmail = email !== undefined ? email : existingUser.email;

      const updateResult = await query<DbUser>(
        `UPDATE users
         SET display_name = $1, profile_image = $2, email = $3, updated_at = NOW(), online_status = TRUE
         WHERE id = $4
         RETURNING *`,
        [newDisplayName, newProfileImage, newEmail, existingUser.id]
      );

      res.json({
        user: updateResult.rows[0],
        isNew: false,
      });
      return;
    }

    // New user: Determine username
    let finalUsername = '';
    if (requestedUsername) {
      const cleanRequested = sanitizeUsername(requestedUsername);
      const conflict = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [cleanRequested]);
      if (conflict.rows.length === 0) {
        finalUsername = cleanRequested;
      }
    }

    if (!finalUsername) {
      const base = displayName || (email ? email.split('@')[0] : 'user');
      finalUsername = await generateUniqueUsername(base || 'user');
    }

    const finalDisplayName = displayName || userContext.display_name || finalUsername;
    const finalEmail = email || userContext.email || null;
    const finalProfileImage = profileImage || userContext.profile_image || null;

    const insertResult = await query<DbUser>(
      `INSERT INTO users (firebase_uid, username, display_name, email, profile_image, online_status)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING *`,
      [firebase_uid, finalUsername, finalDisplayName, finalEmail, finalProfileImage]
    );

    res.status(201).json({
      user: insertResult.rows[0],
      isNew: true,
    });
  } catch (error) {
    console.error('Error in syncUser:', error);
    res.status(500).json({ error: 'Failed to synchronize user account' });
  }
}

export async function checkUsername(req: Request, res: Response): Promise<void> {
  try {
    const rawUsername = req.query.username;
    const currentUserId = req.query.currentUserId || req.user?.id;

    if (!rawUsername || typeof rawUsername !== 'string') {
      res.status(400).json({ error: 'Username query parameter is required' });
      return;
    }

    const clean = sanitizeUsername(rawUsername);
    if (clean.length < 3 || clean.length > 30) {
      res.json({ available: false, reason: 'Username must be between 3 and 30 characters' });
      return;
    }

    // Check if matching current user
    if (req.user && req.user.username && req.user.username.toLowerCase() === clean) {
      res.json({ available: true, username: clean, isCurrent: true });
      return;
    }

    const result = await query(
      'SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)',
      [clean]
    );

    // If username exists in database
    if (result.rows.length > 0) {
      const foundUser = result.rows[0];
      if ((req.user && foundUser.id === req.user.id) || (currentUserId && foundUser.id === currentUserId)) {
        res.json({ available: true, username: clean, isCurrent: true });
        return;
      }
      res.json({ available: false, reason: 'Username is already taken' });
      return;
    }

    res.json({ available: true, username: clean });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Failed to check username availability' });
  }
}

export function getAuthConfig(_req: Request, res: Response): void {
  // Returns client auth initialization config securely to frontend
  res.json({
    apiKey: ENV.FIREBASE_API_KEY,
    authDomain: ENV.FIREBASE_AUTH_DOMAIN,
    projectId: ENV.FIREBASE_PROJECT_ID,
    storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
    appId: ENV.FIREBASE_APP_ID,
  });
}
