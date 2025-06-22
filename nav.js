// Simple navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check auth status and show/hide navigation
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(user => {
            const navWrapper = document.getElementById('navWrapper');
            if (navWrapper) {
                if (user) {
                    navWrapper.style.display = 'block';
                } else {
                    navWrapper.style.display = 'none';
                }
            }
        });
    }
    
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navContainer = document.querySelector('.nav-container');
    const closeButton = document.querySelector('.close-nav-button');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navContainer.classList.toggle('active');
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            navContainer.classList.remove('active');
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navContainer.contains(e.target) && !hamburger.contains(e.target)) {
            navContainer.classList.remove('active');
        }
    });
    
    // Handle logout
    const logoutBtn = document.getElementById('navLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().signOut().then(() => {
                    window.location.href = 'index.html';
                }).catch((error) => {
                    console.error('Logout error:', error);
                    window.location.href = 'index.html';
                });
            } else {
                window.location.href = 'index.html';
            }
        });
    }
    
    // Handle submenu toggles
    const submenuItems = document.querySelectorAll('.has-submenu > a');
    submenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const submenu = this.nextElementSibling;
            submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
        });
    });
}); 