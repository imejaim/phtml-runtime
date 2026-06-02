#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PKG_DIR = path.resolve(__dirname, '..');
const PKG = require(path.join(PKG_DIR, 'package.json'));
const PACKAGE_IMPORT_NAME = PKG.name || '@imejaim/ptml';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const DESIGN_PRESETS = {
  presentation: {
    default: 'presentation-dark-tech',
    aliases: {
      'dark-tech': 'presentation-dark-tech',
      'editorial-dark': 'presentation-editorial-dark',
      'editorial-light': 'presentation-editorial-light',
    },
  },
  report: {
    default: 'report-analyst-light',
    aliases: { 'analyst-light': 'report-analyst-light' },
  },
  document: {
    default: 'document-simple',
    aliases: { simple: 'document-simple', 'simple-doc': 'document-simple' },
  },
  web: {
    default: 'web-warm-paper',
    aliases: {
      warm: 'web-warm-paper',
      paper: 'web-warm-paper',
      'warm-paper': 'web-warm-paper',
      modern: 'web-warm-paper',
      basic: 'web-warm-paper',
      landing: 'web-warm-paper',
      'landing-modern': 'web-warm-paper',
      immersive: 'web-warm-paper',
      premium: 'web-warm-paper',
      cinematic: 'web-warm-paper',
      default: 'web-warm-paper',
      horizontal: 'web-warm-paper',
      'horizontal-cinematic': 'web-warm-paper',
    },
  },
};

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try { execSync(`${cmd} ${url}`); } catch (_) {}
}

function getFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) return fallback;
  return args[index + 1];
}

function hasFlag(args, name) { return args.includes(name); }

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
  return String(value || 'PTML Document')
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
  return String(source).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

function availableThemes() {
  return fs.readdirSync(path.join(PKG_DIR, 'themes'))
    .filter((name) => name.endsWith('.css'))
    .map((name) => name.replace(/\.css$/, ''))
    .sort();
}

function normalizeType(type) {
  const clean = String(type || 'presentation').toLowerCase();
  if (!DESIGN_PRESETS[clean]) {
    console.error(`Unknown type: ${clean}`);
    console.error('Available types: presentation, report, document, web');
    process.exit(1);
  }
  return clean;
}

function resolveDesign(type, value) {
  const preset = DESIGN_PRESETS[type];
  const raw = String(value || preset.default).toLowerCase();
  const design = preset.aliases[raw] || raw;
  if (!availableThemes().includes(design)) {
    console.error(`Design/theme not found: ${design}`);
    console.error(`Available designs: ${availableThemes().join(', ')}`);
    process.exit(1);
  }
  return design;
}

function themePath(theme) {
  const clean = String(theme || 'presentation-dark-tech').replace(/[^a-z0-9_-]/gi, '');
  const filePath = path.join(PKG_DIR, `themes/${clean}.css`);
  if (!fs.existsSync(filePath)) {
    console.error(`Theme not found: ${clean}`);
    console.error(`Available themes: ${availableThemes().join(', ')}`);
    process.exit(1);
  }
  return filePath;
}

function box(id, className, html, x, y, w, h, style) {
  const item = { id, className: `phtml-box ${className}`, html, x, y, w, h };
  if (style) item.style = style;
  return item;
}

