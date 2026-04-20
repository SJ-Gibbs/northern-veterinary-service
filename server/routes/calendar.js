'use strict';

const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getMemberPracticeCalendarStatus } = require('../lib/calendar-logic');

const router = express.Router();

function isMasterSession(req) {
    return !!(req.session && req.session.isMasterAdmin);
}

function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
}

/** Public/member calendar: computed status per day for one month */
router.get('/member-month', requireAuth, async (req, res) => {
    try {
        const y = parseInt(req.query.year, 10);
        const m = parseInt(req.query.month, 10);
        if (!y || Number.isNaN(m) || m < 0 || m > 11) {
            return res.status(400).json({ success: false, message: 'year and month (0-11) required' });
        }
        const dim = daysInMonth(y, m);
        const startIso = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const endIso = `${y}-${String(m + 1).padStart(2, '0')}-${String(dim).padStart(2, '0')}`;

        const [siteRows] = await pool.query(
            'SELECT calendar_date, status FROM site_calendar_overrides WHERE calendar_date BETWEEN ? AND ?',
            [startIso, endIso]
        );
        const siteMap = {};
        siteRows.forEach(r => {
            const k = formatDateKey(r.calendar_date);
            siteMap[k] = r.status;
        });

        const [teamRows] = await pool.query(
            `SELECT id FROM users WHERE account_type = 'team_member' AND is_admin = 0 AND is_active = 1`
        );
        const teamIds = teamRows.map(r => String(r.id));

        const staffMap = {};
        if (teamIds.length) {
            const [stRows] = await pool.query(
                `SELECT user_id, avail_date, status FROM staff_availability
         WHERE avail_date BETWEEN ? AND ? AND user_id IN (${teamIds.map(() => '?').join(',')})`,
                [startIso, endIso, ...teamIds.map(id => parseInt(id, 10))]
            );
            stRows.forEach(r => {
                const uid = String(r.user_id);
                if (!staffMap[uid]) staffMap[uid] = {};
                staffMap[uid][formatDateKey(r.avail_date)] = r.status;
            });
        }

        const [bookDates] = await pool.query(
            `SELECT DISTINCT preferred_date FROM booking_request_dates WHERE preferred_date BETWEEN ? AND ?`,
            [startIso, endIso]
        );
        const bookSet = new Set(bookDates.map(r => formatDateKey(r.preferred_date)));

        const days = {};
        for (let d = 1; d <= dim; d++) {
            const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days[iso] = getMemberPracticeCalendarStatus(iso, {
                siteOverrideMap: siteMap,
                staffMap,
                teamMemberIds: teamIds,
                bookingDatesSet: bookSet
            });
        }

        return res.json({ success: true, year: y, month: m, days });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

function formatDateKey(d) {
    if (!d) return '';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
        return d.slice(0, 10);
    }
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return String(d);
    return x.toISOString().slice(0, 10);
}

router.get('/site-overrides', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT calendar_date, status FROM site_calendar_overrides ORDER BY calendar_date'
        );
        const o = {};
        rows.forEach(r => {
            o[formatDateKey(r.calendar_date)] = r.status;
        });
        return res.json({ success: true, overrides: o });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put(
    '/site-overrides/:iso',
    requireAuth,
    (req, res, next) => {
        if (!isMasterSession(req)) {
            return res.status(403).json({ success: false, message: 'Master admin only.' });
        }
        next();
    },
    express.json(),
    async (req, res) => {
        try {
            const iso = (req.params.iso || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
                return res.status(400).json({ success: false, message: 'Invalid date' });
            }
            const status = req.body.status;
            if (status === 'clear' || status === null) {
                await pool.query('DELETE FROM site_calendar_overrides WHERE calendar_date = ?', [iso]);
                return res.json({ success: true });
            }
            if (!['available', 'limited', 'unavailable'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }
            await pool.query(
                `INSERT INTO site_calendar_overrides (calendar_date, status) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
                [iso, status]
            );
            return res.json({ success: true });
        } catch (e) {
            console.error(e);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

router.get('/staff/:userId', requireAuth, async (req, res) => {
    try {
        const uid = parseInt(req.params.userId, 10);
        if (uid !== req.session.userId && !isMasterSession(req)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        const [rows] = await pool.query(
            'SELECT avail_date, status FROM staff_availability WHERE user_id = ?',
            [uid]
        );
        const o = {};
        rows.forEach(r => {
            o[formatDateKey(r.avail_date)] = r.status;
        });
        return res.json({ success: true, userId: String(uid), overrides: o });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/staff/:userId/:iso', requireAuth, express.json(), async (req, res) => {
    try {
        const uid = parseInt(req.params.userId, 10);
        if (uid !== req.session.userId && !isMasterSession(req)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        const iso = (req.params.iso || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            return res.status(400).json({ success: false, message: 'Invalid date' });
        }
        const status = req.body.status;
        if (status === 'clear' || status === null) {
            await pool.query('DELETE FROM staff_availability WHERE user_id = ? AND avail_date = ?', [uid, iso]);
            return res.json({ success: true });
        }
        if (!['available', 'limited', 'unavailable'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        await pool.query(
            `INSERT INTO staff_availability (user_id, avail_date, status) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
            [uid, iso, status]
        );
        return res.json({ success: true });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
