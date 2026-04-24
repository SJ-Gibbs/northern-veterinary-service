# Northern Veterinary Service — replit.md

## Overview

Northern Veterinary Service is a professional website for a peripatetic veterinary surgery company operating across Northern England. It provides:

- A public-facing marketing site with case stories, team profiles, pricing, and policies
- A user authentication and account system (login, signup, profile management)
- A booking/advice request system with an interactive calendar
- A staff diary and availability management system
- An admin dashboard for managing users and bookings
- A site-wide access gate (username/password) for protecting the full site during development/private operation

The project is structured as an **Express (Node.js) backend** serving a **static HTML/CSS/JS frontend** from the `public/` directory, with a **MySQL database** for persistent storage.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend Architecture

- **Pure static HTML/CSS/JS** — no frontend framework (React, Vue, etc.)
- All pages live in `public/` and are served as static files by Express
- Shared CSS in `public/style.css` plus `public/grid-gallery.css` for the gallery grid
- Per-feature JavaScript files:
  - `auth.js` — API-backed login/signup/session state, renders user dropdown
  - `index.js` — mobile menu, form validation, scroll animations
  - `booking.js` — interactive calendar and booking form logic
  - `booking-diary.js` — shared diary state (localStorage overrides + demo rules)
  - `booking-requests.js` — localStorage persistence for booking submissions (legacy)
  - `casestories.js` — lightbox/image gallery for case stories
  - `diary-admin.js` — master admin diary override calendar
  - `staff-diary.js` — team member personal availability calendar
  - `hero-banner.js` — alternating hero banner animation
  - `site-gate.js` — site-wide sessionStorage access gate

### Two-Layer Access Control

1. **Site Gate** (`site-gate.js` + `enter.html`): A simple username/password (`vet`/`vet`) stored in `sessionStorage`. Redirects unauthenticated users away from all internal pages. This is a lightweight "soft lock" for the whole site.
2. **User Authentication** (Express session + MySQL): Full user accounts with bcrypt password hashing. Sessions stored in MySQL via `express-mysql-session`. Roles: `admin`, `master admin`, `team_member`, `member_practice`.

### Backend Architecture

- **Framework**: Express.js (`server/app.js`)
- **Entry point**: `node server/app.js` (or `npm start`)
- **Static files**: Express serves `public/` as the root and `uploads/` for user-uploaded files
- **Session storage**: MySQL-backed sessions (`express-mysql-session`)
- **Password hashing**: `bcrypt` with 12 rounds
- **File uploads**: `multer` for booking attachments and profile photos (stored in `uploads/`)
- **Environment config**: `dotenv` (`.env` file with DB credentials, session secret, etc.)

**Route structure:**

| Route module | Path prefix | Purpose |
|---|---|---|
| `auth.js` | `/api/auth` | Login, logout, register, current user |
| `account.js` | `/api/account` | Profile update, password change |
| `admin.js` | `/api/admin` | Admin-only user management |
| `bookings.js` | `/api/bookings` | Submit bookings, view inbox |
| `calendar.js` | `/api/calendar` | Member-practice and staff calendar |

### Database

- **MySQL** via `mysql2/promise` connection pool
- Schema defined in `sql/schema.sql` (not shown but referenced in README)
- Key tables:
  - `users` — accounts with role, account_type, is_admin, is_active flags
  - `addresses` — one-to-one with users
  - `user_services` — many services per user (service codes)
  - `sessions` — auto-created by `express-mysql-session`
  - `site_calendar_overrides` — admin overrides for calendar availability
  - `staff_availability` — per-staff per-day availability
  - Bookings table (referenced in routes)

### Admin and Role System

- **Master admin**: identified by `MASTER_ADMIN_EMAIL` env var + `is_admin=1`; has full access
- **Admin**: `is_admin=1`; can manage users, view all bookings
- **Team member**: `account_type='team_member'`; can set personal availability, view inbox
- **Member practice**: standard authenticated user; can book services, see pricing

### Middleware

- `requireAuth` — checks `req.session.userId`
- `requireAdmin` — checks `req.session.isAdmin`
- `requireMasterAdmin` — checks `req.session.isMasterAdmin`

### Services Catalog

A shared list of offerable veterinary service codes is defined in both `server/lib/services-catalog.js` (backend) and `public/auth.js` (frontend) to keep them in sync. Services include orthopaedic, soft tissue, minimally invasive, diagnostic, and locum categories.

### Profile Photos

Uploaded as base64 data URLs from the frontend, decoded server-side, and saved to `uploads/profiles/`. URLs served back via `/uploads/` static route.

---

## External Dependencies

### npm Packages

| Package | Purpose |
|---|---|
| `express` | Web server and routing |
| `mysql2` | MySQL driver (promise-based pool) |
| `express-session` | Cookie-based session management |
| `express-mysql-session` | MySQL session store |
| `bcrypt` | Password hashing |
| `multer` | File upload handling (booking attachments, profile photos) |
| `dotenv` | Environment variable loading |

### Database

- **MySQL** (compatible with Hostinger's MySQL offering)
- Connection configured via environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### Deployment Target

- **Hostinger Node.js Web App** (primary production target)
- Start command: `node server/app.js`
- Requires: `DB_*`, `SESSION_SECRET`, `PORT`, `NODE_ENV=production`, `TRUST_PROXY=true`

### Environment Variables Required

```
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
SESSION_SECRET=
PORT=3000
NODE_ENV=production
TRUST_PROXY=true
MASTER_ADMIN_EMAIL=info@northernveterinaryservice.co.uk
SEED_ADMIN_PASSWORD=
ALLOW_PUBLIC_SIGNUP=true   # set false to disable self-signup
```

### No External Third-Party APIs Currently

No payment processors, external email services, or mapping APIs are integrated at this time (the README mentions SMTP as a future addition for mail).