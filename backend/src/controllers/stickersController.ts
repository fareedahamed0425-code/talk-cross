import { Request, Response } from 'express';
import { query } from '../config/db.js';
import { uploadFile } from '../config/supabase.js';
import { DbSticker } from '../types/index.js';

// Curated default high-quality sticker collection available to all users
const DEFAULT_STICKERS = [
  {
    id: 'default-1',
    name: 'Party Cat',
    storage_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop&q=80',
    is_default: true,
  },
  {
    id: 'default-2',
    name: 'Cool Shiba',
    storage_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200&auto=format&fit=crop&q=80',
    is_default: true,
  },
  {
    id: 'default-3',
    name: 'Sparkle Heart',
    storage_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&auto=format&fit=crop&q=80',
    is_default: true,
  },
  {
    id: 'default-4',
    name: 'Fire Flame',
    storage_url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=200&auto=format&fit=crop&q=80',
    is_default: true,
  },
  {
    id: 'default-5',
    name: 'Coffee Mug',
    storage_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=200&auto=format&fit=crop&q=80',
    is_default: true,
  },
  {
    id: 'default-6',
    name: 'Peace Sign',
    storage_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200&auto=format&fit=crop&q=80',
    is_default: true,
  },
];

export async function getStickers(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // User's custom stickers from DB
    const result = await query<DbSticker>(
      'SELECT * FROM stickers WHERE user_id = $1 ORDER BY created_at DESC',
      [currentUserId]
    );

    const customStickers = result.rows.map((st) => ({
      ...st,
      is_default: false,
    }));

    res.json({
      myStickers: customStickers,
      defaultStickers: DEFAULT_STICKERS,
    });
  } catch (error) {
    console.error('Error fetching stickers:', error);
    res.status(500).json({ error: 'Failed to fetch stickers' });
  }
}

export async function createSticker(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name } = req.body;
    const stickerName = (name && name.trim()) || `Sticker_${Date.now().toString().slice(-4)}`;

    let storageUrl = '';

    if (req.file) {
      const ext = req.file.mimetype.split('/')[1] || 'png';
      const filePath = `stickers/${currentUserId}/${Date.now()}_sticker.${ext}`;
      storageUrl = await uploadFile('stickers', filePath, req.file.buffer, req.file.mimetype);
    } else if (req.body.imageUrl) {
      storageUrl = req.body.imageUrl;
    } else if (req.body.dataUrl) {
      // Process base64 dataUrl
      const matches = req.body.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = mimeType.split('/')[1] || 'png';
        const filePath = `stickers/${currentUserId}/${Date.now()}_sticker.${ext}`;
        storageUrl = await uploadFile('stickers', filePath, buffer, mimeType);
      } else {
        res.status(400).json({ error: 'Invalid data URL format' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Image file, dataUrl, or imageUrl is required' });
      return;
    }

    const insertResult = await query<DbSticker>(
      `INSERT INTO stickers (user_id, name, storage_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [currentUserId, stickerName, storageUrl]
    );

    res.status(201).json({
      sticker: {
        ...insertResult.rows[0],
        is_default: false,
      },
    });
  } catch (error) {
    console.error('Error creating sticker:', error);
    res.status(500).json({ error: 'Failed to create sticker' });
  }
}

export async function deleteSticker(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { id: stickerId } = req.params;

    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await query(
      'DELETE FROM stickers WHERE id = $1 AND user_id = $2 RETURNING id',
      [stickerId, currentUserId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Sticker not found or not owned by you' });
      return;
    }

    res.json({ success: true, stickerId });
  } catch (error) {
    console.error('Error deleting sticker:', error);
    res.status(500).json({ error: 'Failed to delete sticker' });
  }
}
