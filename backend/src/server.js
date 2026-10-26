import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import auth from './routes/auth.js';
import complaints from './routes/complaints.js';
import misc from './routes/misc.js';
import files from './routes/files.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/files', files);
app.use('/api/complaints', complaints);
app.use('/api', misc);

app.use((err, _req, res, _next) => {
  const known = {
    ER_DUP_ENTRY: [409, 'That already exists (for example a duplicate email, category name, or feedback entry).'],
    ER_ROW_IS_REFERENCED_2: [409, 'This item is still in use by other records.'],
  };
  const upload = {
    LIMIT_FILE_SIZE: 'One of the files is too big (max 50 MB each).',
    LIMIT_FILE_COUNT: 'You can attach at most 5 files.',
    LIMIT_UNEXPECTED_FILE: 'You can attach at most 5 files.',
  };
  if (upload[err.code]) return res.status(400).json({ error: upload[err.code] });
  if (err.status === 400 && err.message) return res.status(400).json({ error: err.message });
  const [status, error] = known[err.code] || [500, 'Something went wrong on the server.'];
  if (status === 500) console.error(err);
  res.status(status).json({ error });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`CCGMS API listening on http://localhost:${port}`));
