import { Request, Response } from 'express';
import { z } from 'zod';
import { query, getClient } from '../config/db.js';
import { getSocketIO } from '../sockets/socketHandler.js';

const requestSchema = z.object({
  receiverId: z.string().uuid().optional(),
  username: z.string().optional(),
});

export async function sendFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    const senderId = req.user?.id;
    if (!senderId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { receiverId, username } = requestSchema.parse(req.body);

    let targetUserId = receiverId;

    if (!targetUserId && username) {
      const cleanUsername = username.replace(/^@/, '').toLowerCase();
      const userRes = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [cleanUsername]);
      if (userRes.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      targetUserId = userRes.rows[0].id;
    }

    if (!targetUserId) {
      res.status(400).json({ error: 'Either receiverId or username is required' });
      return;
    }

    if (targetUserId === senderId) {
      res.status(400).json({ error: 'You cannot send a friend request to yourself' });
      return;
    }

    // Check if already friends
    const friendshipCheck = await query(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [senderId, targetUserId]
    );
    if (friendshipCheck.rows.length > 0) {
      res.status(400).json({ error: 'You are already friends with this user' });
      return;
    }

    // Check if reverse request already exists (target user already requested current user)
    const reverseReqCheck = await query(
      `SELECT id, status FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2`,
      [targetUserId, senderId]
    );

    if (reverseReqCheck.rows.length > 0 && reverseReqCheck.rows[0].status === 'pending') {
      // Auto-accept the existing request
      const client = await getClient();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
          [reverseReqCheck.rows[0].id]
        );

        await client.query(
          `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING`,
          [senderId, targetUserId]
        );

        // Ensure 1-on-1 conversation exists
        let convId: string;
        const existingConv = await client.query(
          `SELECT cm1.conversation_id 
           FROM conversation_members cm1
           JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
           WHERE cm1.user_id = $1 AND cm2.user_id = $2`,
          [senderId, targetUserId]
        );

        if (existingConv.rows.length > 0) {
          convId = existingConv.rows[0].conversation_id;
        } else {
          const newConv = await client.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`);
          convId = newConv.rows[0].id;
          await client.query(
            `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
            [convId, senderId, targetUserId]
          );
        }

        await client.query('COMMIT');

        // Socket notifications
        const io = getSocketIO();
        if (io) {
          io.to(`user:${targetUserId}`).emit('friend_request_accepted', {
            friend: req.user,
            conversationId: convId,
          });
          io.to(`user:${senderId}`).emit('friend_request_accepted', {
            conversationId: convId,
          });
        }

        res.json({
          status: 'accepted',
          message: 'Friend request accepted and connected!',
          conversationId: convId,
        });
        return;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // Check if forward request already exists
    const existingReq = await query(
      `SELECT id, status FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2`,
      [senderId, targetUserId]
    );

    if (existingReq.rows.length > 0) {
      if (existingReq.rows[0].status === 'pending') {
        res.status(400).json({ error: 'A friend request is already pending' });
        return;
      }
      // If was rejected previously, reset to pending
      const updated = await query(
        `UPDATE friend_requests SET status = 'pending', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [existingReq.rows[0].id]
      );

      const io = getSocketIO();
      if (io) {
        io.to(`user:${targetUserId}`).emit('new_friend_request', {
          requestId: updated.rows[0].id,
          sender: req.user,
        });
      }

      res.json({ request: updated.rows[0], message: 'Friend request sent' });
      return;
    }

    // Insert new pending friend request
    const insertRes = await query(
      `INSERT INTO friend_requests (sender_id, receiver_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [senderId, targetUserId]
    );

    const io = getSocketIO();
    if (io) {
      io.to(`user:${targetUserId}`).emit('new_friend_request', {
        requestId: insertRes.rows[0].id,
        sender: req.user,
      });
    }

    res.status(201).json({ request: insertRes.rows[0], message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
}

export async function getFriendRequests(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Received pending requests
    const received = await query(
      `SELECT 
        fr.id,
        fr.status,
        fr.created_at,
        u.id AS sender_id,
        u.username,
        u.display_name,
        u.profile_image,
        u.bio,
        u.online_status,
        u.last_seen
      FROM friend_requests fr
      JOIN users u ON u.id = fr.sender_id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC`,
      [currentUserId]
    );

    // Sent pending requests
    const sent = await query(
      `SELECT 
        fr.id,
        fr.status,
        fr.created_at,
        u.id AS receiver_id,
        u.username,
        u.display_name,
        u.profile_image,
        u.bio,
        u.online_status,
        u.last_seen
      FROM friend_requests fr
      JOIN users u ON u.id = fr.receiver_id
      WHERE fr.sender_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC`,
      [currentUserId]
    );

    res.json({
      received: received.rows,
      sent: sent.rows,
    });
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
}

export async function acceptFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { requestId, senderId } = req.body;

    let reqRecord: any = null;

    if (requestId) {
      const result = await query(
        `SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2`,
        [requestId, currentUserId]
      );
      reqRecord = result.rows[0];
    } else if (senderId) {
      const result = await query(
        `SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'`,
        [senderId, currentUserId]
      );
      reqRecord = result.rows[0];
    }

    if (!reqRecord) {
      res.status(404).json({ error: 'Pending friend request not found' });
      return;
    }

    const otherUserId = reqRecord.sender_id;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Update friend request status
      await client.query(
        `UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
        [reqRecord.id]
      );

      // Insert reciprocal friendships
      await client.query(
        `INSERT INTO friendships (user_id, friend_id)
         VALUES ($1, $2), ($2, $1)
         ON CONFLICT (user_id, friend_id) DO NOTHING`,
        [currentUserId, otherUserId]
      );

      // Create or find 1-on-1 conversation
      let convId: string;
      const existingConv = await client.query(
        `SELECT cm1.conversation_id 
         FROM conversation_members cm1
         JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
         WHERE cm1.user_id = $1 AND cm2.user_id = $2`,
        [currentUserId, otherUserId]
      );

      if (existingConv.rows.length > 0) {
        convId = existingConv.rows[0].conversation_id;
      } else {
        const newConv = await client.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`);
        convId = newConv.rows[0].id;
        await client.query(
          `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
          [convId, currentUserId, otherUserId]
        );
      }

      await client.query('COMMIT');

      // Get friend user record
      const friendData = await query('SELECT * FROM users WHERE id = $1', [otherUserId]);

      // Emit socket notification
      const io = getSocketIO();
      if (io) {
        io.to(`user:${otherUserId}`).emit('friend_request_accepted', {
          friend: req.user,
          conversationId: convId,
        });
        io.to(`user:${currentUserId}`).emit('friend_request_accepted', {
          friend: friendData.rows[0],
          conversationId: convId,
        });
      }

      res.json({
        success: true,
        message: 'Friend request accepted',
        conversationId: convId,
        friend: friendData.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
}

export async function rejectFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { requestId, senderId } = req.body;

    if (!requestId && !senderId) {
      res.status(400).json({ error: 'requestId or senderId is required' });
      return;
    }

    let result;
    if (requestId) {
      result = await query(
        `UPDATE friend_requests SET status = 'rejected', updated_at = NOW()
         WHERE id = $1 AND receiver_id = $2
         RETURNING *`,
        [requestId, currentUserId]
      );
    } else {
      result = await query(
        `UPDATE friend_requests SET status = 'rejected', updated_at = NOW()
         WHERE sender_id = $1 AND receiver_id = $2
         RETURNING *`,
        [senderId, currentUserId]
      );
    }

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    res.json({ success: true, message: 'Friend request rejected' });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
}

export async function cancelFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { requestId, receiverId } = req.body;

    let result;
    if (requestId) {
      result = await query(
        `DELETE FROM friend_requests WHERE id = $1 AND sender_id = $2 RETURNING *`,
        [requestId, currentUserId]
      );
    } else if (receiverId) {
      result = await query(
        `DELETE FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 RETURNING *`,
        [currentUserId, receiverId]
      );
    } else {
      res.status(400).json({ error: 'requestId or receiverId is required' });
      return;
    }

    res.json({ success: true, message: 'Friend request cancelled' });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({ error: 'Failed to cancel friend request' });
  }
}

export async function getFriendsList(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Fetch friends joined with their conversation id (if exists)
    const sql = `
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.profile_image,
        u.bio,
        u.online_status,
        u.last_seen,
        f.created_at AS friendship_date,
        cm1.conversation_id
      FROM friendships f
      JOIN users u ON u.id = f.friend_id
      LEFT JOIN conversation_members cm1 ON cm1.user_id = f.user_id
      LEFT JOIN conversation_members cm2 ON cm2.conversation_id = cm1.conversation_id AND cm2.user_id = u.id
      WHERE f.user_id = $1
      ORDER BY u.online_status DESC, u.display_name ASC
    `;

    const result = await query(sql, [currentUserId]);
    res.json({ friends: result.rows });
  } catch (error) {
    console.error('Error getting friends list:', error);
    res.status(500).json({ error: 'Failed to fetch friends list' });
  }
}

export async function removeFriend(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { friendId } = req.params;

    if (!friendId) {
      res.status(400).json({ error: 'friendId parameter is required' });
      return;
    }

    await query(
      `DELETE FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) 
          OR (user_id = $2 AND friend_id = $1)`,
      [currentUserId, friendId]
    );

    // Also remove any friend request record so they can start fresh if needed
    await query(
      `DELETE FROM friend_requests 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)`,
      [currentUserId, friendId]
    );

    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
}
