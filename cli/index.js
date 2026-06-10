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
  '.htm': 'text/html; charset=utf-8',
  // Compatibility rescue only. Browser-ready PTML artifacts should be .html.
  '.ptml': 'text/html; charset=utf-8',
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
    default: 'report-scroll-action',
    aliases: {
      'analyst-light': 'report-analyst-light',
      cinematic: 'report-scroll-action',
      'scroll-action': 'report-scroll-action',
      immersive: 'report-scroll-action',
      default: 'report-scroll-action',
    },
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

const DESIGN_INFO = {
  'dark-tech': {
    type: 'presentation', aliases: ['presentation-dark-tech'],
    description: 'Backward-compatible dark tech presentation theme.',
    recommendedFor: ['발표', '슬라이드', 'legacy deck'],
  },
  'editorial-dark': {
    type: 'presentation', aliases: ['presentation-editorial-dark'],
    description: 'Backward-compatible editorial dark presentation theme.',
    recommendedFor: ['발표', '스토리텔링'],
  },
  'editorial-light': {
    type: 'presentation', aliases: ['presentation-editorial-light'],
    description: 'Backward-compatible editorial light presentation theme.',
    recommendedFor: ['발표', '교육자료'],
  },
  'presentation-dark-tech': {
    type: 'presentation', defaultFor: 'presentation', aliases: ['dark-tech'],
    description: 'Dark technology presentation deck with strong contrast and slide navigation.',
    recommendedFor: ['발표', '슬라이드', 'deck', 'technical presentation'],
  },
  'presentation-editorial-dark': {
    type: 'presentation', aliases: ['editorial-dark'],
    description: 'Editorial dark presentation style for narrative decks.',
    recommendedFor: ['발표', '스토리텔링', 'executive deck'],
  },
  'presentation-editorial-light': {
    type: 'presentation', aliases: ['editorial-light'],
    description: 'Clean editorial light deck for readable presentation material.',
    recommendedFor: ['발표', '교육자료', 'light deck'],
  },
  'report-analyst-light': {
    type: 'report', aliases: ['analyst-light'],
    description: 'Classic executive analysis report with KPI cards, insight, recommendation, and risk blocks.',
    recommendedFor: ['보고서', '레포트', '분석', 'classic executive summary'],
  },
  'report-scroll-action': {
    type: 'report', defaultFor: 'report', aliases: ['scroll-action', 'cinematic', 'immersive'],
    description: 'Default bright readable report with OME-DUO-style scroll scenes, side-moving chart flow, and presentation-ready pacing.',
    recommendedFor: ['스크롤 리포트', '발표 가능한 보고서', '분석', 'executive narrative'],
  },
  'document-simple': {
    type: 'document', defaultFor: 'document', aliases: ['simple', 'simple-doc'],
    description: 'Long-form memo/spec document with readable prose and callouts.',
    recommendedFor: ['문서', '메모', 'spec', 'internal note'],
  },
  'web-warm-paper': {
    type: 'web', defaultFor: 'web', aliases: ['warm-paper', 'warm', 'paper', 'immersive', 'modern'],
    description: 'Warm paper scroll page: report-like typography plus subtle immersive motion.',
    recommendedFor: ['스크롤 리포트', '웹페이지', '랜딩', '보기 좋은 보고서'],
  },
};

const TYPE_ALIASES = {
  report: 'report', reports: 'report', '보고서': 'report', '레포트': 'report', analysis: 'report', analyst: 'report',
  document: 'document', doc: 'document', memo: 'document', spec: 'document', '문서': 'document', '메모': 'document',
  presentation: 'presentation', deck: 'presentation', slides: 'presentation', slide: 'presentation', '발표': 'presentation', '슬라이드': 'presentation',
  web: 'web', site: 'web', page: 'web', landing: 'web', '웹': 'web', '웹페이지': 'web', immersive: 'web',
};

