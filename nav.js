// Load nav markup into #navWrapper, then init behavior
function initNav() {
    const auth = window.auth || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth());
    const db = window.db || (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore());

    if (auth) {
        auth.onAuthStateChanged(user => {
            const navWrapper = document.getElementById('navWrapper');
            const adminNavItem = document.getElementById('adminNavItem');

            if (user) {
                if (navWrapper) navWrapper.style.display = 'block';
                if (db) {
                    const userDocRef = db.collection('users').doc(user.uid);
                    userDocRef.get().then(doc => {
                        if (doc.exists && doc.data().role === 'admin') {
                            if (adminNavItem) adminNavItem.style.display = 'block';
                        } else {
                            if (adminNavItem) adminNavItem.style.display = 'none';
                        }
                    });
                }
            } else {
                if (navWrapper) navWrapper.style.display = 'none';
                if (adminNavItem) adminNavItem.style.display = 'none';
            }
        });
    }

    const hamburger = document.querySelector('.hamburger');
    const navContainer = document.querySelector('.nav-container');
    const closeButton = document.querySelector('.close-nav-button');

    if (hamburger && navContainer) {
        hamburger.addEventListener('click', function() {
            navContainer.classList.toggle('active');
        });
    }
    if (closeButton && navContainer) {
        closeButton.addEventListener('click', function() {
            navContainer.classList.remove('active');
        });
    }
    if (navContainer && hamburger) {
        document.addEventListener('click', function(e) {
            if (!navContainer.contains(e.target) && !hamburger.contains(e.target)) {
                navContainer.classList.remove('active');
            }
        });
    }

    const logoutBtn = document.getElementById('navLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const authObj = window.auth || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth());
            if (authObj) {
                authObj.signOut().then(() => {
                    window.location.href = 'index.html';
                }).catch(() => {
                    window.location.href = 'index.html';
                });
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    const submenuToggles = document.querySelectorAll('.has-submenu > a');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth > 768) {
                e.preventDefault();
                this.parentElement.classList.toggle('open');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const wrapper = document.getElementById('navWrapper');
    if (!wrapper) return;

    fetch('nav.html')
        .then(r => r.text())
        .then(html => {
            wrapper.innerHTML = html;
            initNav();
        })
        .catch(err => {
            console.error('Failed to load nav:', err);
        });
});
