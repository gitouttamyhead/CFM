/**
 * Resolve official Gospel Library talk URLs from the conference index page.
 * Index format (when published): /study/general-conference/{year}/{month}/NNNsurname
 */

const CHURCH_ORIGIN = 'https://www.churchofjesuschrist.org';

function normalizeTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\*\*/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSpeaker(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lastName(speaker) {
  const parts = normalizeSpeaker(speaker)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(' ')
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/** Gospel Library talk slug prefix → CFM sessionKey (e.g. 12gong → sat-am). */
function catalogEntrySessionKey(entry) {
  const slug = (entry.url || '').split('/').pop().replace(/\?lang=eng$/i, '');
  const digit = slug.match(/^(\d)/);
  if (!digit) return null;
  const map = { 1: 'sat-am', 2: 'sat-pm', 4: 'sun-am', 5: 'sun-pm' };
  return map[parseInt(digit[1], 10)] || null;
}

const TITLE_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'our', 'your', 'their', 'through', 'unto', 'into',
  'will', 'are', 'was', 'have', 'has', 'been', 'being', 'about', 'when', 'what', 'how', 'who', 'all'
]);

function significantTitleTokens(title) {
  return normalizeTitle(title)
    .split(' ')
    .filter((w) => w.length > 2 && !TITLE_STOP_WORDS.has(w));
}

function titleTokenOverlapScore(a, b) {
  const ta = new Set(significantTitleTokens(a));
  const tb = new Set(significantTitleTokens(b));
  let overlap = 0;
  for (const w of ta) {
    if (tb.has(w)) overlap++;
  }
  return overlap;
}

function titlesRoughlyMatch(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return titleTokenOverlapScore(a, b) >= Math.min(3, Math.min(significantTitleTokens(a).length, significantTitleTokens(b).length));
}

function speakersRoughlyMatch(ours, church) {
  const ln = lastName(ours);
  const cn = normalizeSpeaker(church);
  if (!ln || !cn) return false;
  return cn.includes(ln);
}

/**
 * @param {string} html
 * @param {string} studyPath e.g. "2026/10"
 * @returns {{ title: string, speaker: string, url: string }[]}
 */
function parseConferenceIndexHtml(html, studyPath) {
  const escaped = studyPath.replace(/\//g, '\\/');
  const re = new RegExp(
    `href="/study/general-conference/${escaped}/([0-9]+[a-z][a-z0-9-]*)\\?lang=eng"[^>]*><div[^>]*><p><span>([^<]+)</span></p><p[^>]*>([^<]+)</p>`,
    'gi'
  );
  const entries = [];
  let m;
  while ((m = re.exec(html))) {
    entries.push({
      url: `${CHURCH_ORIGIN}/study/general-conference/${studyPath}/${m[1]}?lang=eng`,
      title: m[2].trim(),
      speaker: m[3].trim()
    });
  }
  return entries;
}

/**
 * @param {string} studyPath
 * @returns {Promise<{ title: string, speaker: string, url: string }[]|null>}
 */
async function fetchChurchConferenceCatalog(studyPath) {
  const url = `${CHURCH_ORIGIN}/study/general-conference/${studyPath}?lang=eng`;
  const res = await fetch(url, { headers: { 'User-Agent': 'CFM-gc-import/1.0' } });
  if (!res.ok) {
    return null;
  }
  const html = await res.text();
  const entries = parseConferenceIndexHtml(html, studyPath);
  return entries.length ? entries : null;
}

/**
 * @param {{ title: string, speaker: string }} talk
 * @param {{ title: string, speaker: string, url: string }[]} catalog
 * @returns {string|null}
 */
function isSustainingVoteEntry(entry) {
  return /sustaining/i.test(entry.title || '');
}

/**
 * @param {{ title: string, speaker: string, sessionKey?: string }} talk
 * @param {{ title: string, speaker: string, url: string }[]} catalog
 * @param {Set<string>} [usedUrls] — avoid reusing URLs when syncing in batch
 * @returns {string|null}
 */
function matchTalkToOfficialUrl(talk, catalog, usedUrls) {
  if (!catalog || !catalog.length) return null;

  const title = cleanTalkTitleForMatch(talk.title);
  const speaker = talk.speaker;
  const oursIsSustaining = /sustaining/i.test(title);
  const sessionKey = talk.sessionKey || null;

  let candidates = catalog.filter((entry) => {
    if (usedUrls && usedUrls.has(entry.url)) return false;
    if (sessionKey && catalogEntrySessionKey(entry) !== sessionKey) return false;
    if (!speakersRoughlyMatch(speaker, entry.speaker)) return false;
    if (isSustainingVoteEntry(entry) && !oursIsSustaining) return false;
    return true;
  });

  if (!candidates.length) return null;

  let best = null;
  let bestScore = -1;
  for (const entry of candidates) {
    const score = titleTokenOverlapScore(title, entry.title);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore >= 1) return best.url;

  if (candidates.length === 1) return candidates[0].url;

  if (best && bestScore === 0 && candidates.length > 1) {
    return best.url;
  }

  return null;
}

function cleanTalkTitleForMatch(title) {
  return String(title || '')
    .replace(/^\*\*/, '')
    .replace(/\*\*$/, '')
    .trim();
}

module.exports = {
  fetchChurchConferenceCatalog,
  matchTalkToOfficialUrl,
  parseConferenceIndexHtml,
  catalogEntrySessionKey
};