function createPresentationDeck(title, design) {
  return {
    title,
    type: 'presentation',
    theme: design,
    slides: [
      { boxes: [
        box('eyebrow-1', 'eyebrow', 'LLM TO AGENT', 72, 74, 360, 48),
        box('title-1', 'title', title, 64, 158, 900, 178),
        box('sub-1', 'subtitle', 'From prompt response to delegated execution, verifiable tools, and persistent operating memory.', 70, 380, 840, 116),
        box('pill-1', 'pill', 'Presentation · editable PTML', 74, 548, 330, 54),
        box('card-1', 'card', '<strong>Baseline:</strong><br/>One standalone HTML file. Press E to edit, export again when done.', 910, 468, 290, 142),
      ] },
      { boxes: [
        box('title-2', 'title', 'The shift', 64, 76, 540, 110),
        box('n-1', 'number', '01', 76, 238, 205, 180),
        box('card-2a', 'card', '<strong>LLM</strong><br/>Generates text and code from context.', 315, 235, 330, 170),
        box('card-2b', 'card', '<strong>Agent</strong><br/>Uses tools, checks state, writes artifacts, verifies execution.', 705, 235, 400, 170),
        box('body-2', 'body', 'The product surface needs to carry both: communication for humans and machine-readable structure for agents.', 320, 476, 710, 110),
      ] },
      { boxes: [
        box('title-3', 'title', 'Operating loop', 64, 72, 620, 112),
        box('card-3a', 'card', '<strong>1. Understand</strong><br/>Goal, constraints, existing files', 92, 240, 300, 160),
        box('card-3b', 'card', '<strong>2. Act</strong><br/>Use tools, edit, generate, run', 490, 240, 300, 160),
        box('card-3c', 'card', '<strong>3. Verify</strong><br/>Tests, browser checks, evidence', 888, 240, 300, 160),
        box('accent-3', 'accent', 'PTML gives the visual artifact a stable runtime so the agent does not reinvent edit/export behavior.', 174, 500, 930, 86),
      ] },
    ],
  };
}

function createReportDeck(title, design) {
  return {
    title,
    type: 'report',
    mode: 'scroll',
    theme: design,
    slides: [
      { boxes: [
        box('r-eyebrow-1', 'eyebrow', 'ANALYSIS REPORT · LLM TO AGENT', 86, 58, 520, 42),
        box('r-title-1', 'title', title, 80, 132, 850, 132),
        box('r-sub-1', 'subtitle', 'A scrollable executive report on turning language models into action-capable operating agents.', 84, 296, 820, 82),
        box('r-kpi-1', 'kpi', '<b>3</b><span>core shifts</span>', 84, 462, 250, 122),
        box('r-kpi-2', 'kpi', '<b>5</b><span>operating layers</span>', 374, 462, 250, 122),
        box('r-kpi-3', 'kpi', '<b>1</b><span>editable artifact</span>', 664, 462, 250, 122),
        box('r-callout-1', 'callout', '<strong>Thesis</strong><br/>Agents become useful when the loop is observable: intent → tool action → verification → report.', 966, 426, 240, 194),
      ] },
      { boxes: [
        box('r-section-2', 'section-heading', 'Executive summary', 82, 72, 540, 70),
        box('r-body-2', 'body', 'The LLM-to-agent transition is not only a model upgrade. It is a runtime and workflow change. The system needs durable context, permissioned tools, inspectable output, and a human-readable surface for decisions.', 86, 170, 720, 150),
        box('r-insight-2', 'insight', '<strong>Key insight</strong><br/>An agent is trusted less by how fluent it sounds and more by whether it can show what it checked, changed, and verified.', 86, 378, 514, 150),
        box('r-rec-2', 'recommendation', '<strong>Recommendation</strong><br/>Use PTML report templates for human-facing outputs while keeping deck JSON and embedded runtime stable for agents.', 662, 376, 514, 152),
      ] },
      { boxes: [
        box('r-section-3', 'section-heading', 'Operating architecture', 82, 70, 650, 70),
        box('r-chart-3', 'chart-placeholder', '<strong>Flow</strong><br/><br/>User intent → Context lookup → Tool execution → Verification → Editable report', 90, 182, 540, 338),
        box('r-table-3', 'table-card', '<strong>Layer comparison</strong><br/><br/>Prompt layer: request framing<br/>Tool layer: file, terminal, browser, APIs<br/>Memory layer: preferences and conventions<br/>Artifact layer: PTML document<br/>Verification layer: tests and screenshots', 700, 180, 430, 342),
      ] },
      { boxes: [
        box('r-section-4', 'section-heading', 'Risks and next actions', 82, 70, 700, 70),
        box('r-risk-4', 'risk', '<strong>Risks</strong><br/>Silent tool failures, stale context, over-designed slides for long reports, and unverifiable claims.', 90, 184, 486, 168),
        box('r-rec-4a', 'recommendation', '<strong>Next action 1</strong><br/>Separate presentation, report, document, and web starter templates.', 642, 184, 486, 126),
        box('r-rec-4b', 'recommendation', '<strong>Next action 2</strong><br/>Keep every output editable and exportable as a single HTML file.', 642, 346, 486, 126),
        box('r-note-4', 'callout', 'This sample is generated by the PTML CLI with --type report --design analyst-light.', 90, 456, 486, 84),
      ] },
    ],
  };
}

