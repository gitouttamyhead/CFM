/**
 * Shared auth helpers for CFM pages.
 * Depends on window.auth and window.db (from firebase-config.js).
 */

/**
 * Role from invitations/{authEmail}, default user.
 * @param {string} authEmail
 * @returns {Promise<string>}
 */
async function resolveSignupRole(authEmail) {
    let role = 'user';
    const db = window.db;
    if (!authEmail || !db) return role;
    try {
        const inviteDoc = await db.collection('invitations').doc(authEmail).get();
        if (inviteDoc.exists) {
            const invitedRole = inviteDoc.data().role;
            if (['user', 'editor', 'admin'].includes(invitedRole)) {
                role = invitedRole;
            }
        }
    } catch (e) {
        console.warn('Could not check invitation:', e);
    }
    return role;
}

/**
 * Ensure Firestore users/{uid} exists (Firebase Auth does not create this automatically).
 * Heals "Auth-only" accounts on login. Safe to call when the profile already exists.
 *
 * @param {firebase.User} user
 * @param {{ name?: string }} [options]
 * @returns {Promise<{ role: string|null, created: boolean }>}
 */
async function ensureUserProfile(user, options) {
    const db = window.db;
    if (!user || !db) {
        return { role: null, created: false };
    }

    const ref = db.collection('users').doc(user.uid);
    const existing = await ref.get();
    if (existing.exists) {
        return { role: existing.data().role || 'user', created: false };
    }

    const authEmail = user.email;
    if (!authEmail) {
        throw new Error('Your account has no email on file. Contact your administrator.');
    }

    const name = (options && options.name
        ? options.name
        : (user.displayName || authEmail.split('@')[0] || 'User')).trim();
    if (!name) {
        throw new Error('Name is required.');
    }

    const role = await resolveSignupRole(authEmail);
    await ref.set({
        email: authEmail,
        name: name.slice(0, 100),
        role: role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { role: role, created: true };
}

/**
 * Ensures the user is logged in. If not, redirects to index.html.
 * @returns {Promise<{user: firebase.User, role: string|null}>}
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
            let role = null;
            try {
                const profile = await ensureUserProfile(user);
                role = profile.role;
            } catch (e) {
                console.warn('Auth: could not ensure user profile', e);
            }
            if (window.CFMAnalytics) {
                window.CFMAnalytics.recordLogin(user);
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

window.CFMAuth = {
    resolveSignupRole: resolveSignupRole,
    ensureUserProfile: ensureUserProfile,
    requireAuth: requireAuth,
    isEditorOrAdmin: isEditorOrAdmin
};
