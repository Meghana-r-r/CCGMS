import { Router } from 'express';
import path from 'path';
import { q } from '../db.js';
import { verifyToken } from '../auth.js';
import { UPLOAD_DIR } from '../upload.js';

const r = Router();

// <img> and <video> tags cannot send an Authorization header, so the JWT may also arrive as ?t=...
// Access follows the same rules as the complaint itself.
r.get('/:id', async (req, res) => {
  let user;
  try {
    user = verifyToken(req.query.t || (req.headers.authorization || '').replace('Bearer ', ''));
  } catch {
    return res.status(401).json({ error: 'Please sign in again.' });
  }
  const [a] = await q(
    'SELECT a.stored_name, a.file_name, a.mime_type, c.student_id, c.officer_id FROM complaint_attachments a JOIN complaints c ON c.id=a.complaint_id WHERE a.id=?',
    [req.params.id],
  );
  if (!a) return res.status(404).json({ error: 'File not found.' });
  const ok = user.role === 'Admin'
    || (user.role === 'Student' && a.student_id === user.id)
    || (user.role === 'Officer' && (a.officer_id === null || a.officer_id === user.id));
  if (!ok) return res.status(403).json({ error: 'You do not have access to this file.' });
  res.set({
    'Content-Type': a.mime_type,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, max-age=3600',
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(a.file_name)}`,
  });
  res.sendFile(path.join(UPLOAD_DIR, a.stored_name)); // also handles Range requests so videos can seek
});

export default r;