function createDocumentDeck(title, design) {
  return {
    title,
    type: 'document',
    mode: 'scroll',
    theme: design,
    slides: [
      { boxes: [
        box('d-title-1', 'doc-title', title, 120, 86, 850, 98),
        box('d-meta-1', 'doc-meta', 'Simple document · LLM to Agent · editable PTML', 122, 204, 640, 40),
        box('d-body-1', 'doc-body', '<h2>Purpose</h2><p>This document explains the practical difference between an LLM that answers and an agent that performs work. It is designed for long-form reading, not slide performance.</p><h2>Core idea</h2><p>The agent layer adds tools, state inspection, verification, and a delivery surface. PTML keeps that delivery surface editable so the final document can still be adjusted by a human.</p>', 120, 286, 840, 260),
        box('d-callout-1', 'callout', '<strong>Document mode</strong><br/>Best for memos, specs, internal notes, and report drafts.', 990, 286, 210, 166),
      ] },
      { boxes: [
        box('d-title-2', 'doc-heading', 'Checklist', 120, 82, 520, 72),
        box('d-body-2', 'doc-body', '<ul><li>Clarify intent and constraints.</li><li>Inspect existing project state.</li><li>Use tools instead of pretending.</li><li>Verify with real outputs.</li><li>Summarize evidence and next decisions.</li></ul><p>The same editable document can become a memo, an appendix, or a published internal note.</p>', 120, 190, 760, 300),
        box('d-quote-2', 'quote', '“The difference between response and operation is verified action.”', 930, 198, 250, 210),
      ] },
    ],
  };
}

