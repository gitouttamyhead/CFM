/**
 * Heuristics for General Conference segments that are not doctrinal talks
 * (conducting, concluding remarks, session summaries, etc.).
 */

function normalizeTitle(title) {
  return String(title || '')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedLower(title) {
  return normalizeTitle(title).toLowerCase();
}

function talkDurationSeconds(talk) {
  const start = new Date(talk.start).getTime();
  const end = new Date(talk.end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, (end - start) / 1000);
}

const NAMED_SEGMENT_RE =
  /\b(?:Elder|Sister|President|Brother)\s+[\w.'’\-]+\s+[\w.'’\-]+(?:\s+[\w.'’\-]+)?['']s\s+(?:Address|Insights|Perspective|Remarks)/gi;

/** Session intros that list upcoming speakers (not a standalone talk). */
const SESSION_INTRO_RE =
  /introduction to the session|overview of the session|overview of conference proceedings|introduction to the conference/i;

/** Numbered outline sections that indicate a prayer, not a talk (CC often invents sermon titles). */
const PRAYER_SECTION_RE =
  /(?:^|\n)\s*\d+\.\s*\*\*(?:closing prayer|prayer for attendees|benediction)\*\*/i;

const CONCLUDING_SPEAKER_INTRO_RE =
  /introduc(?:e|tion of)\s+.+?\s+as the concluding speaker/i;

/**
 * @param {object} talk — list or detail shape with id, speaker, title, start, end
 * @param {object} heuristics — from conference config filterHeuristics
 * @returns {{ reason: string }|null}
 */
function shouldExcludeTalk(talk, heuristics) {
  const id = (talk.id || '').toLowerCase();
  const speaker = (talk.speaker || '').toLowerCase();
  const titleRaw = talk.title || '';
  const title = normalizedLower(titleRaw);

  for (const sub of heuristics.excludeIdSubstrings || []) {
    if (id.includes(sub.toLowerCase())) {
      return { reason: `id contains "${sub}"` };
    }
  }
  for (const sub of heuristics.excludeSpeakerSubstrings || []) {
    if (speaker.includes(sub.toLowerCase())) {
      return { reason: `speaker contains "${sub}"` };
    }
  }
  for (const sub of heuristics.excludeTitleSubstrings || []) {
    if (title.includes(sub.toLowerCase())) {
      return { reason: `title contains "${sub}"` };
    }
  }

  if (title.includes('conducting')) {
    return { reason: 'conducting segment (title)' };
  }

  if (/concluding remarks|closing remarks|closing of the conference|adjournment/.test(title)) {
    return { reason: 'concluding or adjournment segment (title)' };
  }

  if (/\b(invocation|benediction|opening prayer|closing prayer)\b/.test(title)) {
    return { reason: 'prayer segment (title)' };
  }

  const minDur = heuristics.minDurationSeconds ?? 120;
  const dur = talkDurationSeconds(talk);
  if (dur < minDur) {
    return { reason: `duration ${Math.round(dur)}s < ${minDur}s` };
  }

  return null;
}

/**
 * @param {string} outlineMarkdown
 * @param {{ speaker?: string, title?: string }} talk
 * @param {object} heuristics
 * @returns {{ reason: string }|null}
 */
function shouldExcludeOutline(outlineMarkdown, talk, heuristics) {
  const outline = String(outlineMarkdown || '').trim();
  if (!outline) return null;

  const lower = outline.toLowerCase();
  const dur = talkDurationSeconds(talk);

  for (const sub of heuristics.excludeOutlineSubstrings || []) {
    if (lower.includes(sub.toLowerCase())) {
      return { reason: `outline contains "${sub}"` };
    }
  }

  if (/adjournment of the conference|will be adjourned for six months/.test(lower)) {
    return { reason: 'conference adjournment (outline)' };
  }

  if (/main topic:\s*acknowledgment and closing/i.test(outline)) {
    return { reason: 'closing acknowledgment (outline)' };
  }

  const namedSegments = outline.match(NAMED_SEGMENT_RE) || [];

  if (PRAYER_SECTION_RE.test(outline)) {
    return { reason: 'prayer segment (outline)' };
  }

  const ccNoSermonContent =
    /scriptures (?:quoted|cited):\*?\*?\s*none|stories told:\*?\*?\s*none/i.test(outline) ||
    /none specified in the provided text/i.test(outline);

  if (dur < 200 && ccNoSermonContent && /final prayer for/i.test(lower)) {
    return { reason: 'short prayer segment (outline)' };
  }

  if (
    /welcome and introduction/i.test(outline) &&
    /(?:^|\n)\s*\d+\.\s*\*\*Invocation\*\*/i.test(outline) &&
    !/sustaining vote/i.test(outline)
  ) {
    return { reason: 'session opening with invocation (outline)' };
  }

  if (SESSION_INTRO_RE.test(outline) && /introduction of (?:elder|president|bishop|sister|brother)/i.test(outline)) {
    return { reason: 'session introduction segment (outline)' };
  }

  if (SESSION_INTRO_RE.test(outline) && namedSegments.length >= 1) {
    return { reason: 'session introduction segment (outline)' };
  }

  if (CONCLUDING_SPEAKER_INTRO_RE.test(outline)) {
    return { reason: 'introduces concluding speaker (outline)' };
  }

  if (namedSegments.length >= 2) {
    return { reason: 'multi-speaker session summary (outline)' };
  }

  if (
    lower.includes('closing hymn') &&
    (lower.includes('congregational participation') || lower.includes('introduction of the concluding speaker'))
  ) {
    return { reason: 'session program wrap-up (outline)' };
  }

  return null;
}

/**
 * @param {object} talk
 * @param {string} [outlineMarkdown]
 * @param {object} heuristics
 */
function shouldExcludeTalkOrOutline(talk, outlineMarkdown, heuristics) {
  const fromTalk = shouldExcludeTalk(talk, heuristics || {});
  if (fromTalk) return fromTalk;
  if (outlineMarkdown) {
    return shouldExcludeOutline(outlineMarkdown, talk, heuristics || {});
  }
  return null;
}

module.exports = {
  normalizeTitle,
  shouldExcludeTalk,
  shouldExcludeOutline,
  shouldExcludeTalkOrOutline,
  talkDurationSeconds
};
