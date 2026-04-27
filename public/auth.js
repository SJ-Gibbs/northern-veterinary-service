// Northern Veterinary Service — API-backed auth (Express session + MySQL)
// Run the site via: node server/app.js (serves /api and static public/)

const OFFERABLE_SERVICES_CATALOG = [
    {
        section: 'Orthopaedic procedures',
        items: [
            { id: 'fracture_repair_simple', label: 'Fracture Repair (Simple)' },
            { id: 'fracture_repair_complex', label: 'Fracture Repair (Complex)' },
            { id: 'tplo', label: 'Tibial Plateau Levelling Osteotomy (TPLO)' },
            { id: 'fho', label: 'Femoral Head and Neck Excision (FHO)' },
            { id: 'medial_patella_luxation_repair', label: 'Medial Patella Luxation Repair' },
            { id: 'carpal_arthrodesis', label: 'Carpal Arthrodesis' },
            { id: 'tarsal_arthrodesis', label: 'Tarsal Arthrodesis' },
            { id: 'hif_repair', label: 'Humeral Intracondylar Fissure (HIF) Repair' },
            { id: 'angular_limb_deformity_correction', label: 'Angular Limb Deformity Correction' }
        ]
    },
    {
        section: 'Soft tissue procedures',
        items: [
            { id: 'perineal_urethrostomy', label: 'Perineal Urethrostomy' },
            { id: 'tecabo', label: 'Total Ear Canal Ablation & Bulla Osteotomy (TECABO)' },
            { id: 'mass_excision_simple', label: 'Mass Excision (Simple)' },
            { id: 'mass_excision_complex', label: 'Mass Excision with Complex Reconstruction' },
            { id: 'diaphragmatic_hernia_repair', label: 'Diaphragmatic Hernia Repair' },
            { id: 'perineal_hernia_repair', label: 'Perineal Hernia Repair' },
            { id: 'nephrectomy', label: 'Nephrectomy' },
            { id: 'liver_lobectomy', label: 'Liver Lobectomy' }
        ]
    },
    {
        section: 'Minimally invasive',
        items: [{ id: 'laparoscopic_surgery', label: 'Laparoscopic surgery' }]
    },
    {
        section: 'Diagnostic services',
        items: [
            { id: 'ultrasonography_abdominal', label: 'Ultrasonography (Abdominal)' },
            { id: 'echocardiography', label: 'Echocardiography' },
            { id: 'endoscopy_gastroscopy_colonoscopy', label: 'Endoscopy (Gastroscopy/Colonoscopy)' },
            { id: 'radiographic_interpretation', label: 'Radiographic Interpretation (Member Practices)' },
            { id: 'consultation_advice', label: 'Consultation & Advice (Member Practices)' }
        ]
    },
    {
        section: 'Other',
        items: [{ id: 'veterinary_locum', label: 'Veterinary locum' }]
    }
];

const OFFERABLE_SERVICE_IDS = OFFERABLE_SERVICES_CATALOG.flatMap(s => s.items.map(i => i.id));

const LEGACY_SERVICES_EXPAND = {
    orthopaedics: OFFERABLE_SERVICES_CATALOG[0].items.map(i => i.id),
    softtissue: OFFERABLE_SERVICES_CATALOG[1].items.map(i => i.id),
    laparoscopic: ['laparoscopic_surgery'],
    ultrasonography: ['ultrasonography_abdominal', 'echocardiography'],
    veterinary_locum: ['veterinary_locum']
};

const LEGACY_SERVICE_KEYS = new Set(Object.keys(LEGACY_SERVICES_EXPAND));

const API = '';

async function apiFetch(path, options = {}) {
    const { body, headers, ...rest } = options;
    const o = { credentials: 'include', ...rest };
    o.headers = { ...(headers || {}) };
    if (body !== undefined) {
        if (body instanceof FormData) {
            o.body = body;
        } else if (typeof body === 'object') {
            o.headers['Content-Type'] = 'application/json';
            o.body = JSON.stringify(body);
        } else {
            o.body = body;
        }
    }
    return fetch(API + path, o);
}