function createWebDeck(title, design) {
  return {
    title,
    type: 'web',
    mode: 'scroll',
    direction: 'vertical',
    theme: design,
    slides: [
      { boxes: [
        box('wp-pill-1', 'pill', 'WARM PAPER / SCROLL ACTION', 78, 68, 360, 48),
        box('wp-title-1', 'warm-title', title, 76, 146, 680, 188),
        box('wp-sub-1', 'warm-subtitle', 'A scroll-native PTML starter that reads like a web landing page and stays disciplined like an internal report. Typography, line length, and spacing come first; motion is layered on top.', 80, 360, 650, 142),
        box('wp-cta-1', 'cta mouse-react', 'Read the scroll report', 82, 556, 260, 58),
        box('wp-card-1', 'report-card mouse-react', '<strong>Title stays contained.</strong> Big enough for a landing hero, restrained enough for a report. Body text keeps a readable width instead of filling every box.', 790, 132, 346, 230),
        box('wp-flow-1', 'text-flow-demo', '<p>PHTML is a readable scroll document. Paragraphs breathe; cards support; the immersive layer reacts lightly.</p>', 786, 404, 360, 216),
      ] },
      { boxes: [
        box('wp-kicker-2', 'micro-nav', '02 / LAYOUT BEFORE EFFECTS', 78, 66, 360, 38),
        box('wp-title-2', 'section-heading', '글자 크기와 배치를 먼저 정하고, 장식은 나중에 붙입니다.', 78, 126, 640, 100),
        box('wp-body-2', 'body', 'The default template uses a report-like rhythm: moderate headings, 16–19px body copy, readable measure, and section spacing instead of oversized PPT blocks.', 82, 262, 650, 128),
        box('wp-rule-2', 'scroll-rule', 'Rule of thumb: hero title 42–58px, section heading 31–38px, body 17–19px, paragraph width 620–720px.', 82, 488, 620, 96),
        box('wp-card-2a', 'feature-card depth-card mouse-react', '<strong>Readable width</strong>Long text never stretches across the whole canvas. It sits in a predictable column.', 780, 140, 320, 150),
        box('wp-card-2b', 'feature-card depth-card mouse-react', '<strong>Soft separation</strong>Use whitespace, lines, and paper cards before heavy decoration.', 780, 330, 320, 150),
        box('wp-card-2c', 'feature-card depth-card mouse-react', '<strong>No overflow</strong>Default box sizes are conservative so edited text has room to breathe.', 780, 520, 320, 150),
      ] },
      { boxes: [
        box('wp-kicker-3', 'micro-nav', '03 / IMMERSIVE LAYER', 78, 66, 330, 38),
        box('wp-title-3', 'section-heading', 'Immersive는 별도 양식이 아니라 문서 위에 얹는 반응 레이어입니다.', 78, 126, 700, 108),
        box('wp-body-3', 'body', 'Scroll reveal, pointer-reactive light, floating cards, and pretext-like text flow are welcome by default. The document still stays vertical, calm, and editable.', 82, 270, 650, 120),
        box('wp-flow-3', 'text-flow-demo mouse-react', '<p>Pretext-style motion can make words flow around an object. In PTML, that belongs as a subtle effect sample — not as a reason to distort the report layout.</p>', 82, 456, 560, 168),
        box('wp-card-3a', 'glass-panel depth-card mouse-react', '<strong>Scroll action</strong>Sections reveal as the reader moves down the page.', 748, 170, 330, 144),
        box('wp-card-3b', 'glass-panel depth-card mouse-react', '<strong>Pointer reaction</strong>Background light and cards move only a few pixels.', 748, 362, 330, 144),
        box('wp-card-3c', 'glass-panel depth-card mouse-react', '<strong>Export-safe</strong>Everything remains one editable HTML file.', 748, 554, 330, 116),
      ] },
      { boxes: [
        box('wp-kicker-4', 'micro-nav', '04 / OUTPUT', 78, 66, 260, 38),
        box('wp-title-4', 'section-heading', 'One warm paper template for web reports, product narratives, and internal docs.', 78, 132, 710, 110),
        box('wp-body-4', 'body', 'Older web templates are folded into this single default direction: scrollable, clean, report-like, and motion-ready.', 82, 286, 640, 110),
        box('wp-card-4a', 'format-card depth-card mouse-react', '<strong>Simple by default</strong><span>Warm paper, calm typography, and readable sections.</span>', 760, 150, 320, 154),
        box('wp-card-4b', 'format-card depth-card mouse-react', '<strong>Immersive when useful</strong><span>Reveal, parallax, cursor light, and text-flow effects stay optional layers.</span>', 760, 354, 320, 166),
        box('wp-accent-4', 'accent', 'PTML starts as a scroll report, then becomes expressive where the story needs it.', 126, 544, 820, 74),
      ] },
    ],
  };
}

function createImmersiveWebDeck(title, design) {
  return createWebDeck(title, design);
}

function createStarterDeck(name, type = 'presentation', design) {
  const title = name || 'LLM to Agent';
  const resolvedType = normalizeType(type);
  const resolvedDesign = resolveDesign(resolvedType, design || undefined);
  if (resolvedType === 'report') return createReportDeck(title, resolvedDesign);
  if (resolvedType === 'document') return createDocumentDeck(title, resolvedDesign);
  if (resolvedType === 'web') return createWebDeck(title, resolvedDesign);
  return createPresentationDeck(title, resolvedDesign);
}

