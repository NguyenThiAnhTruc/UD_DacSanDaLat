#!/usr/bin/env node

/**
 * Simple HTTP Server cho DA LAT FARM Web App
 * Usage: node server.js
 * Access: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'www');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Default to index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Prevent directory traversal
  const filePath = path.normalize(path.join(DIST_DIR, pathname));
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Try to read file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // File not found - serve index.html para sa SPA routing
      if (pathname !== '/index.html') {
        fs.readFile(path.join(DIST_DIR, 'index.html'), (indexErr, indexData) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(indexData);
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Cache headers
    const isAsset = /\.(js|css|webp|woff2|png|jpg|jpeg|gif|svg)$/i.test(filePath);
    if (isAsset) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║     🌾 DA LAT FARM - NÔNG SẢN ĐÀ LẠT                   ║
║                                                        ║
║     ✅ Server running at http://localhost:${PORT}      ║
║     📁 Serving from: ${DIST_DIR}                     ║
║                                                        ║
║     DEMO ACCOUNTS:                                    ║
║     👤 Customer: customer.a@dalatfarm.vn              ║
║     🏪 Seller:  seller@dalatfarm.vn                   ║
║     👨‍💼 Admin:  test@example.com                      ║
║     🔑 Password: Check .env file                      ║
║                                                        ║
║     📚 Docs: DEPLOYMENT_GUIDE.md                      ║
║     🔒 Security: Check .env configuration              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝

Press Ctrl+C to stop server
  `);
});
