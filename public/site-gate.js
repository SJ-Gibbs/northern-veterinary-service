/**
 * Site-wide access gate.
 *
 * Layer 1 – sessionStorage flag (set by enter.html gate or on real login).
 * Layer 2 – if the flag is absent, silently check /api/auth/me.  A valid
 *            server session (e.g. returning to a tab after a browser restart)
 *            re-grants access without sending the user back to the gate.
 *
 * Public pages that are always reachable: index, enter, login, signup.
 */
(function () {
    var KEY = 'northern_vet_site_access';
    var pageName = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (pageName === '') pageName = 'index.html';

    var publicPages = ['index.html', 'enter.html', 'login.html', 'signup.html'];
    var isPublic = publicPages.indexOf(pageName) !== -1;

    // Already granted in this browser session — fast path.
    if (sessionStorage.getItem(KEY) === '1') {
        if (pageName === 'index.html') {
            window.location.replace('home.html');
        }
        return;
    }

    // Public pages never need the gate.
    if (isPublic) return;

    // No sessionStorage flag — hide the page while we verify the server session.
    // This prevents a flash of content before the redirect fires.
    document.documentElement.style.visibility = 'hidden';

    fetch('/api/auth/me', { credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
            if (j && j.user) {
                // Valid server session → restore the flag and show the page.
                sessionStorage.setItem(KEY, '1');
                document.documentElement.style.visibility = '';
            } else {
                window.location.replace('index.html');
            }
        })
        .catch(function () {
            window.location.replace('index.html');
        });
})();
