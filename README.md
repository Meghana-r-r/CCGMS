# CCGMS — College Complaint & Grievance Management System

Full-stack version of the CCGMS prototype: **React** frontend, **Node/Express** REST API (JWT + bcrypt),
and a **MySQL** database using the 10-table schema from the SRS.

```
ccgms/
├── database/   schema.sql (10 tables) + seed.sql (demo data)
├── backend/    Express API  → http://localhost:5000
└── frontend/   React + Vite → http://localhost:5173
```

## Requirements
Node.js 18+ and MySQL 8+ (or MariaDB 10.5+).

## Setup

**1. Database**
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
# recommended: a dedicated user instead of root
mysql -u root -p -e "CREATE USER 'ccgms'@'localhost' IDENTIFIED BY 'choose_a_password'; GRANT ALL ON ccgms.* TO 'ccgms'@'localhost';"
```
> `schema.sql` drops and recreates the tables, so re-running it resets all data.

**2. Backend**
```bash
cd backend
cp .env.example .env      # then set DB_USER, DB_PASSWORD and a long random JWT_SECRET
npm install
npm run dev               # or: npm start
```

**3. Frontend** (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. In dev, Vite proxies `/api` to the backend. For a production build run
`npm run build` and set `VITE_API_URL` to your API's public URL (and `CLIENT_ORIGIN` in the backend `.env`).

## Demo accounts
All use the password **`password123`**.

| Role    | Email                      |
|---------|----------------------------|
| Student | asha.rao@college.edu       |
| Student | kiran.patel@college.edu    |
| Officer | r.menon@college.edu        |
| Officer | d.nair@college.edu         |
| Officer | s.ahmed@college.edu        |
| Admin   | n.iyer@college.edu         |

## What each role can do
- **Student** — register, sign in, submit complaints, track status history, leave feedback (1–5 ★) on resolved ones.
- **Officer** — accept complaints from the shared unassigned queue, update status on their own, add remarks.
- **Admin** — edit/reassign/delete any complaint, add/edit/delete users and officers, manage categories, view analytics.

## API overview (all under `/api`, JWT in `Authorization: Bearer <token>`)
| Method & path | Who | Purpose |
|---|---|---|
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | public / any | Accounts & session |
| `GET /departments` | public | Registration dropdown |
| `GET /complaints` | any | Scoped by role (own / own + unassigned / all) |
| `POST /complaints` | Student | File a complaint |
| `POST /complaints/:id/accept` | Officer | Claim an unassigned complaint |
| `PATCH /complaints/:id/status` | Officer (owner) | Update status + remark |
| `PATCH /complaints/:id`, `DELETE /complaints/:id` | Admin | Edit / reassign / delete |
| `POST /complaints/:id/feedback` | Student (owner) | Feedback on resolved complaint |
| `GET/POST/DELETE /categories` | any / Admin | Category list & management |
| `GET/POST/PUT/DELETE /users` | Admin | People management |
| `GET /stats` | Admin | Counts by category and status |
| `GET /notifications`, `POST /notifications/read` | any | In-app notifications (API only) |

## Notes
- Complaint numbers display as `CMP-<id>`; new ones continue from the highest seeded ID (`CMP-1043`…).
- Every status change writes a row to `complaint_status_history` and notifies the student (`notifications`).
  The notification API is ready; the UI does not display them yet.
- The prototype's attachment dropzone and roll-number field were not carried over — they were placeholders
  and the SRS schema has no attachments table.
- Change `JWT_SECRET` and the demo passwords before any real deployment.
