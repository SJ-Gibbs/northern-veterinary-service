'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { getProfileById, setUserServices } = require('../lib/profile');
const { masterEmail } = require('../lib/user-mapper');
const {
    isValidEmail,
    validateRcvsRegistrationNumber,
    validatePhoneNumber,
    normalizeRole
} = require('../lib/validators');
const { OFFERABLE_SERVICE_IDS } = require('../lib/services-catalog');

const router = express.Router();
const BCRYPT_ROUNDS = 12;

// 5 failed login attempts per IP per 24 hours.
// Successful logins (2xx) are not counted so legitimate users are not penalised.
const loginRateLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many failed login attempts. Please try again in 24 hours.' }
});
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

function allowPublicSignup() {
    return process.env.ALLOW_PUBLIC_SIGNUP !== 'false';
}

function writeProfilePhotoFromDataUrl(userId, dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        return null;
    }
    const m = dataUrl.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
    if (!m) return null;
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 2.5 * 1024 * 1024) {
        const err = new Error('Image too large');
        err.status = 400;
        throw err;
    }
    const ext = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg';
    const rel = `/uploads/profiles/${userId}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const dest = path.join(UPLOAD_ROOT, 'profiles', path.basename(rel));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return rel;
}

function setSessionForUser(req, userRow) {
    const emailL = (userRow.email || '').toLowerCase();
    req.session.userId = userRow.id;
    req.session.isAdmin = !!userRow.is_admin;
    req.session.isMasterAdmin = !!userRow.is_admin && emailL === masterEmail();
    req.session.userEmail = userRow.email;
}

router.post('/login', loginRateLimiter, express.json(), async (req, res) => {
    try {
        const email = (req.body.email || '').trim();
        const password = req.body.password || '';
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required.' });
        }
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE LOWER(email) = LOWER(:e) LIMIT 1',
            { e: email }
        );
        if (!rows.length) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
        const user = rows[0];
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
        if (!user.is_admin && !user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'This account has been deactivated. Please contact support.'
            });
        }
        setSessionForUser(req, user);
        const profile = await getProfileById(pool, user.id, req);
        return res.json({ success: true, message: 'Login successful', user: profile });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Could not log out.' });
        }
        res.clearCookie('nvs.sid');
        return res.json({ success: true, message: 'Logged out.' });
    });
});

/**
 * Site access gate — validates the shared site credentials stored in .env.
 * No DB hit; purely env-var comparison.  The client stores a sessionStorage
 * flag on success so subsequent page loads bypass this check.
 */
router.post('/site-gate', express.json(), (req, res) => {
    const { username, password } = req.body || {};
    const expectedUser = (process.env.SITE_GATE_USER || '').trim();
    const expectedPass = (process.env.SITE_GATE_PASS || '').trim();

    if (!expectedUser || !expectedPass) {
        return res
            .status(503)
            .json({ success: false, message: 'Site gate is not configured on this server.' });
    }
    if (username === expectedUser && password === expectedPass) {
        return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: 'Those details are not correct. Please try again.' });
});

router.get('/me', async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ success: false, message: 'Not logged in.' });
        }
        const profile = await getProfileById(pool, req.session.userId, req);
        if (!profile) {
            req.session.destroy();
            return res.status(401).json({ success: false, message: 'Session invalid.' });
        }
        return res.json({
            success: true,
            user: profile,
            masterAdminEmail: masterEmail()
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/register', express.json({ limit: '4mb' }), async (req, res) => {
    if (!allowPublicSignup()) {
        return res.status(403).json({
            success: false,
            message: 'Self-registration is disabled. Contact the practice administrator.'
        });
    }
    try {
        const body = req.body || {};
        const accountType = body.accountType === 'practice' ? 'practice' : 'team_member';
        let email = (body.email || '').trim();
        const confirmEmail = (body.confirmEmail || '').trim();
        const password = body.password || '';
        const practiceName = (body.practiceName || '').trim();
        const phone = (body.phone || '').trim();
        const address = body.address || {};
        const rcvsRegistrationNumber = body.rcvsRegistrationNumber;
        const profilePhotoDataUrl = body.profilePhotoDataUrl;

        if (confirmEmail && email.toLowerCase() !== confirmEmail.toLowerCase()) {
            return res.status(400).json({ success: false, message: 'Email addresses do not match.' });
        }
        if (!confirmEmail) {
            return res.status(400).json({ success: false, message: 'Please confirm your email address.' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }

        const rcvsCheck = validateRcvsRegistrationNumber(rcvsRegistrationNumber);
        if (!rcvsCheck.ok) {
            return res.status(400).json({ success: false, message: rcvsCheck.message });
        }

        const phCheck = validatePhoneNumber(phone);
        if (!phCheck.ok) {
            return res.status(400).json({ success: false, message: phCheck.message });
        }

        let role = normalizeRole(body.role);
        if (accountType === 'practice') {
            role = 'practice';
        } else {
            if (!['vet', 'veterinary_nurse'].includes(role)) {
                return res.status(400).json({ success: false, message: 'Select a valid role (Vet or Veterinary Nurse).' });
            }
        }

        if (accountType === 'team_member') {
            if (!profilePhotoDataUrl) {
                return res.status(400).json({ success: false, message: 'A profile photo is required.' });
            }
        }

        const [dup] = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER(:e) LIMIT 1', {
            e: email
        });
        if (dup.length) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const conn = await pool.getConnection();
        let newId;
        try {
            await conn.beginTransaction();
            const [r] = await conn.query(
                `INSERT INTO users
                (email, password_hash, practice_name, account_type, role, phone, rcvs_registration_number,
                 is_admin, is_active)
                VALUES
                (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
                [email, password_hash, practiceName, accountType, role, phCheck.value, rcvsCheck.value]
            );
            newId = r.insertId;
            await conn.query(
                `INSERT INTO addresses (user_id, line1, line2, city, county, postcode)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    newId,
                    (address.line1 || '').trim(),
                    (address.line2 || '').trim(),
                    (address.city || '').trim(),
                    (address.county || '').trim(),
                    (address.postcode || '').trim()
                ]
            );
            if (accountType === 'team_member') {
                for (const code of OFFERABLE_SERVICE_IDS) {
                    await conn.query('INSERT INTO user_services (user_id, service_code) VALUES (?, ?)', [
                        newId,
                        code
                    ]);
                }
            }
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }

        if (accountType === 'team_member' && profilePhotoDataUrl) {
            try {
                const rel = writeProfilePhotoFromDataUrl(newId, profilePhotoDataUrl);
                if (rel) {
                    await pool.query('UPDATE users SET profile_photo_path = ? WHERE id = ?', [rel, newId]);
                } else {
                    await pool.query('DELETE FROM user_services WHERE user_id = ?', [newId]);
                    await pool.query('DELETE FROM addresses WHERE user_id = ?', [newId]);
                    await pool.query('DELETE FROM users WHERE id = ?', [newId]);
                    return res
                        .status(400)
                        .json({ success: false, message: 'Invalid profile photo. Please upload a valid image.' });
                }
            } catch (e) {
                if (e.status === 400) {
                    return res.status(400).json({ success: false, message: e.message || 'Image too large.' });
                }
                throw e;
            }
        }

        return res.json({ success: true, message: 'Account created successfully.' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

module.exports = router;
