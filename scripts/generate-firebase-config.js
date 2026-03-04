/**
 * Writes firebase-config.js from env vars so the API key is never committed.
 * Run during Netlify build; set env in Netlify UI (or .env for local).
 */
const fs = require('fs');
const path = require('path');

const config = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'comefollowme-d097a.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'comefollowme-d097a',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'comefollowme-d097a.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '725941283112',
  appId: process.env.FIREBASE_APP_ID || '1:725941283112:web:7071276f065bb3b7dd081d',
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-Z9HKN7M5K5'
};

if (!config.apiKey) {
  console.error('Set FIREBASE_API_KEY (or VITE_FIREBASE_API_KEY) in Netlify env or .env');
  process.exit(1);
}

const out = path.join(__dirname, '..', 'firebase-config.js');
const content = `// Generated at build time — do not commit. See firebase-config.example.js
window.__FIREBASE_CONFIG__ = ${JSON.stringify(config, null, 2)};
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(window.__FIREBASE_CONFIG__);
  window.db = firebase.firestore();
  window.auth = firebase.auth();
}
`;
fs.writeFileSync(out, content, 'utf8');
console.log('Wrote firebase-config.js');
