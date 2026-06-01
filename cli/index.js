#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PKG_DIR = path.resolve(__dirname, '..');
const PKG = require(path.join(PKG_DIR, 'package.json'));

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

function getFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) return fallback;
  return args[index + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function positionalArgs(args) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) i += 1;
      continue;
    }
    out.push(arg);
  }
  return out;
}

function safeTitle(value) {
  return String(value || 'PHTML Deck')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeScriptForHtml(source) {
  return String(source)
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--');
}

function themePath(theme) {
  const clean = String(theme || 'editorial-dark').replace(/[^a-z0-9_-]/gi, '');
  const filePath = path.join(PKG_DIR, `themes/${clean}.css`);
  if (!fs.existsSync(filePath)) {
    console.error(`Theme not found: ${clean}`);
    console.error('Available themes: editorial-dark, editorial-light, dark-tech');
    process.exit(1);
  }
  return filePath;
}

function createStarterDeck(name, theme = 'editorial-dark') {
  const title = name || 'PHTML Deck';
  return {
    title,
    theme,
    slides: [
      {
        boxes: [
          { id: 'eyebrow-1', className: 'phtml-box eyebrow', html: 'Editable HTML', x: 64, y: 72, w: 360, h: 52 },
          { id: 'title-1', className: 'phtml-box title', html: title, x: 64, y: 160, w: 900, h: 180 },
          { id: 'sub-1', className: 'phtml-box subtitle', html: 'Press E to edit. Drag, resize, double-click, and export as one HTML file.', x: 68, y: 370, w: 820, h: 100 },
          { id: 'pill-1', className: 'phtml-box pill', html: 'Shared PHTML runtime', x: 72, y: 535, w: 280, h: 58 }
        ]
      },
      {
        boxes: [
          { id: 'title-2', className: 'phtml-box title', html: 'Why PHTML?', x: 64, y: 88, w: 760, h: 130 },
          { id: 'body-2', className: 'phtml-box body', html: 'PHTML is not a new language. It is a small installable runtime and file convention so people and AI agents start from the same editable HTML behavior instead of inventing incompatible versions.', x: 72, y: 260, w: 760, h: 210 },
          { id: 'card-2', className: 'phtml-box card', html: '<strong>Common baseline</strong><br/>Edit mode, deck data, themes, export, and optional agent bridge.', x: 900, y: 230, w: 300, h: 230 }
        ]
      }
    ]
  };
}

function buildStandaloneHtml(deck, options = {}) {
  const theme = options.theme || deck.theme || 'editorial-dark';
  const coreCss = fs.readFileSync(path.join(PKG_DIR, 'runtime/phtml.css'), 'utf8');
  const themeCss = fs.readFileSync(themePath(theme), 'utf8');
  const js = fs.readFileSync(path.join(PKG_DIR, 'runtime/phtml.js'), 'utf8');
  const bridgeLine = options.agentBridge
    ? `, agentBridge: ${JSON.stringify(options.agentBridge)}`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeTitle(deck.title || 'PHTML Deck')}</title>
<style>${coreCss}\n${themeCss}</style>
</head>
<body>
<div class="phtml-hint">E: edit · arrows: navigate · Export HTML: share as one file</div>
<div class="phtml-status"></div>
<main class="phtml-deck"></main>
<script id="phtml-deck-data" type="application/json">${escapeJsonForHtml(deck)}</script>
<script>${escapeScriptForHtml(js)}</script>
<script>PHTML.init({ deck: JSON.parse(document.getElementById('phtml-deck-data').textContent)${bridgeLine} });</script>
</body>
</html>`;
}

function serve(args) {
  const port = parseInt(getFlag(args, '--port', '3000'), 10);
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
  const name = positionalArgs(args)[0] || 'my-deck';
  const theme = getFlag(args, '--theme', 'editorial-dark');
  const dir = path.resolve(process.cwd(), name);

  if (fs.existsSync(dir)) {
    console.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(dir, { recursive: true });
  const starterDeck = createStarterDeck(name, theme);
  fs.writeFileSync(path.join(dir, 'deck.json'), JSON.stringify(starterDeck, null, 2));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle(name)}</title>
  <link rel="stylesheet" href="node_modules/phtml-runtime/runtime/phtml.css" />
  <link rel="stylesheet" href="node_modules/phtml-runtime/themes/${theme}.css" />
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

function newStandalone(args) {
  const fileName = positionalArgs(args)[0] || 'deck.html';
  const out = path.resolve(process.cwd(), fileName);
  const theme = getFlag(args, '--theme', 'editorial-dark');
  const title = getFlag(args, '--title', path.basename(fileName, path.extname(fileName)) || 'PHTML Deck');
  const agentBridge = getFlag(args, '--agent-bridge', undefined);

  if (fs.existsSync(out) && !hasFlag(args, '--force')) {
    console.error(`File already exists: ${out}`);
    console.error('Use --force to overwrite.');
    process.exit(1);
  }

  const deck = createStarterDeck(title, theme);
  const html = buildStandaloneHtml(deck, { theme, agentBridge });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);

  console.log(`Created standalone editable PHTML file: ${out}`);
  console.log('Open it in a browser, press E to edit, then use Export HTML to save/share.');
}

function exportHtml(args) {
  const deckPath = positionalArgs(args)[0];
  if (!deckPath) { console.error('Usage: phtml export <deck.json>'); process.exit(1); }

  const resolvedDeckPath = path.resolve(deckPath);
  const deck = JSON.parse(fs.readFileSync(resolvedDeckPath, 'utf8'));
  const html = buildStandaloneHtml(deck, { theme: deck.theme || 'editorial-dark' });

  const out = resolvedDeckPath.replace(/\.json$/, '.html');
  fs.writeFileSync(out, html);
  console.log(`Exported: ${out}`);
}

const [,, cmd, ...rest] = process.argv;

switch (cmd) {
  case '--version':
  case '-v':
  case 'version':
    console.log(PKG.version);
    break;
  case 'serve':  serve(rest); break;
  case 'init':   init(rest); break;
  case 'new':    newStandalone(rest); break;
  case 'export': exportHtml(rest); break;
  default:
    console.log(`phtml <command>\n\nCommands:\n  new [file.html] [--title T] [--theme name] [--force]\n                         Create one standalone editable HTML file\n  init [name]            Create a new deck project\n  serve [--port N] [--open]\n                         Start example dev server\n  export <deck.json>     Export JSON deck as standalone HTML\n  version, --version     Print installed version\n`);
}
