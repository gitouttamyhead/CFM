/**
 * One-time script: replace inline nav block with <div id="navWrapper"></div> in all HTML files.
 * Run from CFM directory: node scripts/replace-nav-placeholder.js
 */
const fs = require('fs');
const path = require('path');

const navBlockStart = '    <!-- Shared Navigation -->\n    <div id="navWrapper">\n        <!-- nav.html -->';
const placeholder = '    <!-- Shared Navigation -->\n    <div id="navWrapper"></div>';

const dir = path.join(__dirname, '..');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'nav.html');

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  if (!content.includes('<!-- nav.html -->')) return;
  if (content.includes('<div id="navWrapper"></div>')) return;
  const start = content.indexOf(navBlockStart);
  if (start === -1) return;
  const navEnd = content.indexOf('        </nav>', start);
  if (navEnd === -1) return;
  const end = content.indexOf('    </div>', navEnd) + '    </div>'.length;
  const before = content.slice(0, start);
  const after = content.slice(end);
  const newContent = before + placeholder + after;
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Updated', f);
});
