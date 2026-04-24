/**
 * Master admin: click days to cycle diary overrides (stored in booking-diary.js).
 */
(function () {
    var grid = document.getElementById('diaryCalGrid');
    var monthTitle = document.getElementById('diaryCalTitle');
    var prevBtn = document.getElementById('diaryCalPrev');
    var nextBtn = document.getElementById('diaryCalNext');
    var hintEl = document.getElementById('diaryCalHint');

    if (!grid || !monthTitle || typeof BookingDiary === 'undefined') return;

    var viewYear;
    var viewMonth;

    function todayParts() {
        var t = new Date();
        return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
    }

    function isoDate(y, m, d) {
        return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    }

    function ymKey(y, m) {
        return y * 12 + m;
    }

    function canGoPrev() {
        var t = todayParts();
        return ymKey(viewYear, viewMonth) > ymKey(t.y, t.m);
    }

    function canGoNext() {
        var t = todayParts();
        var maxYm = ymKey(t.y, t.m) + 12;
        return ymKey(viewYear, viewMonth) < maxYm;
    }

    function shiftMonth(delta) {
        viewMonth += delta;
        if (viewMonth > 11) {
            viewMonth -= 12;
            viewYear += 1;
        }
        if (viewMonth < 0) {
            viewMonth += 12;
            viewYear -= 1;
        }
        var t = todayParts();
        var minYm = ymKey(t.y, t.m);
        var maxYm = minYm + 12;
        var cur = ymKey(viewYear, viewMonth);
        if (cur < minYm) {
            viewYear = t.y;
            viewMonth = t.m;
        }
        if (cur > maxYm) {
            var total = maxYm;
            viewYear = Math.floor(total / 12);
            viewMonth = total % 12;
        }
        render();
    }

    function cycleOverride(iso) {
        var cur = BookingDiary.getOverride(iso);
        var next = null;
        if (cur === null) {
            next = 'available';
            BookingDiary.setOverride(iso, 'available');
        } else if (cur === 'available') {
            next = 'limited';
            BookingDiary.setOverride(iso, 'limited');
        } else if (cur === 'limited') {
            next = 'unavailable';
            BookingDiary.setOverride(iso, 'unavailable');
        } else {
            next = 'clear';
            BookingDiary.clearOverride(iso);
        }
        fetch('/api/calendar/site-overrides/' + encodeURIComponent(iso), {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: next === 'clear' ? 'clear' : next })
        }).catch(function () {
            /* local still updated */
        });
    }

    function render() {
        monthTitle.textContent = new Date(viewYear, viewMonth, 1).toLocaleString('en-GB', {
            month: 'long',
            year: 'numeric'
        });

        if (prevBtn) prevBtn.disabled = !canGoPrev();
        if (nextBtn) nextBtn.disabled = !canGoNext();

        grid.innerHTML = '';
        var first = new Date(viewYear, viewMonth, 1);
        var startPad = first.getDay();
        var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

        var i;
        for (i = 0; i < startPad; i++) {
            var pad = document.createElement('div');
            pad.className = 'booking-cal-cell booking-cal-cell--pad';
            grid.appendChild(pad);
        }

        for (var d = 1; d <= daysInMonth; d++) {
            var iso = isoDate(viewYear, viewMonth, d);
            var effective = BookingDiary.getBookingAvailability(iso);
            var hasOverride = BookingDiary.getOverride(iso) !== null;

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'booking-cal-day booking-cal-day--' + effective;
            if (hasOverride) btn.classList.add('booking-cal-day--diary-override');
            btn.textContent = String(d);
            btn.dataset.date = iso;

            var labelBase =
                effective === 'available'
                    ? 'Available'
                    : effective === 'limited'
                      ? 'Limited availability'
                      : 'Unavailable';
            var label =
                (hasOverride ? 'Diary override: ' : 'Default pattern: ') + labelBase + ', ' + iso;
            btn.setAttribute('aria-label', label);

            btn.addEventListener('click', (function (dateIso) {
                return function () {
                    cycleOverride(dateIso);
                    render();
                };
            })(iso));

            grid.appendChild(btn);
        }
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { shiftMonth(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { shiftMonth(1); });

    var t0 = todayParts();
    viewYear = t0.y;
    viewMonth = t0.m;

    if (hintEl) {
        hintEl.textContent =
            'Click a day to cycle: set available → limited → unavailable → clear (revert to default pattern). Changes apply immediately on the public booking calendar.';
    }

    fetch('/api/calendar/site-overrides', { credentials: 'include' })
        .then(function (r) {
            return r.json();
        })
        .then(function (j) {
            if (j && j.success && j.overrides && BookingDiary.importSiteOverrides) {
                BookingDiary.importSiteOverrides(j.overrides);
            }
        })
        .catch(function () {
            /* fall back to local */
        })
        .finally(function () {
            render();
        });
})();
