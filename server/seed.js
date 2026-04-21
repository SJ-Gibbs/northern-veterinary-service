#!/usr/bin/env node
/**
 * Create initial master admin user (run once after importing sql/schema.sql).
 * Usage: SEED_ADMIN_PASSWORD='YourSecurePass' node server/seed.js
 */
'use strict';

require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./db');
const { masterEmail } = require('./lib/user-mapper');

const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeOnFirstLogin!';
const EMAIL = process.env.MASTER_ADMIN_EMAIL || masterEmail();
const NAME = 'Northern Veterinary Service Master Admin';

async function main() {
    const hash = await bcrypt.hash(PASSWORD, 12);
    const conn = await pool.getConnection();
    try {
        const [ex] = await conn.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [EMAIL]);
        if (ex.length) {
            console.log('Master admin already exists:', EMAIL);
            process.exit(0);
        }
        await conn.beginTransaction();
        const [ins] = await conn.query(
            `INSERT INTO users
      (email, password_hash, practice_name, account_type, role, phone, rcvs_registration_number, is_admin, is_active)
      VALUES (?, ?, ?, 'admin', 'admin', '', '', 1, 1)`,
            [EMAIL, hash, NAME]
        );
        const id = ins.insertId;
        await conn.query(
            `INSERT INTO addresses (user_id, line1, line2, city, county, postcode) VALUES (?,?,?,?,?,?)`,
            [id, '', '', '', '', '']
        );
        await conn.commit();
        console.log('Created master admin:', EMAIL);
        console.log('Change SEED_ADMIN_PASSWORD in production and run password update after first login.');
    } catch (e) {
        await conn.rollback();
        console.error(e);
        process.exit(1);
    } finally {
        conn.release();
        await pool.end();
    }
}

main();
