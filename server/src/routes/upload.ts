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

import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING || ''
);

const containerClient = blobServiceClient.getContainerClient(
  process.env.AZURE_STORAGE_CONTAINER || 'uploads'
);

router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const file = req.file;
    const fileName = `${uuidv4()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    const fileUrl = blockBlobClient.url;
    let thumbnail_url = null;

    // Check if the file is an image for thumbnail generation
    const isImage = file.mimetype.startsWith('image/');
    if (isImage) {
      const thumbnailName = `thumb-${fileName}`;
      const thumbBuffer = await sharp(file.buffer)
        .resize(200, 200, { fit: 'inside' })
        .toBuffer();

      const thumbBlobClient = containerClient.getBlockBlobClient(thumbnailName);
      await thumbBlobClient.uploadData(thumbBuffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });

      thumbnail_url = thumbBlobClient.url;
    }

    res.json({
      media_url: fileUrl,
      media_thumbnail_url: thumbnail_url,
      message_type: isImage ? 'image' : 'file',
      media_filename: file.originalname,
      media_size_bytes: file.size,
      media_mime_type: file.mimetype
    });
  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({ message: 'Error processing upload' });
  }
});

export default router;
