#!/usr/bin/env node
/**
 * Generate Relief Society–oriented discussion questions (6–8) from imported talk outlines.
 * Personas (config/rs-personas-lehi.json) inform generation only — never stored or shown.
 *
 * Uses Gemini (same as gc-discussion-questions.js / import-gc-outlines), not OpenAI.
 *
 * Usage:
 *   npm run generate-rs-discussion -- --session 2026-10
 *   ... --talkId 20261003161236-elder-gerrit-w-gong
 *   ... --dry-run
 *   ... --force   (regenerate even if rsDiscussionMarkdown exists)
 *
 * Requires CFM_SERVICE_ACCOUNT_PATH (or GOOGLE_APPLICATION_CREDENTIALS) and GEMINI_API_KEY
 * (CFM .env or parent Build AI Product Sense .env).
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { splitOutlineAndDiscussion, formatDiscussionMarkdown } = require('./gc-outline-sections');
const { loadGeminiConfig } = require('./gc-discussion-questions');

const PROJECT_ID = 'comefollowme-d097a';
const MAX_RS_MARKDOWN_CHARS = 16384;

function parseArgs(argv) {
  const args = { session: null, talkId: null, dryRun: false, force: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--session' && argv[i + 1]) args.session = argv[++i];
    else if (argv[i] === '--talkId' && argv[i + 1]) args.talkId = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--force') args.force = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(
        'Usage: node scripts/generate-rs-discussion-guides.js --session 2026-10 [--talkId ID] [--dry-run] [--force]'
      );
      process.exit(0);
    }
  }
  if (!args.session) {
    console.error('Missing --session (e.g. 2026-10)');
    process.exit(1);
  }
  return args;
}

function loadJson(relativePath) {
  const p = path.join(__dirname, '..', relativePath);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function initAdmin() {
  const keyPath = process.env.CFM_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.error('Missing Firebase service account (CFM_SERVICE_ACCOUNT_PATH).');
    process.exit(1);
  }
  if (!admin.apps.length) {
    const key = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(key), projectId: PROJECT_ID });
  }
  return admin.firestore();
}

function buildPrompt({ title, speaker, outlineBody }, genConfig, personasConfig) {
  const personaBlock = personasConfig.personas
    .map((p) => `- ${p.label}: ${p.notes}`)
    .join('\n');

  return {
    system: `You help teachers prepare Relief Society lessons from General Conference talk outlines.

Use the persona list only as an internal lens so the final questions work for a diverse ward class. Do NOT name personas, archetypes, or labels in the output.

Rules:
- Output valid JSON only: {"questions":["..."]}
- Provide between ${genConfig.minCount} and ${genConfig.maxCount} questions (aim for ${genConfig.targetCount} when the talk has enough substance).
- Each question must be distinct (no near-duplicates or rephrasing the same prompt).
- Questions are for group discussion: open-ended, respectful, Christ-centered.
- Anchor in themes from the outline — do not invent doctrines or quotes not implied by the outline.
- Avoid yes/no, trivia, or "what did the speaker say" recap questions.
- No mention of Conference Companion, AI, or personas in the questions.

Internal persona lens (do not cite):
${personaBlock}`,
    user: `Talk: ${title}
Speaker: ${speaker}

Outline (discussion section omitted):
---
${outlineBody}
---`,
  };
}

async function callGemini(promptText, model) {
  const { apiKey, model: defaultModel } = loadGeminiConfig();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set (CFM .env or parent Build AI Product Sense .env)');
  }
  const useModel = model || defaultModel || 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = await res.json();
  const content =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';
  if (!content) throw new Error('Empty Gemini response');

  let parsed;
  try {
    parsed = JSON.parse(content.trim());
  } catch {
    const objMatch = content.match(/\{[\s\S]*\}/);
    const arrMatch = content.match(/\[[\s\S]*\]/);
    if (objMatch) parsed = JSON.parse(objMatch[0]);
    else if (arrMatch) parsed = { questions: JSON.parse(arrMatch[0]) };
    else throw new Error('Gemini did not return JSON');
  }

  const questions = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.questions)
      ? parsed.questions
      : null;
  if (!questions) {
    throw new Error('Expected JSON { "questions": string[] } or a string array');
  }
  return questions.map((q) => String(q).trim()).filter(Boolean);
}

function validateQuestions(questions, genConfig) {
  if (questions.length < genConfig.minCount || questions.length > genConfig.maxCount) {
    throw new Error(
      `Question count ${questions.length} outside ${genConfig.minCount}-${genConfig.maxCount}`
    );
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const genConfig = loadJson('config/rs-discussion-generation.json');
  const personasConfig = loadJson('config/rs-personas-lehi.json');
  const { model: geminiDefault } = loadGeminiConfig();
  const model = process.env.GEMINI_MODEL || genConfig.model || geminiDefault;

  if (args.dryRun) console.log('DRY RUN — no Firestore writes');

  const db = initAdmin();
  const sessionRef = db.collection('generalConferenceSessions').doc(args.session);

  let talkDocs = [];
  if (args.talkId) {
    const snap = await sessionRef.collection('talks').doc(args.talkId).get();
    if (!snap.exists) {
      console.error('Talk not found:', args.talkId);
      process.exit(1);
    }
    talkDocs = [snap];
  } else {
    const snap = await sessionRef.collection('talks').get();
    talkDocs = snap.docs;
  }

  let generated = 0;
  let skipped = 0;

  for (const doc of talkDocs) {
    const t = doc.data();
    const talkId = doc.id;
    if (!args.force && t.rsDiscussionMarkdown) {
      console.log(`  SKIP ${talkId}: already has rsDiscussionMarkdown (use --force)`);
      skipped++;
      continue;
    }
    const outline = t.outlineMarkdown;
    if (!outline || !String(outline).trim()) {
      console.log(`  SKIP ${talkId}: no outlineMarkdown`);
      skipped++;
      continue;
    }
    const { body } = splitOutlineAndDiscussion(outline);
    const { system, user } = buildPrompt(
      { title: t.title || '', speaker: t.speaker || '', outlineBody: body },
      genConfig,
      personasConfig
    );
    const basePrompt = `${system}\n\n${user}\n\nReturn ONLY valid JSON: {"questions":["..."]}`;

    let questions;
    try {
      questions = await callGemini(basePrompt, model);
      try {
        validateQuestions(questions, genConfig);
      } catch (countErr) {
        console.warn(`  RETRY ${talkId}: ${countErr.message}`);
        questions = await callGemini(
          `${basePrompt}\n\nCorrection: you previously returned ${questions.length} questions. Return JSON with exactly ${genConfig.targetCount} questions (min ${genConfig.minCount}, max ${genConfig.maxCount}), still distinct and persona-aware internally.`,
          model
        );
        validateQuestions(questions, genConfig);
      }
    } catch (err) {
      console.error(`  ERROR ${talkId}:`, err.message);
      skipped++;
      continue;
    }

    const rsDiscussionMarkdown = formatDiscussionMarkdown(questions, genConfig.sectionHeading);
    if (rsDiscussionMarkdown.length > MAX_RS_MARKDOWN_CHARS) {
      console.error(`  ERROR ${talkId}: generated markdown too large`);
      skipped++;
      continue;
    }

    if (args.dryRun) {
      console.log(`  WOULD WRITE ${talkId} (${questions.length} questions)`);
      questions.forEach((q, i) => console.log(`    ${i + 1}. ${q.slice(0, 100)}${q.length > 100 ? '…' : ''}`));
      generated++;
      continue;
    }

    await sessionRef.collection('talks').doc(talkId).set(
      {
        rsDiscussionMarkdown,
        rsDiscussionGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        rsDiscussionQuestionCount: questions.length
      },
      { merge: true }
    );
    console.log(`  OK ${talkId} (${questions.length} questions)`);
    generated++;
  }

  console.log(`\nDone. Generated: ${generated}, skipped: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
