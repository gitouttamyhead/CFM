// Simple navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check auth status and show/hide navigation
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const auth = firebase.auth();
        const db = firebase.firestore();

        auth.onAuthStateChanged(user => {
            const navWrapper = document.getElementById('navWrapper');
            const adminNavItem = document.getElementById('adminNavItem');

            if (user) {
                // Show the main navigation
                if (navWrapper) navWrapper.style.display = 'block';
                
                // Check user role for admin link
                const userDocRef = db.collection('users').doc(user.uid);
                userDocRef.get().then(doc => {
                    if (doc.exists && doc.data().role === 'admin') {
                        if (adminNavItem) adminNavItem.style.display = 'block';
                    } else {
                        if (adminNavItem) adminNavItem.style.display = 'none';
                    }
                });

            } else {
                // Hide navigation if logged out
                if (navWrapper) navWrapper.style.display = 'none';
                if (adminNavItem) adminNavItem.style.display = 'none';
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
    const submenuToggles = document.querySelectorAll('.has-submenu > a');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            // On desktop, prevent navigation and toggle the submenu.
            // On mobile, allow navigation. The submenu can be opened by tapping the arrow.
            if (window.innerWidth > 768) {
                e.preventDefault();
                this.parentElement.classList.toggle('open');
            }
        });
    });
}); 