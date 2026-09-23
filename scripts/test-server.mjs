import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const distDir = path.resolve(__dirname, '../dist');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
};

const server = http.createServer((req, res) => {
  let reqPath = (req.url || '/').split('?')[0];

  // 1. Service Worker routing with PWA headers
  if (reqPath === '/sw.js') {
    const swPath = fs.existsSync(path.join(distDir, 'sw.js'))
      ? path.join(distDir, 'sw.js')
      : path.join(publicDir, 'sw.js');
    if (fs.existsSync(swPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      fs.createReadStream(swPath).pipe(res);
      return;
    }
  }

  // 2. React App assets routing
  if (reqPath.startsWith('/assets/')) {
    const assetPath = path.join(distDir, reqPath);
    if (fs.existsSync(assetPath)) {
      const ext = path.extname(assetPath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(assetPath).pipe(res);
      return;
    }
  }

  // 2. React App root routing (/v2, /app)
  if (
    reqPath === '/v2' ||
    reqPath.startsWith('/v2/') ||
    reqPath === '/app' ||
    reqPath.startsWith('/app/')
  ) {
    const distHtml = path.join(distDir, 'index.html');
    if (fs.existsSync(distHtml)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(distHtml).pipe(res);
      return;
    }
  }

  // 3. Default: serve from publicDir (preserving legacy monolith baseline)
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(publicDir, reqPath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(publicDir, 'index.html'), (err2, html) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        }
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const PORT = Number(process.env.PORT || 4173);
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Test server running at http://127.0.0.1:${PORT}`);
});
