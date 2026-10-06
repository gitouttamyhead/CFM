/**
 * Parse Gospel Library "Notes" footnotes from talk HTML (server-rendered).
 */

function htmlToPlainText(fragment) {
  return String(fragment || '')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
      const label = text.replace(/<[^>]+>/g, '').trim();
      if (/scriptures|general-conference|study\//i.test(href) && label) {
        return label;
      }
      return label || '';
    })
    .replace(/<cite>([\s\S]*?)<\/cite>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} html
 * @returns {{ marker: string, id: string, text: string }[]}
 */
function parseFootnotesFromTalkHtml(html) {
  const notes = [];
  const items = [...String(html).matchAll(/<li[^>]*\bid="(note\d+)"[^>]*data-marker="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi)];
  for (const m of items) {
    const inner = m[3];
    const pMatch = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const text = htmlToPlainText(pMatch ? pMatch[1] : inner);
    if (!text) continue;
    notes.push({
      id: m[1],
      marker: m[2] || '',
      text
    });
  }
  return notes;
}

async function fetchTalkHtml(officialTalkUrl) {
  const res = await fetch(officialTalkUrl, {
    headers: { 'User-Agent': 'CFM-gc-enrichment/1.0', Accept: 'text/html' }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${officialTalkUrl}`);
  }
  return res.text();
}

/**
 * @param {string} officialTalkUrl
 * @returns {Promise<{ marker: string, id: string, text: string }[]>}
 */
async function fetchFootnotesForTalkUrl(officialTalkUrl) {
  const html = await fetchTalkHtml(officialTalkUrl);
  const notes = parseFootnotesFromTalkHtml(html);
  if (!notes.length) {
    const fallback = [...html.matchAll(/<li[^>]*id="(note\d+)"[^>]*>([\s\S]*?)<\/li>/gi)];
    for (const m of fallback) {
      const text = htmlToPlainText(m[2]);
      if (text) notes.push({ id: m[1], marker: '', text });
    }
  }
  return notes;
}

module.exports = {
  parseFootnotesFromTalkHtml,
  fetchFootnotesForTalkUrl,
  htmlToPlainText
};