const DEFAULT_FILENAMES = {
  presentation: 'ptml-deck.html',
  report: 'ptml-report.html',
  document: 'ptml-document.html',
  web: 'ptml-web.html',
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

function removeFlagWithValue(args, name) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name) { i += 1; continue; }
    out.push(args[i]);
  }
  return out;
}

function stripFlags(args, flags) {
  let out = [...args];
  for (const flag of flags) out = removeFlagWithValue(out, flag).filter((arg) => arg !== flag);
  return out;
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

function normalizeHtmlOutputPath(fileName, args = []) {
  const requested = fileName || 'deck.html';
  const ext = path.extname(requested).toLowerCase();
  const allowNonHtml = hasFlag(args, '--allow-non-html-extension');
  if (!ext) return `${requested}.html`;
  if (ext === '.html' || ext === '.htm') return requested;
  if (allowNonHtml) return requested;
  if (ext === '.ptml' || ext === '.phtml') {
    console.error('PTML/PHTML is the runtime/CLI name, not the browser-ready output extension.');
    console.error('Use a .html filename, e.g. ptml report report.html');
    console.error('.ptml is reserved for a future source format; .phtml can conflict with PHP/PHTML servers.');
  } else {
    console.error(`Unsupported output extension: ${ext}`);
    console.error('Standalone editable PTML artifacts must be browser-ready .html files.');
  }
  console.error('Override only if you know what you are doing: --allow-non-html-extension');
  process.exit(1);
}

function firstFileArgOrDefault(args, type) {
  const pos = positionalArgs(stripFlags(args, ['--title', '--type', '--design', '--theme', '--agent-bridge', '--out', '-o']));
  const explicitOut = getFlag(args, '--out', getFlag(args, '-o', undefined));
  if (explicitOut) return explicitOut;
  const first = pos[0];
  if (!first) return DEFAULT_FILENAMES[type] || 'ptml-output.html';
  const ext = path.extname(first).toLowerCase();
  if (ext || first.includes('/') || first.includes('\\\\')) return first;
  if (pos.length === 1 && /[\s가-힣]/.test(first)) return DEFAULT_FILENAMES[type] || 'ptml-output.html';
  return first;
}

function titleFromArgs(args, fallback) {
  const flagTitle = getFlag(args, '--title', undefined);
  if (flagTitle) return flagTitle;
  const pos = positionalArgs(stripFlags(args, ['--type', '--design', '--theme', '--agent-bridge', '--out', '-o']));
  if (!pos.length) return fallback;
  const first = pos[0];
  const firstLooksLikeFile = path.extname(first) || first.includes('/') || first.includes('\\\\');
  const titleParts = firstLooksLikeFile ? pos.slice(1) : pos;
  return titleParts.length ? titleParts.join(' ') : fallback;
}

function inferTypeFromText(text) {
  const clean = String(text || '').toLowerCase();
  if (/보고서|레포트|리포트|분석|report|analysis|analyst/.test(clean)) return 'report';
  if (/웹|랜딩|홈페이지|web|site|landing|page|immersive/.test(clean)) return 'web';
  if (/발표|슬라이드|프레젠테이션|deck|slide|presentation/.test(clean)) return 'presentation';
  if (/문서|메모|스펙|document|memo|spec|doc/.test(clean)) return 'document';
  return 'report';
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
    direction: 'vertical',
    theme: design,
    slides: [
      { className: 'scroll-scene scene-hero', boxes: [
        box('rs-orbit-1', 'orbit-line orbit-one', '', 770, -110, 640, 640),
        box('rs-pill-1', 'pill', 'PTML SCROLL REPORT · EDITABLE HTML', 78, 68, 430, 48),
        box('rs-title-1', 'warm-title', title, 78, 138, 700, 164),
        box('rs-sub-1', 'warm-subtitle', 'A bright, readable report format where the reader scrolls naturally: sections move down, supporting evidence slides sideways, and the whole artifact remains editable/exportable as one HTML file.', 82, 326, 690, 132),
        box('rs-cta-1', 'cta mouse-react', 'Scroll to read · Press E to edit', 82, 546, 310, 58),
        box('rs-card-1', 'report-card mouse-react', '<strong>Default direction</strong>Readable first. Motion second. The scroll action guides attention without turning the report into an unreadable event site.', 820, 150, 330, 230),
        box('rs-metric-1', 'metric', '<b>01</b>What', 820, 430, 96, 88),
        box('rs-metric-2', 'metric', '<b>02</b>How', 934, 430, 96, 88),
        box('rs-metric-3', 'metric', '<b>03</b>Why', 1048, 430, 96, 88),
      ] },
      { className: 'scroll-scene scene-from-right', boxes: [
        box('rs-kicker-2', 'micro-nav', '01 / WHAT', 78, 66, 230, 38),
        box('rs-title-2', 'section-heading', 'What: AI is becoming an operating layer, not just a chat window.', 78, 128, 650, 108),
        box('rs-body-2', 'body', 'The important change is not that models produce more fluent text. The change is that models can now sit inside workflows: reading context, choosing tools, creating artifacts, and returning verifiable outputs.', 82, 276, 650, 138),
        box('rs-note-2', 'side-note', 'Reading rhythm: thesis on the left, evidence moves in from the side, then the next scene resolves the implication.', 82, 500, 520, 92),
        box('rs-chart-2a', 'chart-card depth-card mouse-react', '<strong>Interface</strong><span>Prompt → answer</span><em>Low operational leverage</em>', 758, 132, 320, 150),
        box('rs-chart-2b', 'chart-card depth-card mouse-react', '<strong>Workflow</strong><span>Intent → tools → checks</span><em>Medium leverage</em>', 826, 318, 320, 150),
        box('rs-chart-2c', 'chart-card depth-card mouse-react', '<strong>Operating layer</strong><span>Memory → action → evidence</span><em>High leverage</em>', 748, 504, 360, 150),
      ] },
      { className: 'scroll-scene scene-from-left', boxes: [
        box('rs-kicker-3', 'micro-nav', '02 / HOW', 78, 66, 220, 38),
        box('rs-title-3', 'section-heading', 'How: reports should become navigable scenes, not static slides.', 78, 126, 660, 104),
        box('rs-body-3', 'body', 'A good report has a vertical argument and horizontal evidence. The reader moves down the story while charts, cards, and comparisons arrive from the side at the exact moment they support the point.', 82, 272, 640, 128),
        box('rs-flow-3', 'chart-track', '<div><b>1</b><span>Frame the question</span></div><div><b>2</b><span>Show the mechanism</span></div><div><b>3</b><span>Compare options</span></div><div><b>4</b><span>Decide next action</span></div>', 660, 150, 520, 365),
        box('rs-callout-3', 'callout mouse-react', '<strong>PTML behavior</strong>Each scene is still editable: double-click/add boxes in edit mode, move text, export the final HTML.', 150, 520, 520, 112),
      ] },
      { className: 'scroll-scene scene-from-right scene-data', boxes: [
        box('rs-kicker-4', 'micro-nav', '03 / WHY', 78, 66, 210, 38),
        box('rs-title-4', 'section-heading', 'Why: motion helps a presenter control attention without hiding the logic.', 78, 126, 660, 110),
        box('rs-body-4', 'body', 'Bright typography keeps the page readable. Scroll pacing turns the report into a presentation track: the same document can be read alone, presented live, or handed to an agent for revision.', 82, 286, 650, 128),
        box('rs-why-4a', 'why-card depth-card', '<strong>Read</strong><span>Calm white paper, long-form line length, scan-friendly cards.</span>', 770, 122, 330, 132),
        box('rs-why-4b', 'why-card depth-card', '<strong>Present</strong><span>Scene transitions, sideways evidence, and scroll-snap pacing.</span>', 840, 304, 330, 132),
        box('rs-why-4c', 'why-card depth-card', '<strong>Edit</strong><span>Press E. Change text/charts. Export the revised single HTML.</span>', 760, 486, 360, 132),
      ] },
      { className: 'scroll-scene scene-finale', boxes: [
        box('rs-pill-5', 'pill', 'DEFAULT REPORT TEMPLATE', 78, 70, 340, 48),
        box('rs-title-5', 'section-heading', 'Use this as the default when someone asks for a “phtml report”.', 78, 142, 720, 112),
        box('rs-body-5', 'body', 'The output is not a new file extension. It is normal .html with the PTML runtime embedded: readable in a browser, editable in place, and suitable for internal reports that need presentation-grade flow.', 82, 296, 680, 126),
        box('rs-accent-5', 'accent', 'Command: ptml report report.html --title "AI, What-How-Why"', 110, 536, 760, 72),
        box('rs-final-5', 'report-card mouse-react', '<strong>Design promise</strong>OME-DUO-like scroll action, but bright, text-first, chart-friendly, and report-safe.', 824, 222, 320, 220),
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
  const requestedName = positionalArgs(args)[0] || 'deck.html';
  const fileName = normalizeHtmlOutputPath(requestedName, args);
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
  console.log(`Created standalone editable HTML file: ${out}`);
  console.log(`Type: ${type} · Design: ${design}`);
  console.log('Open it in a browser, press E to edit, then use Export HTML to save/share.');
  if (requestedName !== fileName) console.log(`Note: added .html extension for browser compatibility (${fileName}).`);
}

function exportHtml(args) {
  const deckPath = positionalArgs(args)[0];
  if (!deckPath) { console.error('Usage: ptml export <deck.json>'); process.exit(1); }
  const resolvedDeckPath = path.resolve(deckPath);
  const deck = JSON.parse(fs.readFileSync(resolvedDeckPath, 'utf8'));
  const html = buildStandaloneHtml(deck, { theme: deck.theme || 'presentation-dark-tech', scrollMode: deck.mode === 'scroll' || deck.mode === 'horizontal', scrollAxis: deck.direction });
  const out = resolvedDeckPath.replace(/\.(json|ptml)$/i, '.html');
  fs.writeFileSync(out, html);
  console.log(`Exported: ${out}`);
}

function createIntent(type, args) {
  const normalizedType = normalizeType(type);
  const requestedName = firstFileArgOrDefault(args, normalizedType);
  const fileName = normalizeHtmlOutputPath(requestedName, args);
  const out = path.resolve(process.cwd(), fileName);
  const design = resolveDesign(normalizedType, getFlag(args, '--design', getFlag(args, '--theme', undefined)));
  const title = titleFromArgs(args, path.basename(fileName, path.extname(fileName)) || 'PTML Document');
  const agentBridge = getFlag(args, '--agent-bridge', undefined);
  if (fs.existsSync(out) && !hasFlag(args, '--force')) {
    console.error(`File already exists: ${out}`);
    console.error('Use --force to overwrite.');
    process.exit(1);
  }
  const deck = createStarterDeck(title, normalizedType, design);
  const html = buildStandaloneHtml(deck, { theme: design, scrollMode: deck.mode === 'scroll' || deck.mode === 'horizontal', scrollAxis: deck.direction, agentBridge });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`Created standalone editable HTML file: ${out}`);
  console.log(`Type: ${normalizedType} · Design: ${design} · Title: ${title}`);
  console.log('Open it in a browser, press E to edit, then use Export HTML to save/share.');
  if (requestedName !== fileName) console.log(`Note: added .html extension for browser compatibility (${fileName}).`);
}

function makeFromNaturalLanguage(args) {
  const text = positionalArgs(stripFlags(args, ['--out', '-o', '--title', '--design', '--theme'])).join(' ');
  const type = normalizeType(getFlag(args, '--type', inferTypeFromText(text)));
  const out = getFlag(args, '--out', getFlag(args, '-o', DEFAULT_FILENAMES[type] || 'ptml-output.html'));
  const title = getFlag(args, '--title', text || path.basename(out, path.extname(out)) || 'PTML Report');
  createIntent(type, [out, '--title', title, ...args.filter((arg) => ['--force', '--allow-non-html-extension'].includes(arg))]);
}

function designRows() {
  return availableThemes().map((name) => ({
    name,
    type: DESIGN_INFO[name]?.type || 'custom',
    aliases: DESIGN_INFO[name]?.aliases || [],
    defaultFor: DESIGN_INFO[name]?.defaultFor || null,
    description: DESIGN_INFO[name]?.description || 'Custom PTML design/theme.',
    recommendedFor: DESIGN_INFO[name]?.recommendedFor || [],
  }));
}

function listDesigns(args) {
  const rows = designRows();
  if (hasFlag(args, '--json')) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (hasFlag(args, '--details') || hasFlag(args, '-d')) {
    console.log('Name                         Type          Default  Description');
    console.log('----                         ----          -------  -----------');
    for (const row of rows) {
      console.log(`${row.name.padEnd(28)} ${row.type.padEnd(13)} ${(row.defaultFor || '').padEnd(8)} ${row.description}`);
    }
    return;
  }
  console.log(rows.map((row) => row.name).join('\n'));
}

function validateFile(args) {
  const file = positionalArgs(args)[0];
  if (!file) { console.error('Usage: ptml validate <file.html> [--json]'); process.exit(1); }
  const p = path.resolve(file);
  const result = { ok: false, file: p, extension: path.extname(p).toLowerCase(), exists: fs.existsSync(p), checks: {} };
  if (result.exists) {
    const s = fs.readFileSync(p, 'utf8');
    result.checks.htmlExtension = result.extension === '.html' || result.extension === '.htm';
    result.checks.doctype = /<!doctype html>/i.test(s);
    result.checks.hasDeckData = s.includes('phtml-deck-data');
    result.checks.hasRuntimeInit = s.includes('PHTML.init');
    result.checks.hasEditHint = s.includes('phtml-hint');
    result.checks.hasExportHtml = s.includes('Export HTML');
    result.ok = Object.values(result.checks).every(Boolean);
  }
  if (hasFlag(args, '--json')) { console.log(JSON.stringify(result, null, 2)); return; }
  if (result.ok) {
    console.log(`PTML editable HTML OK: ${p}`);
    return;
  }
  console.error(`PTML validation failed: ${p}`);
  if (!result.exists) console.error('missing file');
  for (const [key, value] of Object.entries(result.checks)) if (!value) console.error(`missing/failed: ${key}`);
  process.exit(1);
}

function doctor(args) {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const checks = {
    node: nodeMajor >= 18,
    version: Boolean(PKG.version),
    runtimeJs: fs.existsSync(path.join(PKG_DIR, 'runtime/phtml.js')),
    runtimeCss: fs.existsSync(path.join(PKG_DIR, 'runtime/phtml.css')),
    themes: availableThemes().length > 0,
    cwdWritable: (() => { try { fs.accessSync(process.cwd(), fs.constants.W_OK); return true; } catch (_) { return false; } })(),
  };
  const result = { ok: Object.values(checks).every(Boolean), package: PKG.name, version: PKG.version, node: process.versions.node, checks, defaultCommands: {
    report: 'ptml report report.html --title "보고서"',
    web: 'ptml web page.html --title "스크롤 리포트"',
    document: 'ptml doc memo.html --title "문서"',
    presentation: 'ptml deck slides.html --title "발표자료"',
  } };
  if (hasFlag(args, '--json')) { console.log(JSON.stringify(result, null, 2)); return; }
  console.log('PTML Doctor');
  for (const [key, value] of Object.entries(checks)) console.log(`${value ? '✓' : '✗'} ${key}`);
  console.log(`Result: ${result.ok ? 'OK' : 'FAILED'} · ${PKG.name}@${PKG.version} · node ${process.versions.node}`);
  if (!result.ok) process.exit(1);
}

function agentGuide(args) {
  const guide = {
    purpose: 'Create standalone browser-editable PTML HTML artifacts. PTML/PHTML is the runtime name; output files should end with .html.',
    naturalLanguageDefault: '레포트를 수정가능한 html 인 phtml 양식으로 만들어줘 => ptml report report.html --title "보고서"',
    commands: {
      report: 'ptml report <file.html> --title "<title>"',
      web: 'ptml web <file.html> --title "<title>"',
      document: 'ptml doc <file.html> --title "<title>"',
      presentation: 'ptml deck <file.html> --title "<title>"',
      validate: 'ptml validate <file.html>',
      designs: 'ptml designs --details or ptml designs --json',
    },
    doNot: ['Do not output .ptml or .phtml for browser deliverables.', 'Do not recreate edit mode manually.', 'Do not remove phtml-deck-data, PHTML.init, or Export HTML.'],
    verify: ['file exists', 'extension is .html', 'contains phtml-deck-data', 'contains PHTML.init', 'contains Export HTML'],
  };
  if (hasFlag(args, '--json')) { console.log(JSON.stringify(guide, null, 2)); return; }
  console.log(`PTML Agent Guide\n\n${guide.purpose}\n`);
  console.log('Intent mapping:');
  for (const [name, cmd] of Object.entries(guide.commands)) console.log(`  ${name.padEnd(12)} ${cmd}`);
  console.log('\nDefault Korean request:');
  console.log(`  ${guide.naturalLanguageDefault}`);
  console.log('\nRules:');
  for (const item of guide.doNot) console.log(`  - ${item}`);
  console.log('\nAfter generation run: ptml validate <file.html>');
}

function printHelp() {
  console.log(`ptml <command>\n\nCommands:\n  report [file.html] [title]      Create an editable analysis report HTML\n  web [file.html] [title]         Create an editable warm-paper scroll/web HTML\n  doc|document [file.html] [title] Create an editable memo/spec HTML\n  deck|presentation [file.html] [title]\n                                  Create an editable presentation HTML\n  make \"natural language request\" -o file.html\n                                  Infer type from text and create HTML\n  new [file.html] [--title T] [--type presentation|report|document|web]\n                  [--design name] [--theme name] [--agent-bridge URL] [--force]\n                                  Create one standalone editable HTML file\n  validate <file.html> [--json]   Verify PTML editable HTML markers\n  doctor [--json]                 Check local PTML installation\n  agent-guide [--json]            Print AI-agent usage rules\n  designs [--details|--json]      List installed designs/themes\n  init [name] [--type type] [--design name]\n                                  Create a PTML project\n  serve [--port N] [--open]       Start example dev server\n  export <deck.json>              Export JSON deck as standalone HTML\n  version, --version              Print installed version\n\nExamples:\n  ptml report market-report.html --title \"시장 분석 보고서\"\n  ptml web strategy.html \"전략 스크롤 리포트\"\n  ptml doc memo.html \"운영 메모\"\n  ptml deck slides.html \"발표자료\"\n\nImportant:\n  Browser-ready outputs must use .html. Do not use .ptml or .phtml as output extensions.\n`);
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
  case 'report':
  case 'reports':
  case '레포트':
  case '보고서':
    createIntent('report', rest); break;
  case 'web':
  case 'site':
  case 'page':
    createIntent('web', rest); break;
  case 'doc':
  case 'document':
  case 'memo':
    createIntent('document', rest); break;
  case 'deck':
  case 'presentation':
  case 'slides':
    createIntent('presentation', rest); break;
  case 'make': makeFromNaturalLanguage(rest); break;
  case 'export': exportHtml(rest); break;
  case 'validate':
  case 'inspect': validateFile(rest); break;
  case 'doctor': doctor(rest); break;
  case 'agent-guide':
  case 'agents': agentGuide(rest); break;
  case 'designs':
  case 'themes': listDesigns(rest); break;
  default:
    if (cmd && TYPE_ALIASES[cmd]) createIntent(TYPE_ALIASES[cmd], rest);
    else printHelp();
}
