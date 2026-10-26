import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { q } from './db.js';

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const MAX_MB = 50;
export const MAX_FILES = 5;
const ALLOWED = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
};

// multer saves each file under a random name, so users can never overwrite each other's files.
export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: MAX_FILES },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype]
      ? cb(null, true)
      : cb(Object.assign(new Error('Only JPG, PNG, GIF, WebP images and MP4, WebM, MOV videos are allowed.'), { status: 400 })),
});

// Saves one DB row per uploaded file.
export async function saveFiles(complaintId, files = [], userId) {
  for (const f of files) {
    await q(
      'INSERT INTO complaint_attachments (complaint_id,uploaded_by,file_name,stored_name,mime_type,kind,size_bytes) VALUES (?,?,?,?,?,?,?)',
      [complaintId, userId, f.originalname.slice(0, 255), f.filename, f.mimetype, f.mimetype.startsWith('video') ? 'video' : 'image', f.size],
    );
  }
}

// Deletes files from disk (used when a request fails after multer already saved them, or a record is removed).
export const discard = (names = []) =>
  Promise.all(names.map((n) => fs.promises.unlink(path.join(UPLOAD_DIR, n)).catch(() => {})));
