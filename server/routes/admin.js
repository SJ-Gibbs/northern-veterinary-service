'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { getProfileById } = require('../lib/profile');
const {
    isValidEmail,
    validateRcvsRegistrationNumber,
    validatePhoneNumber
} = require('../lib/validators');

const router = express.Router();
const BCRYPT_ROUNDS = 12;

/** List all member users (non-admin or all with flag) for admin table */
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id, u.email, u.practice_name, u.account_type, u.role, u.phone, u.rcvs_registration_number,
              u.is_admin, u.is_active, u.created_at,
              a.line1 AS addr_line1, a.line2 AS addr_line2, a.city AS addr_city, a.county AS addr_county, a.postcode AS addr_postcode
            FROM users u
            LEFT JOIN addresses a ON a.user_id = u.id
            ORDER BY u.practice_name ASC`
        );
        const base = (req.protocol || 'http') + '://' + (req.get('host') || 'localhost');
        const list = rows.map(r => {
            const rel = r.profile_photo_path;
            return {
                id: String(r.id),
                email: r.email,
                practiceName: r.practice_name,
                accountType: r.account_type,
                role: r.role,
                phone: r.phone || '',
                rcvsRegistrationNumber: r.rcvs_registration_number || '',
                isAdmin: !!r.is_admin,
                isActive: !!r.is_active,
                createdAt: r.created_at,
                address: {
                    line1: r.addr_line1 || '',
                    line2: r.addr_line2 || '',
                    city: r.addr_city || '',
                    county: r.addr_county || '',
                    postcode: r.addr_postcode || ''
                }
            };
        });
        return res.json({ success: true, users: list });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.patch('/users/:id', requireAdmin, express.json(), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) {
            return res.status(400).json({ success: false, message: 'Invalid id.' });
        }
        const [trg] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (!trg.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (trg[0].is_admin) {
            return res.status(400).json({ success: false, message: 'Cannot edit admin accounts here.' });
        }
        const body = req.body || {};
        if (body.email !== undefined) {
            const c = body.confirmEmail;
            if (c === undefined) {
                return res.status(400).json({ success: false, message: 'Email confirmation required.' });
            }
            if (String(body.email).trim().toLowerCase() !== String(c).trim().toLowerCase()) {
                return res.status(400).json({ success: false, message: 'Email addresses do not match.' });
            }
        }

        const u = trg[0];
        let nextEmail = u.email;
        let nextPractice = u.practice_name;
        let nextPhone = u.phone;
        let nextRcvs = u.rcvs_registration_number;

        if (body.practiceName !== undefined) {
            nextPractice = String(body.practiceName).trim();
        }
        if (body.email !== undefined) {
            const newEmail = String(body.email).trim();
            if (newEmail !== u.email) {
                if (!isValidEmail(newEmail)) {
                    return res.status(400).json({ success: false, message: 'Invalid email address.' });
                }
                const [ex] = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ?', [
                    newEmail,
                    id
                ]);
                if (ex.length) {
                    return res.status(400).json({ success: false, message: 'Email already in use by another account.' });
                }
            }
            nextEmail = String(body.email).trim();
        }
        if (body.phone !== undefined) {
            const ph = validatePhoneNumber(body.phone);
            if (u.account_type === 'practice' || u.account_type === 'team_member') {
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
            if (u.account_type === 'practice' || u.account_type === 'team_member') {
                if (!rc.ok) {
                    return res.status(400).json({ success: false, message: rc.message });
                }
                nextRcvs = rc.value;
            } else {
                nextRcvs = String(body.rcvsRegistrationNumber || '');
            }
        }

        await pool.query(
            'UPDATE users SET email=?, practice_name=?, phone=?, rcvs_registration_number=? WHERE id=?',
            [nextEmail, nextPractice, nextPhone, nextRcvs, id]
        );

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
                    id
                ]
            );
        }

        return res.json({ success: true, message: 'Practice details updated.' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/users/:id/active', requireAdmin, express.json(), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const isActive = !!req.body.isActive;
        const [trg] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [id]);
        if (!trg.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (trg[0].is_admin) {
            return res.status(400).json({ success: false, message: 'Cannot change admin account status here.' });
        }
        await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
        return res.json({ success: true, message: `Account ${isActive ? 'activated' : 'deactivated'} successfully.` });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const [trg] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [id]);
        if (!trg.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (trg[0].is_admin) {
            return res.status(400).json({ success: false, message: 'Cannot delete admin accounts.' });
        }
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Practice account deleted.' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/users/:id/reset-password', requireAdmin, express.json(), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const newPassword = (req.body.newPassword || '').toString();
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }
        const [trg] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [id]);
        if (!trg.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (trg[0].is_admin) {
            return res.status(400).json({ success: false, message: 'Cannot reset admin password here.' });
        }
        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
        return res.json({ success: true, message: 'Password reset successfully.' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/** Admin-created user (e.g. practice) — no self-confirm for email if admin sets both */
router.post('/users', requireAdmin, express.json(), async (req, res) => {
    try {
        const b = req.body || {};
        const accountType = b.accountType === 'team_member' ? 'team_member' : 'practice';
        const email = (b.email || '').trim();
        const password = (b.password || '').toString();
        const practiceName = (b.practiceName || '').trim();
        const phone = (b.phone || '').trim();
        const address = b.address || {};
        const role =
            accountType === 'practice' ? 'practice' : normalizeAdminRole(b.role) || 'vet';
        if (!isValidEmail(email) || !practiceName) {
            return res.status(400).json({ success: false, message: 'Valid email and practice name required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }
        const rc = validateRcvsRegistrationNumber(b.rcvsRegistrationNumber);
        if (!rc.ok) {
            return res.status(400).json({ success: false, message: rc.message });
        }
        const ph = validatePhoneNumber(phone);
        if (!ph.ok) {
            return res.status(400).json({ success: false, message: ph.message });
        }
        const [ex] = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        if (ex.length) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const conn = await pool.getConnection();
        let newId;
        try {
            await conn.beginTransaction();
            const [r] = await conn.query(
                `INSERT INTO users
                (email, password_hash, practice_name, account_type, role, phone, rcvs_registration_number, is_admin, is_active, email_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 1)`,
                [email, hash, practiceName, accountType, role, ph.value, rc.value]
            );
            newId = r.insertId;
            await conn.query(
                `INSERT INTO addresses (user_id, line1, line2, city, county, postcode) VALUES (?,?,?,?,?,?)`,
                [
                    newId,
                    (address.line1 || '').trim(),
                    (address.line2 || '').trim(),
                    (address.city || '').trim(),
                    (address.county || '').trim(),
                    (address.postcode || '').trim()
                ]
            );
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
        return res.json({ success: true, message: 'User created.', id: String(newId) });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

function normalizeAdminRole(r) {
    if (!r) return '';
    const s = String(r).toLowerCase();
    if (s === 'vet' || s === 'veterinary_nurse') return s;
    return 'vet';
}

module.exports = router;
