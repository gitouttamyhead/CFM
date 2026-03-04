/**
 * XSS sanitization for user-supplied HTML. Depends on DOMPurify (load via CDN before this script).
 */

/**
 * Sanitize HTML for safe display (e.g. insight content). Allows safe tags; strips script and dangerous attributes.
 * @param {string} html
 * @returns {string}
 */
function sanitize(html) {
    if (typeof html !== 'string') return '';
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(html);
    return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Strip all HTML and return plain text. Use before inserting into HTML (e.g. search highlight).
 * @param {string} html
 * @returns {string}
 */
function sanitizePlainText(html) {
    if (typeof html !== 'string') return '';
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
    return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
