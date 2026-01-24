/**
 * Simple HTTP server for testing the extension
 * Run: node test/serve.js
 * Then open: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/test/mock-whatnot.html' : req.url;
  filePath = path.join(__dirname, '..', filePath);

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          Whatnot Chat Bot - Test Server                    ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Server running at: http://localhost:${PORT}                 ║
║                                                            ║
║  TESTING STEPS:                                            ║
║  1. Load extension in Chrome (chrome://extensions)         ║
║  2. Open http://localhost:${PORT} in Chrome                  ║
║  3. Click extension icon → Enable "Bot Active"             ║
║  4. Use test buttons to simulate viewers                   ║
║  5. Watch the bot respond!                                 ║
║                                                            ║
║  Press Ctrl+C to stop the server                           ║
╚════════════════════════════════════════════════════════════╝
  `);
});
