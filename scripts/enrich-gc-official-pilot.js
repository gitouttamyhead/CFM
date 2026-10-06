#!/usr/bin/env node
/**
 * Pilot: enrich GC talks from Gospel Library footnotes + Gemini.
 *
 * Usage:
 *   node scripts/enrich-gc-official-pilot.js --session 2026-10
 *   node scripts/enrich-gc-official-pilot.js --session 2026-10 --talkIds id1,id2,id3
 *   node scripts/enrich-gc-official-pilot.js --session 2026-10 --dry-run
 *
 * Default talkIds (pilot): Bednar, Gong, Rasband — must have officialTalkUrl.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { loadEnvFiles } = require('./load-env');
const { fetchFootnotesForTalkUrl } = require('./gc-official-footnotes');
const { enrichTalkFromOfficialSources } = require('./gc-official-enrichment');

loadEnvFiles();

const PROJECT_ID = 'comefollowme-d097a';

const DEFAULT_PILOT_IDS = [
  '20261004203950-elder-david-a-bednar',
  '20261003161236-elder-gerrit-w-gong',
  '20261003213859-elder-ronald-a-rasband'
];

function parseArgs(argv) {
  const args = { session: null, talkIds: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--session' && argv[i + 1]) args.session = argv[++i];
    else if (argv[i] === '--talkIds' && argv[i + 1]) args.talkIds = argv[++i].split(',').map((s) => s.trim());
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/enrich-gc-official-pilot.js --session 2026-10 [--talkIds a,b,c] [--dry-run]');
      process.exit(0);
    }
  }
  if (!args.session) {
    console.error('Missing --session');
    process.exit(1);
  }
  if (!args.talkIds) args.talkIds = DEFAULT_PILOT_IDS;
  return args;
}

function initAdmin() {
  const keyPath = process.env.CFM_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.error('Missing CFM_SERVICE_ACCOUNT_PATH');
    process.exit(1);
  }
  if (!admin.apps.length) {
    const key = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(key), projectId: PROJECT_ID });
  }
  return admin.firestore();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { session: conferenceId, talkIds, dryRun } = parseArgs(process.argv);
  const db = initAdmin();
  const sessionRef = db.collection('generalConferenceSessions').doc(conferenceId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  console.log(`Official enrichment pilot: ${conferenceId}, ${talkIds.length} talk(s)`);
  if (dryRun) console.log('DRY RUN');

  for (const talkId of talkIds) {
    const ref = sessionRef.collection('talks').doc(talkId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  SKIP ${talkId}: not in Firestore`);
      continue;
    }
    const data = snap.data();
    if (!data.officialTalkUrl) {
      console.log(`  SKIP ${talkId}: no officialTalkUrl`);
      continue;
    }

    console.log(`\n  ${talkId}`);
    console.log(`    URL: ${data.officialTalkUrl}`);

    let footnotes;
    try {
      footnotes = await fetchFootnotesForTalkUrl(data.officialTalkUrl);
      console.log(`    Footnotes parsed: ${footnotes.length}`);
    } catch (err) {
      console.error(`    ERROR footnotes: ${err.message}`);
      continue;
    }

    let enrichment;
    try {
      enrichment = await enrichTalkFromOfficialSources({
        speaker: data.speaker,
        title: data.title,
        outlineMarkdown: data.outlineMarkdown,
        footnotes
      });
    } catch (err) {
      console.error(`    ERROR Gemini: ${err.message}`);
      continue;
    }

    console.log(`    scripturesCited: ${enrichment.scripturesCited.length}`);
    console.log(`    storiesTold: ${enrichment.storiesTold.length}`);
    console.log(`    footnoteHighlights: ${enrichment.footnoteHighlights.length}`);
    enrichment.scripturesCited.slice(0, 5).forEach((s) => console.log(`      · ${s}`));
    enrichment.footnoteHighlights.forEach((h) => console.log(`      * ${h}`));

    if (!dryRun) {
      await ref.set(
        {
          officialFootnotesRaw: footnotes.map((n) => ({ marker: n.marker, text: n.text })),
          scripturesCited: enrichment.scripturesCited,
          storiesTold: enrichment.storiesTold,
          footnoteHighlights: enrichment.footnoteHighlights,
          officialEnrichmentSyncedAt: now
        },
        { merge: true }
      );
      console.log('    Saved to Firestore.');
    }

    await sleep(500);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
