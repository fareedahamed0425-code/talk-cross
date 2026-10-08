import { Request, Response } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/db.js';

export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sql = `
      SELECT 
        c.id,
        c.created_at,
        c.updated_at,
        -- Other user info
        u.id AS other_user_id,
        u.username AS other_username,
        u.display_name AS other_display_name,
        u.profile_image AS other_profile_image,
        u.online_status AS other_online_status,
        u.last_seen AS other_last_seen,
        u.bio AS other_bio,
        -- Last message info
        lm.id AS last_message_id,
        lm.content AS last_message_content,
        lm.message_type AS last_message_type,
        lm.sender_id AS last_message_sender_id,
        lm.created_at AS last_message_created_at,
        lm.deleted_at AS last_message_deleted_at,
        -- Unread messages count for current user
        COUNT(unread.id) AS unread_count
      FROM conversation_members cm
      JOIN conversations c ON c.id = cm.conversation_id
      -- Join to get the other member in this 1-on-1 chat
      JOIN conversation_members other_cm ON other_cm.conversation_id = c.id AND other_cm.user_id != $1
      JOIN users u ON u.id = other_cm.user_id
      -- Left join to get the latest message
      LEFT JOIN LATERAL (
        SELECT id, content, message_type, sender_id, created_at, deleted_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      -- Left join to count unread messages
      LEFT JOIN messages unread ON unread.conversation_id = c.id 
        AND unread.sender_id != $1 
        AND unread.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM message_reads mr 
          WHERE mr.message_id = unread.id AND mr.user_id = $1
        )
      WHERE cm.user_id = $1
      GROUP BY 
        c.id, c.created_at, c.updated_at,
        u.id, u.username, u.display_name, u.profile_image, u.online_status, u.last_seen, u.bio,
        lm.id, lm.content, lm.message_type, lm.sender_id, lm.created_at, lm.deleted_at
      ORDER BY COALESCE(lm.created_at, c.updated_at) DESC
    `;

    const result = await query(sql, [currentUserId]);

    const conversations = result.rows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      other_user: {
        id: row.other_user_id,
        username: row.other_username,
        display_name: row.other_display_name,
        profile_image: row.other_profile_image,
        online_status: row.other_online_status,
        last_seen: row.other_last_seen,
        bio: row.other_bio,
      },
      last_message: row.last_message_id
        ? {
            id: row.last_message_id,
            content: row.last_message_deleted_at ? 'This message was deleted' : row.last_message_content,
            message_type: row.last_message_type,
            sender_id: row.last_message_sender_id,
            created_at: row.last_message_created_at,
            is_deleted: !!row.last_message_deleted_at,
          }
        : null,
      unread_count: parseInt(row.unread_count || '0', 10),
    }));

    res.json({ conversations });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}

export async function getConversationById(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { id } = req.params;

    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify membership
    const membership = await query(
      'SELECT * FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [id, currentUserId]
    );

    if (membership.rows.length === 0) {
      res.status(403).json({ error: 'You are not a member of this conversation' });
      return;
    }

    // Fetch conversation details and other user
    const sql = `
      SELECT 
        c.id,
        c.created_at,
        c.updated_at,
        u.id AS other_user_id,
        u.username AS other_username,
        u.display_name AS other_display_name,
        u.profile_image AS other_profile_image,
        u.online_status AS other_online_status,
        u.last_seen AS other_last_seen,
        u.bio AS other_bio
      FROM conversations c
      JOIN conversation_members other_cm ON other_cm.conversation_id = c.id AND other_cm.user_id != $1
      JOIN users u ON u.id = other_cm.user_id
      WHERE c.id = $2
    `;

    const result = await query(sql, [currentUserId, id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const row = result.rows[0];
    res.json({
      conversation: {
        id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        other_user: {
          id: row.other_user_id,
          username: row.other_username,
          display_name: row.other_display_name,
          profile_image: row.other_profile_image,
          online_status: row.other_online_status,
          last_seen: row.other_last_seen,
          bio: row.other_bio,
        },
      },
    });
  } catch (error) {
    console.error('Error getting conversation by id:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}

export async function getOrCreateConversation(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { targetUserId } = req.body;

    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!targetUserId) {
      res.status(400).json({ error: 'targetUserId is required' });
      return;
    }

    if (targetUserId === currentUserId) {
      res.status(400).json({ error: 'Cannot create conversation with yourself' });
      return;
    }

    // Verify friendship exists before creating conversation
    const friendship = await query(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [currentUserId, targetUserId]
    );

    if (friendship.rows.length === 0) {
      res.status(403).json({ error: 'You must be friends with this user to start a conversation' });
      return;
    }

    // Check if conversation already exists
    const existing = await query(
      `SELECT cm1.conversation_id 
       FROM conversation_members cm1
       JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
       WHERE cm1.user_id = $1 AND cm2.user_id = $2`,
      [currentUserId, targetUserId]
    );

    if (existing.rows.length > 0) {
      const convId = existing.rows[0].conversation_id;
      res.json({ conversationId: convId, created: false });
      return;
    }

    // Create new conversation
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const newConv = await client.query('INSERT INTO conversations DEFAULT VALUES RETURNING id');
      const convId = newConv.rows[0].id;

      await client.query(
        'INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
        [convId, currentUserId, targetUserId]
      );

      await client.query('COMMIT');
      res.status(201).json({ conversationId: convId, created: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create or get conversation' });
  }
}
