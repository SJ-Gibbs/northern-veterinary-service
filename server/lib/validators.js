'use strict';

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function validateRcvsRegistrationNumber(value) {
    const s = String(value ?? '').trim();
    if (!s) {
        return { ok: false, message: 'RCVS registration number is required.', value: '' };
    }
    if (s.length < 3 || s.length > 32) {
        return { ok: false, message: 'Enter a valid RCVS registration number.', value: s };
    }
    return { ok: true, value: s };
}

function validatePhoneNumber(value) {
    const s = String(value ?? '').trim();
    if (!s) {
        return { ok: false, message: 'Phone number is required.' };
    }
    const digits = s.replace(/\D/g, '');
    if (digits.length < 8) {
        return { ok: false, message: 'Enter a valid phone number (at least 8 digits).' };
    }
    return { ok: true, value: s };
}

function normalizeRole(role) {
    if (!role) return '';
    const n = String(role).trim().toLowerCase();
    if (n === 'nurse') return 'veterinary_nurse';
    return n;
}

module.exports = {
    isValidEmail,
    validateRcvsRegistrationNumber,
    validatePhoneNumber,
    normalizeRole
};
