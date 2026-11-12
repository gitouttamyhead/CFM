/**
 * Split Conference Companion outline markdown: body vs. trailing discussion/study block.
 */

const DISCUSSION_HEADING =
  /^#{1,3}\s*(?:\d+\.\s*)?(?:discussion\s*questions?|questions\s+for\s+discussion|personal\s+study|for\s+discussion|reflection\s+questions?)\s*$/im;

/**
 * @param {string} markdown
 * @returns {{ body: string, hadDiscussionSection: boolean }}
 */
function splitOutlineAndDiscussion(markdown) {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return { body: '', hadDiscussionSection: false };
  }
  const match = markdown.match(DISCUSSION_HEADING);
  if (!match || match.index == null) {
    return { body: markdown.trim(), hadDiscussionSection: false };
  }
  const body = markdown.slice(0, match.index).trim();
  return { body, hadDiscussionSection: true };
}

/**
 * @param {string[]} questions
 * @param {string} heading
 * @returns {string}
 */
function formatDiscussionMarkdown(questions, heading) {
  const h = heading || 'Discussion questions';
  const list = questions
    .map((q) => String(q).trim())
    .filter(Boolean)
    .map((q, i) => `${i + 1}. ${q.replace(/^\d+\.\s*/, '')}`);
  if (!list.length) return '';
  return `## ${h}\n\n${list.join('\n\n')}`;
}

module.exports = { splitOutlineAndDiscussion, formatDiscussionMarkdown, DISCUSSION_HEADING };
