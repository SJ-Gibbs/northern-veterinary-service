/**
 * Booking page: availability calendar (demo pattern — replace with server data in production).
 * Green = available, amber = limited, red = unavailable.
 * Veterinary Locum: multiple dates (preferredDates); other services: single date (preferredDate).
 */
(function () {
    const grid = document.getElementById('bookingCalGrid');
    const monthTitle = document.getElementById('bookingCalTitle');
    const prevBtn = document.getElementById('bookingCalPrev');
    const nextBtn = document.getElementById('bookingCalNext');
    const hiddenSingle = document.getElementById('preferredDate');
    const hiddenMulti = document.getElementById('preferredDates');
    const selectedEl = document.getElementById('bookingCalSelected');
    const modeHintEl = document.getElementById('bookingCalModeHint');
    const serviceSel = document.getElementById('servicerequired');

    if (!grid || !monthTitle || !hiddenSingle || !selectedEl) return;

    let viewYear;
    let viewMonth;
    /** Single-date selection (non–Veterinary Locum) */
    let selectedIso = '';
    /** Multi-date selection (Veterinary Locum), sorted ISO strings */
    let selectedDates = [];

    function isLocum() {
        return serviceSel && serviceSel.value === 'veterinary_locum';
    }

    function todayParts() {
        const t = new Date();
        return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
    }

    function isoDate(y, m, d) {
        return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    /**
     * Effective availability: master-admin diary overrides (booking-diary.js) then demo rules.
     */
    function getAvailability(iso) {
        if (typeof BookingDiary !== 'undefined' && BookingDiary.getBookingAvailability) {
            return BookingDiary.getBookingAvailability(iso);
        }
        const [y, m, d] = iso.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) return 'unavailable';

        const dow = date.getDay();
        if (dow === 0) return 'unavailable';
        if (dow === 6) return 'limited';

        let h = 0;
        for (let i = 0; i < iso.length; i++) {
            h = (Math.imul(31, h) + iso.charCodeAt(i)) | 0;
        }
        h = Math.abs(h);
        if (h % 13 === 0) return 'unavailable';
        if (h % 5 === 0) return 'limited';
        return 'available';
    }

    function ymKey(y, m) {
        return y * 12 + m;
    }

    function canGoPrev() {
        const t = todayParts();
        return ymKey(viewYear, viewMonth) > ymKey(t.y, t.m);
    }

    function canGoNext() {
        const t = todayParts();
        const maxYm = ymKey(t.y, t.m) + 12;
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
        const t = todayParts();
        const minYm = ymKey(t.y, t.m);
        const maxYm = minYm + 12;
        let cur = ymKey(viewYear, viewMonth);
        if (cur < minYm) {
            viewYear = t.y;
            viewMonth = t.m;
        }
        if (cur > maxYm) {
            const total = maxYm;
            viewYear = Math.floor(total / 12);
            viewMonth = total % 12;
        }
        render();
    }

    function formatDisplay(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    function syncHiddenInputsForServiceMode() {
        const locum = isLocum();
        if (hiddenMulti) {
            hiddenMulti.disabled = !locum;
            if (!locum) {
                hiddenMulti.value = '';
                selectedDates = [];
            } else {
                hiddenMulti.value = selectedDates.join(',');
            }
        }
        hiddenSingle.disabled = locum;
        if (locum) {
            hiddenSingle.value = '';
            selectedIso = '';
        } else {
            hiddenSingle.value = selectedIso || '';
        }
        updateModeHint();
        updateSelectedMessage();
    }

    function updateModeHint() {
        if (!modeHintEl) return;
        if (isLocum()) {
            modeHintEl.textContent =
                'Veterinary Locum: click several days to add them; click again to remove. Limited days can be included.';
        } else {
            modeHintEl.textContent = '';
        }
    }

    function updateSelectedMessage() {
        if (isLocum()) {
            if (selectedDates.length === 0) {
                selectedEl.textContent = 'No dates selected — choose one or more available or limited days.';
            } else {
                const lines = selectedDates.map(function (iso) {
                    const avail = getAvailability(iso);
                    const tag = avail === 'limited' ? '(limited)' : '(available)';
                    return formatDisplay(iso) + ' ' + tag;
                });
                selectedEl.textContent =
                    selectedDates.length +
                    ' date' +
                    (selectedDates.length === 1 ? '' : 's') +
                    ' selected: ' +
                    lines.join('; ') +
                    '.';
            }
        } else {
            if (!selectedIso) {
                selectedEl.textContent = 'No date selected — choose an available or limited day.';
            } else {
                const avail = getAvailability(selectedIso);
                const note =
                    avail === 'limited'
                        ? 'Limited availability — we will confirm capacity when we reply.'
                        : 'Available — we will confirm this slot when we reply.';
                selectedEl.textContent = 'Selected: ' + formatDisplay(selectedIso) + '. ' + note;
            }
        }
    }

    function onDayClick(iso, avail) {
        if (isLocum()) {
            const idx = selectedDates.indexOf(iso);
            if (idx === -1) {
                selectedDates.push(iso);
                selectedDates.sort();
            } else {
                selectedDates.splice(idx, 1);
            }
            if (hiddenMulti) hiddenMulti.value = selectedDates.join(',');
        } else {
            selectedIso = iso;
            hiddenSingle.value = iso;
        }
        updateSelectedMessage();
        render();
    }

    function isDaySelected(iso) {
        if (isLocum()) return selectedDates.indexOf(iso) !== -1;
        return selectedIso === iso;
    }

    function render() {
        monthTitle.textContent = new Date(viewYear, viewMonth, 1).toLocaleString('en-GB', {
            month: 'long',
            year: 'numeric'
        });

        if (prevBtn) prevBtn.disabled = !canGoPrev();
        if (nextBtn) nextBtn.disabled = !canGoNext();

        grid.innerHTML = '';
        const first = new Date(viewYear, viewMonth, 1);
        const startPad = first.getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

        for (let i = 0; i < startPad; i++) {
            const cell = document.createElement('div');
            cell.className = 'booking-cal-cell booking-cal-cell--pad';
            grid.appendChild(cell);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const iso = isoDate(viewYear, viewMonth, d);
            const avail = getAvailability(iso);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'booking-cal-day booking-cal-day--' + avail;
            btn.textContent = String(d);
            btn.dataset.date = iso;

            const label =
                avail === 'available'
                    ? 'Available, ' + iso
                    : avail === 'limited'
                      ? 'Limited availability, ' + iso
                      : 'Unavailable, ' + iso;

            if (avail === 'unavailable') {
                btn.disabled = true;
                btn.setAttribute('aria-label', label);
            } else {
                btn.setAttribute('aria-label', label);
                btn.addEventListener('click', function () {
                    onDayClick(iso, avail);
                });
            }

            if (isDaySelected(iso) && avail !== 'unavailable') {
                btn.classList.add('booking-cal-day--selected');
            }

            grid.appendChild(btn);
        }
    }

    if (prevBtn) prevBtn.addEventListener('click', function () {
        shiftMonth(-1);
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
        shiftMonth(1);
    });

    if (serviceSel) {
        serviceSel.addEventListener('change', function () {
            syncHiddenInputsForServiceMode();
            render();
        });
    }

    const t = todayParts();
    viewYear = t.y;
    viewMonth = t.m;
    syncHiddenInputsForServiceMode();
    render();
})();

/** Fill hidden contact fields from logged-in account (booking page is auth-only). */
(function bookingAccountFromSession() {
    if (typeof auth === 'undefined') return;
    const pn = document.getElementById('practiceName');
    const em = document.getElementById('email');
    const ph = document.getElementById('phone');
    const sum = document.getElementById('bookingAccountSummary');
    if (!pn || !em || !ph) return;

    const session = auth.getCurrentUser();
    if (!session) return;

    const user = auth.getUsers().find(function (u) {
        return u.id === session.id;
    });
    if (!user) return;

    pn.value = user.practiceName || '';
    em.value = user.email || '';
    ph.value = user.phone || '';

    if (sum) {
        var label = user.practiceName || 'Your practice';
        var mail = user.email || '';
        sum.textContent = mail ? 'Signed in as ' + label + ' · ' + mail : 'Signed in as ' + label;
    }
})();

/** Show locum role (Surgeon / Nurse) only when Veterinary Locum is selected. */
(function bookingLocumRoleToggle() {
    var serviceSel = document.getElementById('servicerequired');
    var group = document.getElementById('locumRoleGroup');
    if (!serviceSel || !group) return;

    var radios = group.querySelectorAll('input[name="locumRole"]');

    function sync() {
        var isLocum = serviceSel.value === 'veterinary_locum';
        group.hidden = !isLocum;
        radios.forEach(function (r, i) {
            r.required = isLocum && i === 0;
            if (!isLocum) {
                r.checked = false;
            }
        });
    }

    serviceSel.addEventListener('change', sync);
    sync();
})();

/** Orthopaedic / soft tissue: optional procedure name field */
(function bookingProcedureNameField() {
    var serviceSel = document.getElementById('servicerequired');
    var group = document.getElementById('procedureNameGroup');
    var input = document.getElementById('procedureNameIfKnown');
    if (!serviceSel || !group) return;

    function sync() {
        var v = serviceSel.value;
        var show = v === 'orthopaedics' || v === 'softtissue';
        group.hidden = !show;
        if (!show && input) {
            input.value = '';
            return;
        }
        if (show && input) {
            input.placeholder = v === 'softtissue' ? 'e.g. TECA' : 'e.g. TPLO';
        }
    }

    serviceSel.addEventListener('change', sync);
    sync();
})();
