# PHTML Runtime

Installable, editable HTML presentations for humans and AI agents.

PHTML is **not a new programming language**. It is a small shared CLI/runtime and file convention that gives every user and every AI agent the same baseline behavior: edit mode, slide data, themes, export, and optional agent control.

The first goal is simple:

> Create one editable HTML presentation file that opens in a browser, can be edited visually, and can be shared as a single file.

The advanced goal comes after that:

> Use the same runtime as an agentic live presentation surface controlled by Claude Code, OpenCode, Codex, Cline, or custom agents.

---

## Why install PHTML?

If you only give an AI agent a GitHub URL and ask it to make an editable HTML document, each agent may invent a different result:

- one file may have edit mode but no font-size controls;
- another may make text directly editable but have no slide runtime;
- another may export HTML but lose the deck data convention;
- another may ignore keyboard shortcuts, themes, or agent control.

PHTML avoids that drift by providing a shared installable baseline. Agents can still customize the final document, but they start from the same runtime instead of reinventing the basics.

---

## Install or run

### Option 1: one-time use with npx

Use this when you do not want a global install. `npx` downloads/runs the package for this command.

```bash
npx phtml-runtime new my-talk.html --title "My Talk"
```

### Option 2: install globally

Use this if you want the `phtml` command available everywhere.

```bash
npm install -g phtml-runtime
phtml new my-talk.html --title "My Talk"
```

### Option 3: install from GitHub / internal GitHub

Use this before the package is published to npm, or when your company wants to install from an internal repository.

```bash
# public GitHub SSH
npm install -g git+ssh://git@github.com/imejaim/phtml-runtime.git

# or inside a project
npm install git+ssh://git@github.com/imejaim/phtml-runtime.git

# company GitHub example
npm install -g git+ssh://git@github.com/your-org/phtml-runtime.git
```

After install:

```bash
phtml new my-talk.html --title "My Talk"
```

---

## Create a standalone editable HTML file

```bash
phtml new my-talk.html --title "Quarterly Strategy"
```

This creates:

```text
my-talk.html
```

The file is self-contained:

- no server required;
- runtime JS is embedded;
- core CSS and theme CSS are embedded;
- starter deck data is embedded;
- edit mode is available in the browser;
- the browser toolbar can export another standalone HTML file.

Open it in any modern browser:

```bash
open my-talk.html      # macOS
# or double-click the file
```

Then press **E** to enter edit mode.

---

## Edit and share

In the browser:

| Action | Description |
|--------|-------------|
| `E` | Toggle edit mode |
| `← →` | Navigate slides |
| Double-click canvas | Add a new box |
| Drag box | Move a box. Hold Shift to snap to an 8px grid |
| Drag handle | Resize a box |
| `Delete` | Remove selected box |
| `Alt + ↑↓` | Adjust font size |
| `Escape` | Deselect / exit edit mode |
| Toolbar → Export HTML | Download a standalone HTML copy |

Share the exported `.html` file by email, chat, GitHub, Drive, or any static hosting service.

---

## Tell an AI agent what to do

Instead of asking an agent to invent an editable HTML system, ask it to use PHTML as the baseline.

Example prompt:

```text
Use PHTML Runtime as the baseline. Create or modify a standalone editable PHTML HTML file.
Keep the PHTML edit mode, phtml-deck-data JSON, embedded runtime, and Export HTML behavior intact.
You may change the slide content, layout, theme, and custom CSS.
```

For GitHub-based installation:

```text
Install PHTML from git+ssh://git@github.com/imejaim/phtml-runtime.git.
Then create a standalone editable presentation with:
phtml new proposal.html --title "Proposal"
```

---

## CLI

```text
phtml new [file.html] [--title T] [--theme name] [--agent-bridge URL] [--force]
    Create one standalone editable HTML presentation file.

phtml init [name] [--theme name]
    Create a deck project with deck.json, index.html, and package.json.

phtml export <deck.json>
    Export a JSON deck as one standalone editable HTML file.

phtml serve [--port N] [--open]
    Start the built-in example server.
```

---

## Themes

Available themes:

| Theme | File | Description |
|-------|------|-------------|
| `editorial-dark` | `themes/editorial-dark.css` | Near-black editorial deck with ember accent |
| `editorial-light` | `themes/editorial-light.css` | Off-white paper-like deck with grid overlay |
| `dark-tech` | `themes/dark-tech.css` | Dark technical presentation theme |

Create a standalone file with a theme:

```bash
phtml new roadmap.html --title "Roadmap" --theme dark-tech
```

---

## Project mode

Use project mode when you want separate source files instead of one HTML file.

```bash
phtml init my-deck
cd my-deck
npm install
npx phtml serve --open
```

Project mode creates:

```text
my-deck/
  deck.json
  index.html
  package.json
```

Use project mode if your team wants to version-control `deck.json`, customize `index.html`, or build more tooling around the deck.

