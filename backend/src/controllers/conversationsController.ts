import { Request, Response } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/db.js';

const createGroupSchema = z.object({
  title: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()).min(1),
  groupImage: z.string().optional().nullable(),
});

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
        c.is_group,
        c.title AS group_title,
        c.group_image,
        c.created_by AS group_created_by,
        c.created_at,
        c.updated_at,
        -- 1-on-1 Other user info (null for groups)
        u.id AS other_user_id,
        u.username AS other_username,
        u.display_name AS other_display_name,
        u.profile_image AS other_profile_image,
        u.online_status AS other_online_status,
        u.last_seen AS other_last_seen,
        u.bio AS other_bio,
        -- Total members count
        COUNT(DISTINCT all_cm.user_id) AS members_count,
        -- Last message info
        lm.id AS last_message_id,
        lm.content AS last_message_content,
        lm.message_type AS last_message_type,
        lm.sender_id AS last_message_sender_id,
        lm_user.display_name AS last_message_sender_name,
        lm.created_at AS last_message_created_at,
        lm.deleted_at AS last_message_deleted_at,
        -- Unread messages count for current user
        COUNT(DISTINCT unread.id) AS unread_count
      FROM conversation_members cm
      JOIN conversations c ON c.id = cm.conversation_id
      -- Join all members for member count
      JOIN conversation_members all_cm ON all_cm.conversation_id = c.id
      -- Left join to get the other member in 1-on-1 chats
      LEFT JOIN conversation_members other_cm ON other_cm.conversation_id = c.id AND other_cm.user_id != $1 AND c.is_group = false
      LEFT JOIN users u ON u.id = other_cm.user_id
      -- Left join to get the latest message
      LEFT JOIN LATERAL (
        SELECT id, content, message_type, sender_id, created_at, deleted_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      LEFT JOIN users lm_user ON lm_user.id = lm.sender_id
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
        c.id, c.is_group, c.title, c.group_image, c.created_by, c.created_at, c.updated_at,
        u.id, u.username, u.display_name, u.profile_image, u.online_status, u.last_seen, u.bio,
        lm.id, lm.content, lm.message_type, lm.sender_id, lm_user.display_name, lm.created_at, lm.deleted_at
      ORDER BY COALESCE(lm.created_at, c.updated_at) DESC
    `;

    const result = await query(sql, [currentUserId]);

    const conversations = result.rows.map((row) => {
      const isGroup = !!row.is_group;
      return {
        id: row.id,
        is_group: isGroup,
        title: row.group_title,
        group_image: row.group_image,
        created_by: row.group_created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        members_count: parseInt(row.members_count || '2', 10),
        other_user: isGroup
          ? {
              id: `group_${row.id}`,
              username: `group_${row.id.substring(0, 6)}`,
              display_name: row.group_title || 'Group Chat',
              profile_image: row.group_image || null,
              online_status: false,
              last_seen: row.updated_at,
              bio: `Group • ${row.members_count} members`,
            }
          : {
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
              sender_name: row.last_message_sender_name,
              created_at: row.last_message_created_at,
              is_deleted: !!row.last_message_deleted_at,
            }
          : null,
        unread_count: parseInt(row.unread_count || '0', 10),
      };
    });

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

    // Fetch conversation details
    const convResult = await query(
      'SELECT id, is_group, title, group_image, created_by, created_at, updated_at FROM conversations WHERE id = $1',
      [id]
    );

    if (convResult.rows.length === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const conv = convResult.rows[0];
    const isGroup = !!conv.is_group;

    // Fetch all members
    const membersResult = await query(
      `SELECT u.id, u.username, u.display_name, u.profile_image, u.online_status, u.last_seen, cm.role
       FROM conversation_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = $1
       ORDER BY cm.joined_at ASC`,
      [id]
    );

    const members = membersResult.rows.map((m) => ({
      id: m.id,
      username: m.username,
      display_name: m.display_name,
      profile_image: m.profile_image,
      online_status: m.online_status,
      last_seen: m.last_seen,
      role: m.role,
    }));

    const otherMember = members.find((m) => m.id !== currentUserId) || members[0];

    res.json({
      conversation: {
        id: conv.id,
        is_group: isGroup,
        title: conv.title,
        group_image: conv.group_image,
        created_by: conv.created_by,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        members,
        other_user: isGroup
          ? {
              id: `group_${conv.id}`,
              username: `group_${conv.id.substring(0, 6)}`,
              display_name: conv.title || 'Group Chat',
              profile_image: conv.group_image || null,
              online_status: false,
              last_seen: conv.updated_at,
              bio: `Group • ${members.length} members`,
            }
          : {
              id: otherMember.id,
              username: otherMember.username,
              display_name: otherMember.display_name,
              profile_image: otherMember.profile_image,
              online_status: otherMember.online_status,
              last_seen: otherMember.last_seen,
              bio: '',
            },
      },
    });
  } catch (error) {
    console.error('Error getting conversation by id:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}

export async function createGroupConversation(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
      return;
    }

    const { title, memberIds, groupImage } = parsed.data;

    // Filter out duplicates and current user
    const uniqueMemberIds = Array.from(new Set(memberIds.filter((id) => id !== currentUserId)));
    if (uniqueMemberIds.length === 0) {
      res.status(400).json({ error: 'You must add at least one friend to the group' });
      return;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Create group conversation
      const insertConv = await client.query(
        `INSERT INTO conversations (is_group, title, group_image, created_by)
         VALUES (true, $1, $2, $3)
         RETURNING id`,
        [title.trim(), groupImage || null, currentUserId]
      );
      const convId = insertConv.rows[0].id;

      // Add creator as admin
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 'admin')`,
        [convId, currentUserId]
      );

      // Add members
      for (const memberId of uniqueMemberIds) {
        await client.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role)
           VALUES ($1, $2, 'member')`,
          [convId, memberId]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ conversationId: convId, created: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating group conversation:', error);
    res.status(500).json({ error: 'Failed to create group conversation' });
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

    // Check if 1-on-1 conversation already exists
    const existing = await query(
      `SELECT cm1.conversation_id 
       FROM conversation_members cm1
       JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
       JOIN conversations c ON c.id = cm1.conversation_id
       WHERE cm1.user_id = $1 AND cm2.user_id = $2 AND c.is_group = false`,
      [currentUserId, targetUserId]
    );

    if (existing.rows.length > 0) {
      const convId = existing.rows[0].conversation_id;
      res.json({ conversationId: convId, created: false });
      return;
    }

    // Create new 1-on-1 conversation
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const newConv = await client.query('INSERT INTO conversations (is_group) VALUES (false) RETURNING id');
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
