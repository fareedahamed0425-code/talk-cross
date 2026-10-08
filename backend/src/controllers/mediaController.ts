import { Request, Response } from 'express';
import { uploadFile } from '../config/supabase.js';

export async function uploadMedia(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No image file uploaded' });
      return;
    }

    const bucket = req.body.bucket === 'avatars' ? 'avatars' : 'chat-media';
    const ext = req.file.mimetype.split('/')[1] || 'jpeg';
    const filename = `${currentUserId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const publicUrl = await uploadFile(bucket, filename, req.file.buffer, req.file.mimetype);

    res.json({
      url: publicUrl,
      filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload media file' });
  }
}
