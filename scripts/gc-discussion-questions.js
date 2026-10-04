/**
 * Generate open-ended discussion questions via Gemini (outline in prompt; transcript optional, not stored).
 */

const crypto = require('crypto');

function outlineContentHash(outlineMarkdown) {
  return crypto.createHash('sha256').update(String(outlineMarkdown || ''), 'utf8').digest('hex');
}

function loadGeminiConfig() {
  const fs = require('fs');
  const path = require('path');
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env')
  ];
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  if (!apiKey) {
    for (const envPath of candidates) {
      if (!fs.existsSync(envPath)) continue;
      const text = fs.readFileSync(envPath, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key === 'GEMINI_API_KEY' && !apiKey) apiKey = val;
        if (key === 'GEMINI_MODEL' && !process.env.GEMINI_MODEL) model = val;
      }
    }
  }

  return { apiKey, model };
}

/**
 * @param {{ speaker: string, title: string, outlineMarkdown: string, transcriptForPrompt?: string }} input
 * @returns {Promise<string[]>}
 */
async function generateDiscussionQuestions(input) {
  const { apiKey, model } = loadGeminiConfig();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set (CFM .env or parent Build AI Product Sense .env)');
  }

  const useTranscript = process.env.CFM_GC_QUESTIONS_USE_TRANSCRIPT === '1';
  const transcriptBlock =
    useTranscript && input.transcriptForPrompt
      ? `\n\nSupplementary transcript excerpt (do not quote long passages; use for nuance only):\n${String(input.transcriptForPrompt).slice(0, 12000)}`
      : '';

  const prompt = `You are helping a Gospel Doctrine teacher in The Church of Jesus Christ of Latter-day Saints.

Talk speaker: ${input.speaker || 'Unknown'}
Talk title: ${input.title || 'Untitled'}

Outline summary (markdown):
${String(input.outlineMarkdown || '').slice(0, 14000)}
${transcriptBlock}

Write exactly 5 open-ended discussion questions for an adult Sunday School class.
- Questions must invite reflection, application, or respectful disagreement — not yes/no.
- Do not ask people to summarize the talk.
- Ground questions in themes from the outline.
- Return ONLY valid JSON: a JSON array of exactly 5 strings, no markdown fences.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
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
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Gemini did not return JSON array');
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed) || parsed.length !== 5) {
    throw new Error(`Expected 5 questions, got ${Array.isArray(parsed) ? parsed.length : 'non-array'}`);
  }

  return parsed.map((q) => String(q).trim()).filter(Boolean);
}

function shouldGenerateQuestions(existing, outlineHash, force) {
  if (force) return true;
  if (!existing?.discussionQuestions || !Array.isArray(existing.discussionQuestions)) return true;
  if (existing.discussionQuestions.length !== 5) return true;
  if (existing.discussionQuestionsOutlineHash !== outlineHash) return true;
  return false;
}

module.exports = {
  outlineContentHash,
  generateDiscussionQuestions,
  shouldGenerateQuestions,
  loadGeminiConfig
};
