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
    default: 'web-modern',
    aliases: { modern: 'web-modern', landing: 'web-modern', 'landing-modern': 'web-modern', immersive: 'web-immersive', premium: 'web-immersive', cinematic: 'web-immersive', horizontal: 'web-horizontal-cinematic', 'horizontal-cinematic': 'web-horizontal-cinematic' },
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
    theme: design,
    slides: [
      { boxes: [
        box('w-pill-1', 'pill', 'LLM TO AGENT', 78, 68, 220, 48),
        box('w-title-1', 'hero-title', title, 76, 146, 760, 130),
        box('w-sub-1', 'hero-subtitle', 'A modern web-style explainer page for teams adopting tool-using AI agents.', 80, 314, 670, 86),
        box('w-cta-1', 'cta', 'Explore the operating model', 82, 464, 300, 58),
        box('w-card-1', 'feature-card', '<strong>Agentic loop</strong><br/>Plan, act, observe, verify, report.', 780, 170, 330, 180),
      ] },
      { boxes: [
        box('w-heading-2', 'section-heading', 'What changes?', 78, 76, 560, 76),
        box('w-feature-1', 'feature-card', '<strong>Tools</strong><br/>The agent can read, edit, run, browse, and send.', 82, 214, 310, 170),
        box('w-feature-2', 'feature-card', '<strong>Memory</strong><br/>Stable preferences and conventions reduce repeated steering.', 484, 214, 310, 170),
        box('w-feature-3', 'feature-card', '<strong>Artifacts</strong><br/>PTML makes deliverables editable, inspectable, and shareable.', 886, 214, 310, 170),
        box('w-band-2', 'accent', 'The output should look like a designed web page while preserving the same PTML edit/export controls.', 160, 496, 960, 78),
      ] },
    ],
  };
}

function createImmersiveWebDeck(title, design) {
  const horizontal = design === 'web-horizontal-cinematic';
  return {
    title,
    type: 'web',
    mode: horizontal ? 'horizontal' : 'scroll',
    direction: horizontal ? 'horizontal' : 'vertical',
    theme: design,
    slides: [
      { boxes: [
        box('im-nav-1', 'micro-nav', 'PTML / LLM TO AGENT / 01', 64, 38, 340, 38),
        box('im-title-1', 'immersive-title', title, 72, 124, 860, 172),
        box('im-sub-1', 'immersive-subtitle', 'A cinematic, scroll-native template for explaining how language models become operating agents.', 78, 326, 650, 92),
        box('im-orb-1', 'orbital-system mouse-react', '<span></span><i></i><b></b>', 760, 72, 420, 420),
        box('im-cta-1', 'magnetic-cta mouse-react', 'Scroll to enter the operating loop', 80, 516, 390, 64),
        box('im-note-1', 'side-note', 'Vertical scroll is the default. Horizontal mode is available when the story should feel like a cinematic track.', 914, 522, 260, 102),
      ] },
      { boxes: [
        box('im-kicker-2', 'micro-nav', '02 / FROM RESPONSE TO ACTION', 64, 44, 380, 38),
        box('im-title-2', 'immersive-heading', 'The page moves like the agent thinks.', 72, 110, 690, 132),
        box('im-card-2a', 'glass-panel depth-card mouse-react', '<strong>Intent</strong><br/>The user asks for an outcome, not just an answer.', 90, 324, 330, 160),
        box('im-card-2b', 'glass-panel depth-card mouse-react', '<strong>Tools</strong><br/>The agent reads, edits, executes, browses, and verifies.', 476, 260, 330, 160),
        box('im-card-2c', 'glass-panel depth-card mouse-react', '<strong>Evidence</strong><br/>The final report shows what was actually checked.', 862, 324, 330, 160),
        box('im-thread-2', 'motion-thread', '', 230, 536, 820, 20),
      ] },
      { boxes: [
        box('im-kicker-3', 'micro-nav', '03 / AGENT SURFACE', 64, 44, 360, 38),
        box('im-title-3', 'immersive-heading', 'Readable for humans. Structured for agents.', 72, 104, 760, 124),
        box('im-console-3', 'agent-console mouse-react', '<code>goal.detect()</code><br/><code>context.load()</code><br/><code>tools.execute()</code><br/><code>result.verify()</code><br/><code>artifact.export()</code>', 86, 306, 430, 270),
        box('im-body-3', 'large-copy', 'PTML keeps the final artifact editable while preserving a stable JSON/runtime convention. That means a designer can polish it, a manager can read it, and an agent can safely modify it later.', 620, 312, 520, 210),
      ] },
      { boxes: [
        box('im-kicker-4', 'micro-nav', '04 / OUTPUT', 64, 44, 260, 38),
        box('im-title-4', 'immersive-heading', 'One file. Multiple formats. Motion included.', 72, 114, 780, 120),
        box('im-card-4a', 'format-card mouse-react', '<b>01</b><strong>Report</strong><span>Default vertical scroll for analysis and publishing.</span>', 86, 332, 310, 190),
        box('im-card-4b', 'format-card mouse-react', '<b>02</b><strong>Web</strong><span>Premium landing-page motion and mouse-reactive surfaces.</span>', 486, 286, 310, 190),
        box('im-card-4c', 'format-card mouse-react', '<b>03</b><strong>Track</strong><span>Optional horizontal scroll for PPT-like progression.</span>', 886, 332, 310, 190),
      ] },
    ],
  };
}

function createStarterDeck(name, type = 'presentation', design) {
  const title = name || 'LLM to Agent';
  const resolvedType = normalizeType(type);
  const resolvedDesign = resolveDesign(resolvedType, design || undefined);
  if (resolvedType === 'report') return createReportDeck(title, resolvedDesign);
  if (resolvedType === 'document') return createDocumentDeck(title, resolvedDesign);
  if (resolvedType === 'web' && (resolvedDesign === 'web-immersive' || resolvedDesign === 'web-horizontal-cinematic')) return createImmersiveWebDeck(title, resolvedDesign);
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
  const hint = scrollMode ? (scrollAxis === 'horizontal' ? 'E: edit · wheel/trackpad: horizontal story · Export HTML' : 'E: edit · scroll: read · Export HTML') : 'E: edit · arrows: navigate · Export HTML: share as one file';
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
    if (urlPath === '/') urlPath = '/examples/llm-to-agent/web-immersive.html';
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
    console.log(`  Example: ${url}/examples/llm-to-agent/web-immersive.html`);
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
    console.log(`ptml <command>\n\nCommands:\n  new [file.html] [--title T] [--type presentation|report|document|web]\n                  [--design name] [--theme name] [--agent-bridge URL] [--force]\n                         Create one standalone editable HTML file\n  init [name] [--type type] [--design name]\n                         Create a PTML project\n  serve [--port N] [--open]\n                         Start example dev server\n  export <deck.json>     Export JSON deck as standalone HTML\n  designs                List installed designs/themes\n  version, --version     Print installed version\n\nExamples:\n  ptml new llm-report.html --type report --design analyst-light\n  ptml new llm-deck.html --type presentation --design dark-tech\n  ptml new llm-doc.html --type document --design simple-doc\n  ptml new llm-site.html --type web --design immersive\n  ptml new llm-track.html --type web --design horizontal\n`);
}
