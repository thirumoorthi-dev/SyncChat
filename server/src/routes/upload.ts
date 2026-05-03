import express, { Response } from 'express';
const router = express.Router();
import { upload } from '../config/multer.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { BlobServiceClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Storage mode detection ─────────────────────────────────────────────────
// If AZURE_STORAGE_CONNECTION_STRING is set → use Azure Blob Storage (production)
// Otherwise                                 → save to local disk (development)
const AZURE_CONN_STR = process.env.AZURE_STORAGE_CONNECTION_STRING;
const USE_AZURE = !!AZURE_CONN_STR;

// ── Azure clients (only initialised when connection string is present) ──────
let containerClient: ReturnType<BlobServiceClient['getContainerClient']> | null = null;
if (USE_AZURE) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONN_STR!);
  containerClient = blobServiceClient.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER || 'uploads'
  );
  console.log('📦 Upload storage: Azure Blob Storage');
} else {
  console.log('📁 Upload storage: Local disk (set AZURE_STORAGE_CONNECTION_STRING for production)');
}

// ── Local disk paths (used only in dev) ────────────────────────────────────
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const THUMBS_DIR = path.resolve(UPLOADS_DIR, 'thumbnails');
if (!USE_AZURE) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
}

// Helper: build a public URL for a locally stored file
const buildLocalUrl = (req: express.Request, relativePath: string) => {
  const origin = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
  return `${origin}/uploads/${relativePath}`;
};

// ── Upload route ────────────────────────────────────────────────────────────
router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const file = req.file;
    const isImage = file.mimetype.startsWith('image/');
    const ext = path.extname(file.originalname) || '';
    const uniqueName = `${randomUUID()}${ext}`;

    let fileUrl: string;
    let thumbnail_url: string | null = null;

    if (USE_AZURE && containerClient) {
      // ── Azure Blob Storage path (production) ───────────────────────────
      const fileName = `${randomUUID()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });

      fileUrl = blockBlobClient.url;

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
    } else {
      // ── Local disk path (development) ──────────────────────────────────
      const filePath = path.join(UPLOADS_DIR, uniqueName);
      fs.writeFileSync(filePath, file.buffer);
      fileUrl = buildLocalUrl(req, uniqueName);

      if (isImage) {
        const thumbName = `thumb-${uniqueName}`;
        const thumbPath = path.join(THUMBS_DIR, thumbName);
        const thumbBuffer = await sharp(file.buffer)
          .resize(200, 200, { fit: 'inside' })
          .toBuffer();
        fs.writeFileSync(thumbPath, thumbBuffer);
        thumbnail_url = buildLocalUrl(req, `thumbnails/${thumbName}`);
      }
    }

    res.json({
      media_url: fileUrl,
      media_thumbnail_url: thumbnail_url,
      message_type: isImage ? 'image' : 'file',
      media_filename: file.originalname,
      media_size_bytes: file.size,
      media_mime_type: file.mimetype,
    });
  } catch (error: any) {
    console.error('[CRITICAL] Upload processing error:', error);
    res.status(500).json({ 
      message: 'Error processing upload', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Storage configuration issue' 
    });
  }
});

export default router;
