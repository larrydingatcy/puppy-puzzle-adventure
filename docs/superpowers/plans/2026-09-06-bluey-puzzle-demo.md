# Bluey 5×5 Puzzle Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-login, responsive browser demo in which players restore a Bluey image by swapping pieces in a fixed 5×5 grid.

**Architecture:** A dependency-free ES module contains all puzzle state transitions as pure functions, while a small DOM adapter renders the state and handles clicks, keyboard activation, timing, and completion feedback. The page and image are static assets, so any local static server can run the game.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, Node.js built-in test runner

**Spec:** `docs/superpowers/specs/2026-09-06-bluey-puzzle-demo-design.md`

## Global Constraints

- Use one fixed 5×5 puzzle with exactly 25 pieces.
- Require no login, backend, persistence, build step, framework, or third-party runtime dependency.
- Support current desktop and mobile browsers using click/tap and keyboard activation.
- Keep the temporary image at `assets/bluey-puzzle.png` and its URL centralized in `src/app.js`.
- Mark the demo as non-commercial and attribute Bluey rights to the relevant rights holders.
- Never allow a new game to start in the solved state.

---

## File Map

- `package.json`: declares ES modules and the single test command.
- `src/puzzle.js`: owns solved-order creation, shuffling, swapping, selection transitions, move counting, and completion detection.
- `tests/puzzle.test.js`: specifies the pure game-state behavior.
- `tests/page.test.js`: verifies the static page contract and required local asset.
- `index.html`: provides semantic single-page structure and accessible status/dialog elements.
- `styles.css`: provides responsive layout, puzzle grid styling, focus/selection states, and celebration animation.
- `src/app.js`: owns the image configuration, DOM rendering, event binding, timer, restart, and image-error messaging.
- `assets/bluey-puzzle.png`: stores the temporary official promotional image locally.
- `README.md`: documents running, gameplay, image replacement, and copyright limitations.

### Task 1: Pure Puzzle Engine

**Files:**
- Create: `package.json`
- Create: `src/puzzle.js`
- Create: `tests/puzzle.test.js`

**Interfaces:**
- Produces: `createSolvedTiles(size: number): number[]`
- Produces: `isSolved(tiles: number[]): boolean`
- Produces: `shuffleTiles(tiles: number[], random?: () => number): number[]`
- Produces: `createGame(size: number, random?: () => number): GameState`
- Produces: `selectTile(state: GameState, index: number): GameState`
- `GameState` shape: `{ size, tiles, selectedIndex, moves, status }`, where `status` is `'playing' | 'completed'`.

- [ ] **Step 1: Add the Node test command**

Create `package.json`:

```json
{
  "name": "bluey-puzzle-demo",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write failing tests for solved order and shuffling**

Create `tests/puzzle.test.js` with imports from `../src/puzzle.js` and tests asserting:

```js
assert.deepEqual(createSolvedTiles(5), Array.from({ length: 25 }, (_, i) => i));
assert.equal(isSolved(createSolvedTiles(5)), true);
assert.deepEqual(shuffleTiles([0, 1, 2, 3], () => 0), [1, 2, 3, 0]);
assert.equal(isSolved(shuffleTiles([0, 1, 2, 3], () => 0)), false);
```

- [ ] **Step 3: Run the tests and verify the expected failure**

Run: `npm test`

Expected: FAIL because `src/puzzle.js` does not exist.

- [ ] **Step 4: Implement solved order and non-solved Fisher–Yates shuffling**

Create `src/puzzle.js` with `createSolvedTiles`, `isSolved`, and `shuffleTiles`. `shuffleTiles` must copy its input, apply Fisher–Yates, and rotate the first two entries if the result is solved.

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npm test`

Expected: all current tests PASS.

- [ ] **Step 6: Write failing tests for game creation and selection transitions**

Extend `tests/puzzle.test.js` to verify:

```js
const game = createGame(5, () => 0);
assert.equal(game.tiles.length, 25);
assert.equal(game.selectedIndex, null);
assert.equal(game.moves, 0);
assert.equal(game.status, 'playing');
assert.equal(isSolved(game.tiles), false);

const almostSolved = { ...game, tiles: [1, 0, ...createSolvedTiles(5).slice(2)] };
const selected = selectTile(almostSolved, 0);
assert.equal(selected.selectedIndex, 0);
assert.equal(selected.moves, 0);

const cancelled = selectTile(selected, 0);
assert.equal(cancelled.selectedIndex, null);
assert.equal(cancelled.moves, 0);

const completed = selectTile(selected, 1);
assert.deepEqual(completed.tiles, createSolvedTiles(5));
assert.equal(completed.moves, 1);
assert.equal(completed.status, 'completed');
```

- [ ] **Step 7: Run the focused tests and verify the expected failure**

Run: `node --test tests/puzzle.test.js`

Expected: FAIL because `createGame` and `selectTile` are not exported.

- [ ] **Step 8: Implement game creation and tile selection**

Add `createGame` and `selectTile` to `src/puzzle.js`. Selecting once records an index; selecting the same index cancels; selecting a second index swaps the two pieces, increments moves once, clears selection, and sets `status` to `completed` only when solved. Completed games ignore further selections.

- [ ] **Step 9: Run the complete tests and commit the engine**

Run: `npm test`

Expected: all tests PASS.

```bash
git add package.json src/puzzle.js tests/puzzle.test.js
git commit -m "feat: add puzzle game engine"
```

### Task 2: Static Page Contract and Local Image

**Files:**
- Create: `tests/page.test.js`
- Create: `index.html`
- Create: `assets/bluey-puzzle.png`

