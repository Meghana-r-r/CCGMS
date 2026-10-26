import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q, syncRole } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const r = Router();
const admin = [requireAuth, requireRole('Admin')];

// Departments are public: the registration form needs them before sign-in.
r.get('/departments', async (_req, res) => res.json(await q('SELECT id,name FROM departments ORDER BY id')));

// Categories
r.get('/categories', requireAuth, async (_req, res) => res.json(await q('SELECT id,name FROM categories ORDER BY id')));
r.post('/categories', ...admin, async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Enter a category name.' });
  await q('INSERT INTO categories (name) VALUES (?)', [name]);
  res.status(201).json({ ok: true });
});
r.delete('/categories/:id', ...admin, async (req, res) => {
  await q('DELETE FROM categories WHERE id=?', [req.params.id]); // blocked by FK if complaints use it
  res.json({ ok: true });
});

// Users & officers (admin)
r.get('/users', ...admin, async (_req, res) =>
  res.json(await q(`SELECT u.id,u.name,u.email,u.role,d.name AS dept FROM users u
    LEFT JOIN officers o ON o.user_id=u.id LEFT JOIN departments d ON d.id=o.department_id ORDER BY u.id`)));
r.post('/users', ...admin, async (req, res) => {
  const { name, email, role, department, password } = req.body;
  if (!name?.trim() || !email?.trim() || !['Student', 'Officer', 'Admin'].includes(role)) return res.status(400).json({ error: 'Name, email and a valid role are required.' });
  const hash = await bcrypt.hash(password || 'ChangeMe123', 10);
  const { insertId } = await q('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', [name.trim(), email.trim(), hash, role]);
  await syncRole(insertId, role, department);
  res.status(201).json({ id: insertId });
});
r.put('/users/:id', ...admin, async (req, res) => {
  const { name, email, role, department, password } = req.body;
  if (!name?.trim() || !email?.trim() || !['Student', 'Officer', 'Admin'].includes(role)) return res.status(400).json({ error: 'Name, email and a valid role are required.' });
  await q('UPDATE users SET name=?, email=?, role=? WHERE id=?', [name.trim(), email.trim(), role, req.params.id]);
  if (password) await q('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(password, 10), req.params.id]);
  await syncRole(req.params.id, role, department);
  res.json({ ok: true });
});
r.delete('/users/:id', ...admin, async (req, res) => {
  if (+req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  await q('DELETE FROM users WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// Analytics (admin)
r.get('/stats', ...admin, async (_req, res) => {
  const [byCategory, byStatus] = await Promise.all([
    q('SELECT cat.name AS label, COUNT(c.id) AS value FROM categories cat LEFT JOIN complaints c ON c.category_id=cat.id GROUP BY cat.id ORDER BY cat.id'),
    q('SELECT status AS label, COUNT(*) AS value FROM complaints GROUP BY status'),
  ]);
  res.json({ byCategory, byStatus });
});

// Notifications for the signed-in user
r.get('/notifications', requireAuth, async (req, res) =>
  res.json(await q('SELECT id,complaint_id,message,is_read,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 30', [req.user.id])));
r.post('/notifications/read', requireAuth, async (req, res) => {
  await q('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
  res.json({ ok: true });
});

export default r;
