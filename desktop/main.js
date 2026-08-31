const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const WEB_DIR = path.join(__dirname, 'web');
const PORT = 0; // random free port

let mainWindow = null;
let server = null;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

// Tiny static file server for the built dashboard (SPA rewrite).
function startServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';

      let filePath = path.join(WEB_DIR, urlPath);
      // Guard against path traversal.
      if (!filePath.startsWith(WEB_DIR)) {
        res.writeHead(403);
        res.end();
        return;
      }

      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          // SPA fallback -> index.html
          filePath = path.join(WEB_DIR, 'index.html');
        }
        fs.readFile(filePath, (err2, data) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
          res.end(data);
        });
      });
    });

    server.on('error', reject);
    server.listen(PORT, () => resolve(server.address().port));
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    title: 'AquaWatch',
    icon: path.join(WEB_DIR, 'favicon.svg'),
    backgroundColor: '#0f172a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  // Open external links in the default browser, not inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}/`)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  const port = await startServer();
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (server) server.close();
});
