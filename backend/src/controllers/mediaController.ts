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
    
    // Resolve clean extension
    let ext = 'jpg';
    if (req.file.originalname && req.file.originalname.includes('.')) {
      ext = req.file.originalname.split('.').pop() || 'jpg';
    } else if (req.file.mimetype) {
      const mimeExt = req.file.mimetype.split('/')[1];
      ext = mimeExt === 'jpeg' ? 'jpg' : (mimeExt?.replace('+xml', '') || 'jpg');
    }
    ext = ext.toLowerCase();

    // Format: talk-cross(YYYY-MM-DD_image_HHMMSS_XXX).ext
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const randNo = Math.floor(100 + Math.random() * 900);

    const dateStr = `${year}-${month}-${day}`;
    const imageSeq = `${hours}${mins}${secs}_${randNo}`;
    const customFileName = `talk-cross(${dateStr}_image_${imageSeq}).${ext}`;
    const storagePath = `${currentUserId}/${customFileName}`;

    const publicUrl = await uploadFile(bucket, storagePath, req.file.buffer, req.file.mimetype);

    res.json({
      url: publicUrl,
      filename: customFileName,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error: any) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: error?.message || 'Failed to upload media file' });
  }
}
