// PHTML Runtime v1.0

(function () {
  const CANVAS_W = 1280;
  const CANVAS_H = 720;
  const GRID = 8;

  const state = {
    deck: null,
    currentSlide: 0,
    editMode: false,
    selectedBox: null,
    dragState: null,
    resizeState: null,
    ws: null,
    wsUrl: null,
    wsBackoff: 1000,
    wsReconnectTimer: null,
    commandQueue: [],
    intersectionObserver: null,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const snap = (value) => Math.round(value / GRID) * GRID;

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

  function scaleCanvas() {
    const deckEl = $('.phtml-deck');
    if (!deckEl) return;
    const isFlow = deckEl.classList.contains('flow');
    if (isFlow) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / CANVAS_W, vh / CANVAS_H);
    const scaledW = CANVAS_W * scale;
    const scaledH = CANVAS_H * scale;
    const offsetX = (vw - scaledW) / 2;
    const offsetY = (vh - scaledH) / 2;
    $$('.phtml-canvas-wrapper').forEach((wrapper) => {
      wrapper.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
      wrapper.style.transformOrigin = 'top left';
      wrapper.style.width = CANVAS_W + 'px';
      wrapper.style.height = CANVAS_H + 'px';
      wrapper.style.position = 'absolute';
      wrapper.style.top = '0';
      wrapper.style.left = '0';
    });
  }

  function showSlide(index) {
    const slides = getSlides();
    if (!slides.length) return;
    state.currentSlide = clamp(index, 0, slides.length - 1);
    slides.forEach((slide, i) => slide.classList.toggle('active', i === state.currentSlide));
    state.selectedBox = null;
    updateSelectedUI();
    updateStatus();
    updateThumbnails();
    emitEvent({ type: 'slide_changed', index: state.currentSlide });
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
    box.innerHTML = (boxData.html != null) ? boxData.html : escapeHtml(boxData.text || '');
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
    const isFlow = deckEl.classList.contains('flow');

    (state.deck.slides || []).forEach((slideData, index) => {
      const slide = document.createElement('section');
      slide.className = `phtml-slide${index === 0 ? ' active' : ''}`;
      const canvas = document.createElement('div');
      canvas.className = 'phtml-canvas';
      (slideData.boxes || []).forEach((boxData) => canvas.appendChild(createBox(boxData)));

      if (isFlow) {
        slide.appendChild(canvas);
      } else {
        const wrapper = document.createElement('div');
        wrapper.className = 'phtml-canvas-wrapper';
        wrapper.appendChild(canvas);
        slide.appendChild(wrapper);
      }
      deckEl.appendChild(slide);
    });

    if (!(state.deck.slides || []).length) addSlide();
    state.currentSlide = 0;
    bindBoxEvents();
    setupIntersectionObserver();
    showSlide(0);
    buildThumbnailStrip();
    if (!isFlow) scaleCanvas();
    if (state.deck.theme) setTheme(state.deck.theme);
  }

  async function loadDeck(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load deck: ${url}`);
    renderDeck(await response.json());
  }

  function collectBoxFromElement(box) {
    const clone = box.cloneNode(true);
    $$('.phtml-resize-handle', clone).forEach((h) => h.remove());
    return {
      id: box.dataset.id || uid(),
      className: box.className.replace(/\s*selected\s*/g, ' ').trim(),
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

  function collectDeck() {
    return {
      title: state.deck?.title || document.title || 'PHTML Deck',
      theme: state.deck?.theme || 'dark-tech',
      slides: getSlides().map((slide) => ({
        boxes: $$('.phtml-canvas > .phtml-box', slide).map((box) => collectBoxFromElement(box)),
      })),
    };
  }

  function toggleEdit() {
    state.editMode = !state.editMode;
    document.body.classList.toggle('phtml-edit-mode', state.editMode);
    $$('.phtml-box').forEach((box) => box.setAttribute('contenteditable', state.editMode ? 'true' : 'false'));
    if (!state.editMode) {
      state.selectedBox = null;
      updateSelectedUI();
    }
    const toolbar = $('.phtml-toolbar');
    if (toolbar) {
      if (state.editMode) {
        toolbar.style.opacity = '0';
        toolbar.style.transform = toolbar.classList.contains('side-panel')
          ? 'translateX(20px)'
          : 'translateX(-50%) translateY(12px)';
        requestAnimationFrame(() => {
          toolbar.style.transition = 'opacity 220ms ease, transform 220ms ease';
          toolbar.style.opacity = '1';
          toolbar.style.transform = toolbar.classList.contains('side-panel')
            ? 'translateX(0)'
            : 'translateX(-50%) translateY(0)';
        });
      } else {
        toolbar.style.transition = '';
        toolbar.style.opacity = '';
        toolbar.style.transform = '';
      }
    }
    updateStatus();
  }

  function selectBox(box) {
    if (!state.editMode || !box) return;
    state.selectedBox = box;
    updateSelectedUI();
    syncToolbarToBox(box);
  }

  function syncToolbarToBox(box) {
    const sizeInput = $('#phtml-fontSize');
    const colorInput = $('#phtml-colorPicker');
    const bgInput = $('#phtml-boxBg');
    const computed = getComputedStyle(box);
    if (sizeInput) sizeInput.value = parseInt(computed.fontSize, 10);
    if (colorInput) colorInput.value = rgbToHex(computed.color);
    if (bgInput) bgInput.value = rgbToHex(computed.backgroundColor);
  }

  function updateSelectedUI() {
    $$('.phtml-box').forEach((box) => box.classList.remove('selected'));
    if (state.selectedBox) {
      state.selectedBox.classList.add('selected');
      measureTextOverflow(state.selectedBox);
    }
  }

  function requireSelected() {
    if (!state.selectedBox) {
      alert('Select a box first.');
      return false;
    }
    return true;
  }

  function measureTextOverflow(box) {
    box.classList.remove('phtml-text-overflow');
    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d');
    const computed = getComputedStyle(box);
    const fontSize = parseFloat(computed.fontSize);
    const lineHeight = parseFloat(computed.lineHeight) || fontSize * 1.4;
    ctx.font = `${computed.fontWeight} ${fontSize}px ${computed.fontFamily}`;
    const boxW = box.offsetWidth - parseFloat(computed.paddingLeft) - parseFloat(computed.paddingRight);
    const text = box.textContent || '';
    let lines = 0;
    for (const paragraph of text.split('\n')) {
      const words = paragraph.split(' ');
      let line = '';
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > boxW && line) {
          lines++;
          line = word;
        } else {
          line = test;
        }
      }
      lines++;
    }
    const totalH = lines * lineHeight;
    const availH = box.offsetHeight - parseFloat(computed.paddingTop) - parseFloat(computed.paddingBottom);
    if (totalH > availH) box.classList.add('phtml-text-overflow');
  }

  function addSlide(slideData) {
    const deckEl = $('.phtml-deck');
    const isFlow = deckEl.classList.contains('flow');
    const slide = document.createElement('section');
    slide.className = 'phtml-slide';
    const canvas = document.createElement('div');
    canvas.className = 'phtml-canvas';
    if (slideData && slideData.boxes) {
      slideData.boxes.forEach((boxData) => canvas.appendChild(createBox(boxData)));
    }
    if (isFlow) {
      slide.appendChild(canvas);
    } else {
      const wrapper = document.createElement('div');
      wrapper.className = 'phtml-canvas-wrapper';
      wrapper.appendChild(canvas);
      slide.appendChild(wrapper);
    }
    deckEl.appendChild(slide);
    setupIntersectionObserver();
    showSlide(getSlides().length - 1);
    buildThumbnailStrip();
    if (!isFlow) scaleCanvas();
  }

  function deleteSlide(index) {
    const slides = getSlides();
    if (slides.length <= 1) return;
    const target = slides[index !== undefined ? index : state.currentSlide];
    if (!target) return;
    target.remove();
    showSlide(clamp(state.currentSlide, 0, getSlides().length - 1));
    buildThumbnailStrip();
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
    const data = collectBoxFromElement(state.selectedBox);
    data.x += 30;
    data.y += 30;
    data.id = uid();
    addBox(data);
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

  function setBoxBackground(color) {
    if (!requireSelected()) return;
    state.selectedBox.style.background = color;
  }

  function setBackground(color) {
    const canvas = currentCanvas();
    if (canvas) canvas.style.background = color;
  }

  function setStyle(id, styleObj) {
    const box = $(`.phtml-box[data-id="${id}"]`);
    if (!box || !styleObj) return;
    Object.assign(box.style, styleObj);
  }

  function setTheme(name) {
    let link = $('#phtml-theme-link');
    if (!link) {
      link = document.createElement('link');
      link.id = 'phtml-theme-link';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    const existingThemeLink = $$('link[rel="stylesheet"]').find(
      (l) => l.href && (l.href.includes('/themes/') || l.href.includes('dark-tech') || l.href.includes('editorial'))
    );
    const base = existingThemeLink
      ? existingThemeLink.href.replace(/\/[^/]+\.css(\?.*)?$/, '/')
      : '../themes/';
    link.href = base + name + '.css';
    if (state.deck) state.deck.theme = name;
  }

  function saveJSON() {
    const deck = collectDeck();
    downloadText('phtml-deck.json', JSON.stringify(deck, null, 2), 'application/json');
    emitEvent({ type: 'deck_saved', deck });
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
          try { css += await (await fetch(sheet.href)).text() + '\n'; } catch (_) {}
        }
      }
    }
    return css;
  }

  async function fetchScriptText() {
    const current = $$('script[src]').find((s) => s.src.includes('phtml.js'));
    if (!current) return document.currentScript?.textContent || '';
    return await (await fetch(current.src)).text();
  }

  function connectAgentBridge(url = 'ws://localhost:8787') {
    if (!('WebSocket' in window)) {
      console.warn('[PHTML] WebSocket not supported.');
      return;
    }
    state.wsUrl = url;
    state.wsBackoff = 1000;
    openWs();
  }

  function openWs() {
    if (state.wsReconnectTimer) {
      clearTimeout(state.wsReconnectTimer);
      state.wsReconnectTimer = null;
    }
    try {
      state.ws = new WebSocket(state.wsUrl);
    } catch (e) {
      scheduleWsReconnect();
      return;
    }
    state.ws.onopen = () => {
      console.info('[PHTML] Agent bridge connected:', state.wsUrl);
      state.wsBackoff = 1000;
      while (state.commandQueue.length) {
        handleAgentCommand(state.commandQueue.shift());
      }
    };
    state.ws.onmessage = (event) => {
      try { handleAgentCommand(JSON.parse(event.data)); }
      catch (error) { console.error('[PHTML] Invalid agent command', error); }
    };
    state.ws.onclose = () => {
      console.info('[PHTML] Agent bridge closed, reconnecting…');
      scheduleWsReconnect();
    };
    state.ws.onerror = () => {
      state.ws.close();
    };
  }

  function scheduleWsReconnect() {
    if (!state.wsUrl) return;
    state.wsReconnectTimer = setTimeout(() => {
      state.wsBackoff = Math.min(state.wsBackoff * 2, 30000);
      openWs();
    }, state.wsBackoff);
  }

  function emitEvent(payload) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(payload));
    }
  }

  function handleAgentCommand(command) {
    if (!command || !command.type) return;
    if (state.ws && state.ws.readyState !== WebSocket.OPEN) {
      state.commandQueue.push(command);
      return;
    }
    switch (command.type) {
      case 'insert_box':
        addBox(command.box || command);
        break;
      case 'replace_deck':
        renderDeck(command.deck);
        break;
      case 'goto_slide':
        showSlide(command.index || 0);
        break;
      case 'add_slide':
        addSlide(command.slide);
        break;
      case 'delete_slide':
        deleteSlide(command.index);
        break;
      case 'set_text':
        if (command.id) {
          const box = $(`.phtml-box[data-id="${command.id}"]`);
          if (box) box.innerHTML = escapeHtml(command.text || '');
        }
        break;
      case 'set_style':
        if (command.id) setStyle(command.id, command.style);
        break;
      case 'set_theme':
        if (command.name) setTheme(command.name);
        break;
    }
  }

  function setupIntersectionObserver(scrollRoot) {
    if (state.intersectionObserver) state.intersectionObserver.disconnect();
    const observerOpts = { threshold: 0.5 };
    if (scrollRoot) observerOpts.root = scrollRoot;
    state.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('visible', entry.isIntersecting);
        if (entry.isIntersecting) {
          const slides = getSlides();
          const index = slides.indexOf(entry.target);
          if (index !== -1 && index !== state.currentSlide) {
            state.currentSlide = index;
            updateStatus();
            updateThumbnails();
            emitEvent({ type: 'slide_changed', index: state.currentSlide });
          }
        }
      });
    }, observerOpts);
    getSlides().forEach((s) => state.intersectionObserver.observe(s));
  }

  function setupScrollMode() {
    const deckEl = $('.phtml-deck');
    if (!deckEl) return;

    // Use inline setProperty('...', 'important') to reliably override phtml.css
    const sp = (el, prop, val) => el.style.setProperty(prop, val, 'important');

    // body = scroll container
    sp(document.documentElement, 'overflow', 'hidden');
    sp(document.body, 'overflow-y', 'scroll');
    sp(document.body, 'scroll-snap-type', 'y mandatory');
    sp(document.body, 'scrollbar-width', 'none');
    sp(document.body, 'height', '100vh');

    // deck: normal block flow so slides stack vertically
    sp(deckEl, 'position', 'relative');
    sp(deckEl, 'overflow', 'visible');
    sp(deckEl, 'height', 'auto');
    sp(deckEl, 'width', '100%');
    sp(deckEl, 'inset', 'auto');

    // Each slide: break out of absolute positioning, become flow element
    const slides = getSlides();
    slides.forEach((slide) => {
      sp(slide, 'position', 'relative');
      sp(slide, 'inset', 'auto');
      sp(slide, 'display', 'flex');
      sp(slide, 'width', '100%');
      sp(slide, 'height', '100vh');
      sp(slide, 'scroll-snap-align', 'start');
      sp(slide, 'scroll-snap-stop', 'always');
      sp(slide, 'overflow', 'hidden');
      sp(slide, 'flex-shrink', '0');
    });

    // Also add webkit scrollbar hide via stylesheet
    const st = document.createElement('style');
    st.textContent = 'body::-webkit-scrollbar{display:none}';
    document.head.appendChild(st);

    // Reset to slide 0
    state.currentSlide = 0;
    slides.forEach((s, i) => s.classList.toggle('active', i === 0));
    if (slides[0]) slides[0].classList.add('visible');
    document.body.scrollTop = 0;
    updateStatus();
    updateThumbnails();

    // IntersectionObserver with viewport root (body scroll)
    setupIntersectionObserver(null);

    // Override navigation to scroll instead of toggle display
    const _showSlide = showSlide;
    state.scrollMode = true;
    window.PHTML.showSlide = (index) => {
      const slides = getSlides();
      const target = slides[clamp(index, 0, slides.length - 1)];
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.showSlide = window.PHTML.showSlide;
    window.PHTML.nextSlide = () => {
      const slides = getSlides();
      window.PHTML.showSlide(state.currentSlide + 1);
    };
    window.PHTML.prevSlide = () => {
      window.PHTML.showSlide(state.currentSlide - 1);
    };
    window.nextSlide = window.PHTML.nextSlide;
    window.prevSlide = window.PHTML.prevSlide;
  }

  function bindBoxEvents() {
    $$('.phtml-box').forEach(ensureHandle);
  }

  function buildThumbnailStrip() {
    let strip = $('.phtml-thumbnails');
    if (!strip) {
      strip = document.createElement('div');
      strip.className = 'phtml-thumbnails';
      document.body.appendChild(strip);
    }
    strip.innerHTML = '';
    getSlides().forEach((slide, i) => {
      const thumb = document.createElement('button');
      thumb.className = `phtml-thumb${i === state.currentSlide ? ' active' : ''}`;
      thumb.textContent = i + 1;
      thumb.title = `Slide ${i + 1}`;
      thumb.onclick = () => showSlide(i);
      strip.appendChild(thumb);
    });
  }

  function updateThumbnails() {
    $$('.phtml-thumb').forEach((t, i) => t.classList.toggle('active', i === state.currentSlide));
  }

  document.addEventListener('mousedown', (event) => {
    if (!state.editMode) return;

    const handle = event.target.closest('.phtml-resize-handle');
    if (handle) {
      event.preventDefault();
      const box = handle.closest('.phtml-box');
      selectBox(box);
      const wrapper = box.closest('.phtml-canvas-wrapper');
      const scale = wrapper ? wrapper.getBoundingClientRect().width / CANVAS_W : 1;
      state.resizeState = {
        box,
        startX: event.clientX,
        startY: event.clientY,
        startW: parseFloat(box.style.width) || box.offsetWidth,
        startH: parseFloat(box.style.height) || box.offsetHeight,
        scale,
      };
      return;
    }

    const box = event.target.closest('.phtml-box');
    if (box) {
      selectBox(box);
      const wrapper = box.closest('.phtml-canvas-wrapper');
      const scale = wrapper ? wrapper.getBoundingClientRect().width / CANVAS_W : 1;
      state.dragState = {
        box,
        scale,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: parseFloat(box.style.left) || 0,
        startTop: parseFloat(box.style.top) || 0,
        moved: false,
      };
      return;
    }

    const canvas = event.target.closest('.phtml-canvas');
    if (canvas && event.detail === 2) {
      const wrapper = canvas.closest('.phtml-canvas-wrapper');
      const rect = canvas.getBoundingClientRect();
      const scale = wrapper ? wrapper.getBoundingClientRect().width / CANVAS_W : 1;
      const x = snap((event.clientX - rect.left) / scale - 210);
      const y = snap((event.clientY - rect.top) / scale - 45);
      addBox({ text: 'New Box', type: 'body', x, y, w: 420, h: 90, style: { fontSize: '28px' } });
    }

    if (!event.target.closest('.phtml-box') && !event.target.closest('.phtml-toolbar')) {
      state.selectedBox = null;
      updateSelectedUI();
    }
  });

  document.addEventListener('mousemove', (event) => {
    if (state.resizeState) {
      const r = state.resizeState;
      const dx = (event.clientX - r.startX) / r.scale;
      const dy = (event.clientY - r.startY) / r.scale;
      const newW = Math.max(80, event.shiftKey ? snap(r.startW + dx) : r.startW + dx);
      const newH = Math.max(36, event.shiftKey ? snap(r.startH + dy) : r.startH + dy);
      r.box.style.width = newW + 'px';
      r.box.style.height = newH + 'px';
      return;
    }
    if (state.dragState) {
      const d = state.dragState;
      const dx = (event.clientX - d.startX) / d.scale;
      const dy = (event.clientY - d.startY) / d.scale;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
      if (d.moved) {
        event.preventDefault();
        const newLeft = event.shiftKey ? snap(d.startLeft + dx) : d.startLeft + dx;
        const newTop = event.shiftKey ? snap(d.startTop + dy) : d.startTop + dy;
        d.box.style.left = clamp(newLeft, 0, CANVAS_W - 40) + 'px';
        d.box.style.top = clamp(newTop, 0, CANVAS_H - 30) + 'px';
      }
    }
  });

  document.addEventListener('mouseup', () => {
    state.dragState = null;
    state.resizeState = null;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (state.selectedBox) {
        state.selectedBox = null;
        updateSelectedUI();
      } else if (state.editMode) {
        toggleEdit();
      }
      return;
    }
    if (event.key.toLowerCase() === 'e' && !isTyping()) {
      toggleEdit();
      return;
    }
    if (!state.editMode) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextSlide();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') prevSlide();
    }
    if (state.editMode && state.selectedBox) {
      if (event.key === 'Delete' && !isTyping()) deleteBox();
      if (event.altKey && event.key === 'ArrowUp') { event.preventDefault(); adjustFontSize(2); }
      if (event.altKey && event.key === 'ArrowDown') { event.preventDefault(); adjustFontSize(-2); }
    }
  });

  window.addEventListener('resize', scaleCanvas);

  function isTyping() {
    const a = document.activeElement;
    return a && (a.isContentEditable || a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
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
<div class="phtml-tb-section">
  <span class="phtml-tb-label">Navigate</span>
  <button onclick="prevSlide()" title="Prev [←]">← <kbd>←</kbd></button>
  <button onclick="nextSlide()" title="Next [→]">→ <kbd>→</kbd></button>
  <button onclick="addSlide()" title="Add slide">+ Slide</button>
  <button onclick="deleteSlide()" title="Delete slide">− Slide</button>
</div>
<div class="phtml-tb-sep"></div>
<div class="phtml-tb-section">
  <span class="phtml-tb-label">Boxes</span>
  <button onclick="addBox()" title="Add box [dblclick canvas]">+ Box</button>
  <button onclick="duplicateBox()" title="Duplicate selected">Dup</button>
  <button onclick="deleteBox()" title="Delete [Del]">Del <kbd>⌫</kbd></button>
  <button onclick="bringForward()" title="Bring forward">↑Z</button>
  <button onclick="sendBackward()" title="Send backward">↓Z</button>
</div>
<div class="phtml-tb-sep"></div>
<div class="phtml-tb-section">
  <span class="phtml-tb-label">Typography</span>
  <button onclick="adjustFontSize(-2)" title="Smaller [Alt+↓]">A−</button>
  <input id="phtml-fontSize" type="number" min="8" max="180" title="Font size" onchange="setFontSize(this.value)" />
  <button onclick="adjustFontSize(2)" title="Larger [Alt+↑]">A+</button>
  <button onclick="toggleBold()" title="Bold">B</button>
  <button onclick="setAlign('left')" title="Left">⟵</button>
  <button onclick="setAlign('center')" title="Center">≡</button>
  <button onclick="setAlign('right')" title="Right">⟶</button>
</div>
<div class="phtml-tb-sep"></div>
<div class="phtml-tb-section">
  <span class="phtml-tb-label">Style</span>
  <label class="phtml-tb-color-label" title="Text color">T <input id="phtml-colorPicker" type="color" value="#f8fafc" onchange="setColor(this.value)" /></label>
  <label class="phtml-tb-color-label" title="Box fill">■ <input id="phtml-boxBg" type="color" value="#000000" onchange="setBoxBackground(this.value)" /></label>
  <label class="phtml-tb-color-label" title="Slide background">BG <input id="phtml-slideBg" type="color" value="#0f172a" onchange="setBackground(this.value)" /></label>
</div>
<div class="phtml-tb-sep"></div>
<div class="phtml-tb-section">
  <span class="phtml-tb-label">File</span>
  <button onclick="saveJSON()" title="Save JSON">Save</button>
  <button onclick="document.getElementById('phtml-fileInput').click()" title="Load JSON">Load</button>
  <button onclick="exportSingleFile()" title="Export HTML">Export</button>
  <input id="phtml-fileInput" type="file" accept="application/json" style="display:none" onchange="loadJSONFile(event)" />
</div>
<div class="phtml-tb-sep"></div>
<button onclick="toggleEdit()" title="Exit edit mode [Esc / E]" class="phtml-tb-exit">✕ <kbd>E</kbd></button>
</div>`;
  }

  function rgbToHex(rgb) {
    const nums = rgb.match(/\d+/g);
    if (!nums || nums.length < 3) return '#000000';
    return '#' + nums.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function slugify(value) {
    return String(value || 'phtml-deck').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'phtml-deck';
  }

  async function init(options = {}) {
    if (options.toolbar !== false && !$('.phtml-toolbar')) {
      document.body.insertAdjacentHTML('beforeend', toolbarHtml());
    }
    if (options.deck) {
      renderDeck(options.deck);
    } else if (options.deckUrl) {
      await loadDeck(options.deckUrl);
    } else {
      const embedded = $('#phtml-deck-data');
      if (embedded) renderDeck(JSON.parse(embedded.textContent));
      else renderDeck({ title: 'PHTML Deck', slides: [{ boxes: [] }] });
    }
    if (options.agentBridge) {
      connectAgentBridge(options.agentBridge === true ? undefined : options.agentBridge);
    }
    if (options.scrollMode) {
      setupScrollMode();
    } else {
      scaleCanvas();
    }
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
    deleteSlide,
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
    setBoxBackground,
    setBackground,
    setStyle,
    setTheme,
    saveJSON,
    loadJSONFile,
    exportSingleFile,
    connectAgentBridge,
    handleAgentCommand,
    emitEvent,
    scaleCanvas,
  };

  Object.assign(window, window.PHTML);
})();
