'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getProfileById, setUserServices } = require('../lib/profile');
const {
    isValidEmail,
    validateRcvsRegistrationNumber,
    validatePhoneNumber
} = require('../lib/validators');

const router = express.Router();
const BCRYPT_ROUNDS = 12;
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

function safeUnlinkProfileAbs(storedPath) {
    if (!storedPath) return;
    const rel = storedPath.replace(/^\//, '');
    const full = path.join(UPLOAD_ROOT, rel.replace(/^uploads\/?/, ''));
    try {
        if (fs.existsSync(full)) fs.unlinkSync(full);
    } catch (e) {
        /* ignore */
    }
}

function writeProfilePhotoFromDataUrl(userId, dataUrl) {
    if (dataUrl === null || dataUrl === '') {
        return 'CLEAR';
    }
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        return null;
    }
    const m = dataUrl.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
    if (!m) return null;
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 2.5 * 1024 * 1024) {
        const err = new Error('Image is too large after processing.');
        err.status = 400;
        throw err;
    }
    const ext = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg';
    const name = `${userId}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const rel = `/uploads/profiles/${name}`;
    const dest = path.join(UPLOAD_ROOT, 'profiles', name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return rel;
}

router.get('/me', requireAuth, async (req, res) => {
    try {
        const profile = await getProfileById(pool, req.session.userId, req);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.json({ success: true, user: profile });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.patch('/update', requireAuth, express.json({ limit: '4mb' }), async (req, res) => {
    try {
        const userId = req.session.userId;
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const u = rows[0];
        const body = req.body || {};

        let nextEmail = u.email;
        let nextPractice = u.practice_name;
        let nextPhone = u.phone;
        let nextRcvs = u.rcvs_registration_number;
        let nextPhotoPath = u.profile_photo_path;

        if (body.email !== undefined) {
            const c = body.confirmEmail;
            if (c === undefined || c === null) {
                return res.status(400).json({ success: false, message: 'Please confirm your email address.' });
            }
            if (String(body.email).trim().toLowerCase() !== String(c).trim().toLowerCase()) {
                return res.status(400).json({ success: false, message: 'Email addresses do not match.' });
            }
            const newEmail = String(body.email).trim();
            if (newEmail !== u.email) {
                if (!isValidEmail(newEmail)) {
                    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
                }
                const [ex] = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ?', [
                    newEmail,
                    userId
                ]);
                if (ex.length) {
                    return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
                }
            }
            nextEmail = newEmail;
        }

        if (body.practiceName !== undefined) {
            nextPractice = String(body.practiceName).trim();
        }

        if (body.phone !== undefined) {
            const ph = validatePhoneNumber(body.phone);
            if (!u.is_admin && (u.account_type === 'practice' || u.account_type === 'team_member')) {
                if (!ph.ok) {
                    return res.status(400).json({ success: false, message: ph.message });
                }
                nextPhone = ph.value;
            } else {
                nextPhone = String(body.phone || '');
            }
        }

        if (body.rcvsRegistrationNumber !== undefined) {
            const rc = validateRcvsRegistrationNumber(body.rcvsRegistrationNumber);
            if (!u.is_admin && (u.account_type === 'practice' || u.account_type === 'team_member')) {
                if (!rc.ok) {
                    return res.status(400).json({ success: false, message: rc.message });
                }
                nextRcvs = rc.value;
            } else {
                nextRcvs = String(body.rcvsRegistrationNumber || '');
            }
        }

        if (body.address && typeof body.address === 'object') {
            const a = body.address;
            await pool.query(
                `UPDATE addresses SET line1=?, line2=?, city=?, county=?, postcode=? WHERE user_id=?`,
                [
                    (a.line1 || '').trim(),
                    (a.line2 || '').trim(),
                    (a.city || '').trim(),
                    (a.county || '').trim(),
                    (a.postcode || '').trim(),
                    userId
                ]
            );
        }

        if (Array.isArray(body.servicesOffered)) {
            if (u.account_type !== 'team_member' || u.is_admin) {
                return res.status(400).json({ success: false, message: 'Only team members can update offered services.' });
            }
            await setUserServices(pool, userId, body.servicesOffered);
        }

        if (body.profilePhotoDataUrl !== undefined) {
            const v = body.profilePhotoDataUrl;
            if (v === null || v === '') {
                safeUnlinkProfileAbs(u.profile_photo_path);
                nextPhotoPath = null;
            } else {
                const rel = writeProfilePhotoFromDataUrl(userId, v);
                if (rel === 'CLEAR') {
                    safeUnlinkProfileAbs(u.profile_photo_path);
                    nextPhotoPath = null;
                } else if (rel) {
                    safeUnlinkProfileAbs(u.profile_photo_path);
                    nextPhotoPath = rel;
                } else {
                    return res.status(400).json({ success: false, message: 'Invalid profile photo.' });
                }
            }
        }

        await pool.query(
            `UPDATE users SET email=?, practice_name=?, phone=?, rcvs_registration_number=?, profile_photo_path=? WHERE id=?`,
            [nextEmail, nextPractice, nextPhone, nextRcvs, nextPhotoPath, userId]
        );

        const profile = await getProfileById(pool, userId, req);
        return res.json({ success: true, message: 'Profile updated successfully.', user: profile });
    } catch (e) {
        if (e.status === 400) {
            return res.status(400).json({ success: false, message: e.message });
        }
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/password', requireAuth, express.json(), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password required.' });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
        }
        const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.session.userId]);
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!ok) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }
        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.session.userId]);
        return res.json({ success: true, message: 'Password changed successfully!' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
