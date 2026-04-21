'use strict';

const { mapUserToClient } = require('./user-mapper');
const { OFFERABLE_SERVICE_IDS } = require('./services-catalog');

async function getProfileById(pool, userId, req) {
    const base =
        (req.protocol || 'http') + '://' + (req.get('host') || 'localhost');
    const uploadPrefix = base + '/uploads';

    const [rows] = await pool.query(
        `SELECT u.*,
          a.line1 AS addr_line1, a.line2 AS addr_line2, a.city AS addr_city,
          a.county AS addr_county, a.postcode AS addr_postcode
        FROM users u
        LEFT JOIN addresses a ON a.user_id = u.id
        WHERE u.id = :id LIMIT 1`,
        { id: userId }
    );
    if (!rows.length) return null;
    const row = rows[0];
    const address = {
        line1: row.addr_line1 || '',
        line2: row.addr_line2 || '',
        city: row.addr_city || '',
        postcode: row.addr_postcode || '',
        county: row.addr_county || ''
    };

    const [svcRows] = await pool.query(
        'SELECT service_code FROM user_services WHERE user_id = :uid',
        { uid: userId }
    );
    const codes = svcRows.map(r => r.service_code);

    const relPath = row.profile_photo_path
        ? (row.profile_photo_path.startsWith('/')
              ? row.profile_photo_path
              : '/' + row.profile_photo_path)
        : null;

    const profile = mapUserToClient(
        {
            ...row,
            profile_photo_path: relPath
        },
        address,
        codes,
        ''
    );
    if (relPath) {
        profile.profilePhotoUrl = base + relPath;
    }
    return profile;
}

async function setUserServices(pool, userId, serviceIds) {
    const allowed = new Set(OFFERABLE_SERVICE_IDS);
    const filtered = (serviceIds || []).filter(id => allowed.has(id));
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM user_services WHERE user_id = ?', [userId]);
        for (const code of filtered) {
            await conn.query('INSERT INTO user_services (user_id, service_code) VALUES (?, ?)', [
                userId,
                code
            ]);
        }
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

module.exports = { getProfileById, setUserServices };
