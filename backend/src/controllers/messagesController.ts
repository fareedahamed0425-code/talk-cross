import { Request, Response } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/db.js';
import { getSocketIO } from '../sockets/socketHandler.js';

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  messageType: z.enum(['text', 'image', 'sticker']).default('text'),
  content: z.string().max(4000).optional().nullable(),
  mediaUrl: z.string().url().optional().nullable(),
  stickerId: z.string().uuid().optional().nullable(),
  replyToMessageId: z.string().uuid().optional().nullable(),
});

export async function getConversationMessages(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { id: conversationId } = req.params;
    const { limit = '50', before } = req.query;

    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify membership
    const membership = await query(
      'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, currentUserId]
    );

    if (membership.rows.length === 0) {
      res.status(403).json({ error: 'Forbidden: Not a member of this conversation' });
      return;
    }

    const parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 100);

    let sql = `
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.message_type,
        CASE 
          WHEN m.deleted_at IS NOT NULL THEN 'This message was deleted'
          ELSE m.content 
        END AS content,
        CASE 
          WHEN m.deleted_at IS NOT NULL THEN NULL
          ELSE m.media_url 
        END AS media_url,
        m.sticker_id,
        m.reply_to_message_id,
        m.created_at,
        m.updated_at,
        m.deleted_at,
        -- Sender Info
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        u.profile_image AS sender_profile_image,
        -- Reply Message Info
        rm.content AS reply_content,
        rm.message_type AS reply_message_type,
        rm.media_url AS reply_media_url,
        ru.display_name AS reply_sender_name,
        -- Sticker Info
        st.storage_url AS sticker_url,
        st.name AS sticker_name,
        -- Read by info
        EXISTS (
          SELECT 1 FROM message_reads mr 
          WHERE mr.message_id = m.id AND mr.user_id != m.sender_id
        ) AS is_read
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      LEFT JOIN messages rm ON rm.id = m.reply_to_message_id
      LEFT JOIN users ru ON ru.id = rm.sender_id
      LEFT JOIN stickers st ON st.id = m.sticker_id
      WHERE m.conversation_id = $1
    `;

    const params: any[] = [conversationId];

    if (before && typeof before === 'string') {
      sql += ` AND m.created_at < $2`;
      params.push(before);
      sql += ` ORDER BY m.created_at DESC LIMIT $3`;
      params.push(parsedLimit);
    } else {
      sql += ` ORDER BY m.created_at DESC LIMIT $2`;
      params.push(parsedLimit);
    }

    const result = await query(sql, params);

    // Format rows (and reverse to chronological order for client)
    const messages = result.rows.reverse().map((row) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      message_type: row.message_type,
      content: row.content,
      media_url: row.media_url,
      sticker_id: row.sticker_id,
      sticker_url: row.sticker_url,
      sticker_name: row.sticker_name,
      reply_to_message_id: row.reply_to_message_id,
      reply_to_message: row.reply_to_message_id
        ? {
            id: row.reply_to_message_id,
            content: row.reply_content,
            message_type: row.reply_message_type,
            media_url: row.reply_media_url,
            sender_name: row.reply_sender_name || 'User',
          }
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      is_deleted: !!row.deleted_at,
      is_read: !!row.is_read,
      sender: row.sender_id
        ? {
            id: row.sender_id,
            username: row.sender_username,
            display_name: row.sender_display_name,
            profile_image: row.sender_profile_image,
          }
        : undefined,
    }));

    // Mark unread messages in this conversation as read
    await query(
      `INSERT INTO message_reads (message_id, user_id, read_at)
       SELECT m.id, $1, NOW()
       FROM messages m
       WHERE m.conversation_id = $2 
         AND m.sender_id != $1
         AND NOT EXISTS (
           SELECT 1 FROM message_reads mr 
           WHERE mr.message_id = m.id AND mr.user_id = $1
         )
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [currentUserId, conversationId]
    );

    // Notify other members that messages were read
    const io = getSocketIO();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('messages_read_update', {
        conversationId,
        readerId: currentUserId,
        readAt: new Date().toISOString(),
      });
    }

    res.json({
      messages,
      hasMore: result.rows.length === parsedLimit,
    });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { conversationId, messageType, content, mediaUrl, stickerId, replyToMessageId } =
      sendMessageSchema.parse(req.body);

    // Validate payload has content, mediaUrl or stickerId
    if (messageType === 'text' && (!content || content.trim().length === 0)) {
      res.status(400).json({ error: 'Message content cannot be empty' });
      return;
    }
    if (messageType === 'image' && !mediaUrl) {
      res.status(400).json({ error: 'mediaUrl is required for image messages' });
      return;
    }
    if (messageType === 'sticker' && !stickerId && !mediaUrl) {
      res.status(400).json({ error: 'stickerId or mediaUrl is required for sticker messages' });
      return;
    }

    // Verify membership
    const membership = await query(
      'SELECT user_id FROM conversation_members WHERE conversation_id = $1',
      [conversationId]
    );

    const isMember = membership.rows.some((m) => m.user_id === currentUserId);
    if (!isMember) {
      res.status(403).json({ error: 'You are not a member of this conversation' });
      return;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Insert message
      const msgResult = await client.query(
        `INSERT INTO messages 
          (conversation_id, sender_id, message_type, content, media_url, sticker_id, reply_to_message_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          conversationId,
          currentUserId,
          messageType,
          content ? content.trim() : null,
          mediaUrl || null,
          stickerId || null,
          replyToMessageId || null,
        ]
      );

      // Update conversation updated_at
      await client.query(
        'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
        [conversationId]
      );

      await client.query('COMMIT');

      const rawMsg = msgResult.rows[0];

      // Fetch full message details with reply & sender info for broadcast
      let replyInfo: any = null;
      if (replyToMessageId) {
        const replyRes = await query(
          `SELECT rm.id, rm.content, rm.message_type, rm.media_url, ru.display_name AS sender_name
           FROM messages rm
           LEFT JOIN users ru ON ru.id = rm.sender_id
           WHERE rm.id = $1`,
          [replyToMessageId]
        );
        if (replyRes.rows.length > 0) {
          replyInfo = replyRes.rows[0];
        }
      }

      // Fetch sticker info if applicable
      let stickerInfo: any = null;
      if (stickerId) {
        const stRes = await query('SELECT storage_url, name FROM stickers WHERE id = $1', [stickerId]);
        if (stRes.rows.length > 0) {
          stickerInfo = stRes.rows[0];
        }
      }

      const userObj = req.user;
      if (!userObj) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const fullMessage = {
        id: rawMsg.id,
        conversation_id: rawMsg.conversation_id,
        sender_id: rawMsg.sender_id,
        message_type: rawMsg.message_type,
        content: rawMsg.content,
        media_url: rawMsg.media_url,
        sticker_id: rawMsg.sticker_id,
        sticker_url: stickerInfo ? stickerInfo.storage_url : rawMsg.media_url,
        sticker_name: stickerInfo ? stickerInfo.name : null,
        reply_to_message_id: rawMsg.reply_to_message_id,
        reply_to_message: replyInfo,
        created_at: rawMsg.created_at,
        updated_at: rawMsg.updated_at,
        deleted_at: null,
        is_deleted: false,
        is_read: false,
        sender: {
          id: userObj.id,
          username: userObj.username,
          display_name: userObj.display_name,
          profile_image: userObj.profile_image,
        },
      };

      // Broadcast via Socket.IO
      const io = getSocketIO();
      if (io) {
        // Emit to conversation room
        io.to(`conversation:${conversationId}`).emit('new_message', fullMessage);

        // Also emit conversation preview update to all members' personal rooms
        membership.rows.forEach((m) => {
          io.to(`user:${m.user_id}`).emit('conversation_updated', {
            conversationId,
            lastMessage: fullMessage,
            updatedAt: rawMsg.created_at,
          });
        });
      }

      res.status(201).json({ message: fullMessage });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

