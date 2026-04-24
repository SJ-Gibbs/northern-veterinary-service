'use strict';

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SCHEMA_FILE = path.join(__dirname, '..', 'sql', 'schema.sql');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true
});

/**
 * Run sql/schema.sql against the database so all tables exist.
 * Safe to call on every startup — every statement uses CREATE TABLE IF NOT EXISTS.
 */
async function initDb() {
    const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');

    // Use a dedicated single connection with multipleStatements to execute the
    // full schema file in one shot without splitting by hand.
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });
    try {
        await conn.query(sql);
        console.log('[db] Schema applied (all tables verified).');
    } finally {
        await conn.end();
    }
}

module.exports = { pool, initDb };
