import { Router } from 'express';
import { q } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { upload, saveFiles, discard } from '../upload.js';

const r = Router();
r.use(requireAuth);

const STATUSES = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Escalated', 'Rejected'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const BASE = `SELECT c.id, CONCAT('CMP-', c.id) AS code, c.title, c.description, c.priority, c.status,
  c.location AS loc, DATE(c.created_at) AS date, cat.name AS cat, s.name AS student, c.student_id,
  o.name AS officer, c.officer_id
  FROM complaints c JOIN categories cat ON cat.id=c.category_id JOIN users s ON s.id=c.student_id
  LEFT JOIN users o ON o.id=c.officer_id`;

// Loads complaints together with their history, comments and feedback, shaped for the UI.
async function load(where = '', params = []) {
  const rows = await q(`${BASE} ${where} ORDER BY c.id DESC`, params);
  if (!rows.length) return [];
  const ids = rows.map((x) => x.id);
  const [hist, coms, fbs, atts] = await Promise.all([
    q('SELECT complaint_id, DATE(created_at) d, note FROM complaint_status_history WHERE complaint_id IN (?) ORDER BY id', [ids]),
    q('SELECT cm.complaint_id, u.name, DATE(cm.created_at) d, cm.body FROM complaint_comments cm JOIN users u ON u.id=cm.user_id WHERE cm.complaint_id IN (?) ORDER BY cm.id', [ids]),
    q('SELECT complaint_id, rating, comment FROM feedback WHERE complaint_id IN (?)', [ids]),
    q('SELECT id, complaint_id, file_name AS name, kind FROM complaint_attachments WHERE complaint_id IN (?) ORDER BY id', [ids]),
  ]);
  return rows.map((c) => ({
    ...c,
    history: hist.filter((h) => h.complaint_id === c.id).map((h) => [h.d, h.note]),
    comments: coms.filter((m) => m.complaint_id === c.id).map((m) => [m.name, m.d, m.body]),
    feedback: fbs.find((f) => f.complaint_id === c.id) || null,
    attachments: atts.filter((a) => a.complaint_id === c.id).map(({ complaint_id, ...a }) => a),
  }));
}
const one = async (id) => (await load('WHERE c.id=?', [id]))[0];

// Adds a history entry and notifies the student (unless they made the change themselves).
async function log(id, status, note, userId) {
  await q('INSERT INTO complaint_status_history (complaint_id,status,note,changed_by) VALUES (?,?,?,?)', [id, status, note, userId]);
  await q('INSERT INTO notifications (user_id,complaint_id,message) SELECT student_id, id, ? FROM complaints WHERE id=? AND student_id<>?', [`CMP-${id}: ${note}`, id, userId]);
}
const remark = (id, userId, body) => q('INSERT INTO complaint_comments (complaint_id,user_id,body) VALUES (?,?,?)', [id, userId, body]);

// Students see their own, officers see their own + the unassigned pool, admins see everything.
r.get('/', async (req, res) => {
  const { id, role } = req.user;
  res.json(role === 'Admin' ? await load()
    : role === 'Officer' ? await load('WHERE c.officer_id=? OR c.officer_id IS NULL', [id])
    : await load('WHERE c.student_id=?', [id]));
});

// Students can attach images/videos (multipart field "files"); plain JSON still works too.
r.post('/', requireRole('Student'), upload.array('files', 5), async (req, res) => {
  const names = (req.files || []).map((f) => f.filename);
  const fail = async (code, error) => { await discard(names); return res.status(code).json({ error }); };
  const { title, category, priority = 'Medium', location, description = '' } = req.body;
  if (!title?.trim()) return fail(400, 'A title is required.');
  if (!PRIORITIES.includes(priority)) return fail(400, 'Invalid priority.');
  const [cat] = await q('SELECT id FROM categories WHERE name=?', [category]);
  if (!cat) return fail(400, 'Unknown category.');
  const { insertId } = await q('INSERT INTO complaints (title,description,category_id,priority,location,student_id) VALUES (?,?,?,?,?,?)',
    [title.trim(), description, cat.id, priority, location?.trim() || 'Not specified', req.user.id]);
  await saveFiles(insertId, req.files, req.user.id);
  await log(insertId, 'Pending', 'Submitted by student', req.user.id);
  res.status(201).json(await one(insertId));
});

// Officer claims an unassigned complaint.
r.post('/:id/accept', requireRole('Officer'), async (req, res) => {
  const { affectedRows } = await q("UPDATE complaints SET officer_id=?, status='Assigned' WHERE id=? AND officer_id IS NULL", [req.user.id, req.params.id]);
  if (!affectedRows) return res.status(409).json({ error: 'That complaint was already accepted or no longer exists.' });
  await log(req.params.id, 'Assigned', `Accepted and assigned to ${req.user.name}`, req.user.id);
  res.json(await one(req.params.id));
});

// Officer updates status on their own complaint.
r.patch('/:id/status', requireRole('Officer'), async (req, res) => {
  const { status, remark: note } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const [c] = await q('SELECT officer_id FROM complaints WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Complaint not found.' });
  if (c.officer_id !== req.user.id) return res.status(403).json({ error: 'This complaint is assigned to someone else.' });
  await q('UPDATE complaints SET status=? WHERE id=?', [status, req.params.id]);
  await log(req.params.id, status, `Marked ${status}${note?.trim() ? ' — ' + note.trim() : ''}`, req.user.id);
  if (note?.trim()) await remark(req.params.id, req.user.id, note.trim());
  res.json(await one(req.params.id));
});

// Admin edits category / priority / officer / status.
r.patch('/:id', requireRole('Admin'), async (req, res) => {
  const c = await one(req.params.id);
  if (!c) return res.status(404).json({ error: 'Complaint not found.' });
  const { category = c.cat, priority = c.priority, status = c.status, remark: note } = req.body;
  if (!STATUSES.includes(status) || !PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid status or priority.' });
  const oid = req.body.officerId ? +req.body.officerId : null;
  let offName = null;
  if (oid) {
    const [o] = await q("SELECT name FROM users WHERE id=? AND role='Officer'", [oid]);
    if (!o) return res.status(400).json({ error: 'Selected officer does not exist.' });
    offName = o.name;
  }
  const notes = [];
  if (category !== c.cat) notes.push('category → ' + category);
  if (priority !== c.priority) notes.push('priority → ' + priority);
  if (oid !== (c.officer_id || null)) notes.push('reassigned to ' + (offName || 'Unassigned'));
  if (status !== c.status) notes.push('status → ' + status);
  await q('UPDATE complaints SET category_id=COALESCE((SELECT id FROM categories WHERE name=?), category_id), priority=?, officer_id=?, status=? WHERE id=?',
    [category, priority, oid, status, req.params.id]);
  await log(req.params.id, status, (notes.length ? notes.join(', ') : 'Updated by admin') + (note?.trim() ? ' — ' + note.trim() : ''), req.user.id);
  if (note?.trim()) await remark(req.params.id, req.user.id, note.trim());
  res.json(await one(req.params.id));
});

r.delete('/:id', requireRole('Admin'), async (req, res) => {
  await q('DELETE FROM complaints WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// Student leaves feedback on their own resolved complaint.
r.post('/:id/feedback', requireRole('Student'), async (req, res) => {
  const rating = Math.min(5, Math.max(1, +req.body.rating || 5));
  const { affectedRows } = await q("INSERT INTO feedback (complaint_id,rating,comment) SELECT id,?,? FROM complaints WHERE id=? AND student_id=? AND status='Resolved'",
    [rating, req.body.comment || '', req.params.id, req.user.id]);
  if (!affectedRows) return res.status(400).json({ error: 'Feedback can only be left on your own resolved complaints.' });
  res.status(201).json(await one(req.params.id));
});

export default r;
