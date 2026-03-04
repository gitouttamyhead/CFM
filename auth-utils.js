/**
 * Shared auth guard for protected CFM pages.
 * Depends on window.auth and window.db (from firebase-config.js).
 */

/**
 * Ensures the user is logged in. If not, redirects to index.html.
 * @returns {Promise<{user: firebase.User, role: string|null}>} Resolves with user and role when logged in; never resolves if redirecting
 */
function requireAuth() {
    return new Promise((resolve) => {
        const auth = window.auth;
        if (!auth) {
            window.location.href = 'index.html';
            return;
        }
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            const db = window.db;
            let role = null;
            if (db) {
                try {
                    const doc = await db.collection('users').doc(user.uid).get();
                    if (doc.exists) role = doc.data().role || null;
                } catch (e) {
                    console.warn('Auth: could not fetch user role', e);
                }
            }
            resolve({ user, role });
        });
    });
}

/**
 * @param {string|null} role
 * @returns {boolean}
 */
function isEditorOrAdmin(role) {
    return role === 'admin' || role === 'editor';
}
