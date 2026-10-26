import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q, syncRole } from '../db.js';
import { sign, requireAuth } from '../auth.js';

const r = Router();
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

r.post('/register', async (req, res) => {
  const { name, email, password, role = 'Student', department } = req.body;
  if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (!['Student', 'Officer'].includes(role)) return res.status(400).json({ error: 'Admin accounts are provisioned by an administrator.' });
  const hash = await bcrypt.hash(password, 10);
  const { insertId } = await q('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', [name.trim(), email.trim(), hash, role]);
  await syncRole(insertId, role, department);
  res.status(201).json({ ok: true });
});

r.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  const [u] = await q('SELECT * FROM users WHERE email=?', [(email || '').trim()]);
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) return res.status(401).json({ error: 'Incorrect email or password.' });
  if (role && u.role.toLowerCase() !== role.toLowerCase()) return res.status(403).json({ error: `This account is registered as ${u.role}, not ${role}.` });
  res.json({ token: sign(u), user: pub(u) });
});

r.get('/me', requireAuth, async (req, res) => {
  const [u] = await q('SELECT id,name,email,role FROM users WHERE id=?', [req.user.id]);
  u ? res.json(u) : res.status(401).json({ error: 'Account no longer exists.' });
});

export default r;
