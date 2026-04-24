'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool } = require('./db');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const adminRoutes = require('./routes/admin');
const bookingsRoutes = require('./routes/bookings');
const calendarRoutes = require('./routes/calendar');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const sessionStoreOptions = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
};

const sessionStore = new MySQLStore(sessionStoreOptions);

const app = express();
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

app.use(
    session({
        key: 'nvs.sid',
        secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        }
    })
);

// Team signup sends base64 profile photos; global limit must be >= register route (see server/routes/auth.js).
const JSON_BODY_LIMIT = '6mb';
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

// Uploaded files (profile photos, booking attachments)
app.use('/uploads', express.static(UPLOADS_DIR));

// API
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/calendar', calendarRoutes);

app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'northern-vet-api' });
});

// Static site
app.use(express.static(PUBLIC_DIR, { index: ['index.html', 'home.html'] }));

// SPA-ish: no API fallthrough to index for missing API (already handled)
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    return res.status(404).send('Not found');
});

app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) {
        return next(err);
    }
    const status = Number(err.status || err.statusCode) || 500;
    if (status === 413) {
        return res.status(413).json({
            success: false,
            message: 'Request too large. Try a smaller profile photo or fewer fields.'
        });
    }
    res.status(status >= 400 && status < 600 ? status : 500).json({
        success: false,
        message: status === 500 ? 'Server error' : err.message || 'Request failed.'
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Northern Vets API + static on http://localhost:${PORT}`);
    });
}

module.exports = { app, pool };