function buildStandaloneHtml(deck, options = {}) {
  const theme = options.theme || deck.theme || 'presentation-dark-tech';
  const scrollMode = options.scrollMode ?? (deck.mode === 'scroll' || deck.mode === 'horizontal');
  const scrollAxis = options.scrollAxis || deck.direction || (deck.mode === 'horizontal' ? 'horizontal' : 'vertical');
  const coreCss = fs.readFileSync(path.join(PKG_DIR, 'runtime/phtml.css'), 'utf8');
  const themeCss = fs.readFileSync(themePath(theme), 'utf8');
  const js = fs.readFileSync(path.join(PKG_DIR, 'runtime/phtml.js'), 'utf8');
  const bridgeLine = options.agentBridge ? `, agentBridge: ${JSON.stringify(options.agentBridge)}` : '';
  const deckClass = scrollMode ? 'phtml-deck flow' : 'phtml-deck';
  const hint = scrollMode ? 'E: edit · scroll: read · immersive effects · Export HTML' : 'E: edit · arrows: navigate · Export HTML: share as one file';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeTitle(deck.title || 'PTML Document')}</title>
<style>${coreCss}\n${themeCss}</style>
</head>
<body class="ptml-${safeTitle(deck.type || 'presentation')}">
<div class="phtml-hint">${hint}</div>
<div class="phtml-status"></div>
<main class="${deckClass}"></main>
<script id="phtml-deck-data" type="application/json">${escapeJsonForHtml(deck)}</script>
<script>${escapeScriptForHtml(js)}</script>
<script>PHTML.init({ deck: JSON.parse(document.getElementById('phtml-deck-data').textContent), scrollMode: ${scrollMode}, scrollAxis: '${scrollAxis}'${bridgeLine} });</script>
</body>
</html>`;
}

function serve(args) {
  const port = parseInt(getFlag(args, '--port', '3000'), 10);
  const doOpen = args.includes('--open') || args.includes('-o');
  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/examples/llm-to-agent/web-warm-paper.html';
    const filePath = path.join(PKG_DIR, urlPath);
    if (!filePath.startsWith(PKG_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end(`Not found: ${urlPath}`); return; }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`Port ${port} in use. Try: ptml serve --port ${port + 1}`);
    else console.error(err.message);
    process.exit(1);
  });
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('\n  PTML Runtime\n');
    console.log(`  Local:   ${url}`);
    console.log(`  Example: ${url}/examples/llm-to-agent/web-warm-paper.html`);
    console.log('\n  Press Ctrl+C to stop\n');
    if (doOpen) openBrowser(url);
  });
}

function init(args) {
  const name = positionalArgs(args)[0] || 'my-ptml-doc';
  const type = normalizeType(getFlag(args, '--type', 'presentation'));
  const design = resolveDesign(type, getFlag(args, '--design', getFlag(args, '--theme', undefined)));
  const dir = path.resolve(process.cwd(), name);
  if (fs.existsSync(dir)) { console.error(`Directory "${name}" already exists.`); process.exit(1); }
  fs.mkdirSync(dir, { recursive: true });
  const starterDeck = createStarterDeck(name, type, design);
  fs.writeFileSync(path.join(dir, 'deck.json'), JSON.stringify(starterDeck, null, 2));
  const scrollMode = starterDeck.mode === 'scroll' || starterDeck.mode === 'horizontal';
  const scrollAxis = starterDeck.direction || (starterDeck.mode === 'horizontal' ? 'horizontal' : 'vertical');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle(name)}</title>
  <link rel="stylesheet" href="node_modules/${PACKAGE_IMPORT_NAME}/runtime/phtml.css" />
  <link rel="stylesheet" href="node_modules/${PACKAGE_IMPORT_NAME}/themes/${design}.css" />
</head>
<body>
  <div class="phtml-hint">E: edit · ${scrollMode ? (scrollAxis === 'horizontal' ? 'wheel/trackpad: horizontal' : 'scroll: read') : 'arrows: navigate'}</div>
  <div class="phtml-status"></div>
  <main class="phtml-deck${scrollMode ? ' flow' : ''}"></main>
  <script src="node_modules/${PACKAGE_IMPORT_NAME}/runtime/phtml.js"></script>
  <script>
    PHTML.init({ deckUrl: 'deck.json', scrollMode: ${scrollMode}, scrollAxis: '${scrollAxis}', agentBridge: 'ws://localhost:8787' });
  </script>
</body>
</html>`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  const pkg = { name, version: '0.0.1', dependencies: { [PACKAGE_IMPORT_NAME]: '^1.0.0' } };
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  console.log(`\n  Created ${name}/ (${type}, ${design})\n`);
  console.log('  Next:\n');
  console.log(`    cd ${name}`);
  console.log('    npm install');
  console.log('    npx ptml serve --open\n');
}

