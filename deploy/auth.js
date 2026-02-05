// Authentication System for Northern Veterinary Service
// NOTE: This is a client-side demo authentication system using localStorage
// For production use, implement proper server-side authentication with secure password hashing

class AuthSystem {
    constructor() {
        this.storageKey = 'nvs_users';
        this.sessionKey = 'nvs_current_user';
        this.init();
    }

    init() {
        // Initialize users storage if it doesn't exist
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
        
        // Update UI based on auth state
        this.updateAuthUI();
        
        // Add event listeners
        this.attachEventListeners();
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
    signup(practiceName, email, password, phone = '') {
        const users = this.getUsers();
        
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
        
        if (!user.isActive) {
            return { success: false, message: 'This account has been deactivated. Please contact support.' };
        }
        
        // Store session
        const session = {
            id: user.id,
            email: user.email,
            practiceName: user.practiceName,
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

    // Update UI based on authentication state
    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        
        if (this.isLoggedIn()) {
            const user = this.getCurrentUser();
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (userName) userName.textContent = user.practiceName;
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    // Require authentication for page
    requireAuth(redirectUrl = 'login.html') {
        if (!this.isLoggedIn()) {
            window.location.href = redirectUrl + '?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        return true;
    }
}

// Initialize auth system globally
const auth = new AuthSystem();

// Expose auth to window for use in other scripts
window.auth = auth;

