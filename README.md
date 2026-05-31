# PHTML Runtime

Agentic HTML presentation runtime. Beautiful by default. Editable by AI.

```
npx phtml serve --open
```

---

## What is PHTML?

PHTML is a browser-based presentation runtime designed for the agentic era. Decks live as JSON files — which means any AI agent (Claude Code, Cursor, Cline, custom agents) can read, edit, and generate presentations programmatically.

- **JSON-driven** — deck content is data, not markup
- **Agent bridge** — WebSocket API for real-time AI control
- **Edit in browser** — drag, resize, inline edit without leaving the browser
- **Single-file export** — share as one self-contained HTML file
- **Responsive scaling** — 1280×720 design space scales to any viewport
- **Zero dependencies** — vanilla JS + CSS, no framework required

---

## Quick Start

```bash
# Run the LLM→Agent example instantly
npx phtml-runtime serve --open

# Create a new deck project
npx phtml-runtime init my-deck
cd my-deck
npm install
npx phtml serve --open
```

---

## Installation

```bash
npm install phtml-runtime
```

Or use directly via npx — no install needed:

```bash
npx phtml-runtime serve --open
```

---

## CLI

```
phtml serve [--port N] [--open]   Start local dev server
phtml init [name]                  Create a new deck project
phtml export <deck.json>           Export as standalone HTML
```

---

## Deck Format

Decks are plain JSON:

```json
{
  "title": "My Deck",
  "theme": "editorial-dark",
  "slides": [
    {
      "boxes": [
        {
          "id": "title-1",
          "className": "phtml-box title",
          "html": "Hello World",
          "x": 60,
          "y": 180,
          "w": 900,
          "h": 200,
          "style": {}
        }
      ]
    }
  ]
}
```

### Box types

| className | Description |
|-----------|-------------|
| `phtml-box title` | Massive headline, 800 weight |
| `phtml-box subtitle` | Secondary text, light weight |
| `phtml-box body` | Body copy, readable line-height |
| `phtml-box eyebrow` | Small uppercase label, accent color |
| `phtml-box accent` | Filled accent-color box |
| `phtml-box card` | Surface card with border |
| `phtml-box code` | Monospace code block |
| `phtml-box pill` | Rounded pill tag |
| `phtml-box number` | Giant stat/number display |

---

## Agent Bridge

Connect any AI agent to control presentations via WebSocket:

```javascript
PHTML.init({
  deckUrl: 'deck.json',
  agentBridge: 'ws://localhost:8787',
});
```

### Commands (agent → runtime)

```json
{ "type": "replace_deck",  "deck": { ... } }
{ "type": "insert_box",    "box": { ... } }
{ "type": "goto_slide",    "index": 2 }
{ "type": "set_text",      "id": "box-id", "text": "New text" }
{ "type": "add_slide" }
{ "type": "delete_slide",  "index": 1 }
{ "type": "set_style",     "id": "box-id", "style": { "color": "#ff4f2a" } }
{ "type": "set_theme",     "name": "editorial-light" }
```

### Events (runtime → agent)

```json
{ "type": "slide_changed", "index": 2 }
{ "type": "deck_saved",    "deck": { ... } }
```

---

## Edit Mode

Press **E** in the browser to enter edit mode:

| Action | Description |
|--------|-------------|
| `E` | Toggle edit mode |
| `← →` | Navigate slides |
| `Double-click` canvas | Add new box |
| Drag box | Move (Shift = snap to 8px grid) |
| Drag handle | Resize |
| `Delete` | Remove selected box |
| `Alt + ↑↓` | Adjust font size |
| `Escape` | Deselect / exit edit mode |

---

## Themes

| Theme | File | Description |
|-------|------|-------------|
| `editorial-dark` | `themes/editorial-dark.css` | Near-black with ember accent |
| `editorial-light` | `themes/editorial-light.css` | Off-white paper with grid overlay |

Switch theme programmatically:

```javascript
PHTML.setTheme('editorial-light');
```

---

## Export

Export as a single self-contained HTML file (no server needed):

```bash
npx phtml export deck.json
# → deck.html
```

Or from the browser toolbar: **Export HTML**

---

## Examples

- `examples/llm-to-agent/` — "LLM to Agent" 7-slide editorial deck

```bash
npx phtml serve --open
# opens examples/llm-to-agent/index.html
```

---

## License

MIT © imejaim
