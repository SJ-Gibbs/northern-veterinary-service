/**
 * Team member: personal availability calendar (localStorage per user id).
 */
(function () {
    var grid = document.getElementById('staffDiaryCalGrid');
    var monthTitle = document.getElementById('staffDiaryCalTitle');
    var prevBtn = document.getElementById('staffDiaryCalPrev');
    var nextBtn = document.getElementById('staffDiaryCalNext');
    var hintEl = document.getElementById('staffDiaryCalHint');

    if (!grid || !monthTitle || typeof BookingDiary === 'undefined' || typeof auth === 'undefined') return;

    function getUserId() {
        var s = auth.getCurrentUser();
        return s && s.id;
    }

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
        var uid = getUserId();
        if (!uid) return;
        var cur = BookingDiary.getStaffOverride(uid, iso);
        var next = 'clear';
        if (cur === null) {
            next = 'available';
            BookingDiary.setStaffOverride(uid, iso, 'available');
        } else if (cur === 'available') {
            next = 'limited';
            BookingDiary.setStaffOverride(uid, iso, 'limited');
        } else if (cur === 'limited') {
            next = 'unavailable';
            BookingDiary.setStaffOverride(uid, iso, 'unavailable');
        } else {
            BookingDiary.clearStaffOverride(uid, iso);
        }
        fetch(
            '/api/calendar/staff/' + encodeURIComponent(uid) + '/' + encodeURIComponent(iso),
            {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: next === 'clear' ? 'clear' : next })
            }
        ).catch(function () {
            /* local updated */
        });
    }

    function render() {
        if (!getUserId()) {
            if (grid) {
                grid.innerHTML =
                    '<p class="text-muted" style="color:#a00;padding:1rem;">Loading your diary…</p>';
            }
            return;
        }
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

        var uid0 = getUserId();
        for (var d = 1; d <= daysInMonth; d++) {
            var iso = isoDate(viewYear, viewMonth, d);
            var effective = BookingDiary.getStaffBookingAvailability(uid0, iso);
            var hasOverride = BookingDiary.getStaffOverride(uid0, iso) !== null;

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
                (hasOverride ? 'Your override: ' : 'Default pattern: ') + labelBase + ', ' + iso;
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
            'This is your personal availability planner. It does not change the public booking calendar (that is set under Site booking diary by the master admin). Click a day to cycle: available → limited → unavailable → clear.';
    }

    if (auth.ready) {
        auth.ready.then(function () {
            var uid = getUserId();
            if (!uid) {
                if (grid) {
                    grid.innerHTML =
                        '<p class="text-muted" style="color:#a00">Could not load your user session.</p>';
                }
                return;
            }
            return fetch('/api/calendar/staff/' + encodeURIComponent(uid), { credentials: 'include' });
        })
            .then(function (r) {
                if (!r) return;
                return r.json();
            })
            .then(function (j) {
                var uid = getUserId();
                if (j && j.success && j.overrides && uid && BookingDiary.importStaffOverrides) {
                    BookingDiary.importStaffOverrides(String(uid), j.overrides);
                }
            })
            .catch(function () {
                /* */
            })
            .finally(function () {
                if (getUserId()) {
                    render();
                }
            });
    } else {
        render();
    }
})();
