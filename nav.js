// Standardized Navigation Script for CFM
// This provides consistent hamburger menu behavior across all pages

function setupStandardizedNav() {
    const hamburger = document.querySelector('.hamburger');
    const closeButton = document.querySelector('.close-nav-button');
    const navContainer = document.querySelector('.nav-container');
    const body = document.body;
    
    function openNav() {
        body.classList.add('nav-active');
    }

    function closeNav() {
        body.classList.remove('nav-active');
    }

    if (hamburger) {
        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openNav();
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeNav();
        });
    }
    
    // Close nav when clicking on nav links (mobile)
    const navLinks = document.querySelectorAll('.nav-item a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeNav();
            }
        });
    });
    
    // Handle submenu toggles
    const submenuToggles = document.querySelectorAll('.has-submenu > a');
    submenuToggles.forEach(toggle => {
        if (toggle.hasAttribute('data-submenu-listener')) return;
        toggle.setAttribute('data-submenu-listener', 'true');
        toggle.addEventListener('click', (e) => {
            // On mobile, let the main nav link handler close the menu.
            // On desktop, just toggle the submenu.
            if (window.innerWidth > 768) {
                e.preventDefault();
                toggle.parentElement.classList.toggle('open');
            }
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
            // On desktop, ensure nav is not active
            closeNav();
        }
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupStandardizedNav);
} else {
    setupStandardizedNav();
} 