export async function editMessage(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { id: messageId } = req.params;
    const { content } = req.body;

    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content cannot be empty' });
      return;
    }

    const checkResult = await query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const msg = checkResult.rows[0];

    if (msg.sender_id !== currentUserId) {
      res.status(403).json({ error: 'You can only edit your own messages' });
      return;
    }

    if (msg.deleted_at) {
      res.status(400).json({ error: 'Cannot edit a deleted message' });
      return;
    }

    if (msg.message_type !== 'text') {
      res.status(400).json({ error: 'Only text messages can be edited' });
      return;
    }

    const updateResult = await query(
      `UPDATE messages 
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content.trim(), messageId]
    );

    const updated = updateResult.rows[0];

    // Broadcast edit to conversation room
    const io = getSocketIO();
    if (io) {
      io.to(`conversation:${msg.conversation_id}`).emit('message_edited', {
        messageId: updated.id,
        conversationId: msg.conversation_id,
        content: updated.content,
        updatedAt: updated.updated_at,
      });
    }

    res.json({ message: updated });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
}

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { id: messageId } = req.params;

    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const checkResult = await query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const msg = checkResult.rows[0];

    if (msg.sender_id !== currentUserId) {
      res.status(403).json({ error: 'You can only delete your own messages' });
      return;
    }

    // Soft delete
    const updateResult = await query(
      `UPDATE messages 
       SET deleted_at = NOW(), content = 'This message was deleted', media_url = NULL, sticker_id = NULL
       WHERE id = $1
       RETURNING *`,
      [messageId]
    );

    // Broadcast delete to conversation room
    const io = getSocketIO();
    if (io) {
      io.to(`conversation:${msg.conversation_id}`).emit('message_deleted', {
        messageId,
        conversationId: msg.conversation_id,
        deletedAt: updateResult.rows[0].deleted_at,
      });
    }

    res.json({ success: true, messageId });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
}

export async function markConversationAsRead(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { id: conversationId } = req.params;

    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await query(
      `INSERT INTO message_reads (message_id, user_id, read_at)
       SELECT m.id, $1, NOW()
       FROM messages m
       WHERE m.conversation_id = $2 
         AND m.sender_id != $1
         AND NOT EXISTS (
           SELECT 1 FROM message_reads mr 
           WHERE mr.message_id = m.id AND mr.user_id = $1
         )
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [currentUserId, conversationId]
    );

    const io = getSocketIO();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('messages_read_update', {
        conversationId,
        readerId: currentUserId,
        readAt: new Date().toISOString(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
}
