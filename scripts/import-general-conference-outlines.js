#!/usr/bin/env node
/**
 * Post-session import of General Conference talk outlines from Conference Companion.
 * Stores final_outline markdown only — never transcripts.
 *
 * Usage:
 *   node scripts/import-general-conference-outlines.js --session 2026-10
 *   node scripts/import-general-conference-outlines.js --session 2026-10 --dry-run
 *   node scripts/import-general-conference-outlines.js --session 2026-10 --freeze
 *   node scripts/import-general-conference-outlines.js --session 2026-10 --force  (override importFrozen)
 *
 * Requires CFM_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS (Firebase Admin).
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const GC_LIMITS = require('./gc-import-constants');

const PROJECT_ID = 'comefollowme-d097a';
const TALKS_LIST_URL = 'https://conferencecompanion.net/talks';
const TALK_DETAIL_URL = 'https://conferencecompanion.net/talks/';

function parseArgs(argv) {
  const args = { session: null, dryRun: false, freeze: false, force: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--session' && argv[i + 1]) {
      args.session = argv[++i];
    } else if (argv[i] === '--dry-run') {
      args.dryRun = true;
    } else if (argv[i] === '--freeze') {
      args.freeze = true;
    } else if (argv[i] === '--force') {
      args.force = true;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/import-general-conference-outlines.js --session 2026-10 [--dry-run] [--freeze] [--force]');
      process.exit(0);
    }
  }
  if (!args.session) {
    console.error('Missing required --session (e.g. 2026-10)');
    process.exit(1);
  }
  return args;
}

function loadConfig(conferenceId) {
  const configPath = path.join(__dirname, '..', 'config', `general_conference_${conferenceId}_sessions.json`);
  if (!fs.existsSync(configPath)) {
    console.error('Config not found:', configPath);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function parseIso(iso) {
  return new Date(iso).getTime();
}

function talkDurationSeconds(talk) {
  const start = parseIso(talk.start);
  const end = parseIso(talk.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, (end - start) / 1000);
}

function shouldExcludeTalk(talk, heuristics) {
  const id = (talk.id || '').toLowerCase();
  const speaker = (talk.speaker || '').toLowerCase();
  const title = (talk.title || '').toLowerCase();

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

  const minDur = heuristics.minDurationSeconds ?? 120;
  const dur = talkDurationSeconds(talk);
  if (dur < minDur) {
    return { reason: `duration ${Math.round(dur)}s < ${minDur}s` };
  }

  if (/^(\*\*\s*)?conducting/.test(title.trim()) && dur < 240) {
    return { reason: 'short conducting segment' };
  }

  return null;
}

function assignSessionKey(talkStartIso, sessions) {
  const t = parseIso(talkStartIso);
  for (const session of sessions) {
    const start = parseIso(session.start);
    const end = parseIso(session.end);
    if (t >= start && t < end) {
      return session.key;
    }
  }
  return null;
}

function inConferenceWindow(talkStartIso, window) {
  const t = parseIso(talkStartIso);
  return t >= parseIso(window.start) && t < parseIso(window.end);
}

function maxResponseBytes(config) {
  return config.security?.maxHttpResponseBytes ?? GC_LIMITS.MAX_HTTP_RESPONSE_BYTES;
}

function maxOutlineChars(config) {
  return config.security?.maxOutlineMarkdownChars ?? GC_LIMITS.MAX_OUTLINE_MARKDOWN_CHARS;
}

async function fetchJson(url, byteLimit) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > byteLimit) {
    throw new Error(`Response too large (${buf.length} bytes > ${byteLimit})`);
  }
  return JSON.parse(buf.toString('utf8'));
}

function buildTalkDoc(talk, detail, sessionKey, now, outline) {
  const speaker = String(talk.speaker || detail.speaker || '').slice(0, GC_LIMITS.MAX_SPEAKER_CHARS);
  const title = String(talk.title || detail.title || '').slice(0, GC_LIMITS.MAX_TITLE_CHARS);
  const talkId = String(talk.id).slice(0, GC_LIMITS.MAX_TALK_ID_CHARS);
  return {
    talkId,
    speaker,
    title,
    start: talk.start,
    end: talk.end,
    sessionKey,
    outlineMarkdown: outline,
    outlineSyncedAt: now,
    sourceTalkUrl: TALK_DETAIL_URL + talk.id
  };
}

function initAdmin() {
  const keyPath = process.env.CFM_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.error('Missing service account key. Set CFM_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(1);
  }
  if (!admin.apps.length) {
    const key = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(key), projectId: PROJECT_ID });
  }
  return admin.firestore();
}

async function main() {
  const { session: conferenceId, dryRun, freeze, force } = parseArgs(process.argv);
  const config = loadConfig(conferenceId);
  const responseLimit = maxResponseBytes(config);
  const outlineLimit = maxOutlineChars(config);

  if (config.conferenceId !== conferenceId) {
    console.warn(`Config conferenceId ${config.conferenceId} differs from --session ${conferenceId}`);
  }

  console.log(`Import General Conference outlines: ${config.label} (${conferenceId})`);
  console.log(`Timezone: ${config.timezone} — ${config.timezoneNote || ''}`);
  if (dryRun) console.log('DRY RUN — no Firestore writes');
  if (freeze) console.log('Will set importFrozen on session after successful import');

  const db = dryRun ? null : initAdmin();
  const sessionRef = db ? db.collection('generalConferenceSessions').doc(conferenceId) : null;

  if (!dryRun && sessionRef && !force) {
    const existing = await sessionRef.get();
    if (existing.exists && existing.data().importFrozen === true) {
      console.error('Session import is frozen (importFrozen=true). Use --force to override or clear importFrozen in Firestore.');
      process.exit(1);
    }
  }

  const listData = await fetchJson(TALKS_LIST_URL, responseLimit);
  const talks = listData.talks || [];
  console.log(`Fetched ${talks.length} talks from Conference Companion`);

  const candidates = talks.filter((t) => inConferenceWindow(t.start, config.conferenceWindow));
  console.log(`${candidates.length} talks within conference window`);

  const now = admin.firestore.FieldValue.serverTimestamp();

  let upserted = 0;
  let skipped = 0;
  let noOutline = 0;

  if (!dryRun) {
    await sessionRef.set(
      {
        label: config.label,
        source: 'conference_companion',
        timezone: config.timezone,
        sessionWindows: config.sessions,
        lastSyncedAt: now
      },
      { merge: true }
    );
  }

  for (const talk of candidates) {
    const exclude = shouldExcludeTalk(talk, config.filterHeuristics || {});
    if (exclude) {
      console.log(`  SKIP ${talk.id}: ${exclude.reason}`);
      skipped++;
      continue;
    }

    const sessionKey = assignSessionKey(talk.start, config.sessions);
    if (!sessionKey) {
      console.log(`  SKIP ${talk.id}: outside session windows`);
      skipped++;
      continue;
    }

    let detail;
    try {
      detail = await fetchJson(TALK_DETAIL_URL + encodeURIComponent(talk.id), responseLimit);
    } catch (err) {
      console.error(`  ERROR fetching ${talk.id}:`, err.message);
      skipped++;
      continue;
    }

    const outline = (detail.final_outline || '').trim();
    if (!outline) {
      console.log(`  SKIP ${talk.id}: final_outline empty (sync again later)`);
      noOutline++;
      continue;
    }

    if (outline.length > outlineLimit) {
      console.log(`  SKIP ${talk.id}: outline too large (${outline.length} > ${outlineLimit} chars)`);
      skipped++;
      continue;
    }

    const doc = buildTalkDoc(talk, detail, sessionKey, now, outline);

    if (dryRun) {
      console.log(`  WOULD UPSERT ${talk.id} [${sessionKey}] ${doc.speaker}`);
      upserted++;
      continue;
    }

    await sessionRef.collection('talks').doc(talk.id).set(doc);
    console.log(`  UPSERT ${talk.id} [${sessionKey}]`);
    upserted++;
  }

  if (!dryRun && sessionRef && freeze) {
    await sessionRef.set(
      {
        importFrozen: true,
        importFrozenAt: now
      },
      { merge: true }
    );
    console.log('Session marked importFrozen=true (future imports blocked until --force).');
  }

  console.log('');
  console.log(`Done. Upserted: ${upserted}, skipped: ${skipped}, missing outline: ${noOutline}`);
  if (!dryRun) {
    console.log(`Session doc generalConferenceSessions/${conferenceId} updated (lastSyncedAt).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
