/**
 * Lightweight, privacy-conscious usage tracking for CFM.
 * - Firebase Analytics: aggregate events (login, search, view_insight)
 * - Firestore: lastLoginAt on users, viewCount + lastViewedAt on insights
 *
 * Load firebase-analytics.js before firebase-config.js, then this file.
 */
(function () {
    let analytics = null;

    function init() {
        if (typeof firebase === 'undefined' || !firebase.apps.length) return;
        if (typeof firebase.analytics !== 'function') return;
        try {
            analytics = firebase.analytics();
        } catch (e) {
            console.warn('CFM Analytics: init failed', e);
        }
    }

    function logEvent(name, params) {
        if (!analytics) return;
        try {
            analytics.logEvent(name, params || {});
        } catch (e) {
            /* non-fatal */
        }
    }

    /** Once per browser session — updates lastLoginAt and logs login event. */
    async function recordLogin(user) {
        if (!user || !window.db) return;
        const sessionKey = 'cfm_session_' + user.uid;
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, '1');

        logEvent('login');

        try {
            await window.db.collection('users').doc(user.uid).update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.warn('CFM Analytics: could not update lastLoginAt', e);
        }
    }

    /** Increment public view counters on the insight doc (no per-user log). */
    async function recordInsightView(collection, insightId) {
        if (!window.db || !collection || !insightId) return;

        logEvent('view_insight', { collection: collection });

        try {
            await window.db.collection(collection).doc(insightId).update({
                viewCount: firebase.firestore.FieldValue.increment(1),
                lastViewedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.warn('CFM Analytics: could not record insight view', e);
        }
    }

    /** Log search usage without storing the query text. */
    function recordSearch(resultCount, hasCategoryFilter) {
        logEvent('search', {
            result_count: resultCount,
            has_category_filter: !!hasCategoryFilter
        });
    }

    function recordSignUp() {
        logEvent('sign_up');
    }

    function recordFeedback(type) {
        logEvent('feedback', { feedback_type: type || 'other' });
    }

    init();

    window.CFMAnalytics = {
        logEvent: logEvent,
        recordLogin: recordLogin,
        recordInsightView: recordInsightView,
        recordSearch: recordSearch,
        recordSignUp: recordSignUp,
        recordFeedback: recordFeedback
    };
})();
