'use strict';

/** Hash date string (must match public/booking-diary.js getDemoAvailability). */
function hashDateStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function getDemoAvailability(iso) {
    const parts = iso.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return 'unavailable';

    const dow = date.getDay();
    if (dow === 0) return 'unavailable';
    if (dow === 6) return 'limited';

    const h = hashDateStr(iso);
    if (h % 13 === 0) return 'unavailable';
    if (h % 5 === 0) return 'limited';
    return 'available';
}

function resolveSiteStatus(iso, overrideMap) {
    const o = overrideMap[iso];
    if (o === 'available' || o === 'limited' || o === 'unavailable') {
        return o;
    }
    return getDemoAvailability(iso);
}

function resolveStaffDay(iso, userId, staffMap, userIdStr) {
    const key = userIdStr || String(userId);
    const dayMap = staffMap[key] || {};
    const st = dayMap[iso];
    if (st === 'available' || st === 'limited' || st === 'unavailable') {
        return st;
    }
    return getDemoAvailability(iso);
}

/**
 * @param {object} opts
 * @param {string} iso
 * @param {Record<string, string>} siteOverrideMap - iso -> status
 * @param {Record<string, Record<string, string>>} staffMap - userId -> iso -> status
 * @param {string[]} teamMemberIds
 * @param {Set<string>} bookingDatesSet - dates that have a booking request
 */
function getMemberPracticeCalendarStatus(iso, opts) {
    const site = resolveSiteStatus(iso, opts.siteOverrideMap || {});
    if (site === 'unavailable') return 'unavailable';

    const teamIds = opts.teamMemberIds || [];
    if (teamIds.length === 0) {
        return site;
    }

    let staffCount = 0;
    for (const tid of teamIds) {
        const st = resolveStaffDay(iso, tid, opts.staffMap || {}, String(tid));
        if (st === 'available' || st === 'limited') {
            staffCount++;
        }
    }
    if (staffCount === 0) return 'unavailable';

    const booked = opts.bookingDatesSet && opts.bookingDatesSet.has(iso);
    if (booked) return 'limited';

    return 'available';
}

module.exports = {
    getDemoAvailability,
    getMemberPracticeCalendarStatus,
    hashDateStr
};