---

## Deck format

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

Common box classes:

| className | Description |
|-----------|-------------|
| `phtml-box title` | Large headline |
| `phtml-box subtitle` | Secondary text |
| `phtml-box body` | Body copy |
| `phtml-box eyebrow` | Small uppercase label |
| `phtml-box accent` | Accent-color box |
| `phtml-box card` | Surface card with border |
| `phtml-box code` | Monospace code block |
| `phtml-box pill` | Rounded pill tag |
| `phtml-box number` | Large stat/number display |

---

## Advanced: agentic live presentation runtime

PHTML can also be used as a browser runtime controlled by an AI agent.

Create a standalone file with an agent bridge URL:

```bash
phtml new live-demo.html --title "Live Demo" --agent-bridge ws://localhost:8787
```

Or initialize manually:

```javascript
PHTML.init({
  deckUrl: 'deck.json',
  agentBridge: 'ws://localhost:8787',
});
```

Commands from agent to runtime:

```json
{ "type": "replace_deck",  "deck": { } }
{ "type": "insert_box",    "box": { } }
{ "type": "goto_slide",    "index": 2 }
{ "type": "set_text",      "id": "box-id", "text": "New text" }
{ "type": "add_slide" }
{ "type": "delete_slide",  "index": 1 }
{ "type": "set_style",     "id": "box-id", "style": { "color": "#ff4f2a" } }
{ "type": "set_theme",     "name": "editorial-light" }
```

Events from runtime to agent:

```json
{ "type": "slide_changed", "index": 2 }
{ "type": "deck_saved",    "deck": { } }
```

Current scope: the runtime includes the browser-side WebSocket client and command handlers. A production-ready agent server, acknowledgements/errors, state-query protocol, and multi-user session model should be added before treating this as a complete live agent presentation platform.

---

## Examples

```bash
phtml serve --open
# opens examples/llm-to-agent/index.html
```

Included examples:

- `examples/llm-to-agent/` — “LLM to Agent” editorial deck
- `examples/agent-flow.html` — agent/workflow presentation example
- `examples/editorial-flow.html` — vertical editorial flow example

---

# PHTML Runtime 한국어 안내

PHTML은 **새로운 프로그래밍 언어가 아닙니다.** 사람이든 AI 에이전트든 같은 방식으로 편집 가능한 HTML 발표자료를 만들 수 있도록 해주는 작은 CLI/브라우저 런타임/파일 규칙입니다.

가장 먼저 집중하는 목표는 이것입니다.

> 브라우저에서 열고, 직접 편집하고, 단일 HTML 파일로 공유할 수 있는 발표자료를 만든다.

그 다음 확장 목표는 이것입니다.

> 같은 런타임을 Claude Code, OpenCode, Codex, Cline 같은 에이전트가 제어하는 실시간 agentic 발표 표면으로 사용한다.

---

## 왜 PHTML을 설치해야 하나요?

AI 에이전트에게 GitHub 주소만 주고 “수정 가능한 HTML 문서를 만들어줘”라고 하면 에이전트마다 결과가 달라질 수 있습니다.

- 어떤 파일은 편집 모드는 있지만 글자 크기 조절이 없습니다.
- 어떤 파일은 텍스트만 바로 수정되고 슬라이드 런타임이 없습니다.
- 어떤 파일은 HTML 내보내기는 되지만 덱 데이터 규칙이 없습니다.
- 어떤 파일은 단축키, 테마, 에이전트 제어 방식을 무시합니다.

PHTML은 이런 흔들림을 줄이기 위한 공통 설치형 기준입니다. 각 에이전트가 디자인과 내용을 자유롭게 바꾸더라도, 편집 모드/덱 데이터/테마/내보내기/선택적 에이전트 제어라는 최소 기능은 같은 기준에서 시작하게 합니다.

---

## 설치 또는 실행

### 1안: npx로 일회성 실행

전역 설치 없이 한 번 실행할 때 사용합니다.

```bash
npx phtml-runtime new my-talk.html --title "My Talk"
```

### 2안: 전역 설치

`phtml` 명령을 어디서든 쓰고 싶을 때 사용합니다.

```bash
npm install -g phtml-runtime
phtml new my-talk.html --title "My Talk"
```

### 3안: GitHub 또는 사내 GitHub에서 설치

npm 배포 전이거나, 사내 GitHub 저장소 기준으로 설치하고 싶을 때 사용합니다.

```bash
# public GitHub SSH
npm install -g git+ssh://git@github.com/imejaim/phtml-runtime.git

# 프로젝트 안에 설치
npm install git+ssh://git@github.com/imejaim/phtml-runtime.git

# 사내 GitHub 예시
npm install -g git+ssh://git@github.com/your-org/phtml-runtime.git
```

설치 후:

```bash
phtml new my-talk.html --title "My Talk"
```

---

## 단독 편집형 HTML 파일 만들기