class AuthSystem {
    constructor() {
        this.professionalRoles = ['vet', 'veterinary_nurse'];
        this.masterAdminEmail = 'info@northernveterinaryservice.co.uk';
        this._session = null;
        this._profile = null;
        this._adminUsersCache = null;
        this._hydrated = false;
        this.ready = this._bootstrap();
        this.attachEventListeners();
    }

    async _bootstrap() {
        try {
            const r = await apiFetch('/api/auth/me');
            if (r.ok) {
                const j = await r.json();
                if (j && j.masterAdminEmail) {
                    this.masterAdminEmail = j.masterAdminEmail;
                }
                if (j && j.user) {
                    this._applyUser(j.user);
                }
            }
        } catch (e) {
            /* offline or static-only */
        }
        this._hydrated = true;
        this.updateAuthUI();
        return this;
    }

    _applyUser(profile) {
        this._profile = profile;
        this._session = {
            id: profile.id,
            email: profile.email,
            practiceName: profile.practiceName,
            isAdmin: !!profile.isAdmin,
            role: this.getUserRole(profile),
            accountType: profile.accountType || (this.getUserRole(profile) === 'practice' ? 'practice' : 'team_member'),
            loginTime: new Date().toISOString()
        };
    }

    _clearClient() {
        this._session = null;
        this._profile = null;
        this._adminUsersCache = null;
    }

    getOfferableServicesCatalog() {
        return OFFERABLE_SERVICES_CATALOG;
    }

    validateRcvsRegistrationNumber(value) {
        const s = String(value ?? '').trim();
        if (s.length < 3) {
            return { ok: false, message: 'Please enter your RCVS registration number.' };
        }
        return { ok: true, value: s };
    }

