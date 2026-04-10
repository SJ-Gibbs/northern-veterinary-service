/**
 * Shared booking diary: localStorage overrides on top of demo availability rules.
 * Master admin edits via diary-admin.html; booking.html reads the same data.
 */
(function (global) {
    var STORAGE_KEY = 'northern_vet_booking_diary';

    function hashDateStr(s) {
        var h = 0;
        for (var i = 0; i < s.length; i++) {
            h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        }
        return Math.abs(h);
    }

    /** Demo rules (must match booking.js fallback when this file is absent). */
    function getDemoAvailability(iso) {
        var parts = iso.split('-').map(Number);
        var y = parts[0];
        var m = parts[1];
        var d = parts[2];
        var date = new Date(y, m - 1, d);
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) return 'unavailable';

        var dow = date.getDay();
        if (dow === 0) return 'unavailable';
        if (dow === 6) return 'limited';

        var h = hashDateStr(iso);
        if (h % 13 === 0) return 'unavailable';
        if (h % 5 === 0) return 'limited';
        return 'available';
    }

    function getOverrides() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveOverrides(obj) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    }

    function getOverride(iso) {
        var v = getOverrides()[iso];
        if (v === 'available' || v === 'limited' || v === 'unavailable') return v;
        return null;
    }

    function setOverride(iso, status) {
        var o = getOverrides();
        o[iso] = status;
        saveOverrides(o);
    }

    function clearOverride(iso) {
        var o = getOverrides();
        delete o[iso];
        saveOverrides(o);
    }

    function getBookingAvailability(iso) {
        var over = getOverride(iso);
        if (over) return over;
        return getDemoAvailability(iso);
    }

    /** Per–team-member diary (staff-diary.html); does not change the public site calendar. */
    var STAFF_DIARIES_KEY = 'northern_vet_staff_diaries';

    function getAllStaffDiaries() {
        try {
            var raw = localStorage.getItem(STAFF_DIARIES_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveAllStaffDiaries(all) {
        localStorage.setItem(STAFF_DIARIES_KEY, JSON.stringify(all));
    }

    function getStaffOverrides(userId) {
        if (!userId) return {};
        var all = getAllStaffDiaries();
        return all[userId] || {};
    }

    function getStaffOverride(userId, iso) {
        var v = getStaffOverrides(userId)[iso];
        if (v === 'available' || v === 'limited' || v === 'unavailable') return v;
        return null;
    }

    function setStaffOverride(userId, iso, status) {
        var all = getAllStaffDiaries();
        if (!all[userId]) all[userId] = {};
        all[userId][iso] = status;
        saveAllStaffDiaries(all);
    }

    function clearStaffOverride(userId, iso) {
        var all = getAllStaffDiaries();
        if (all[userId]) {
            delete all[userId][iso];
            saveAllStaffDiaries(all);
        }
    }

    function getStaffBookingAvailability(userId, iso) {
        var over = getStaffOverride(userId, iso);
        if (over) return over;
        return getDemoAvailability(iso);
    }

    global.BookingDiary = {
        STORAGE_KEY: STORAGE_KEY,
        STAFF_DIARIES_KEY: STAFF_DIARIES_KEY,
        getDemoAvailability: getDemoAvailability,
        getBookingAvailability: getBookingAvailability,
        getOverride: getOverride,
        setOverride: setOverride,
        clearOverride: clearOverride,
        getOverrides: getOverrides,
        getStaffOverride: getStaffOverride,
        setStaffOverride: setStaffOverride,
        clearStaffOverride: clearStaffOverride,
        getStaffBookingAvailability: getStaffBookingAvailability
    };
})(typeof window !== 'undefined' ? window : this);
