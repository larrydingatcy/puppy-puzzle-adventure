# Puppy Puzzle Plus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish an iPad-friendly static puzzle with 5×5, 7×7, and 9×9 difficulty, drag-to-swap, click/keyboard fallback, local best records, original artwork, and a shareable GitHub Pages URL.

**Architecture:** Keep the dependency-free ES-module app. Add pure puzzle-layout, best-record, and drag-state modules that the DOM controller composes; use Pointer Events for touch/mouse/Pencil input and CSS custom properties for dynamic grids. Publish the repository root with a GitHub Actions Pages workflow.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, Pointer Events, localStorage, Node.js built-in test runner, agent-browser, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-11-06-puppy-puzzle-plus-design.md`

## Global Constraints

- Support exactly 5×5, 7×7, and 9×9 difficulty with 5×5 as the default.
- Preserve drag, click/tap, and keyboard gameplay on current iPadOS and desktop browsers.
- Keep user-uploaded images local to the browser session and preserve their original aspect ratio.
- Use no runtime dependencies, build step, backend, account, analytics, or cloud storage.
- Use only relative asset paths so GitHub Pages works under a repository subpath.
- Remove all Bluey artwork, branding, rights text, and affiliation implications from the deployed branch.
- Use an original 16:9 cartoon-dog image with no resemblance to protected characters, logos, or trade dress.
- Keep the board within the viewport without horizontal scrolling at 390px and common iPad widths.
- Do not modify the original dirty checkout containing “彩虹汉字岛”; work only in this managed worktree.

## Review Focus

- Unsupported puzzle sizes: `createGame(6)` must reject instead of producing an unreviewed layout; Task 1 tests this.
- Corrupt or inaccessible record storage: play must continue with empty records and no thrown error; Task 1 tests normalization and Task 4 tests storage failure in-browser.
- A pointer gesture below the drag threshold: it must remain a normal click and never produce a double swap; Task 3 tests this pure transition and in-browser behavior.
- Pointer cancellation or release outside the board: pieces and move count must remain unchanged; Task 3 tests both paths.
- Extreme image ratio plus 81 pieces on iPad: the board must preserve the image and avoid horizontal overflow; Task 4 browser tests this at 390×844 and 1024×768.

---

### Task 1: Dynamic Puzzle Rules and Best Records

**Files:**
- Modify: `src/puzzle.js`
- Create: `src/records.js`
- Modify: `tests/puzzle.test.js`
- Create: `tests/records.test.js`

**Interfaces:**
- Produces: `SUPPORTED_SIZES: readonly number[]` containing `[5, 7, 9]`.
- Produces: `isSupportedSize(size: number): boolean`.
- Produces: `tileBackgroundPosition(tile: number, size: number): { xPercent: number, yPercent: number }`.
- Produces: `createEmptyBestRecords(): BestRecords` where each supported size has `{ bestMoves: null, bestTimeMs: null }`.
- Produces: `normalizeBestRecords(value: unknown): BestRecords`.
- Produces: `updateBestRecords(records: BestRecords, size: number, moves: number, timeMs: number): { records: BestRecords, newBestMoves: boolean, newBestTime: boolean }`.

- [ ] **Step 1: Write failing dynamic-size tests in `tests/puzzle.test.js`**

Add tests named `supports only the three designed puzzle sizes` and `calculates tile backgrounds for any supported grid`. Assert `createGame(7, () => 0).tiles.length === 49`, `createGame(9, () => 0).tiles.length === 81`, `createGame(6)` throws `/Unsupported puzzle size/`, and tile 24 in a 7×7 grid produces `{ xPercent: 50, yPercent: 50 }`.

- [ ] **Step 2: Run the puzzle tests and verify RED**

Run: `node --test tests/puzzle.test.js`

Expected: FAIL because the size exports and background helper do not exist and unsupported size 6 is accepted.

- [ ] **Step 3: Implement the dynamic puzzle interfaces in `src/puzzle.js`**

Keep Fisher–Yates and immutable selection behavior. Validate the size in `createSolvedTiles` and `createGame`; calculate each axis as `(coordinate / (size - 1)) * 100`.

- [ ] **Step 4: Run the puzzle tests and verify GREEN**

Run: `node --test tests/puzzle.test.js`

Expected: all puzzle tests PASS.

- [ ] **Step 5: Write failing record tests in `tests/records.test.js`**

Test empty defaults, corrupt values, non-finite/negative metrics, independent size records, first-result bests, improving only one metric, and worse results leaving records unchanged. Use literal records and literal expected values.

- [ ] **Step 6: Run the record tests and verify RED**

Run: `node --test tests/records.test.js`

Expected: FAIL because `src/records.js` does not exist.

- [ ] **Step 7: Implement the record interfaces in `src/records.js`**

Normalize to a fresh object every time. Accept only positive integer moves and finite non-negative milliseconds; invalid stored fields become `null`.

- [ ] **Step 8: Run all Node tests and commit Task 1**

Run: `npm test`

Expected: all tests PASS with zero failures.

```bash
git add src/puzzle.js src/records.js tests/puzzle.test.js tests/records.test.js
git commit -m "feat: add puzzle difficulty and best records"
```

### Task 2: Original Artwork, Rebranding, and Difficulty UI

**Files:**
- Create: `assets/puppy-puzzle.png`
- Delete: `assets/bluey-puzzle.png`
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/app.js`
- Modify: `tests/page.test.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: `SUPPORTED_SIZES`, `createGame`, and `tileBackgroundPosition` from Task 1.
- Produces DOM ids: `difficulty-controls`, `difficulty-5`, `difficulty-7`, `difficulty-9`, `current-difficulty`, `best-moves`, `best-time`, `replay-button`, and `next-difficulty-button`.
- Produces app constant: `DEFAULT_IMAGE_URL = './assets/puppy-puzzle.png'`.

- [ ] **Step 1: Write failing page-contract tests**

Extend `tests/page.test.js` to require the new ids, three `aria-pressed` difficulty buttons, Replay/Next Difficulty dialog buttons, “Puppy Puzzle Adventure” branding, the local puppy asset, and no case-insensitive match for `Bluey`, `Ludo Studio`, or `BBC Studios` in `index.html`, `README.md`, or `src/app.js`.

- [ ] **Step 2: Run the page tests and verify RED**

Run: `node --test tests/page.test.js`

Expected: FAIL on missing controls, missing puppy asset, and old branding.

- [ ] **Step 3: Generate the original default artwork**

Use the image-generation skill to create a 16:9, high-resolution, cheerful cartoon landscape with generic original dog characters, simple shapes, strong color regions suitable for 81 puzzle slices, and no protected character resemblance, logos, text, or trademarks. Save the final PNG as `assets/puppy-puzzle.png` and visually inspect it before use.

- [ ] **Step 4: Rebrand and add semantic difficulty controls**

Update `index.html` and `README.md`; remove the old asset. Use real buttons for difficulty and dialog actions. Keep upload controls and privacy copy.

- [ ] **Step 5: Implement dynamic-size rendering in `src/app.js` and CSS**

Track `selectedSize`, set `--puzzle-size`, call `createGame(selectedSize)`, calculate backgrounds through `tileBackgroundPosition`, update `aria-pressed`, and start a new game immediately on difficulty change. Make piece borders and gaps size-aware with CSS classes or a `data-size` attribute.

- [ ] **Step 6: Run Node tests and commit Task 2**

Run: `npm test`

Expected: all tests PASS with zero failures.

```bash
git add README.md index.html styles.css src/app.js tests/page.test.js assets/puppy-puzzle.png
git rm assets/bluey-puzzle.png
git commit -m "feat: add original puppy puzzle difficulties"
```

### Task 3: Pointer Drag-to-Swap

**Files:**
- Create: `src/drag.js`
- Create: `tests/drag.test.js`
- Modify: `src/app.js`
- Modify: `styles.css`
- Replace: `tests/keyboard-swap.browser.mjs` with `tests/gameplay.browser.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `createDragState(sourceIndex: number, pointerId: number, x: number, y: number): DragState`.
- Produces: `updateDragState(state: DragState, pointerId: number, x: number, y: number, targetIndex: number | null, threshold?: number): DragState`.
- Produces: `finishDrag(state: DragState, pointerId: number, targetIndex: number | null): { type: 'tap' | 'swap' | 'cancel', sourceIndex: number, targetIndex: number | null }`.
- Consumes: `selectTile` for both completed drag swaps and click fallback.