```bash
phtml new my-talk.html --title "Quarterly Strategy"
```

생성되는 파일:

```text
my-talk.html
```

이 파일은 자체 포함형입니다.

- 서버 없이 브라우저에서 열 수 있습니다.
- 런타임 JS가 파일 안에 들어 있습니다.
- 기본 CSS와 테마 CSS가 파일 안에 들어 있습니다.
- 시작 덱 데이터가 파일 안에 들어 있습니다.
- 브라우저 편집 모드를 사용할 수 있습니다.
- 브라우저 툴바에서 다시 단일 HTML로 내보낼 수 있습니다.

브라우저에서 열기:

```bash
open my-talk.html      # macOS
# 또는 파일을 더블클릭
```

그 다음 **E** 키를 눌러 편집 모드로 들어갑니다.

---

## 편집하고 공유하기

브라우저에서:

| 동작 | 설명 |
|------|------|
| `E` | 편집 모드 전환 |
| `← →` | 슬라이드 이동 |
| 캔버스 더블클릭 | 새 박스 추가 |
| 박스 드래그 | 박스 이동. Shift를 누르면 8px 그리드에 스냅 |
| 핸들 드래그 | 박스 크기 조절 |
| `Delete` | 선택한 박스 삭제 |
| `Alt + ↑↓` | 글자 크기 조절 |
| `Escape` | 선택 해제 또는 편집 모드 종료 |
| 툴바 → Export HTML | 단일 HTML 파일 다운로드 |

내보낸 `.html` 파일은 이메일, 메신저, GitHub, Drive, 정적 호스팅으로 공유할 수 있습니다.

---

## AI 에이전트에게 줄 지시문

에이전트에게 편집형 HTML 시스템을 새로 만들라고 하지 말고, PHTML을 기준으로 사용하라고 지시합니다.

예시:

```text
PHTML Runtime을 기준으로 사용하세요. 단독 편집형 PHTML HTML 파일을 만들거나 수정하세요.
PHTML edit mode, phtml-deck-data JSON, embedded runtime, Export HTML 동작은 유지하세요.
슬라이드 내용, 레이아웃, 테마, custom CSS는 자유롭게 바꿔도 됩니다.
```

GitHub 설치를 같이 지시할 때:

```text
git+ssh://git@github.com/imejaim/phtml-runtime.git 에서 PHTML을 설치하세요.
그 다음 아래 명령으로 단독 편집형 발표자료를 만드세요.
phtml new proposal.html --title "Proposal"
```

---

## CLI

```text
phtml new [file.html] [--title T] [--theme name] [--agent-bridge URL] [--force]
    단독 편집형 HTML 발표자료 파일 하나를 만듭니다.

phtml init [name] [--theme name]
    deck.json, index.html, package.json이 있는 덱 프로젝트를 만듭니다.

phtml export <deck.json>
    JSON 덱을 단독 편집형 HTML 파일로 내보냅니다.

phtml serve [--port N] [--open]
    내장 예제 서버를 시작합니다.
```

---

## 테마

사용 가능한 테마:

| 테마 | 파일 | 설명 |
|------|------|------|
| `editorial-dark` | `themes/editorial-dark.css` | 어두운 editorial 덱, ember accent |
| `editorial-light` | `themes/editorial-light.css` | 종이 같은 밝은 덱, grid overlay |
| `dark-tech` | `themes/dark-tech.css` | 어두운 기술 발표용 테마 |

테마를 지정해서 만들기:

```bash
phtml new roadmap.html --title "Roadmap" --theme dark-tech
```

---

## 프로젝트 모드

단일 HTML 파일이 아니라 소스 파일을 분리해서 관리하고 싶을 때 사용합니다.

```bash
phtml init my-deck
cd my-deck
npm install
npx phtml serve --open
```

프로젝트 모드는 다음 파일을 만듭니다.

```text
my-deck/
  deck.json
  index.html
  package.json
```

팀에서 `deck.json`을 버전 관리하거나, `index.html`을 직접 커스터마이즈하거나, 덱 주변 도구를 더 만들고 싶을 때 적합합니다.

---

## 고급: agentic live presentation runtime

PHTML은 AI 에이전트가 제어하는 브라우저 런타임으로도 사용할 수 있습니다.

```bash
phtml new live-demo.html --title "Live Demo" --agent-bridge ws://localhost:8787
```

또는 직접 초기화할 수 있습니다.

```javascript
PHTML.init({
  deckUrl: 'deck.json',
  agentBridge: 'ws://localhost:8787',
});
```

현재 범위: 런타임에는 브라우저 쪽 WebSocket 클라이언트와 명령 처리기가 포함되어 있습니다. 완전한 라이브 agentic 발표 플랫폼으로 쓰려면 agent server, ack/error 응답, 상태 조회 프로토콜, 다중 사용자 세션 모델이 추가되어야 합니다.
