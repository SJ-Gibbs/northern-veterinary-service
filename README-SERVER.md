# Northern Veterinary Service — Node.js backend

This app serves the static site in `deploy/` and JSON APIs under `/api` using **Express**, **MySQL**, and **bcrypt** + **cookie sessions** (stored in MySQL).

## Quick start (local)

1. **Create a MySQL database** and import the schema:
   ```bash
   mysql -u USER -p DB_NAME < sql/schema.sql
   ```
2. **Copy environment** and edit credentials:
   ```bash
   cp .env.example .env
   ```
3. **Install and seed the master admin** (uses `SEED_ADMIN_PASSWORD` or a default; change it in production):
   ```bash
   npm install
   SEED_ADMIN_PASSWORD='YourStrongPassword' node server/seed.js
   ```
4. **Run the server**:
   ```bash
   npm start
   ```
5. Open **http://localhost:3000** (or the `PORT` you set).

`MASTER_ADMIN_EMAIL` in `.env` should match the seed email (default `info@northernveterinaryservice.co.uk`).

## Hostinger

- **Node.js Web App**: set start command to `node server/app.js` (or `npm start` if the working directory is the app root).
- **Environment variables**: set `DB_*`, `SESSION_SECRET`, `PORT`, `NODE_ENV=production`, `TRUST_PROXY=true`, and production SMTP if you add mail later.
- **MySQL**: use the values from hPanel; `DB_HOST` is often the internal hostname shown there.
- **File uploads** live in `uploads/` (gitignored in production workflows—ensure the directory is writable and backed up with the DB).

## API overview

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/login` | JSON `{ email, password }` |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | Current profile |
| POST | `/api/auth/register` | Self-signup; disable with `ALLOW_PUBLIC_SIGNUP=false` |
| PATCH | `/api/account/update` | Profile, address, services, base64 profile photo |
| POST | `/api/account/password` | Change password |
| GET | `/api/admin/users` | Admin only |
| ... | other `/api/admin/*` | See `server/routes/admin.js` |
| POST | `/api/bookings` | `multipart/form-data` (same field names as `deploy/booking.html`) |
| GET | `/api/bookings/inbox` | Team + master |
| GET | `/api/calendar/member-month` | `?year=2025&month=0` (month 0–11) |
| ... | site/staff calendar | See `server/routes/calendar.js` |

## Front end

The previous `localStorage` demo in `auth.js` has been replaced with `fetch` + session cookies. Running **only** the static `deploy/` folder on a file host without the Node app will not persist accounts; run both together (or a reverse proxy to Node).
