// Authentication System for Northern Veterinary Service
// NOTE: This is a client-side demo authentication system using localStorage
// For production use, implement proper server-side authentication with secure password hashing

class AuthSystem {
    constructor() {
        this.storageKey = 'northern_vet_users';
        this.sessionKey = 'northern_vet_current_user';
        this.professionalRoles = ['vet', 'veterinary_nurse'];
        /** Master admin: Admin Panel, user management, site-wide booking diary (info@…) */
        this.masterAdminEmail = 'info@northernveterinaryservice.co.uk';
        /** accountType: admin | team_member | practice */
        this.init();
    }

    init() {
        // Initialize users storage if it doesn't exist
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }

        this.ensureMasterAdminAccount();
        this.migrateAccountTypes();
        this.ensureTestDemoAccount();

        // Update UI based on auth state
        this.updateAuthUI();
        
        // Add event listeners
        this.attachEventListeners();
    }

    // Ensures info@northernveterinaryservice.co.uk is the only admin (runs every init)
    ensureMasterAdminAccount() {
        const MASTER = this.masterAdminEmail;
        const pluralLegacyEmail = 'info@northernveterinaryservices.co.uk';
        const typoEmail = 'info@nothernveterinaryservices.co.uk';
        const legacyAdminEmail = 'admin@northernveterinaryservice.co.uk';
        const users = this.getUsers();

        users.forEach(u => {
            if (u.email === pluralLegacyEmail) u.email = MASTER;
        });

        // Canonical email so login + password sync always match
        users.forEach(u => {
            if (u.email && u.email.trim().toLowerCase() === MASTER.toLowerCase()) {
                u.email = MASTER;
            }
        });

        if (!users.find(u => u.email === MASTER)) {
            const typoIdx = users.findIndex(u => u.email === typoEmail);
            if (typoIdx !== -1) {
                users[typoIdx].email = MASTER;
                users[typoIdx].practiceName = users[typoIdx].practiceName || 'Northern Veterinary Service Master Admin';
            } else {
                const legacyIdx = users.findIndex(
                    u => u.email === legacyAdminEmail && u.isAdmin === true
                );
                if (legacyIdx !== -1) {
                    users[legacyIdx].email = MASTER;
                    users[legacyIdx].practiceName = 'Northern Veterinary Service Master Admin';
                } else if (!users.some(u => u.isAdmin === true)) {
                    users.push({
                        id: 'site-master-admin-001',
                        practiceName: 'Northern Veterinary Service Master Admin',
                        email: MASTER,
                        password: btoa('1234'),
                        phone: '',
                        address: { line1: '', line2: '', city: '', postcode: '', county: '' },
                        createdAt: new Date().toISOString(),
                        isActive: true,
                        isAdmin: true,
                        role: 'admin',
                        accountType: 'admin'
                    });
                }
            }
        }

        const hasMaster = users.some(u => u.email === MASTER);
        users.forEach(u => {
            if (u.email === MASTER) {
                u.isAdmin = true;
                u.role = 'admin';
                u.accountType = 'admin';
                u.password = btoa('1234');
            } else if (hasMaster && u.isAdmin === true) {
                u.isAdmin = false;
                if (u.role === 'admin') {
                    u.role = u.accountType === 'practice' ? 'practice' : 'vet';
                }
            }
        });

        localStorage.setItem(this.storageKey, JSON.stringify(users));
    }

    /** Normalize legacy professional → team_member; ensure accountType is set. */
    migrateAccountTypes() {
        const users = this.getUsers();
        let changed = false;
        users.forEach(u => {
            if (u.isAdmin) return;
            if (u.accountType === 'professional') {
                u.accountType = 'team_member';
                changed = true;
            }
            if (!u.accountType) {
                const r = this.normalizeRole(u.role);
                u.accountType = r === 'practice' ? 'practice' : 'team_member';
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem(this.storageKey, JSON.stringify(users));
        }
    }

    /** Demo vet login for testing (only added if email not already registered). */
    ensureTestDemoAccount() {
        const TEST_EMAIL = 'stevengibbs@btopenworld.com';
        const users = this.getUsers();
        if (users.some(u => u.email.toLowerCase() === TEST_EMAIL)) {
            return;
        }
        users.push({
            id: 'demo-test-steven-gibbs',
            practiceName: 'Test login (Steven Gibbs)',
            email: TEST_EMAIL,
            password: btoa('123'),
            phone: '',
            address: { line1: '', line2: '', city: '', postcode: '', county: '' },
            role: 'vet',
            accountType: 'team_member',
            createdAt: new Date().toISOString(),
            isActive: true
        });
        localStorage.setItem(this.storageKey, JSON.stringify(users));
    }

    attachEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        const userDropdownBtn = document.getElementById('userDropdownBtn');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        if (userDropdownBtn) {
            userDropdownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropdownMenu.classList.toggle('show');
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdownMenu && !e.target.closest('.user-menu')) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // Register a new user (practice or team_member only — master is not created via signup)
    signup(practiceName, email, password, phone = '', address = null, options = {}) {
        const users = this.getUsers();
        const rawType = options.accountType;
        const accountType = rawType === 'practice' ? 'practice' : rawType === 'team_member' ? 'team_member' : '';
        let role = this.normalizeRole(options.role);

        if (accountType !== 'practice' && accountType !== 'team_member') {
            return { success: false, message: 'Choose a valid account type (practice or team member).' };
        }
        if (accountType === 'practice') {
            role = 'practice';
        } else if (!role || !this.professionalRoles.includes(role)) {
            return { success: false, message: 'Please select a valid role (Vet or Veterinary Nurse).' };
        }
        
        // Check if email already exists
        if (users.find(user => user.email === email)) {
            return { success: false, message: 'An account with this email already exists.' };
        }
        
        // Validate email format
        if (!this.isValidEmail(email)) {
            return { success: false, message: 'Please enter a valid email address.' };
        }
        
        // Validate password strength
        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters long.' };
        }
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            practiceName,
            email,
            password: btoa(password), // Basic encoding (NOT secure for production!)
            phone,
            address: address || {
                line1: '',
                line2: '',
                city: '',
                postcode: '',
                county: ''
            },
            role,
            accountType,
            createdAt: new Date().toISOString(),
            isActive: true
        };
        
        users.push(newUser);
        localStorage.setItem(this.storageKey, JSON.stringify(users));
        
        return { success: true, message: 'Account created successfully!' };
    }

    // Login user
    login(email, password) {
        const users = this.getUsers();
        const emailNorm = (email || '').trim().toLowerCase();
        const user = users.find(u => (u.email || '').trim().toLowerCase() === emailNorm);

        if (!user) {
            return { success: false, message: 'Invalid email or password.' };
        }

        // Check password (decode from base64)
        let decodedPassword;
        try {
            decodedPassword = atob(user.password);
        } catch (e) {
            return { success: false, message: 'Invalid email or password.' };
        }
        if (decodedPassword !== password) {
            return { success: false, message: 'Invalid email or password.' };
        }
        
        if (!user.isActive && !user.isAdmin) {
            return { success: false, message: 'This account has been deactivated. Please contact support.' };
        }
        
        // Store session
        const session = {
            id: user.id,
            email: user.email,
            practiceName: user.practiceName,
            isAdmin: user.isAdmin || false,
            role: this.getUserRole(user),
            accountType: user.accountType || (this.getUserRole(user) === 'practice' ? 'practice' : 'team_member'),
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem(this.sessionKey, JSON.stringify(session));

        // Same flag as enter.html / site gate — unlocks browsing home, pricing, etc.
        try {
            sessionStorage.setItem('northern_vet_site_access', '1');
        } catch (e) {
            /* ignore if sessionStorage unavailable */
        }

        return { success: true, message: 'Login successful!', user: session };
    }

    // Logout user
    logout() {
        localStorage.removeItem(this.sessionKey);
        window.location.href = 'home.html';
    }

    // Check if user is logged in
    isLoggedIn() {
        const session = localStorage.getItem(this.sessionKey);
        return session !== null;
    }

    // Get current user session
    getCurrentUser() {
        const session = localStorage.getItem(this.sessionKey);
        return session ? JSON.parse(session) : null;
    }

    // Get all users (admin function)
    getUsers() {
        const users = localStorage.getItem(this.storageKey);
        return users ? JSON.parse(users) : [];
    }

    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Normalize incoming role values to storage keys
    normalizeRole(role) {
        if (!role) return '';
        const normalized = role.toString().trim().toLowerCase();
        if (normalized === 'nurse') return 'veterinary_nurse';
        return normalized;
    }

    // Human-readable role label
    getRoleLabel(role) {
        if (role === 'vet') return 'Vet';
        if (role === 'veterinary_nurse') return 'Veterinary Nurse';
        if (role === 'practice') return 'Practice';
        if (role === 'admin') return 'Admin';
        return 'Member';
    }

    /** UI label for accountType */
    getAccountTypeLabel(user) {
        if (!user) return '—';
        if (user.isAdmin && user.email && user.email.toLowerCase() === this.masterAdminEmail.toLowerCase()) {
            return 'Master admin';
        }
        if (user.isAdmin) return 'Admin';
        const t = user.accountType;
        if (t === 'practice') return 'Practice';
        if (t === 'team_member') return 'Team member';
        return 'Member';
    }

    // Resolve role from user record (including legacy users)
    getUserRole(user) {
        if (!user) return '';
        if (user.isAdmin) return 'admin';
        return this.normalizeRole(user.role);
    }

    // Check if the currently logged-in user is an admin
    // (reads from full user record so old sessions without isAdmin still work)
    isCurrentUserAdmin() {
        const session = this.getCurrentUser();
        if (!session) return false;
        const user = this.getUsers().find(u => u.id === session.id);
        return user ? (user.isAdmin === true) : false;
    }

    /** Master admin only (booking diary + sole site admin). */
    isCurrentUserMasterAdmin() {
        const session = this.getCurrentUser();
        if (!session) return false;
        const user = this.getUsers().find(u => u.id === session.id);
        if (!user || user.isAdmin !== true) return false;
        return user.email.toLowerCase() === this.masterAdminEmail.toLowerCase();
    }

    isCurrentUserTeamMember() {
        const user = this.getUserProfile();
        return !!(user && user.accountType === 'team_member' && !user.isAdmin);
    }

    isCurrentUserPractice() {
        const user = this.getUserProfile();
        return !!(user && user.accountType === 'practice');
    }

    /** Practices (and master) can submit the public booking form; team members use staff tools instead. */
    canAccessBookingForm() {
        if (this.isCurrentUserMasterAdmin()) return true;
        return this.isCurrentUserPractice();
    }

    // Check if current user may access clinical Resources (team + master; not practice-only accounts)
    isCurrentUserProfessional() {
        if (this.isCurrentUserMasterAdmin()) return true;
        if (this.isCurrentUserTeamMember()) return true;
        const session = this.getCurrentUser();
        if (!session) return false;
        const user = this.getUsers().find(u => u.id === session.id);
        if (!user) return false;
        return this.professionalRoles.includes(this.getUserRole(user));
    }

    // Update UI based on authentication state
    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        if (this.isLoggedIn()) {
            const isAdmin = this.isCurrentUserAdmin();
            const user = this.getCurrentUser();
            const isProfessional = this.isCurrentUserProfessional();
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

            // Dynamically inject Admin Panel link for admin users
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

            const accountLinkEl = document.getElementById('accountLink');
            if (dropdownMenu && this.isCurrentUserTeamMember() && !document.getElementById('staffDiaryLink')) {
                const staffDiary = document.createElement('a');
                staffDiary.href = 'staff-diary.html';
                staffDiary.className = 'dropdown-item';
                staffDiary.id = 'staffDiaryLink';
                staffDiary.textContent = '📅 My availability';
                staffDiary.style.cssText = 'color:#1a5276;font-weight:600;';
                if (accountLinkEl) {
                    dropdownMenu.insertBefore(staffDiary, accountLinkEl);
                } else {
                    dropdownMenu.prepend(staffDiary);
                }
            }

            if (dropdownMenu && (this.isCurrentUserTeamMember() || this.isCurrentUserMasterAdmin()) && !document.getElementById('bookingsInboxLink')) {
                const bookingsLink = document.createElement('a');
                bookingsLink.href = 'bookings-inbox.html';
                bookingsLink.className = 'dropdown-item';
                bookingsLink.id = 'bookingsInboxLink';
                bookingsLink.textContent = '📋 Booking requests';
                bookingsLink.style.cssText = 'font-weight:600;';
                const ref = document.getElementById('staffDiaryLink')
                    || document.getElementById('diaryAdminLink')
                    || document.getElementById('adminPanelLink');
                if (ref) {
                    ref.insertAdjacentElement('afterend', bookingsLink);
                } else if (accountLinkEl) {
                    dropdownMenu.insertBefore(bookingsLink, accountLinkEl);
                } else {
                    dropdownMenu.prepend(bookingsLink);
                }
            }

            // Dynamically inject Resources link for professional users
            const navList = document.querySelector('.nav-list');
            if (navList) {
                const existingResourcesLink = navList.querySelector('a[href="resources.html"]');
                if (isProfessional && !existingResourcesLink) {
                    const li = document.createElement('li');
                    li.id = 'resourcesNavLink';
                    const link = document.createElement('a');
                    link.href = 'resources.html';
                    link.textContent = 'Resources';
                    li.appendChild(link);
                    navList.appendChild(li);
                } else if (!isProfessional && existingResourcesLink) {
                    existingResourcesLink.closest('li')?.remove();
                }
            }
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
            const existingResourcesLink = document.querySelector('.nav-list a[href="resources.html"]');
            if (existingResourcesLink) existingResourcesLink.closest('li')?.remove();
        }
    }

    // Get full user profile (including fields not stored in session)
    getUserProfile() {
        const session = this.getCurrentUser();
        if (!session) return null;
        const users = this.getUsers();
        return users.find(u => u.id === session.id) || null;
    }

    // Update user profile details
    updateUser(updatedFields) {
        const session = this.getCurrentUser();
        if (!session) return { success: false, message: 'You must be logged in to update your profile.' };

        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === session.id);
        if (idx === -1) return { success: false, message: 'User account not found.' };

        // Validate email if being changed
        if (updatedFields.email && updatedFields.email !== users[idx].email) {
            if (!this.isValidEmail(updatedFields.email)) {
                return { success: false, message: 'Please enter a valid email address.' };
            }
            if (users.find((u, i) => i !== idx && u.email === updatedFields.email)) {
                return { success: false, message: 'An account with this email already exists.' };
            }
        }

        // Apply allowed field updates
        const allowed = ['practiceName', 'email', 'phone', 'address'];
        allowed.forEach(field => {
            if (updatedFields[field] !== undefined) {
                users[idx][field] = updatedFields[field];
            }
        });

        localStorage.setItem(this.storageKey, JSON.stringify(users));

        // Refresh session with updated values
        const updatedSession = {
            id: users[idx].id,
            email: users[idx].email,
            practiceName: users[idx].practiceName,
            isAdmin: users[idx].isAdmin === true,
            role: this.getUserRole(users[idx]),
            accountType: users[idx].accountType || (this.getUserRole(users[idx]) === 'practice' ? 'practice' : 'team_member'),
            loginTime: session.loginTime
        };
        localStorage.setItem(this.sessionKey, JSON.stringify(updatedSession));
        this.updateAuthUI();

        return { success: true, message: 'Profile updated successfully!' };
    }

    // Update password
    updatePassword(currentPassword, newPassword) {
        const session = this.getCurrentUser();
        if (!session) return { success: false, message: 'You must be logged in to change your password.' };

        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === session.id);
        if (idx === -1) return { success: false, message: 'User account not found.' };

        // Verify current password
        if (atob(users[idx].password) !== currentPassword) {
            return { success: false, message: 'Current password is incorrect.' };
        }

        if (newPassword.length < 6) {
            return { success: false, message: 'New password must be at least 6 characters long.' };
        }

        users[idx].password = btoa(newPassword);
        localStorage.setItem(this.storageKey, JSON.stringify(users));

        return { success: true, message: 'Password changed successfully!' };
    }

    // ── Admin-only data methods ──────────────────────────────────────

    // Get all non-admin member practices
    getAllPractices() {
        return this.getUsers().filter(u => !u.isAdmin);
    }

    // Activate or deactivate a practice account
    setUserActiveStatus(id, isActive) {
        if (!this.isCurrentUserAdmin()) return { success: false, message: 'Admin access required.' };
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return { success: false, message: 'User not found.' };
        users[idx].isActive = isActive;
        localStorage.setItem(this.storageKey, JSON.stringify(users));
        return { success: true, message: `Account ${isActive ? 'activated' : 'deactivated'} successfully.` };
    }

    // Delete a practice account (cannot delete admin accounts)
    adminDeleteUser(id) {
        if (!this.isCurrentUserAdmin()) return { success: false, message: 'Admin access required.' };
        const users = this.getUsers();
        const target = users.find(u => u.id === id);
        if (!target) return { success: false, message: 'User not found.' };
        if (target.isAdmin) return { success: false, message: 'Cannot delete admin accounts.' };
        const filtered = users.filter(u => u.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
        return { success: true, message: 'Practice account deleted.' };
    }

    // Admin: update any practice's profile fields
    adminUpdateUser(id, updatedFields) {
        if (!this.isCurrentUserAdmin()) return { success: false, message: 'Admin access required.' };
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return { success: false, message: 'User not found.' };
        if (users[idx].isAdmin) return { success: false, message: 'Cannot edit admin accounts here.' };

        if (updatedFields.email && updatedFields.email !== users[idx].email) {
            if (!this.isValidEmail(updatedFields.email)) {
                return { success: false, message: 'Invalid email address.' };
            }
            if (users.find((u, i) => i !== idx && u.email === updatedFields.email)) {
                return { success: false, message: 'Email already in use by another account.' };
            }
        }

        const allowed = ['practiceName', 'email', 'phone', 'address'];
        allowed.forEach(field => {
            if (updatedFields[field] !== undefined) users[idx][field] = updatedFields[field];
        });
        localStorage.setItem(this.storageKey, JSON.stringify(users));
        return { success: true, message: 'Practice details updated.' };
    }

    // Admin: reset a practice's password without knowing the current one
    adminResetPassword(id, newPassword) {
        if (!this.isCurrentUserAdmin()) return { success: false, message: 'Admin access required.' };
        if (newPassword.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return { success: false, message: 'User not found.' };
        if (users[idx].isAdmin) return { success: false, message: 'Cannot reset admin password here.' };
        users[idx].password = btoa(newPassword);
        localStorage.setItem(this.storageKey, JSON.stringify(users));
        return { success: true, message: 'Password reset successfully.' };
    }

    // ─────────────────────────────────────────────────────────────────

    // Require authentication for page
    requireAuth(redirectUrl = 'login.html') {
        if (!this.isLoggedIn()) {
            window.location.href = redirectUrl + '?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        return true;
    }

    // Require admin role for page
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

    /** Booking diary editor — master admin account only */
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

    // Resources / discharge forms — team members + master; not practice-only accounts
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

    /** Staff diary + booking requests inbox — team members and master admin */
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
}

// Initialize auth system globally
const auth = new AuthSystem();

// Expose auth to window for use in other scripts
window.auth = auth;

