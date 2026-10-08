import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { DbUser, UserSearchResult } from '../types/index.js';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(255).optional(),
  profileImage: z.string().url().nullable().optional(),
});

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userResult = await query<DbUser>(
      'SELECT * FROM users WHERE id = $1',
      [currentUserId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    // Get friend count
    const friendCountResult = await query(
      'SELECT COUNT(*) AS count FROM friendships WHERE user_id = $1',
      [currentUserId]
    );

    // Get sticker count
    const stickerCountResult = await query(
      'SELECT COUNT(*) AS count FROM stickers WHERE user_id = $1',
      [currentUserId]
    );

    res.json({
      user,
      stats: {
        friendsCount: parseInt(friendCountResult.rows[0]?.count || '0', 10),
        stickersCount: parseInt(stickerCountResult.rows[0]?.count || '0', 10),
      },
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const validated = updateProfileSchema.parse(req.body);

    // If username is being changed, check uniqueness
    if (validated.username) {
      const cleanUsername = validated.username.toLowerCase();
      const existing = await query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [cleanUsername, currentUserId]
      );
      if (existing.rows.length > 0) {
        res.status(400).json({ error: 'Username is already taken by another user' });
        return;
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (validated.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(validated.displayName);
    }
    if (validated.username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(validated.username.toLowerCase());
    }
    if (validated.bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(validated.bio);
    }
    if (validated.profileImage !== undefined) {
      updates.push(`profile_image = $${paramIndex++}`);
      values.push(validated.profileImage);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields provided to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(currentUserId);

    const updateQuery = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query<DbUser>(updateQuery, values);
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
      return;
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      res.json({ results: [] });
      return;
    }

    const searchTerm = q.trim().replace(/^@/, ''); // Remove leading @ if typed

    // Search query that also computes the friendship relationship with the current authenticated user
    const sql = `
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.profile_image,
        u.bio,
        u.online_status,
        u.last_seen,
        CASE
          WHEN u.id = $1 THEN 'self'
          WHEN f.id IS NOT NULL THEN 'friends'
          WHEN fr_sent.id IS NOT NULL THEN 'pending_sent'
          WHEN fr_recv.id IS NOT NULL THEN 'pending_received'
          ELSE 'none'
        END AS friendship_status,
        COALESCE(fr_sent.id, fr_recv.id) AS request_id
      FROM users u
      LEFT JOIN friendships f 
        ON (f.user_id = $1 AND f.friend_id = u.id)
      LEFT JOIN friend_requests fr_sent 
        ON (fr_sent.sender_id = $1 AND fr_sent.receiver_id = u.id AND fr_sent.status = 'pending')
      LEFT JOIN friend_requests fr_recv 
        ON (fr_recv.sender_id = u.id AND fr_recv.receiver_id = $1 AND fr_recv.status = 'pending')
      WHERE 
        u.id != $1
        AND (
          LOWER(u.username) LIKE LOWER($2)
          OR LOWER(u.display_name) LIKE LOWER($2)
        )
      ORDER BY 
        CASE 
          WHEN LOWER(u.username) = LOWER($3) THEN 1
          WHEN LOWER(u.username) LIKE LOWER($4) THEN 2
          ELSE 3
        END,
        u.display_name ASC
      LIMIT 20;
    `;

    const pattern = `%${searchTerm}%`;
    const startsWith = `${searchTerm}%`;
    const results = await query<UserSearchResult>(sql, [
      currentUserId || '00000000-0000-0000-0000-000000000000',
      pattern,
      searchTerm,
      startsWith,
    ]);

    res.json({ results: results.rows });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
}

export async function getUserByUsername(req: Request, res: Response): Promise<void> {
  try {
    const rawUsername = req.params.username;
    const username = Array.isArray(rawUsername) ? rawUsername[0] : rawUsername;
    const currentUserId = req.user?.id;

    if (!username) {
      res.status(400).json({ error: 'Username parameter required' });
      return;
    }

    const cleanUsername = (username as string).replace(/^@/, '').toLowerCase();

    const sql = `
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.profile_image,
        u.bio,
        u.online_status,
        u.last_seen,
        u.created_at,
        CASE
          WHEN u.id = $1 THEN 'self'
          WHEN f.id IS NOT NULL THEN 'friends'
          WHEN fr_sent.id IS NOT NULL THEN 'pending_sent'
          WHEN fr_recv.id IS NOT NULL THEN 'pending_received'
          ELSE 'none'
        END AS friendship_status,
        COALESCE(fr_sent.id, fr_recv.id) AS request_id
      FROM users u
      LEFT JOIN friendships f 
        ON (f.user_id = $1 AND f.friend_id = u.id)
      LEFT JOIN friend_requests fr_sent 
        ON (fr_sent.sender_id = $1 AND fr_sent.receiver_id = u.id AND fr_sent.status = 'pending')
      LEFT JOIN friend_requests fr_recv 
        ON (fr_recv.sender_id = u.id AND fr_recv.receiver_id = $1 AND fr_recv.status = 'pending')
      WHERE LOWER(u.username) = LOWER($2)
    `;

    const result = await query(sql, [
      currentUserId || '00000000-0000-0000-0000-000000000000',
      cleanUsername,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error getting user by username:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
