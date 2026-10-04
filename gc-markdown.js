/**
 * Render Conference Companion outline markdown to sanitized HTML.
 * Requires marked (CDN) and sanitize.js (DOMPurify).
 */
function renderOutlineMarkdown(markdown) {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return '';
  }
  if (typeof marked !== 'undefined') {
    marked.setOptions({ gfm: true, breaks: false });
    const html = marked.parse(markdown);
    return sanitize(html, {
      ADD_ATTR: ['target'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
  }
  return sanitize('<pre>' + markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>');
}

function formatSpeakerName(speaker) {
  if (!speaker || typeof speaker !== 'string') return 'Speaker';
  return speaker
    .split(' ')
    .map(function (w) {
      if (!w) return w;
      if (w === w.toUpperCase() && w.length > 1) {
        return w.charAt(0) + w.slice(1).toLowerCase();
      }
      return w;
    })
    .join(' ');
}

function cleanTalkTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title.replace(/\*\*/g, '').replace(/^[\s"']+|[\s"']+$/g, '').trim();
}
