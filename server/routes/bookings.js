'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getProfileById } = require('../lib/profile');

const router = express.Router();
const UPLOAD_TMP = path.join(__dirname, '..', '..', 'uploads', 'bookings');
const upload = multer({
    dest: UPLOAD_TMP,
    limits: { fileSize: 15 * 1024 * 1024 }
});

router.post('/', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const userId = req.session.userId;
        const b = req.body || {};
        const serviceRequired = (b.servicerequired || '').toString();
        const locumRole = (b.locumRole || '').toString() || null;
        const procedureName = (b.procedureNameIfKnown || '').toString().trim() || null;
        const history = (b.History || '').toString();
        const preferredDate = (b.preferredDate || '').toString().trim();
        const preferredDates = (b.preferredDates || '').toString().trim();

        if (!serviceRequired) {
            return res.status(400).json({ success: false, message: 'Service required.' });
        }
        if (!history || history.length < 10) {
            return res.status(400).json({ success: false, message: 'Please provide more detail in history.' });
        }

        const dates = [];
        if (preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
            dates.push(preferredDate);
        }
        if (preferredDates) {
            preferredDates.split(',').forEach(s => {
                const t = s.trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(t)) dates.push(t);
            });
        }
        const uniqueDates = [...new Set(dates)];

        const conn = await pool.getConnection();
        let bookingId;
        try {
            await conn.beginTransaction();
            const [ins] = await conn.query(
                `INSERT INTO booking_requests
        (submitter_user_id, service_required, locum_role, procedure_name, history, status)
        VALUES (?, ?, ?, ?, ?, 'new')`,
                [userId, serviceRequired, locumRole, procedureName, history]
            );
            bookingId = ins.insertId;
            for (const d of uniqueDates) {
                await conn.query(
                    'INSERT INTO booking_request_dates (booking_request_id, preferred_date) VALUES (?, ?)',
                    [bookingId, d]
                );
            }

            if (req.file) {
                const ext = path.extname(req.file.originalname || '') || '.bin';
                const stored = `${bookingId}-${crypto.randomBytes(8).toString('hex')}${ext}`;
                const finalDir = path.join(__dirname, '..', '..', 'uploads', 'bookings');
                fs.mkdirSync(finalDir, { recursive: true });
                const finalPath = path.join(finalDir, stored);
                fs.renameSync(req.file.path, finalPath);
                const relPath = `/uploads/bookings/${stored}`;
                await conn.query(
                    `INSERT INTO booking_attachments
          (booking_request_id, original_name, stored_name, mime_type, file_path)
          VALUES (?, ?, ?, ?, ?)`,
                    [
                        bookingId,
                        req.file.originalname || 'upload',
                        stored,
                        req.file.mimetype || 'application/octet-stream',
                        relPath
                    ]
                );
            }

            await conn.commit();
        } catch (e) {
            await conn.rollback();
            if (req.file && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (e2) {
                    /* ignore */
                }
            }
            throw e;
        } finally {
            conn.release();
        }

        return res.json({ success: true, message: 'Booking request submitted.', id: String(bookingId) });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Could not save booking request.' });
    }
});

/** Team + master admin inbox */
router.get('/inbox', requireAuth, async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        if (req.session.isMasterAdmin) {
            /* ok */
        } else {
            const [me] = await pool.query(
                'SELECT account_type FROM users WHERE id = ?',
                [req.session.userId]
            );
            if (!me.length || me[0].account_type !== 'team_member') {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        const [rows] = await pool.query(
            `SELECT br.id, br.submitted_at, br.service_required, br.locum_role, br.procedure_name, br.history,
              u.practice_name, u.email,
              GROUP_CONCAT(brd.preferred_date ORDER BY brd.preferred_date SEPARATOR ',') AS dates
       FROM booking_requests br
       JOIN users u ON u.id = br.submitter_user_id
       LEFT JOIN booking_request_dates brd ON brd.booking_request_id = br.id
       GROUP BY br.id
       ORDER BY br.submitted_at DESC`
        );

        const list = rows.map(r => ({
            id: String(r.id),
            submittedAt: new Date(r.submitted_at).toISOString(),
            data: {
                practiceName: r.practice_name,
                email: r.email,
                servicerequired: r.service_required,
                locumRole: r.locum_role || '',
                procedureNameIfKnown: r.procedure_name || '',
                preferredDate: '',
                preferredDates: r.dates || '',
                History: r.history
            }
        }));

        return res.json({ success: true, requests: list });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
