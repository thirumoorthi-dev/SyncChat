import express, { Response } from 'express';
const router = express.Router();
import { upload } from '../config/multer.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const fileUrl = `/uploads/${req.file.filename}`;
    let thumbnail_url = null;

    // Check if the file is an image for thumbnail generation
    const isImage = req.file.mimetype.startsWith('image/');
    if (isImage) {
      const thumbnailName = `thumb-${req.file.filename}`;
      const thumbnailPath = path.join(__dirname, '../../uploads/thumbnails', thumbnailName);

      await sharp(req.file.path)
        .resize(200, 200, { fit: 'inside' })
        .toFile(thumbnailPath);

      thumbnail_url = `/uploads/thumbnails/${thumbnailName}`;
    }

    res.json({
      media_url: fileUrl,
      media_thumbnail_url: thumbnail_url,
      message_type: isImage ? 'image' : 'file',
      media_filename: req.file.originalname,
      media_size_bytes: req.file.size,
      media_mime_type: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({ message: 'Error processing upload' });
  }
});

export default router;
