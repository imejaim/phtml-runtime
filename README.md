# PTML Runtime

PTML is an installable editable HTML runtime for presentations, scrollable reports, simple documents, and web-style pages.

It is **not a new programming language**. It is a shared CLI/runtime and file convention so humans and AI agents start from the same baseline: editable boxes, deck/document data, themes, export, and optional agent control.

## Install

Before npm publishing, install from GitHub:

```bash
npm install -g git+ssh://git@github.com/imejaim/phtml-runtime.git
```

After npm publishing, the intended package name is scoped and short:

```bash
npm install -g @imejaim/ptml
```

Both commands are installed:

```bash
ptml --version
phtml --version
```

`ptml` is the preferred product/CLI name. `phtml` remains an alias for compatibility.

## Create standalone editable files

```bash
ptml new llm-deck.html --type presentation --design dark-tech --title "LLM to Agent"
ptml new llm-report.html --type report --design analyst-light --title "LLM to Agent Analysis Report"
ptml new llm-memo.html --type document --design simple-doc --title "LLM to Agent Operating Memo"
ptml new llm-web.html --type web --title "LLM to Agent"                 # default: immersive
ptml new llm-modern.html --type web --design modern --title "LLM to Agent"  # simpler web style
ptml new llm-horizontal.html --type web --design horizontal --title "LLM to Agent"
```

Each output is a single HTML file:

- no server required;
- runtime JS is embedded;
- core CSS and design CSS are embedded;
- document/deck data is embedded;
- press **E** in the browser to edit;
- use **Export HTML** to save/share another standalone file.

## Document types

- `presentation`: slide/deck mode, large visual typography, arrow navigation.
- `report`: scroll mode, executive summary, KPI cards, insight/recommendation/risk blocks.
- `document`: scroll mode, long-form memo/spec style, readable text and callouts.
- `web`: default immersive vertical scroll, landing-page/product-page style sections, reveal motion, and mouse-reactive surfaces.
- `web` with `--design modern`: simpler landing-page style.
- `web` with `--design horizontal`: optional sideways, PPT-like cinematic track using the mouse wheel/trackpad.

## Designs/themes

Run:

```bash
ptml designs
```

Current design files:

- `presentation-dark-tech`
- `presentation-editorial-dark`
- `presentation-editorial-light`
- `report-analyst-light`
- `document-simple`
- `web-modern`
- `web-immersive`
- `web-horizontal-cinematic`

Backward-compatible theme names are also kept:

- `dark-tech`
- `editorial-dark`
- `editorial-light`

Design aliases:

```bash
--design dark-tech      # presentation-dark-tech
--design editorial-light # presentation-editorial-light
--design analyst-light  # report-analyst-light
--design simple-doc     # document-simple
--design modern         # web-modern, simpler web style
--design immersive      # web-immersive, also the default for --type web
--design horizontal     # web-horizontal-cinematic
```

## Included examples

The repository includes generated examples on the topic **LLM to Agent**:

```text
examples/llm-to-agent/presentation-dark-tech.html
examples/llm-to-agent/presentation-editorial-light.html
examples/llm-to-agent/report-analyst-light.html
examples/llm-to-agent/document-simple.html
examples/llm-to-agent/web-modern.html
examples/llm-to-agent/web-immersive.html
examples/llm-to-agent/web-horizontal-cinematic.html
```

Serve them locally:

```bash
ptml serve --open
```

The default server page opens the immersive web example.

## CLI

```text
ptml new [file.html] [--title T] [--type presentation|report|document|web]
                    [--design name] [--theme name] [--agent-bridge URL] [--force]
    Create one standalone editable HTML file.

ptml init [name] [--type type] [--design name]
    Create a PTML project with deck.json, index.html, and package.json.

ptml export <deck.json>
    Export a JSON deck/document as one standalone editable HTML file.

ptml serve [--port N] [--open]
    Start the built-in example server.

ptml designs
    List installed designs/themes.

ptml --version
    Print the installed version. `phtml --version` also works.
```

## Edit controls

In the browser:

- `E`: toggle edit mode
- `← →`: navigate slides in presentation mode
- scroll: read report/document/web files in scroll mode
- double-click canvas: add a new box
- drag box: move a box
- drag handle: resize a box
- `Delete`: remove selected box
- `Alt + ↑↓`: adjust font size
- `Escape`: deselect / exit edit mode
- toolbar → Export HTML: download a standalone HTML copy

## Agent prompt baseline

When asking an AI agent to modify an output, use this kind of instruction:

```text
Use PTML Runtime as the baseline. Create or modify a standalone editable PTML HTML file.
Keep the PTML edit mode, phtml-deck-data JSON, embedded runtime, and Export HTML behavior intact.
You may change the content, layout, design, and custom CSS.
```

## Data convention

Generated files embed deck/document data as JSON:

```html
<script id="phtml-deck-data" type="application/json">...</script>
```

Presentation outputs use normal slide mode. Report, document, and web outputs set:

```json
{
  "mode": "scroll"
}
```

and initialize the runtime with:

```js
PHTML.init({ deck, scrollMode: true })
```
