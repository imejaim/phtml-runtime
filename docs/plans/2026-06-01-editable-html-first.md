# Editable HTML First Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Reposition PHTML around installable, consistent, editable single-file HTML presentations first, then document the agentic runtime as an advanced workflow.

**Architecture:** Keep PHTML as a small Node CLI plus zero-dependency browser runtime. Add a `phtml new <file.html>` command that produces one standalone editable HTML file with the shared runtime, theme CSS, and starter deck embedded. Keep `phtml init` for project mode and `phtml export` for JSON deck to standalone HTML.

**Tech Stack:** Node.js stdlib CLI, vanilla JS runtime, CSS themes, Markdown documentation.

---

### Task 1: Add standalone editable HTML generator

**Objective:** Let users create a consistent single editable HTML file without asking their agent to invent edit behavior.

**Files:**
- Modify: `cli/index.js`

**Steps:**
1. Add argument helpers for `--title`, `--theme`, and `--agent-bridge`.
2. Add shared `createStarterDeck(name, theme)`.
3. Add shared `buildStandaloneHtml(deck, options)` that embeds `runtime/phtml.css`, selected theme CSS, `runtime/phtml.js`, and safe JSON deck data.
4. Add `newStandalone(args)` command:
   - Usage: `phtml new [file.html] [--title Title] [--theme editorial-dark] [--agent-bridge ws://localhost:8787]`
   - Default output: `deck.html`
   - Refuse overwrite unless `--force` is passed.
5. Update help text.

**Verification:**
- `node --check cli/index.js`
- `node cli/index.js new /tmp/phtml-test.html --title "Team Update" --force`
- Verify `/tmp/phtml-test.html` contains `PHTML.init`, `phtml-deck-data`, and editable hint text.

---

### Task 2: Make export safer and reuse the standalone builder

**Objective:** Keep generated HTML consistent between `new` and `export`.

**Files:**
- Modify: `cli/index.js`

**Steps:**
1. Replace ad hoc export HTML assembly with `buildStandaloneHtml`.
2. Escape JSON safely for `<script type="application/json">` by replacing `</script`, `<`, `>`, `&`, U+2028, and U+2029.
3. Preserve existing output behavior: `deck.json` -> `deck.html`.

**Verification:**
- `node cli/index.js export decks/agent-flow.json`
- Verify generated file includes runtime and parses embedded JSON.
- Remove generated `decks/agent-flow.html` after smoke test.

---

### Task 3: Rewrite README around install → create single file → edit/share → advanced runtime

**Objective:** Make the first-time user path match the product purpose.

**Files:**
- Modify: `README.md`

**Steps:**
1. Lead with “install a shared PHTML CLI/runtime so agents do not reinvent edit mode.”
2. Provide three install options:
   - `npx phtml-runtime new my-talk.html`
   - `npm install -g phtml-runtime`
   - `npm install git+ssh://git@github.com/imejaim/phtml-runtime.git` or company GitHub equivalent.
3. Document first artifact: `phtml new my-talk.html` creates a standalone editable HTML file.
4. Then document browser edit mode and export/share.
5. Then document project mode (`phtml init`) and agent runtime (`agentBridge`) as advanced workflows.
6. Keep Korean translation below the English guide.

**Verification:**
- README contains the ordered sections: install, create standalone HTML, edit/share, project mode, agent runtime.
- README states PHTML is a shared runtime/convention, not a new language.

---

### Task 4: Final validation

**Objective:** Ensure docs and CLI are coherent.

**Commands:**
- `node --check cli/index.js`
- `node --check runtime/phtml.js`
- `node cli/index.js new /tmp/phtml-demo.html --title "PHTML Demo" --force`
- `node cli/index.js export decks/agent-flow.json`
- `git diff --stat`
- `git status --short`

**Expected:**
- All commands pass.
- Only intentional files are modified.
