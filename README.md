# PTML Runtime

```bash
npm install -g @imejaim/ptml
ptml report my-report.html --title "My Editable Report"
ptml validate my-report.html
```

PTML is an installable editable HTML runtime for presentations, scrollable reports, simple documents, and immersive web-style pages.

The default report design is now a bright scroll-action report: readable typography first, OME-DUO-style scene transitions second. It scrolls vertically like a report, while evidence cards/charts enter from the side so the same file can be read, presented, and edited.

It is **not a new programming language**. It is a shared CLI/runtime and file convention so humans and AI agents start from the same baseline: editable boxes, deck/document data, themes, export, and optional agent control.

## Install

```bash
npm install -g @imejaim/ptml
```

Both commands are installed:

```bash
ptml --version
phtml --version
```

`ptml` is the preferred product/CLI name. `phtml` remains an alias for compatibility.

## Quick start: natural commands for agents and humans

For the default bright scroll-action report:

```bash
ptml report my-report.html --title "My Editable Report"
open my-report.html
```

For a warm-paper scroll/web artifact:

```bash
ptml web my-site.html --title "My Scroll Report"
open my-site.html
```

For a document or presentation:

```bash
ptml doc my-memo.html --title "My Memo"
ptml deck my-slides.html --title "My Deck"
```

The output must be `.html`. PTML/PHTML is the runtime/CLI name, not the browser-ready file extension. Do **not** create `.ptml` or `.phtml` files for deliverables.

Open the generated standalone HTML file in a browser, press **E** to edit, then use **Export HTML** to save/share the edited version.

AI agents can ask the CLI for compact instructions:

```bash
ptml agent-guide
ptml doctor
ptml designs --details
ptml validate my-report.html
```

GitHub install fallback:

```bash
npm install -g git+ssh://git@github.com/imejaim/phtml-runtime.git
```

## Create standalone editable files

```bash
ptml deck llm-deck.html --title "LLM to Agent"
ptml report llm-report.html --title "LLM to Agent Analysis Report"
ptml doc llm-memo.html --title "LLM to Agent Operating Memo"
ptml web llm-web.html --title "LLM to Agent"

# Equivalent low-level form:
ptml new llm-report.html --type report --design analyst-light --title "LLM to Agent Analysis Report"
ptml new llm-web.html --type web --design warm-paper --title "LLM to Agent"
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
- `report`: default bright scroll-action mode, readable executive narrative, side-moving evidence cards/charts, presentation-ready pacing.
- `document`: scroll mode, long-form memo/spec style, readable text and callouts.
- `web`: default warm-paper vertical scroll, landing-page/report typography, reveal motion, mouse-reactive surfaces, and pretext-like text-flow samples.

## Designs/themes

Run:

```bash
ptml designs
ptml designs --details
ptml designs --json
```

Current design files:

- `presentation-dark-tech`
- `presentation-editorial-dark`
- `presentation-editorial-light`
- `report-scroll-action`
- `report-analyst-light`
- `document-simple`
- `web-warm-paper`

Backward-compatible theme names are also kept:

- `dark-tech`
- `editorial-dark`
- `editorial-light`

Design aliases:

```bash
--design dark-tech      # presentation-dark-tech
--design editorial-light # presentation-editorial-light
--design scroll-action  # report-scroll-action, default for reports
--design cinematic      # report-scroll-action
--design analyst-light  # classic report-analyst-light
--design simple-doc     # document-simple
--design warm-paper     # web-warm-paper, also the default for --type web
--design immersive      # alias to web-warm-paper
--design modern         # alias to web-warm-paper
```

## Included examples

The repository includes generated examples on the topic **LLM to Agent**:

```text
examples/llm-to-agent/presentation-dark-tech.html
examples/llm-to-agent/presentation-editorial-light.html
examples/llm-to-agent/report-analyst-light.html
examples/llm-to-agent/document-simple.html
examples/llm-to-agent/web-warm-paper.html
examples/ai-what-how-why.html
```

Serve them locally:

```bash
ptml serve --open
```

The default server page opens the warm-paper scroll web example.

## CLI

```text
ptml report [file.html] [title]
    Create an editable analysis report HTML.

ptml web [file.html] [title]
    Create an editable warm-paper scroll/web HTML.

ptml doc [file.html] [title]
    Create an editable long-form document/memo/spec HTML.

ptml deck [file.html] [title]
    Create an editable presentation/deck HTML.

ptml make "natural language request" -o file.html
    Infer type from text and create editable HTML.

ptml new [file.html] [--title T] [--type presentation|report|document|web]
                    [--design name] [--theme name] [--agent-bridge URL] [--force]
    Low-level command to create one standalone editable HTML file.

ptml validate <file.html> [--json]
    Verify that a file is a PTML editable HTML artifact.

ptml doctor [--json]
    Check the local PTML installation.

ptml agent-guide [--json]
    Print compact rules for AI agents.

ptml init [name] [--type type] [--design name]
    Create a PTML project with deck.json, index.html, and package.json.

ptml export <deck.json>
    Export a JSON deck/document as one standalone editable HTML file.

ptml serve [--port N] [--open]
    Start the built-in example server.

ptml designs [--details|--json]
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
The output filename must end with .html. Do not create .ptml or .phtml deliverables.
Prefer the CLI: ptml report <file.html>, ptml web <file.html>, ptml doc <file.html>, or ptml deck <file.html>.
Keep the PTML edit mode, phtml-deck-data JSON, embedded runtime, PHTML.init, and Export HTML behavior intact.
Run ptml validate <file.html> before reporting completion.
```

For the Korean request “레포트를 수정가능한 html 인 phtml 양식으로 만들어줘”, an agent should run:

```bash
ptml report report.html --title "보고서"
ptml validate report.html
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
