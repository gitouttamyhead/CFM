#!/usr/bin/env node
/**
 * Phase 2a: Fill officialTalkUrl on existing GC talk docs from Gospel Library index.
 * Does not re-import Conference Companion outlines or call Gemini.
 *
 * Usage:
 *   node scripts/sync-gc-official-talk-urls.js --session 2026-10
 *   node scripts/sync-gc-official-talk-urls.js --session 2026-10 --dry-run
 *
 * Requires CFM_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { loadEnvFiles } = require('./load-env');
const { fetchChurchConferenceCatalog, matchTalkToOfficialUrl } = require('./gc-church-official-links');

loadEnvFiles();

const PROJECT_ID = 'comefollowme-d097a';

function parseArgs(argv) {
  const args = { session: null, dryRun: false, refresh: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--session' && argv[i + 1]) {
      args.session = argv[++i];
    } else if (argv[i] === '--dry-run') {
      args.dryRun = true;
    } else if (argv[i] === '--refresh') {
      args.refresh = true;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/sync-gc-official-talk-urls.js --session 2026-10 [--dry-run]');
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
  const { session: conferenceId, dryRun, refresh } = parseArgs(process.argv);
  const config = loadConfig(conferenceId);
  const studyPath = config.churchStudyPath;

  if (!studyPath) {
    console.error(`Config missing churchStudyPath (e.g. "2026/10") for ${conferenceId}`);
    process.exit(1);
  }

  console.log(`Sync official Gospel Library URLs: ${config.label || conferenceId}`);
  console.log(`Index: https://www.churchofjesuschrist.org/study/general-conference/${studyPath}?lang=eng`);
  if (dryRun) console.log('DRY RUN — no Firestore writes');

  const catalog = await fetchChurchConferenceCatalog(studyPath);
  if (!catalog || !catalog.length) {
    console.log('');
    console.log('Church catalog not published yet (0 talks on index). Try again in a week or two.');
    process.exit(0);
  }
  console.log(`Church catalog: ${catalog.length} talks`);

  const db = initAdmin();
  const sessionRef = db.collection('generalConferenceSessions').doc(conferenceId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  let alreadySet = 0;
  let newlySet = 0;
  let stillMissing = 0;

  const snap = await sessionRef.collection('talks').orderBy('start', 'asc').get();
  const usedUrls = new Set();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.officialTalkUrl && !refresh) {
      alreadySet++;
      usedUrls.add(data.officialTalkUrl);
      continue;
    }
    const matched = matchTalkToOfficialUrl(
      { title: data.title, speaker: data.speaker, sessionKey: data.sessionKey },
      catalog,
      usedUrls
    );
    if (matched) {
      usedUrls.add(matched);
      if (dryRun) {
        console.log(`  WOULD SET ${doc.id} → ${matched}`);
      } else {
        await doc.ref.set(
          { officialTalkUrl: matched, officialTalkUrlSyncedAt: now },
          { merge: true }
        );
        console.log(`  SET ${doc.id}`);
      }
      newlySet++;
    } else {
      console.log(`  MISS ${doc.id} — ${data.speaker} / ${(data.title || '').slice(0, 50)}`);
      if (refresh && !dryRun && data.officialTalkUrl) {
        await doc.ref.set(
          { officialTalkUrl: admin.firestore.FieldValue.delete(), officialTalkUrlSyncedAt: admin.firestore.FieldValue.delete() },
          { merge: true }
        );
      }
      stillMissing++;
    }
  }

  console.log('');
  console.log(
    `Done. Already had URL: ${alreadySet}, newly set: ${newlySet}, unmatched in Firestore: ${stillMissing}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
