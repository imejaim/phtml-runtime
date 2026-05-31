#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PKG_DIR = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start' :
              process.platform === 'darwin' ? 'open' : 'xdg-open';
  try { execSync(`${cmd} ${url}`); } catch (_) {}
}

function serve(args) {
  const portArg = args.find((a, i) => a === '--port' && args[i + 1]);
  const port = portArg ? parseInt(args[args.indexOf('--port') + 1], 10) : 3000;
  const doOpen = args.includes('--open') || args.includes('-o');

  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/examples/llm-to-agent/index.html';

    const filePath = path.join(PKG_DIR, urlPath);

    if (!filePath.startsWith(PKG_DIR)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Not found: ${urlPath}`);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} in use. Try: phtml serve --port ${port + 1}`);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n  PHTML Runtime\n`);
    console.log(`  Local:   ${url}`);
    console.log(`  Deck:    ${url}/examples/llm-to-agent/index.html`);
    console.log(`\n  Press Ctrl+C to stop\n`);
    if (doOpen) openBrowser(url);
  });
}

function init(args) {
  const name = args[0] || 'my-deck';
  const dir = path.resolve(process.cwd(), name);

  if (fs.existsSync(dir)) {
    console.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(dir, { recursive: true });

  const starterDeck = {
    title: name,
    theme: 'editorial-dark',
    slides: [{
      boxes: [
        { id: 'title-1', className: 'phtml-box title', html: name, x: 60, y: 180, w: 900, h: 200 },
        { id: 'sub-1', className: 'phtml-box subtitle', html: 'Your presentation starts here', x: 60, y: 400, w: 700, h: 80 },
      ]
    }]
  };

  fs.writeFileSync(path.join(dir, 'deck.json'), JSON.stringify(starterDeck, null, 2));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link rel="stylesheet" href="node_modules/phtml-runtime/runtime/phtml.css" />
  <link rel="stylesheet" href="node_modules/phtml-runtime/themes/editorial-dark.css" />
</head>
<body>
  <div class="phtml-hint">E: edit · arrows: navigate</div>
  <div class="phtml-status"></div>
  <main class="phtml-deck"></main>
  <script src="node_modules/phtml-runtime/runtime/phtml.js"></script>
  <script>
    PHTML.init({ deckUrl: 'deck.json', agentBridge: 'ws://localhost:8787' });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(dir, 'index.html'), html);

  const pkg = { name, version: '0.0.1', dependencies: { 'phtml-runtime': '^1.0.0' } };
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

  console.log(`\n  Created ${name}/\n`);
  console.log(`  Next:\n`);
  console.log(`    cd ${name}`);
  console.log(`    npm install`);
  console.log(`    npx phtml serve --open\n`);
}

function exportHtml(args) {
  const deckPath = args[0];
  if (!deckPath) { console.error('Usage: phtml export <deck.json>'); process.exit(1); }

  const deck = JSON.parse(fs.readFileSync(path.resolve(deckPath), 'utf8'));
  const theme = deck.theme || 'editorial-dark';

  const coreCss = fs.readFileSync(path.join(PKG_DIR, 'runtime/phtml.css'), 'utf8');
  const themeCss = fs.readFileSync(path.join(PKG_DIR, `themes/${theme}.css`), 'utf8');
  const js = fs.readFileSync(path.join(PKG_DIR, 'runtime/phtml.js'), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${deck.title || 'PHTML Deck'}</title>
<style>${coreCss}\n${themeCss}</style>
</head>
<body>
<div class="phtml-hint">E: edit · arrows: navigate</div>
<div class="phtml-status"></div>
<main class="phtml-deck"></main>
<script id="phtml-deck-data" type="application/json">${JSON.stringify(deck)}</script>
<script>${js}</script>
<script>PHTML.init({ deck: JSON.parse(document.getElementById('phtml-deck-data').textContent) });</script>
</body>
</html>`;

  const out = deckPath.replace(/\.json$/, '.html');
  fs.writeFileSync(out, html);
  console.log(`Exported: ${out}`);
}

const [,, cmd, ...rest] = process.argv;

switch (cmd) {
  case 'serve':  serve(rest); break;
  case 'init':   init(rest); break;
  case 'export': exportHtml(rest); break;
  default:
    console.log(`phtml <command>\n\nCommands:\n  serve [--port N] [--open]  Start dev server\n  init [name]                Create new deck project\n  export <deck.json>         Export standalone HTML\n`);
}
