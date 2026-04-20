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

    /** Merge server map into site overrides (used by diary-admin + API). */
    function importSiteOverrides(obj) {
        if (!obj || typeof obj !== 'object') return;
        var o = getOverrides();
        Object.keys(obj).forEach(function (k) {
            var st = obj[k];
            if (st === 'available' || st === 'limited' || st === 'unavailable') {
                o[k] = st;
            }
        });
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

    function importStaffOverrides(userId, obj) {
        if (!userId || !obj || typeof obj !== 'object') return;
        var all = getAllStaffDiaries();
        if (!all[userId]) all[userId] = {};
        Object.keys(obj).forEach(function (k) {
            var st = obj[k];
            if (st === 'available' || st === 'limited' || st === 'unavailable') {
                all[userId][k] = st;
            }
        });
        saveAllStaffDiaries(all);
    }

    function getStaffBookingAvailability(userId, iso) {
        var over = getStaffOverride(userId, iso);
        if (over) return over;
        return getDemoAvailability(iso);
    }

    var USERS_KEY = 'northern_vet_users';
    var BOOKING_REQ_KEY = 'northern_vet_booking_requests';

    /** Active team_member accounts (for aggregating who can work on a day). */
    function getTeamMemberUserIds() {
        try {
            var raw = localStorage.getItem(USERS_KEY);
            var users = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(users)) return [];
            return users
                .filter(function (u) {
                    return (
                        u &&
                        u.accountType === 'team_member' &&
                        !u.isAdmin &&
                        u.isActive !== false
                    );
                })
                .map(function (u) {
                    return u.id;
                });
        } catch (e) {
            return [];
        }
    }

    function getBookingRequestsList() {
        try {
            var raw = localStorage.getItem(BOOKING_REQ_KEY);
            var list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    /** True if any stored request uses this calendar day (single or locum multi-date). */
    function dateHasBookingRequest(iso) {
        var list = getBookingRequestsList();
        for (var i = 0; i < list.length; i++) {
            var d = (list[i] && list[i].data) || {};
            var pd = d.preferredDate;
            if (pd && String(pd).trim() === iso) return true;
            var pds = d.preferredDates;
            if (pds && typeof pds === 'string') {
                var parts = pds.split(',');
                for (var j = 0; j < parts.length; j++) {
                    if (String(parts[j]).trim() === iso) return true;
                }
            }
        }
        return false;
    }

    /**
     * Member practice calendar (booking.html): same CSS classes as before —
     * available = green, limited = amber, unavailable = red.
     * Green: site diary allows the day, ≥1 team member available/limited, no booking request on that date.
     * Amber: same but at least one booking request already uses that date.
     * Red: site diary closed, or no team member is available/limited that day.
     * If there are no team_member accounts, falls back to site diary + demo rules only.
     */
    function getMemberPracticeCalendarStatus(iso) {
        var site = getBookingAvailability(iso);
        if (site === 'unavailable') return 'unavailable';

        var teamIds = getTeamMemberUserIds();
        if (teamIds.length === 0) {
            return site;
        }

        var staffCount = 0;
        for (var t = 0; t < teamIds.length; t++) {
            var st = getStaffBookingAvailability(teamIds[t], iso);
            if (st === 'available' || st === 'limited') staffCount++;
        }
        if (staffCount === 0) return 'unavailable';

        if (dateHasBookingRequest(iso)) return 'limited';

        return 'available';
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
        importSiteOverrides: importSiteOverrides,
        getStaffOverride: getStaffOverride,
        setStaffOverride: setStaffOverride,
        clearStaffOverride: clearStaffOverride,
        getStaffBookingAvailability: getStaffBookingAvailability,
        importStaffOverrides: importStaffOverrides,
        getTeamMemberUserIds: getTeamMemberUserIds,
        dateHasBookingRequest: dateHasBookingRequest,
        getMemberPracticeCalendarStatus: getMemberPracticeCalendarStatus
    };
})(typeof window !== 'undefined' ? window : this);
