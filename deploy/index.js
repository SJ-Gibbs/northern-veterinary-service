/**
 * Northern Veterinary Service - Main JavaScript
 * Handles form validation, mobile menu, and interactive features
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // ===== Mobile Menu Toggle =====
    initMobileMenu();
    
    // ===== Form Validation =====
    initFormValidation();
    
    // ===== Smooth Scrolling for Anchor Links =====
    initSmoothScrolling();
    
    // ===== Add Active State to Current Page =====
    highlightActivePage();
    
    // ===== Add Fade-in Animation to Sections =====
    initScrollAnimations();

});

/**
 * Initialize mobile menu toggle functionality
 */
function initMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navList = document.querySelector('.nav-list');
    
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', function() {
            navList.classList.toggle('active');
            this.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.navbar')) {
                navList.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        });
        
        // Close menu when clicking a link
        const navLinks = navList.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navList.classList.remove('active');
                menuToggle.classList.remove('active');
            });
        });
    }
}

/**
 * Initialize form validation
 */
function initFormValidation() {
    const bookingForm = document.getElementById('bookingform');
    
    if (bookingForm) {
        // Real-time validation on blur
        const inputs = bookingForm.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            // Remove error on input
            input.addEventListener('input', function() {
                if (this.classList.contains('error')) {
                    this.classList.remove('error');
                    const errorMsg = this.parentElement.querySelector('.error-message');
                    if (errorMsg) {
                        errorMsg.classList.remove('show');
                    }
                }
            });
        });
        
        // Form submission validation
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            let isValid = true;
            inputs.forEach(input => {
                if (!validateField(input)) {
                    isValid = false;
                }
            });
            
            if (isValid) {
                handleFormSubmission(bookingForm);
            } else {
                // Scroll to first error
                const firstError = bookingForm.querySelector('.error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
}

/**
 * Validate individual form field
 * @param {HTMLElement} field - The form field to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateField(field) {
    const fieldType = field.type;

    if (fieldType === 'radio') {
        if (!field.hasAttribute('required')) {
            return true;
        }
        const form = field.form;
        const checked = form ? form.querySelector(`input[name="${field.name}"]:checked`) : null;
        const isValid = !!checked;
        const errorMessage = isValid ? '' : 'Please select an option';
        showFieldError(field, isValid, errorMessage);
        return isValid;
    }

    const value = field.value.trim();
    const isRequired = field.hasAttribute('required');
    
    let isValid = true;
    let errorMessage = '';
    
    // Check if required field is empty
    if (isRequired && !value) {
        isValid = false;
        errorMessage = 'This field is required';
    }
    
    // Email validation
    if (fieldType === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
    }
    
    // Phone validation
    if (fieldType === 'tel' && value) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(value) || value.length < 10) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
        }
    }
    
    // Textarea minimum length
    if (field.tagName === 'TEXTAREA' && value && value.length < 10) {
        isValid = false;
        errorMessage = 'Please provide more detail (minimum 10 characters)';
    }
    
    // Display error or clear it
    showFieldError(field, isValid, errorMessage);
    
    return isValid;
}

/**
 * Show or hide error message for a field
 * @param {HTMLElement} field - The form field
 * @param {boolean} isValid - Whether the field is valid
 * @param {string} message - Error message to display
 */
function showFieldError(field, isValid, message) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    let errorDiv = formGroup.querySelector('.error-message');
    
    if (!isValid) {
        field.classList.add('error');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            formGroup.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    } else {
        field.classList.remove('error');
        if (errorDiv) {
            errorDiv.classList.remove('show');
        }
    }
}

/**
 * Handle form submission
 * @param {HTMLFormElement} form - The form element
 */
function handleFormSubmission(form) {
    // Since there's no backend, show a success message
    const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
    const originalText = (submitBtn.value != null && submitBtn.value !== '')
        ? submitBtn.value
        : submitBtn.textContent;
    
    submitBtn.disabled = true;
    if (submitBtn.tagName === 'BUTTON') {
        submitBtn.textContent = 'Submitting...';
    } else {
        submitBtn.value = 'Submitting...';
    }

    if (form.id === 'bookingform') {
        const fd = new FormData(form);
        (async function () {
            try {
                const res = await fetch('/api/bookings', { method: 'POST', body: fd, credentials: 'include' });
                const j = await res.json().catch(() => ({}));
                if (!res.ok || !j.success) {
                    throw new Error(j.message || 'Could not submit request.');
                }
                try {
                    window.dispatchEvent(new CustomEvent('northern-vet-booking-requests-changed'));
                } catch (e) {
                    /* ignore */
                }
            } catch (err) {
                submitBtn.disabled = false;
                if (submitBtn.tagName === 'BUTTON') {
                    submitBtn.textContent = originalText;
                } else {
                    submitBtn.value = originalText;
                }
                alert(err.message || 'Submission failed. Please try again.');
                return;
            }
            finishSuccess();
        })();
        return;
    }

    function finishSuccess() {
    setTimeout(() => {
        // Create success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            background-color: #d4edda;
            color: #155724;
            padding: 1rem;
            border-radius: 5px;
            margin-bottom: 1rem;
            border: 2px solid #28a745;
            text-align: center;
        `;
        successDiv.innerHTML = `
            <strong>Thank you for your request!</strong><br>
            We will contact you shortly to confirm your booking.
        `;
        
        form.insertBefore(successDiv, form.firstChild);
        form.reset();
        submitBtn.disabled = false;
        if (submitBtn.tagName === 'BUTTON') {
            submitBtn.textContent = originalText;
        } else {
            submitBtn.value = originalText;
        }
        
        // Scroll to success message
        successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove success message after 5 seconds
        setTimeout(() => {
            successDiv.style.opacity = '0';
            successDiv.style.transition = 'opacity 0.5s';
            setTimeout(() => successDiv.remove(), 500);
        }, 5000);
    }, 1000);
    }
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Highlight active page in navigation
 */
function highlightActivePage() {
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    const navLinks = document.querySelectorAll('.nav-list a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const linkPage = link.getAttribute('href');
        
        if (linkPage === currentPage || 
            (currentPage === '' && linkPage === 'home.html')) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

/**
 * Initialize scroll animations
 */
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Observe all content sections
    document.querySelectorAll('.content-section, .service-card, .staffbox, .gallery-item').forEach(el => {
        observer.observe(el);
    });
}

/**
 * File input preview (if needed in the future)
 */
function initFilePreview() {
    const fileInput = document.getElementById('file');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name;
            if (fileName) {
                console.log('File selected:', fileName);
                // Could add preview functionality here
            }
        });
    }
}

// Export functions for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateField,
        highlightActivePage
    };
}
