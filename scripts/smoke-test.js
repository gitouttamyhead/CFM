#!/usr/bin/env node
/**
 * Basic smoke tests: fetch key HTML pages and check for 200.
 * Run against a running server (local or deployed).
 *
 * Usage:
 *   BASE_URL=http://localhost:8888 node scripts/smoke-test.js
 *   BASE_URL=https://yoursite.netlify.app node scripts/smoke-test.js
 *
 * For local: from CFM directory run `npx serve -p 8888` then run the script.
 * Requires Node 18+ (fetch).
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';

const PAGES = [
  '/',
  '/index.html',
  '/scripture.html',
  '/search.html',
  '/gospel.html',
  '/other.html',
];

async function run() {
  let failed = 0;
  for (const path of PAGES) {
    const url = BASE_URL.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) {
        console.log(`OK ${res.status} ${url}`);
      } else {
        console.error(`FAIL ${res.status} ${url}`);
        failed++;
      }
    } catch (err) {
      console.error(`ERROR ${url}`, err.message);
      failed++;
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}

run();