- [ ] **Step 1: Write failing drag-state tests**

Cover an 8px threshold, wrong pointer ids being ignored, a sub-threshold gesture returning `tap`, a valid cross-piece drag returning `swap`, source/outside drops returning `cancel`, and pointer cancellation clearing state without a move.

- [ ] **Step 2: Run drag tests and verify RED**

Run: `node --test tests/drag.test.js`

Expected: FAIL because `src/drag.js` does not exist.

- [ ] **Step 3: Implement the pure drag-state interfaces**

Use squared Euclidean distance for threshold comparison. Never mutate the input state.

- [ ] **Step 4: Run drag tests and verify GREEN**

Run: `node --test tests/drag.test.js`

Expected: all drag tests PASS.

- [ ] **Step 5: Integrate Pointer Events in `src/app.js` and `styles.css`**

Capture the initiating pointer, use `elementFromPoint` for targets, set `.is-dragging` and `.is-drop-target`, suppress the post-drag click, keep tap/click/keyboard behavior, restore focus after swap, and announce drag cancellation or completion. Apply `touch-action: none` only to the board.

- [ ] **Step 6: Write the gameplay browser regression before finalizing integration**

Create `tests/gameplay.browser.mjs` with a Node static server bound to port `0`, then use agent-browser to verify keyboard swap, click swap, real pointer drag swap, sub-threshold tap, outside-drop cancellation, and unchanged moves after cancellation. Update `npm run test:browser` to use this file.

