import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ccgms',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // DATE/TIMESTAMP columns come back as plain strings
});

// q(sql, params) -> rows (SELECT) or ResultSetHeader (INSERT/UPDATE/DELETE)
export const q = async (sql, params = []) => (await pool.query(sql, params))[0];

// Create the role-specific row that goes with a users row.
export async function syncRole(id, role, dept) {
  await q('DELETE FROM officers WHERE user_id=?', [id]);
  await q('DELETE FROM students WHERE user_id=?', [id]);
  if (role === 'Officer')
    await q('INSERT INTO officers (user_id, department_id) VALUES (?, (SELECT id FROM departments WHERE name=? LIMIT 1))', [id, dept || '']);
  if (role === 'Student') await q('INSERT INTO students (user_id) VALUES (?)', [id]);
}
