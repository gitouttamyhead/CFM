// Standardized Navigation Script for CFM
// This provides consistent hamburger menu behavior across all pages

function setupStandardizedNav() {
    const hamburger = document.querySelector('.hamburger');
    const navContainer = document.querySelector('.nav-container');
    const body = document.body;
    
    if (hamburger) {
        // Remove any existing listeners to prevent duplicates
        hamburger.removeEventListener('click', handleHamburgerClick);
        hamburger.removeEventListener('touchstart', handleHamburgerClick);
        
        // Add both click and touch events for better mobile support
        hamburger.addEventListener('click', handleHamburgerClick);
        hamburger.addEventListener('touchstart', handleHamburgerClick, { passive: true });
    }
    
    // Handle hamburger click/touch
    function handleHamburgerClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle both class systems for compatibility
        body.classList.toggle('nav-active');
        hamburger.classList.toggle('active');
        if (navContainer) {
            navContainer.classList.toggle('active');
        }
    }
    
    // Click outside to close (for mobile)
    document.addEventListener('click', function(e) {
        if (body.classList.contains('nav-active') && 
            !hamburger.contains(e.target) && 
            !navContainer.contains(e.target)) {
            body.classList.remove('nav-active');
            hamburger.classList.remove('active');
            if (navContainer) {
                navContainer.classList.remove('active');
            }
        }
    });
    
    // Close nav when clicking on nav links (mobile)
    const navLinks = document.querySelectorAll('.nav-item a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                body.classList.remove('nav-active');
                hamburger.classList.remove('active');
                if (navContainer) {
                    navContainer.classList.remove('active');
                }
            }
        });
    });
    
    // Handle submenu toggles
    const submenuToggles = document.querySelectorAll('.has-submenu > a');
    submenuToggles.forEach(toggle => {
        if (toggle.hasAttribute('data-submenu-listener')) return;
        toggle.setAttribute('data-submenu-listener', 'true');
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggle.parentElement.classList.toggle('open');
        });
    });
    
    // Setup logout
    const logoutBtn = document.getElementById('navLogout');
    if (logoutBtn && !logoutBtn.hasAttribute('data-logout-listener')) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof auth !== 'undefined') {
                auth.signOut();
            }
        });
        logoutBtn.setAttribute('data-logout-listener', 'true');
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            // On desktop, ensure nav is properly positioned
            body.classList.remove('nav-active');
            hamburger.classList.remove('active');
            if (navContainer) {
                navContainer.classList.remove('active');
            }
        }
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupStandardizedNav);
} else {
    setupStandardizedNav();
} 