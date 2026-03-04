/**
 * CFM Firestore backup — exports all collections to JSON in the parent project's backups/cfm/.
 * Run from CFM folder: npm run backup
 * Requires: Firebase service account key. Set GOOGLE_APPLICATION_CREDENTIALS or CFM_SERVICE_ACCOUNT_PATH.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COLLECTIONS = ['insights', 'gospelInsights', 'otherInsights', 'users', 'invitations', 'emailNotifications'];
const PROJECT_ID = 'comefollowme-d097a';

// Backup directory: parent project's backups/cfm/ (outside CFM repo)
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups', 'cfm');

function serializeDoc(doc) {
  const data = doc.data();
  const out = { id: doc.id, ...data };
  // Firestore Timestamps -> ISO string for JSON
  Object.keys(out).forEach(key => {
    if (out[key] && typeof out[key].toDate === 'function') {
      out[key] = out[key].toDate().toISOString();
    }
  });
  return out;
}

async function exportCollection(db, name) {
  const snapshot = await db.collection(name).get();
  const docs = snapshot.docs.map(serializeDoc);
  return docs;
}

async function main() {
  const keyPath = process.env.CFM_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.error('Missing service account key. Set CFM_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS to the path of your Firebase service account JSON (Firebase Console > Project Settings > Service Accounts > Generate new private key).');
    process.exit(1);
  }

  if (!admin.apps.length) {
    const key = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(key), projectId: PROJECT_ID });
  }
  const db = admin.firestore();

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(BACKUP_DIR, timestamp);
  fs.mkdirSync(runDir, { recursive: true });

  console.log('Exporting to', runDir);
  for (const name of COLLECTIONS) {
    try {
      const docs = await exportCollection(db, name);
      const filePath = path.join(runDir, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
      console.log(`  ${name}: ${docs.length} documents`);
    } catch (err) {
      if (err.code === 5 || err.message?.includes('NOT_FOUND')) {
        console.log(`  ${name}: (collection missing or empty) — skipped`);
      } else {
        throw err;
      }
    }
  }

  // Also write a manifest
  const manifest = { exportedAt: new Date().toISOString(), projectId: PROJECT_ID, collections: COLLECTIONS };
  fs.writeFileSync(path.join(runDir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Done. Spot-check a few documents in', runDir);
}

main().catch(err => { console.error(err); process.exit(1); });
