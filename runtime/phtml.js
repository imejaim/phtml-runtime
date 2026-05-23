// PHTML Runtime v0.2
// JSON deck rendering, edit mode, drag/resize, save/load, single-file export, and agent bridge.

(function () {
  const state = {
    deck: null,
    currentSlide: 0,
    editMode: false,
    selectedBox: null,
    dragState: null,
    resizeState: null,
    ws: null,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function uid(prefix = 'box') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function px(value, fallback = 0) {
    if (typeof value === 'number') return `${value}px`;
    if (typeof value === 'string') return value;
    return `${fallback}px`;
  }

  function currentCanvas() {
    return $('.phtml-slide.active .phtml-canvas');
  }

  function getSlides() {
    return $$('.phtml-slide');
  }

  function updateStatus() {
    const status = $('.phtml-status');
    const slides = getSlides();
    if (status) status.textContent = `${state.editMode ? 'Edit' : 'Present'} · ${state.currentSlide + 1}/${Math.max(slides.length, 1)}`;
  }

  function showSlide(index) {
    const slides = getSlides();
    if (!slides.length) return;
    state.currentSlide = clamp(index, 0, slides.length - 1);
    slides.forEach((slide, i) => slide.classList.toggle('active', i === state.currentSlide));
    state.selectedBox = null;
    updateSelectedUI();
    updateStatus();
  }

  function nextSlide() {
    if (!state.editMode) showSlide(state.currentSlide + 1);
  }

  function prevSlide() {
    if (!state.editMode) showSlide(state.currentSlide - 1);
  }

  function ensureHandle(box) {
    if (!$(':scope > .phtml-resize-handle', box)) {
      const handle = document.createElement('span');
      handle.className = 'phtml-resize-handle';
      handle.contentEditable = 'false';
      box.appendChild(handle);
    }
  }

  function createBox(boxData = {}) {
    const box = document.createElement('div');
    box.className = boxData.className || `phtml-box ${boxData.type || 'body'}`;
    box.dataset.id = boxData.id || uid();
    box.innerHTML = boxData.html || escapeHtml(boxData.text || 'New Box');
    box.style.left = px(boxData.x ?? boxData.left, 80);
    box.style.top = px(boxData.y ?? boxData.top, 100);
    box.style.width = px(boxData.w ?? boxData.width, 420);
    box.style.height = px(boxData.h ?? boxData.height, 90);
    if (boxData.style) Object.assign(box.style, boxData.style);
    if (boxData.zIndex !== undefined) box.style.zIndex = boxData.zIndex;
    box.setAttribute('contenteditable', state.editMode ? 'true' : 'false');
    ensureHandle(box);
    return box;
  }

  function renderDeck(deck) {
    state.deck = deck || { title: 'Untitled', slides: [] };
    document.title = state.deck.title || 'PHTML Deck';
    const deckEl = $('.phtml-deck');
    if (!deckEl) throw new Error('Missing .phtml-deck element');
    deckEl.innerHTML = '';
    (state.deck.slides || []).forEach((slideData, index) => {
      const slide = document.createElement('section');
      slide.className = `phtml-slide${index === 0 ? ' active' : ''}`;
      const canvas = document.createElement('div');
      canvas.className = 'phtml-canvas';
      (slideData.boxes || []).forEach((boxData) => canvas.appendChild(createBox(boxData)));
      slide.appendChild(canvas);
      deckEl.appendChild(slide);
    });
    if (!(state.deck.slides || []).length) addSlide();
    state.currentSlide = 0;
    bindBoxEvents();
    showSlide(0);
  }

  async function loadDeck(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load deck: ${url}`);
    renderDeck(await response.json());
  }

  function collectDeck() {
    return {
      title: state.deck?.title || document.title || 'PHTML Deck',
      theme: state.deck?.theme || 'dark-tech',
      slides: getSlides().map((slide) => ({
        boxes: $$('.phtml-canvas > .phtml-box', slide).map((box) => {
          const clone = box.cloneNode(true);
          $$('.phtml-resize-handle', clone).forEach((handle) => handle.remove());
          return {
            id: box.dataset.id || uid(),
            className: box.className.replace(' selected', ''),
            html: clone.innerHTML,
            x: parseFloat(box.style.left) || 0,
            y: parseFloat(box.style.top) || 0,
            w: parseFloat(box.style.width) || box.offsetWidth,
            h: parseFloat(box.style.height) || box.offsetHeight,
            style: {
              fontSize: box.style.fontSize || '',
              fontWeight: box.style.fontWeight || '',
              textAlign: box.style.textAlign || '',
              color: box.style.color || '',
              background: box.style.background || '',
              zIndex: box.style.zIndex || '',
            },
          };
        }),
      })),
    };
  }

  function toggleEdit() {
    state.editMode = !state.editMode;
    document.body.classList.toggle('phtml-edit-mode', state.editMode);
    $$('.phtml-box').forEach((box) => box.setAttribute('contenteditable', state.editMode ? 'true' : 'false'));
    if (!state.editMode) state.selectedBox = null;
    updateSelectedUI();
    updateStatus();
  }

  function selectBox(box) {
    if (!state.editMode || !box) return;
    state.selectedBox = box;
    updateSelectedUI();
    const sizeInput = $('#phtml-fontSize');
    const colorInput = $('#phtml-colorPicker');
    const computed = getComputedStyle(box);
    if (sizeInput) sizeInput.value = parseInt(computed.fontSize, 10);
    if (colorInput) colorInput.value = rgbToHex(computed.color);
  }

  function updateSelectedUI() {
    $$('.phtml-box').forEach((box) => box.classList.remove('selected'));
    if (state.selectedBox) state.selectedBox.classList.add('selected');
  }

  function requireSelected() {
    if (!state.selectedBox) {
      alert('Select a box first.');
      return false;
    }
    return true;
  }

  function addSlide() {
    const deckEl = $('.phtml-deck');
    const slide = document.createElement('section');
    slide.className = 'phtml-slide';
    slide.innerHTML = '<div class="phtml-canvas"></div>';
    deckEl.appendChild(slide);
    showSlide(getSlides().length - 1);
  }

  function addBox(boxData) {
    const canvas = currentCanvas();
    if (!canvas) return;
    const box = createBox(boxData || { text: 'New Box', type: 'body', x: 90, y: 120, w: 420, h: 90, style: { fontSize: '28px' } });
    canvas.appendChild(box);
    bindBoxEvents();
    selectBox(box);
    box.focus();
  }

  function duplicateBox() {
    if (!requireSelected()) return;
    const deckBox = collectBoxFromElement(state.selectedBox);
    deckBox.x += 30;
    deckBox.y += 30;
    deckBox.id = uid();
    addBox(deckBox);
  }

  function deleteBox() {
    if (!requireSelected()) return;
    state.selectedBox.remove();
    state.selectedBox = null;
    updateSelectedUI();
  }

  function bringForward() {
    if (!requireSelected()) return;
    state.selectedBox.style.zIndex = String((parseInt(state.selectedBox.style.zIndex || '1', 10)) + 1);
  }

  function sendBackward() {
    if (!requireSelected()) return;
    state.selectedBox.style.zIndex = String(Math.max(0, (parseInt(state.selectedBox.style.zIndex || '1', 10)) - 1));
  }

  function setFontSize(value) {
    if (!requireSelected()) return;
    state.selectedBox.style.fontSize = `${value}px`;
  }

  function adjustFontSize(delta) {
    if (!requireSelected()) return;
    const size = parseInt(getComputedStyle(state.selectedBox).fontSize, 10);
    const next = clamp(size + delta, 8, 180);
    state.selectedBox.style.fontSize = `${next}px`;
    const input = $('#phtml-fontSize');
    if (input) input.value = next;
  }

  function toggleBold() {
    if (!requireSelected()) return;
    const weight = parseInt(getComputedStyle(state.selectedBox).fontWeight, 10);
    state.selectedBox.style.fontWeight = weight >= 700 ? '400' : '800';
  }

  function setAlign(align) {
    if (!requireSelected()) return;
    state.selectedBox.style.textAlign = align;
  }

  function setColor(color) {
    if (!requireSelected()) return;
    state.selectedBox.style.color = color;
  }

  function saveJSON() {
    downloadText('phtml-deck.json', JSON.stringify(collectDeck(), null, 2), 'application/json');
  }

  function loadJSONFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => renderDeck(JSON.parse(reader.result));
    reader.readAsText(file);
  }

  async function exportSingleFile() {
    const deck = collectDeck();
    const cssText = await collectCssText();
    const jsText = await fetchScriptText();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(deck.title)}</title>
<style>${cssText}</style>
</head>
<body>
<div class="phtml-hint">E: edit mode · arrows: navigate</div>
<div class="phtml-status">Presentation Mode</div>
<main class="phtml-deck"></main>
${toolbarHtml()}
<div class="phtml-nav"><button onclick="prevSlide()">←</button><button onclick="nextSlide()">→</button></div>
<script id="phtml-deck-data" type="application/json">${escapeHtml(JSON.stringify(deck))}</script>
<script>${jsText}</script>
<script>PHTML.init({ deck: JSON.parse(document.getElementById('phtml-deck-data').textContent) });</script>
</body>
</html>`;
    downloadText(`${slugify(deck.title)}.html`, html, 'text/html');
  }

  async function collectCssText() {
    let css = '';
    for (const sheet of [...document.styleSheets]) {
      try {
        css += [...sheet.cssRules].map((rule) => rule.cssText).join('\n') + '\n';
      } catch (_) {
        if (sheet.href) {
          try { css += await (await fetch(sheet.href)).text(); } catch (_) {}
        }
      }
    }
    return css;
  }

  async function fetchScriptText() {
    const current = $$('script[src]').find((script) => script.src.includes('phtml.js'));
    if (!current) return document.currentScript?.textContent || '';
    return await (await fetch(current.src)).text();
  }

  function connectAgentBridge(url = 'ws://localhost:8787') {
    if (!('WebSocket' in window)) {
      console.warn('WebSocket is not supported.');
      return;
    }
    state.ws = new WebSocket(url);
    state.ws.onopen = () => console.info('[PHTML] Agent bridge connected:', url);
    state.ws.onmessage = (event) => {
      try { handleAgentCommand(JSON.parse(event.data)); }
      catch (error) { console.error('[PHTML] Invalid agent command', error); }
    };
    state.ws.onclose = () => console.info('[PHTML] Agent bridge closed');
  }

  function handleAgentCommand(command) {
    if (!command || !command.type) return;
    if (command.type === 'insert_box') addBox(command.box || command);
    if (command.type === 'replace_deck') renderDeck(command.deck);
    if (command.type === 'goto_slide') showSlide(command.index || 0);
    if (command.type === 'set_text' && command.id) {
      const box = $(`.phtml-box[data-id="${command.id}"]`);
      if (box) box.innerHTML = escapeHtml(command.text || '');
    }
  }

  function bindBoxEvents() {
    $$('.phtml-box').forEach(ensureHandle);
  }

  document.addEventListener('mousedown', (event) => {
    if (!state.editMode) return;
    const handle = event.target.closest('.phtml-resize-handle');
    if (handle) {
      event.preventDefault();
      const box = handle.closest('.phtml-box');
      selectBox(box);
      const rect = box.getBoundingClientRect();
      state.resizeState = { box, startX: event.clientX, startY: event.clientY, startW: rect.width, startH: rect.height };
      return;
    }
    const box = event.target.closest('.phtml-box');
    if (!box) return;
    selectBox(box);
    const parentRect = box.parentElement.getBoundingClientRect();
    state.dragState = {
      box,
      parentRect,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: parseFloat(box.style.left) || 0,
      startTop: parseFloat(box.style.top) || 0,
    };
  });

  document.addEventListener('mousemove', (event) => {
    if (state.resizeState) {
      const r = state.resizeState;
      r.box.style.width = Math.max(80, r.startW + event.clientX - r.startX) + 'px';
      r.box.style.height = Math.max(36, r.startH + event.clientY - r.startY) + 'px';
      return;
    }
    if (state.dragState) {
      const d = state.dragState;
      const dx = event.clientX - d.startX;
      const dy = event.clientY - d.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        event.preventDefault();
        d.box.style.left = clamp(d.startLeft + dx, 0, d.parentRect.width - 40) + 'px';
        d.box.style.top = clamp(d.startTop + dy, 0, d.parentRect.height - 30) + 'px';
      }
    }
  });

  document.addEventListener('mouseup', () => {
    state.dragState = null;
    state.resizeState = null;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'e' && !isTyping()) toggleEdit();
    if (!state.editMode) {
      if (event.key === 'ArrowRight') nextSlide();
      if (event.key === 'ArrowLeft') prevSlide();
    }
    if (state.editMode && state.selectedBox) {
      if (event.key === 'Delete' && !isTyping()) deleteBox();
      if (event.altKey && event.key === 'ArrowUp') adjustFontSize(2);
      if (event.altKey && event.key === 'ArrowDown') adjustFontSize(-2);
    }
  });

  function isTyping() {
    const a = document.activeElement;
    return a && (a.isContentEditable || a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
  }

  function collectBoxFromElement(box) {
    const clone = box.cloneNode(true);
    $$('.phtml-resize-handle', clone).forEach((handle) => handle.remove());
    return {
      id: box.dataset.id || uid(),
      className: box.className.replace(' selected', ''),
      html: clone.innerHTML,
      x: parseFloat(box.style.left) || 0,
      y: parseFloat(box.style.top) || 0,
      w: parseFloat(box.style.width) || box.offsetWidth,
      h: parseFloat(box.style.height) || box.offsetHeight,
      style: {
        fontSize: box.style.fontSize || '',
        fontWeight: box.style.fontWeight || '',
        textAlign: box.style.textAlign || '',
        color: box.style.color || '',
        background: box.style.background || '',
        zIndex: box.style.zIndex || '',
      },
    };
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toolbarHtml() {
    return `<div class="phtml-toolbar">
<button onclick="toggleEdit()">Toggle Edit</button>
<button onclick="addSlide()">Add Slide</button>
<button onclick="addBox()">Add Box</button>
<button onclick="duplicateBox()">Duplicate</button>
<button onclick="deleteBox()">Delete</button>
<button onclick="bringForward()">Forward</button>
<button onclick="sendBackward()">Back</button>
<label>Size <input id="phtml-fontSize" type="number" min="8" max="180" onchange="setFontSize(this.value)" /></label>
<button onclick="adjustFontSize(-2)">A-</button>
<button onclick="adjustFontSize(2)">A+</button>
<button onclick="toggleBold()">B</button>
<button onclick="setAlign('left')">L</button>
<button onclick="setAlign('center')">C</button>
<button onclick="setAlign('right')">R</button>
<input id="phtml-colorPicker" type="color" value="#f8fafc" onchange="setColor(this.value)" />
<button onclick="saveJSON()">Save JSON</button>
<button onclick="document.getElementById('phtml-fileInput').click()">Load JSON</button>
<button onclick="exportSingleFile()">Export HTML</button>
<input id="phtml-fileInput" type="file" accept="application/json" style="display:none" onchange="loadJSONFile(event)" />
</div>`;
  }

  function rgbToHex(rgb) {
    const nums = rgb.match(/\d+/g);
    if (!nums || nums.length < 3) return '#f8fafc';
    return '#' + nums.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  }

  function slugify(value) {
    return String(value || 'phtml-deck').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'phtml-deck';
  }

  async function init(options = {}) {
    if (options.toolbar !== false && !$('.phtml-toolbar')) document.body.insertAdjacentHTML('beforeend', toolbarHtml());
    if (options.deck) renderDeck(options.deck);
    else if (options.deckUrl) await loadDeck(options.deckUrl);
    else {
      const embedded = $('#phtml-deck-data');
      if (embedded) renderDeck(JSON.parse(embedded.textContent));
      else renderDeck({ title: 'PHTML Deck', slides: [{ boxes: [] }] });
    }
    if (options.agentBridge) connectAgentBridge(options.agentBridge === true ? undefined : options.agentBridge);
  }

  window.PHTML = {
    init,
    renderDeck,
    loadDeck,
    collectDeck,
    toggleEdit,
    showSlide,
    nextSlide,
    prevSlide,
    addSlide,
    addBox,
    duplicateBox,
    deleteBox,
    bringForward,
    sendBackward,
    setFontSize,
    adjustFontSize,
    toggleBold,
    setAlign,
    setColor,
    saveJSON,
    loadJSONFile,
    exportSingleFile,
    connectAgentBridge,
    handleAgentCommand,
  };

  Object.assign(window, window.PHTML);
})();