- [ ] **Step 7: Run browser regression and commit Task 3**

Run: `npm run test:browser`

Expected: PASS with no page errors; every swap increments exactly once.

```bash
git add package.json src/app.js src/drag.js styles.css tests/drag.test.js tests/gameplay.browser.mjs
git rm tests/keyboard-swap.browser.mjs
git commit -m "feat: add pointer drag puzzle swaps"
```

### Task 4: Best Results, Completion Actions, and iPad Verification

**Files:**
- Modify: `src/app.js`
- Modify: `styles.css`
- Modify: `tests/gameplay.browser.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: `normalizeBestRecords` and `updateBestRecords` from Task 1.
- Produces localStorage key: `puppy-puzzle-best-v1`.
- Produces completion actions: Replay restarts the same size; Next Difficulty advances 5→7→9 and stays at 9.

- [ ] **Step 1: Extend the browser test with failing result and layout cases**

Verify difficulty selection renders 49 and 81 buttons; solve a controlled game to verify completion metadata, local best records, Replay, and Next Difficulty; replace `localStorage` methods with throwing fakes to verify play still completes; upload the 3:2 fixture; and assert `document.documentElement.scrollWidth <= innerWidth` at 390×844 and 1024×768 with 81 pieces.

- [ ] **Step 2: Run browser regression and verify RED**

Run: `npm run test:browser`

Expected: FAIL on missing best-result integration and completion actions.

- [ ] **Step 3: Implement best-result persistence and completion actions**

Load normalized records at startup, save in `try/catch`, update independent metrics on completion, render `—` for absent records, and announce unavailable persistence only at completion. Wire Replay and Next Difficulty exactly as specified.

- [ ] **Step 4: Finish iPad-responsive styling and documentation**

Ensure difficulty controls wrap, 81 pieces remain visible, drag visuals respect reduced motion, and normal page scrolling works outside the board. Document difficulty, drag/click fallback, local records, uploads, and iPad Safari usage.

- [ ] **Step 5: Run full local verification and commit Task 4**

Run:

```bash
npm test
npm run test:browser
git diff --check
```

Expected: all Node and browser tests PASS, no console errors, and no whitespace errors.

```bash
git add README.md src/app.js styles.css tests/gameplay.browser.mjs
git commit -m "feat: add puzzle records and iPad completion flow"
```

### Task 5: GitHub Pages Pipeline

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `tests/deployment.test.js`
- Modify: `README.md`

**Interfaces:**
- Produces workflow triggers: push to `main` and manual `workflow_dispatch`.
- Produces Pages artifact from repository root after `npm test`.
- Produces required permissions: `contents: read`, `pages: write`, `id-token: write`.

- [ ] **Step 1: Write failing workflow-contract tests**

In `tests/deployment.test.js`, read `.github/workflows/pages.yml` and assert the exact triggers, permissions, test command, `actions/configure-pages`, `actions/upload-pages-artifact` with `path: .`, and `actions/deploy-pages`. Also scan public HTML/JS/CSS/README and tracked asset names for forbidden Bluey references.

- [ ] **Step 2: Run deployment tests and verify RED**

Run: `node --test tests/deployment.test.js`

Expected: FAIL because the workflow does not exist.

- [ ] **Step 3: Create the Pages workflow and publishing documentation**

Pin official actions to current major versions available in GitHub documentation at implementation time. Use one build job and one deploy job with the `github-pages` environment and deployment URL output.

- [ ] **Step 4: Run all tests and commit Task 5**

Run:

```bash
npm test
npm run test:browser
git diff --check
git status --short
```

Expected: tests PASS and only intended workflow/documentation changes are pending.

```bash
git add .github/workflows/pages.yml tests/deployment.test.js README.md
git commit -m "ci: deploy puppy puzzle to GitHub Pages"
```

### Task 6: Publish and Verify the Shareable Link

**Files:**
- No product-file changes expected; fix only defects discovered by deployment verification.

**Interfaces:**
- Consumes: authenticated GitHub account, branch `codex/bluey-puzzle-plus`, and the Pages workflow from Task 5.
- Produces: public repository `puppy-puzzle-adventure` and its HTTPS GitHub Pages URL.

- [ ] **Step 1: Verify GitHub authentication and repository availability**

Use the connected GitHub account or `gh auth status`. Confirm `puppy-puzzle-adventure` is available; if occupied, use `puppy-puzzle-adventure-game` and record the change.

- [ ] **Step 2: Create the public repository and push the implementation**

Create the repository without a generated README or license, add it as `origin`, push the feature branch, then set/push it as `main` without touching the original dirty checkout.

- [ ] **Step 3: Enable GitHub Pages with GitHub Actions**

Use GitHub API or repository settings to select workflow-based Pages deployment. Trigger the workflow if the `main` push did not already do so.

- [ ] **Step 4: Wait for deployment and inspect checks**

Wait for the Pages workflow to finish. If it fails, inspect logs, add a regression test for any product defect, fix, commit, and push once.

- [ ] **Step 5: Smoke-test the deployed HTTPS URL**

Open the returned Pages URL in a browser; verify the original puppy image and modules load from the repository subpath, 9×9 renders 81 pieces, a drag swap works, upload remains local, there is no horizontal overflow at 1024×768, and the console has no errors.

- [ ] **Step 6: Return the final link**

Report the public repository URL, GitHub Pages URL, successful workflow run, and the exact iPad Safari instruction: open the HTTPS link, then use Share → Add to Home Screen if desired.
