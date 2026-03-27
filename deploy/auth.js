// Authentication System for Northern Veterinary Service
// NOTE: This is a client-side demo authentication system using localStorage
// For production use, implement proper server-side authentication with secure password hashing

class AuthSystem {
    constructor() {
        this.storageKey = 'nvs_users';
        this.sessionKey = 'nvs_current_user';
        this.professionalRoles = ['vet', 'veterinary_nurse'];
        this.init();
    }

    init() {
        // Initialize users storage if it doesn't exist
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }

        // Seed default admin account if none exists
        this.seedAdmin();
        this.seedDemoProfessionalUser();
        
        // Update UI based on auth state
        this.updateAuthUI();
        
        // Add event listeners
        this.attachEventListeners();
    }

    // Seed a default admin account (idempotent – safe to call on every init)
    seedAdmin() {
        const users = this.getUsers();
        if (users.find(u => u.isAdmin === true)) return; // already seeded
        const adminUser = {
            id: 'nvs-admin-001',
            practiceName: 'NVS Admin',
            email: 'admin@northernveterinaryservice.co.uk',
            password: btoa('NVSadmin2026!'),
            phone: '',
            address: { line1: '', line2: '', city: '', postcode: '', county: '' },
            createdAt: new Date().toISOString(),
            isActive: true,
            isAdmin: true,
            role: 'admin'
        };
        users.push(adminUser);
        localStorage.setItem(this.storageKey, JSON.stringify(users));
    }

    // Seed requested professional login (idempotent)
    seedDemoProfessionalUser() {
        const users = this.getUsers();
        const demoEmail = 'info@nothernveterinaryservices.co.uk';
        if (users.find(u => u.email === demoEmail)) return;
        const demoUser = {
            id: 'nvs-demo-vet-001',
            practiceName: 'NVS Professional User',
            email: demoEmail,
            password: btoa('1'),
            phone: '',
            address: { line1: '', line2: '', city: '', postcode: '', county: '' },
            role: 'vet',
            createdAt: new Date().toISOString(),
            isActive: true
        };
        users.push(demoUser);
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

    // Register a new user
    signup(practiceName, email, password, phone = '', address = null, options = {}) {
        const users = this.getUsers();
        const role = this.normalizeRole(options.role);
        
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

        if (role && !this.professionalRoles.includes(role)) {
            return { success: false, message: 'Please select a valid professional role.' };
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
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return { success: false, message: 'Invalid email or password.' };
        }
        
        // Check password (decode from base64)
        const decodedPassword = atob(user.password);
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
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
        
        return { success: true, message: 'Login successful!', user: session };
    }

    // Logout user
    logout() {
        localStorage.removeItem(this.sessionKey);
        window.location.href = 'index.html';
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

    // Check if current user is a logged-in professional (vet or veterinary nurse)
    isCurrentUserProfessional() {
        const session = this.getCurrentUser();
        if (!session) return false;
        if (session.isAdmin) return true;
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
                userName.textContent = isAdmin
                    ? '⚙️ Admin'
                    : `${user.practiceName} (${this.getRoleLabel(user.role)})`;
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
            role: this.getUserRole(users[idx]),
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
    requireAdmin(redirectUrl = 'index.html') {
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

    // Require a veterinary professional role for restricted pages
    requireProfessionalAccess(redirectUrl = 'index.html') {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        if (!this.isCurrentUserProfessional()) {
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