function newStandalone(args) {
  const fileName = positionalArgs(args)[0] || 'deck.html';
  const out = path.resolve(process.cwd(), fileName);
  const type = normalizeType(getFlag(args, '--type', 'presentation'));
  const design = resolveDesign(type, getFlag(args, '--design', getFlag(args, '--theme', undefined)));
  const title = getFlag(args, '--title', path.basename(fileName, path.extname(fileName)) || 'LLM to Agent');
  const agentBridge = getFlag(args, '--agent-bridge', undefined);
  if (fs.existsSync(out) && !hasFlag(args, '--force')) {
    console.error(`File already exists: ${out}`);
    console.error('Use --force to overwrite.');
    process.exit(1);
  }
  const deck = createStarterDeck(title, type, design);
  const html = buildStandaloneHtml(deck, { theme: design, scrollMode: deck.mode === 'scroll' || deck.mode === 'horizontal', scrollAxis: deck.direction, agentBridge });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`Created standalone editable PTML file: ${out}`);
  console.log(`Type: ${type} · Design: ${design}`);
  console.log('Open it in a browser, press E to edit, then use Export HTML to save/share.');
}

function exportHtml(args) {
  const deckPath = positionalArgs(args)[0];
  if (!deckPath) { console.error('Usage: ptml export <deck.json>'); process.exit(1); }
  const resolvedDeckPath = path.resolve(deckPath);
  const deck = JSON.parse(fs.readFileSync(resolvedDeckPath, 'utf8'));
  const html = buildStandaloneHtml(deck, { theme: deck.theme || 'presentation-dark-tech', scrollMode: deck.mode === 'scroll' || deck.mode === 'horizontal', scrollAxis: deck.direction });
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
  case 'serve': serve(rest); break;
  case 'init': init(rest); break;
  case 'new': newStandalone(rest); break;
  case 'export': exportHtml(rest); break;
  case 'designs':
  case 'themes':
    console.log(availableThemes().join('\n'));
    break;
  default:
    console.log(`ptml <command>\n\nCommands:\n  new [file.html] [--title T] [--type presentation|report|document|web]\n                  [--design name] [--theme name] [--agent-bridge URL] [--force]\n                         Create one standalone editable HTML file\n  init [name] [--type type] [--design name]\n                         Create a PTML project\n  serve [--port N] [--open]\n                         Start example dev server\n  export <deck.json>     Export JSON deck as standalone HTML\n  designs                List installed designs/themes\n  version, --version     Print installed version\n\nExamples:\n  ptml new llm-report.html --type report --design analyst-light\n  ptml new llm-deck.html --type presentation --design dark-tech\n  ptml new llm-doc.html --type document --design simple-doc\n  ptml new llm-site.html --type web --design warm-paper\n`);
}
