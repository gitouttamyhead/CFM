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
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lastName(speaker) {
  const parts = normalizeSpeaker(speaker).split(' ').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function titlesRoughlyMatch(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = new Set(na.split(' ').filter((w) => w.length > 3));
  const wb = new Set(nb.split(' ').filter((w) => w.length > 3));
  let overlap = 0;
  for (const w of wa) {
    if (wb.has(w)) overlap++;
  }
  return overlap >= Math.min(3, Math.min(wa.size, wb.size));
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
    `href="/study/general-conference/${escaped}/([0-9]+[a-z]+)\\?lang=eng"[^>]*><div[^>]*><p><span>([^<]+)</span></p><p[^>]*>([^<]+)</p>`,
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
function matchTalkToOfficialUrl(talk, catalog) {
  if (!catalog || !catalog.length) return null;

  const title = cleanTalkTitleForMatch(talk.title);
  const speaker = talk.speaker;

  let best = null;
  for (const entry of catalog) {
    if (!titlesRoughlyMatch(title, entry.title)) continue;
    if (!speakersRoughlyMatch(speaker, entry.speaker)) continue;
    best = entry.url;
    break;
  }

  if (best) return best;

  for (const entry of catalog) {
    if (titlesRoughlyMatch(title, entry.title)) {
      return entry.url;
    }
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
  parseConferenceIndexHtml
};
