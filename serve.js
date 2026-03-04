const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 8888;
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  let filePath = path.join(__dirname, file);
  // If path has no extension, try .html (so /search -> search.html)
  if (!path.extname(filePath)) {
    const withHtml = filePath + '.html';
    if (fs.existsSync(withHtml)) filePath = withHtml;
  }
  // Read as UTF-8 so we never send UTF-16 (which causes NUL-between-chars in browser)
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    let type = mime[ext] || 'application/octet-stream';
    if (type === 'text/html') type += '; charset=utf-8';
    const headers = { 'Content-Type': type };
    if (type.startsWith('text/html')) headers['Cache-Control'] = 'no-store';
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(port, () => console.log('CFM at http://localhost:' + port));
