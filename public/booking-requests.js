/**
 * Persist booking form submissions locally for staff to review (bookings-inbox.html).
 */
(function (global) {
    var STORAGE_KEY = 'northern_vet_booking_requests';

    function getAll() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function save(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    /**
     * @param {Object} data - flat fields from the booking form
     */
    function append(data) {
        var list = getAll();
        list.unshift({
            id: 'br-' + Date.now(),
            submittedAt: new Date().toISOString(),
            data: data
        });
        save(list);
    }

    global.BookingRequests = {
        STORAGE_KEY: STORAGE_KEY,
        getAll: getAll,
        append: append
    };
})(typeof window !== 'undefined' ? window : this);