**Interfaces:**
- Consumes: `src/app.js` as the page module entry point.
- Produces DOM ids: `puzzle`, `start-button`, `restart-button`, `moves`, `timer`, `preview-image`, `image-error`, `completion-dialog`, `final-moves`, `final-time`, and `live-status`.
- Produces local asset path: `assets/bluey-puzzle.png`.

- [ ] **Step 1: Write the failing static-page contract test**

Create `tests/page.test.js` using `node:fs/promises`, `node:path`, `node:url`, and `node:assert/strict`. Read `index.html` and assert it includes each required DOM id, `type="module"`, `src="./src/app.js"`, the 5×5 instruction text, and the non-commercial copyright notice. Assert `stat('assets/bluey-puzzle.png').size > 0`.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `node --test tests/page.test.js`

Expected: FAIL because `index.html` and the local image do not exist.

- [ ] **Step 3: Download the approved temporary image**

Run:

```bash
mkdir -p assets
curl -L "https://www.bluey.tv/wp-content/uploads/2025/04/image-select-10.png" -o assets/bluey-puzzle.png
```

Expected: `assets/bluey-puzzle.png` is a non-empty PNG sourced from the official Bluey wallpaper page.

- [ ] **Step 4: Create the semantic page shell**

Create `index.html` with a title area, instruction text, preview figure, start/restart controls, move and timer counters, a 25-cell puzzle container, an inline image-error alert, an `aria-live` status region, and a native `<dialog>` completion panel. Load `styles.css` and `src/app.js`.

- [ ] **Step 5: Run the focused test and commit the page contract**

Run: `node --test tests/page.test.js`

Expected: PASS.

```bash
git add tests/page.test.js index.html assets/bluey-puzzle.png
git commit -m "feat: add puzzle page and image asset"
```

### Task 3: Browser Interaction and Responsive Presentation

**Files:**
- Create: `src/app.js`
- Create: `styles.css`
- Modify: `tests/page.test.js`

**Interfaces:**
- Consumes: `createGame(size, random)` and `selectTile(state, index)` from `src/puzzle.js`.
- Consumes: all DOM ids defined in Task 2.
- Produces: rendered puzzle buttons with `data-index`, correct background size/position, accessible position labels, and selected/completed states.
- Produces: `formatElapsed(milliseconds: number): string`, exported from `src/app.js` for testing.

- [ ] **Step 1: Write a failing timer-format test**

Extend `tests/page.test.js` to import `formatElapsed` and assert:

```js
assert.equal(formatElapsed(0), '00:00');
assert.equal(formatElapsed(65_000), '01:05');
assert.equal(formatElapsed(3_605_000), '60:05');
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `node --test tests/page.test.js`

Expected: FAIL because `src/app.js` does not exist.

- [ ] **Step 3: Implement the minimal DOM controller**

Create `src/app.js`. Export a side-effect-free `formatElapsed`; guard DOM startup with `if (typeof document !== 'undefined')`. Set `PUZZLE_SIZE = 5` and `IMAGE_URL = './assets/bluey-puzzle.png'`. On start/restart, create a fresh game, record `performance.now()`, update every second, render 25 buttons, and announce status. On each button click, call `selectTile`; update moves and selection; when completed, stop the interval, lock the board, populate the dialog, and call `showModal()`.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `node --test tests/page.test.js`

Expected: PASS.

- [ ] **Step 5: Add responsive and accessible styling**

Create `styles.css` with CSS custom properties for the palette, a centered card layout, a responsive 16:9 five-column grid, visible `:focus-visible` and selected-piece outlines, disabled/completed states, a narrow-screen media query, and a short confetti-like completion animation disabled by `prefers-reduced-motion`.

- [ ] **Step 6: Run all automated tests and commit the playable UI**

Run: `npm test`

Expected: all tests PASS with zero failures.

```bash
git add src/app.js styles.css tests/page.test.js
git commit -m "feat: add playable puzzle interface"
```

### Task 4: Documentation and End-to-End Verification

**Files:**
- Create: `README.md`
- Modify only if verification finds a defect: `index.html`, `styles.css`, `src/app.js`, `src/puzzle.js`, or their tests.

**Interfaces:**
- Consumes: the completed static app and its test command.
- Produces: local run command `python3 -m http.server 8000` and browser URL `http://localhost:8000`.

- [ ] **Step 1: Write the README**

Document the one-command local server, browser URL, two-click swap rules, 5×5 difficulty, test command, image replacement path, source page, non-commercial limitation, and rights notice.

- [ ] **Step 2: Run the complete automated test suite**

Run: `npm test`

Expected: all tests PASS with zero failures.

- [ ] **Step 3: Start a local static server**

Run: `python3 -m http.server 8000`

Expected: server listens on port 8000 without errors.

- [ ] **Step 4: Verify the complete browser flow**

Open `http://localhost:8000` and verify: image loads locally; start produces 25 shuffled pieces; clicking the same tile cancels; clicking two different tiles swaps once; moves and timer update; keyboard focus is visible; restart resets both counters; a solved board opens the completion dialog; 390px-wide layout stays within the viewport; the browser console has no errors.

- [ ] **Step 5: Stop the server and run final repository checks**

Run:

```bash
npm test
git diff --check
git status --short
```

Expected: tests PASS, `git diff --check` prints nothing, and only intended files are pending.

- [ ] **Step 6: Commit documentation and any verified fixes**

```bash
git add README.md index.html styles.css src tests assets/bluey-puzzle.png
git commit -m "docs: document Bluey puzzle demo"
```
