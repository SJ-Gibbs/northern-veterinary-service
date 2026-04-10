/**
 * Site-wide access gate (sessionStorage). Public pages: landing, gate form, account login/signup.
 * Site access is checked on enter.html; successful gate sets northern_vet_site_access.
 * login.html / signup.html must stay public so the Login button can open the real login form.
 */
(function () {
    var KEY = 'northern_vet_site_access';
    var path = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (path === '') path = 'index.html';

    var publicPages = ['index.html', 'enter.html', 'login.html', 'signup.html'];
    var isPublic = publicPages.indexOf(path) !== -1;

    if (sessionStorage.getItem(KEY) === '1') {
        if (path === 'index.html') {
            window.location.replace('home.html');
        }
        return;
    }

    if (!isPublic) {
        window.location.replace('index.html');
    }
})();
