/**
 * Derive scriptures, stories, and footnote highlights from outline + Gospel Library footnotes (Gemini).
 */

const { loadGeminiConfig } = require('./gc-discussion-questions');

/**
 * @param {{
 *   speaker: string,
 *   title: string,
 *   outlineMarkdown: string,
 *   footnotes: { marker: string, text: string }[]
 * }} input
 */
async function enrichTalkFromOfficialSources(input) {
  const { apiKey, model } = loadGeminiConfig();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const footnoteBlock = (input.footnotes || [])
    .map((n, i) => `${i + 1}. ${n.text}`)
    .join('\n');

  const prompt = `You help Latter-day Saint teachers supplement a Conference talk OUTLINE with material from Gospel Library FOOTNOTES only.

Speaker: ${input.speaker || 'Unknown'}
Title: ${input.title || 'Untitled'}

Outline (from a third-party summary — may omit scriptures and stories):
${String(input.outlineMarkdown || '').slice(0, 12000)}

Gospel Library footnotes (authoritative citations; use these to supplement scriptures):
${footnoteBlock || '(none)'}

Tasks:
1. scripturesCited — Combine scriptures clearly referenced in the outline OR footnotes. Use standard LDS abbreviations (e.g. "D&C 132:7", "Moses 7:21", "Alma 32:21"). Deduplicate. Prefer footnotes when outline missed one.
2. storiesTold — People/anecdotes mentioned in footnotes or outline (e.g. historical examples, quoted speakers). Short noun phrases or one sentence each. Empty array if none.
3. footnoteHighlights — 2 to 4 items: interesting context FROM FOOTNOTES that the outline likely did not emphasize (older talks, Guide to the Scriptures links, definitions, extra scripture chains). Paraphrase briefly; do not paste long quotes. If footnotes add nothing beyond the outline, return 1 item saying footnotes are mostly cross-refs to scriptures already listed.

Return ONLY valid JSON:
{
  "scripturesCited": ["string"],
  "storiesTold": ["string"],
  "footnoteHighlights": ["string"]
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';

  let parsed;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini did not return JSON object');
    parsed = JSON.parse(match[0]);
  }

  return {
    scripturesCited: Array.isArray(parsed.scripturesCited)
      ? parsed.scripturesCited.map((s) => String(s).trim()).filter(Boolean)
      : [],
    storiesTold: Array.isArray(parsed.storiesTold)
      ? parsed.storiesTold.map((s) => String(s).trim()).filter(Boolean)
      : [],
    footnoteHighlights: Array.isArray(parsed.footnoteHighlights)
      ? parsed.footnoteHighlights.map((s) => String(s).trim()).filter(Boolean)
      : []
  };
}

module.exports = { enrichTalkFromOfficialSources };