    validatePhoneNumber(value) {
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

    normalizeRole(role) {
        if (!role) return '';
        const normalized = role.toString().trim().toLowerCase();
        if (normalized === 'nurse') return 'veterinary_nurse';
        return normalized;
    }

    getRoleLabel(role) {
        if (role === 'vet') return 'Vet';
        if (role === 'veterinary_nurse') return 'Veterinary Nurse';
        if (role === 'practice') return 'Practice';
        if (role === 'admin') return 'Admin';
        return 'Member';
    }

    getAccountTypeLabel(user) {
        if (!user) return '—';
        if (user.isAdmin && user.email && user.email.toLowerCase() === this.masterAdminEmail.toLowerCase()) {
            return 'Master admin';
        }
        if (user.isAdmin) return 'Admin';
        const t = user.accountType;
        if (t === 'practice') return 'Practice';
        if (t === 'team_member') return 'Team Member';
        return 'Member';
    }

    getUserRole(user) {
        if (!user) return '';
        if (user.isAdmin) return 'admin';
        return this.normalizeRole(user.role);
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
    }

    async login(email, password) {
        const r = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        const j = await r.json().catch(() => ({}));
        if (j.success && j.user) {
            this._applyUser(j.user);
            try {
                sessionStorage.setItem('northern_vet_site_access', '1');
            } catch (e) {
                /* ignore */
            }
            this.updateAuthUI();
            return { success: true, message: j.message || 'Login successful!', user: this.getCurrentUser() };
        }
        return { success: false, message: j.message || 'Invalid email or password.' };
    }

    async logout() {
        try {
            await apiFetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            /* ignore */
        }
        this._clearClient();
        window.location.href = 'home.html';
    }

    isLoggedIn() {
        return this._session !== null;
    }

    getCurrentUser() {
        return this._session;
    }

    getUserProfile() {
        return this._profile;
    }

    /** @deprecated use refreshAdminUsers — returns last cached list for admin UI */
    getUsers() {
        return this._adminUsersCache || [];
    }

    async refreshAdminUsers() {
        const r = await apiFetch('/api/admin/users');
        const j = await r.json();
        if (!j.success) {
            this._adminUsersCache = [];
            return [];
        }
        this._adminUsersCache = (j.users || []).map(u => ({
            id: String(u.id),
            email: u.email,
            practiceName: u.practiceName,
            accountType: u.accountType,
            role: u.role,
            phone: u.phone,
            rcvsRegistrationNumber: u.rcvsRegistrationNumber,
            isAdmin: u.isAdmin,
            isActive: u.isActive,
            createdAt: u.createdAt,
            address: u.address
        }));
        return this._adminUsersCache;
    }

    getAllPractices() {
        return (this._adminUsersCache || []).filter(u => !u.isAdmin);
    }

    isCurrentUserAdmin() {
        const s = this.getCurrentUser();
        if (!s) return false;
        return !!s.isAdmin;
    }

    isCurrentUserMasterAdmin() {
        const p = this.getUserProfile();
        if (!p || !p.isAdmin) return false;
        return !!p.isMasterAdmin;
    }

    isCurrentUserTeamMember() {
        const p = this.getUserProfile();
        return !!(p && p.accountType === 'team_member' && !p.isAdmin);
    }

    isCurrentUserPractice() {
        const p = this.getUserProfile();
        return !!(p && p.accountType === 'practice');
    }

    canAccessBookingForm() {
        if (this.isCurrentUserMasterAdmin()) return true;
        if (this.isCurrentUserTeamMember()) return true;
        return this.isCurrentUserPractice();
    }

    isCurrentUserProfessional() {
        if (this.isCurrentUserMasterAdmin()) return true;
        if (this.isCurrentUserTeamMember()) return true;
        const s = this.getCurrentUser();
        if (!s) return false;
        const p = this.getUserProfile();
        if (!p) return false;
        return this.professionalRoles.includes(this.getUserRole(p));
    }

    applyLogoHomeLink() {
        const section = document.querySelector('.logo-section');
        if (!section) return;
        const h1 = section.querySelector('h1.site-title');
        if (!h1) return;
        const link = section.querySelector('a.site-logo-home');

        if (this.isLoggedIn()) {
            if (link && link.contains(h1)) return;
            const a = document.createElement('a');
            a.href = 'home.html';
            a.className = 'site-logo-home';
            a.setAttribute('aria-label', 'Home — Northern Veterinary Service');
            h1.parentNode.insertBefore(a, h1);
            a.appendChild(h1);
        } else if (link && link.contains(h1)) {
            link.replaceWith(h1);
        }
    }

    applyTeamMemberMainNav() {
        const navList = document.querySelector('.nav-list');
        if (!navList) return;

        const pathn = window.location.pathname || '';
        const file = pathn.split('/').pop() || '';
        const hash = ((window.location.hash || '') + '').replace(/^#/, '').toLowerCase();

        const isAccount = file === 'account.html';
        const isBookings = file === 'bookings-inbox.html';
        const isStaffDiary = file === 'staff-diary.html';
        const isResourcesArea = file === 'resources.html' || file === 'discharge-form.html';

        const profileOn = isAccount && !['services', 'security'].includes(hash);
        const servicesOn = isAccount && hash === 'services';
        const securityOn = isAccount && hash === 'security';

        const li = (href, text, on) => {
            const cur = on ? ' class="active" aria-current="page"' : '';
            return '<li><a href="' + href + '"' + cur + '>' + text + '</a></li>';
        };

        navList.innerHTML =
            li('account.html', 'Profile', profileOn) +
            li('bookings-inbox.html', 'Bookings', isBookings) +
            li('staff-diary.html', 'My availability', isStaffDiary) +
            li('resources.html', 'Resources', isResourcesArea) +
            li('account.html#services', 'Services I offer', servicesOn) +
            li('account.html#security', 'Security', securityOn);
        navList.setAttribute('data-nvs-team-nav', 'true');
    }

    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        const dropdownMenu = document.getElementById('dropdownMenu');

        if (this.isLoggedIn()) {
            const isAdmin = this.isCurrentUserAdmin();
            const user = this.getCurrentUser();
            const showResourcesInMainNav = this.isCurrentUserMasterAdmin() || this.isCurrentUserProfessional();
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (userName) {
                if (this.isCurrentUserMasterAdmin()) {
                    userName.textContent = '⚙️ Master admin';
                } else if (this.isCurrentUserTeamMember()) {
                    userName.textContent = `${user.practiceName} (Team)`;
                } else if (this.isCurrentUserPractice()) {
                    userName.textContent = `${user.practiceName} (Practice)`;
                } else {
                    userName.textContent = `${user.practiceName} (${this.getRoleLabel(user.role)})`;
                }
            }

            const userDropdownBtn = document.getElementById('userDropdownBtn');
            const profileForAvatar = this.getUserProfile();
            if (userDropdownBtn) {
                let av = document.getElementById('headerUserAvatar');
                const iconEl = userDropdownBtn.querySelector('.user-icon');
                const photoSrc = profileForAvatar && (profileForAvatar.profilePhotoUrl || profileForAvatar.profilePhotoDataUrl);
                if (photoSrc) {
                    if (!av) {
                        av = document.createElement('img');
                        av.id = 'headerUserAvatar';
                        av.className = 'user-menu-avatar';
                        av.alt = '';
                        av.width = 28;
                        av.height = 28;
                        userDropdownBtn.insertBefore(av, userDropdownBtn.firstChild);
                    }
                    av.src = photoSrc;
                    if (iconEl) iconEl.style.display = 'none';
                } else {
                    if (av) av.remove();
                    if (iconEl) iconEl.style.display = '';
                }
            }

            if (dropdownMenu && isAdmin && !document.getElementById('adminPanelLink')) {
                const link = document.createElement('a');
                link.href = 'admin.html';
                link.className = 'dropdown-item';
                link.id = 'adminPanelLink';
                link.textContent = '⚙️ Admin Panel';
                link.style.cssText = 'color:#c0392b;font-weight:700;';
                const accountLink = document.getElementById('accountLink');
                if (accountLink) {
                    dropdownMenu.insertBefore(link, accountLink);
                } else {
                    dropdownMenu.prepend(link);
                }
            }

            if (dropdownMenu && this.isCurrentUserMasterAdmin() && !document.getElementById('diaryAdminLink')) {
                const diaryLink = document.createElement('a');
                diaryLink.href = 'diary-admin.html';
                diaryLink.className = 'dropdown-item';
                diaryLink.id = 'diaryAdminLink';
                diaryLink.textContent = '📅 Site booking diary';
                diaryLink.style.cssText = 'color:#1a5276;font-weight:700;';
                const adminLink = document.getElementById('adminPanelLink');
                const accountLink = document.getElementById('accountLink');
                if (adminLink) {
                    adminLink.insertAdjacentElement('afterend', diaryLink);
                } else if (accountLink) {
                    dropdownMenu.insertBefore(diaryLink, accountLink);
                } else {
                    dropdownMenu.prepend(diaryLink);
                }
            }

            if (dropdownMenu && this.isCurrentUserMasterAdmin() && !document.getElementById('bookingsInboxLink')) {
                const bookingsLink = document.createElement('a');
                bookingsLink.href = 'bookings-inbox.html';
                bookingsLink.className = 'dropdown-item';
                bookingsLink.id = 'bookingsInboxLink';
                bookingsLink.textContent = '📋 Booking requests';
                bookingsLink.style.cssText = 'font-weight:600;';
                const ref = document.getElementById('diaryAdminLink') || document.getElementById('adminPanelLink');
                if (ref) {
                    ref.insertAdjacentElement('afterend', bookingsLink);
                } else {
                    const accountLinkEl = document.getElementById('accountLink');
                    if (accountLinkEl) {
                        dropdownMenu.insertBefore(bookingsLink, accountLinkEl);
                    } else {
                        dropdownMenu.prepend(bookingsLink);
                    }
                }
            }

            const accountLinkEl = document.getElementById('accountLink');
            if (dropdownMenu) {
                const teamRes = document.getElementById('teamResourcesLink');
                if (this.isCurrentUserTeamMember()) {
                    if (!teamRes) {
                        const resLink = document.createElement('a');
                        resLink.href = 'resources.html';
                        resLink.className = 'dropdown-item';
                        resLink.id = 'teamResourcesLink';
                        resLink.textContent = 'Resources';
                        if (accountLinkEl) {
                            dropdownMenu.insertBefore(resLink, accountLinkEl);
                        } else {
                            dropdownMenu.prepend(resLink);
                        }
                    }
                } else if (teamRes) {
                    teamRes.remove();
                }
            }

            const navList = document.querySelector('.nav-list');
            if (navList) {
                if (this.isCurrentUserTeamMember()) {
                    this.applyTeamMemberMainNav();
                } else {
                    const existingResourcesLink = navList.querySelector('a[href="resources.html"]');
                    if (showResourcesInMainNav && !existingResourcesLink) {
                        const li = document.createElement('li');
                        li.id = 'resourcesNavLink';
                        const link = document.createElement('a');
                        link.href = 'resources.html';
                        link.textContent = 'Resources';
                        li.appendChild(link);
                        const policiesItem = navList.querySelector('a[href="policies.html"]')?.closest('li');
                        if (policiesItem) {
                            policiesItem.insertAdjacentElement('beforebegin', li);
                        } else {
                            navList.appendChild(li);
                        }
                    } else if (!showResourcesInMainNav && existingResourcesLink) {
                        existingResourcesLink.closest('li')?.remove();
                    }
                }
            }
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
            document.getElementById('teamResourcesLink')?.remove();
            const existingResourcesLink = document.querySelector('.nav-list a[href="resources.html"]');
            if (existingResourcesLink) {
                if (!document.querySelector('.nav-list')?.getAttribute('data-nvs-team-nav')) {
                    existingResourcesLink.closest('li')?.remove();
                }
            }
            const headerAv = document.getElementById('headerUserAvatar');
            if (headerAv) headerAv.remove();
            const btnOut = document.querySelector('.user-dropdown-btn .user-icon');
            if (btnOut) btnOut.style.display = '';
        }
        this.applyLogoHomeLink();
    }

    async signup(practiceName, email, password, phone = '', address = null, options = {}) {
        const rawType = options.accountType;
        const accountType = rawType === 'practice' ? 'practice' : rawType === 'team_member' ? 'team_member' : '';
        let role = this.normalizeRole(options.role);
        email = (email || '').trim();
        const confirmEmail = (options.confirmEmail !== undefined ? String(options.confirmEmail) : '').trim();
        if (confirmEmail && email.toLowerCase() !== confirmEmail.toLowerCase()) {
            return { success: false, message: 'Email addresses do not match. Please check and try again.' };
        }
        if (!confirmEmail) {
            return { success: false, message: 'Please confirm your email address.' };
        }
        if (accountType !== 'practice' && accountType !== 'team_member') {
            return { success: false, message: 'Choose a valid account type (practice or team member).' };
        }
        if (accountType === 'practice') {
            role = 'practice';
        } else if (!role || !this.professionalRoles.includes(role)) {
            return { success: false, message: 'Please select a valid role (Vet or Veterinary Nurse).' };
        }
        const rcvsCheck = this.validateRcvsRegistrationNumber(options.rcvsRegistrationNumber);
        if (!rcvsCheck.ok) {
            return { success: false, message: rcvsCheck.message };
        }
        const phoneCheck = this.validatePhoneNumber(phone);
        if (!phoneCheck.ok) {
            return { success: false, message: phoneCheck.message };
        }
        if (accountType === 'team_member') {
            const v = options.profilePhotoDataUrl;
            if (!v || typeof v !== 'string' || !v.startsWith('data:image/')) {
                return { success: false, message: 'A profile photo is required.' };
            }
        }
        if (!this.isValidEmail(email)) {
            return { success: false, message: 'Please enter a valid email address.' };
        }
        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters long.' };
        }

        const r = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: {
                practiceName,
                email,
                password,
                phone: phoneCheck.value,
                address: address || {},
                accountType,
                role,
                rcvsRegistrationNumber: rcvsCheck.value,
                confirmEmail,
                profilePhotoDataUrl: options.profilePhotoDataUrl
            }
        });
        const raw = await r.text();
        let j = {};
        try {
            j = raw ? JSON.parse(raw) : {};
        } catch {
            j = {};
        }
        if (j.success) {
            return { success: true, message: j.message || 'Account created successfully!' };
        }
        if (j.message) {
            return { success: false, message: j.message };
        }
        if (!r.ok) {
            if (r.status === 413) {
                return {
                    success: false,
                    message:
                        'Registration data was too large (often the profile photo). Try a smaller image or lower-resolution photo.'
                };
            }
            if (r.status === 403) {
                return {
                    success: false,
                    message:
                        'Self-registration is disabled on this server. Ask an administrator to create your account.'
                };
            }
            if (r.status === 404) {
                return {
                    success: false,
                    message:
                        'Could not reach the registration API. Ensure the Node server is running and this site is opened from the same host as the API (not opened as files or from static-only hosting).'
                };
            }
            return {
                success: false,
                message: `Registration failed (server returned ${r.status}). Check the browser Network tab or server logs.`
            };
        }
        return { success: false, message: 'Registration failed.' };
    }

    async updateUser(updatedFields) {
        const r = await apiFetch('/api/account/update', { method: 'PATCH', body: updatedFields });
        const j = await r.json().catch(() => ({}));
        if (j.success && j.user) {
            this._applyUser(j.user);
            this.updateAuthUI();
        }
        return { success: !!j.success, message: j.message || (j.success ? 'Saved.' : 'Update failed.') };
    }

    async updatePassword(currentPassword, newPassword) {
        const r = await apiFetch('/api/account/password', {
            method: 'POST',
            body: { currentPassword, newPassword }
        });
        const j = await r.json().catch(() => ({}));
        return { success: !!j.success, message: j.message || 'Could not change password.' };
    }

    async setUserActiveStatus(id, isActive) {
        const r = await apiFetch('/api/admin/users/' + encodeURIComponent(id) + '/active', {
            method: 'POST',
            body: { isActive: !!isActive }
        });
        const j = await r.json().catch(() => ({}));
        if (j.success) await this.refreshAdminUsers();
        return { success: !!j.success, message: j.message || 'Done.' };
    }

    async adminDeleteUser(id) {
        const r = await apiFetch('/api/admin/users/' + encodeURIComponent(id), { method: 'DELETE' });
        const j = await r.json().catch(() => ({}));
        if (j.success) await this.refreshAdminUsers();
        return { success: !!j.success, message: j.message || 'Done.' };
    }

    async adminUpdateUser(id, updatedFields) {
        const r = await apiFetch('/api/admin/users/' + encodeURIComponent(id), {
            method: 'PATCH',
            body: updatedFields
        });
        const j = await r.json().catch(() => ({}));
        if (j.success) await this.refreshAdminUsers();
        return { success: !!j.success, message: j.message || 'Done.' };
    }

    async adminResetPassword(id, newPassword) {
        const r = await apiFetch('/api/admin/users/' + encodeURIComponent(id) + '/reset-password', {
            method: 'POST',
            body: { newPassword }
        });
        const j = await r.json().catch(() => ({}));
        return { success: !!j.success, message: j.message || 'Done.' };
    }

    requireAuth(redirectUrl = 'login.html') {
        if (!this.isLoggedIn()) {
            window.location.href = redirectUrl + '?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        return true;
    }

    requireAdmin(redirectUrl = 'home.html') {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        if (!this.isCurrentUserAdmin()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    requireMasterAdmin(redirectUrl = 'home.html') {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        if (!this.isCurrentUserMasterAdmin()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    requireProfessionalAccess(redirectUrl = 'home.html') {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        if (this.isCurrentUserPractice() && !this.isCurrentUserMasterAdmin()) {
            window.location.href = redirectUrl;
            return false;
        }
        if (!this.isCurrentUserProfessional()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    requireTeamStaffAccess(redirectUrl = 'home.html') {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        if (!this.isCurrentUserTeamMember() && !this.isCurrentUserMasterAdmin()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    attachEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        const userDropdownBtn = document.getElementById('userDropdownBtn');
        const dropdownMenu = document.getElementById('dropdownMenu');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', e => {
                e.preventDefault();
                this.logout();
            });
        }

        if (userDropdownBtn) {
            userDropdownBtn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                if (dropdownMenu) dropdownMenu.classList.toggle('show');
            });
        }

        document.addEventListener('click', e => {
            if (dropdownMenu && !e.target.closest('.user-menu')) {
                dropdownMenu.classList.remove('show');
            }
        });

        window.addEventListener('hashchange', () => {
            if (this.isLoggedIn() && this.isCurrentUserTeamMember()) {
                this.applyTeamMemberMainNav();
            }
        });
    }
}

const auth = new AuthSystem();
window.auth = auth;
window.OFFERABLE_SERVICE_IDS = OFFERABLE_SERVICE_IDS;
window.OFFERABLE_SERVICES_CATALOG = OFFERABLE_SERVICES_CATALOG;
window.LEGACY_SERVICES_EXPAND = LEGACY_SERVICES_EXPAND;
window.LEGACY_SERVICE_KEYS = LEGACY_SERVICE_KEYS;
