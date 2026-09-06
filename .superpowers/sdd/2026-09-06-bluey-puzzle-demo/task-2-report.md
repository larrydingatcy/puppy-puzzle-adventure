# Task 2 Report: Static Page Contract and Local Image

## Implementation summary

Implemented the static page contract and added the approved local Bluey puzzle image. The page contains the requested semantic shell: title and instructions, preview figure, controls, move/time counters, puzzle board container, inline image error, live status region, native completion dialog, and non-commercial rights notice.

The test uses Node's built-in test runner and the specified `node:fs/promises`, `node:path`, `node:url`, and `node:assert/strict` modules. It verifies all required DOM IDs, module entry-point wiring, 5×5 instruction text, non-commercial copyright notice, and a non-empty local image.

## Files

- `tests/page.test.js` — static page contract test.
- `index.html` — semantic page shell and required DOM IDs.
- `assets/bluey-puzzle.png` — approved local PNG asset (1,289,699 bytes, 3840×2160 RGBA PNG).

## TDD evidence

### RED

Command:

```text
node --test tests/page.test.js
```

Relevant output:

```text
✖ static page exposes the required puzzle contract and local image
Error: ENOENT: no such file or directory, open '.../bluey-puzzle-demo/index.html'
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

### GREEN

Command:

```text
node --test tests/page.test.js
```

Relevant output:

```text
✔ static page exposes the required puzzle contract and local image
ℹ tests 1
ℹ pass 1
ℹ fail 0
```

The approved temporary image was available locally at `/tmp/bluey-wallpaper-candidate.png`, so it was copied to the required final path. The resulting file was verified as a non-empty PNG.

## Test results

Command:

```text
npm test
```

Result: 4 tests passed, 0 failed. This includes the new page contract and all existing puzzle-engine tests.

## Self-review

- `git diff --check` passed before commit.
- Only the three files requested by Task 2 were added.
- The page references `./styles.css` and `./src/app.js` as the planned entry points but does not implement styling or browser interaction; those remain Task 3 scope.
- The local image path is exactly `assets/bluey-puzzle.png`.

## Commit

`9a0a305 feat: add puzzle page and image asset`

## Concerns

None for Task 2. `styles.css` and the behavior in `src/app.js` are intentionally not implemented here, per scope.

## Review fix round 1

Addressed the review finding that the preview image URL was hard-coded in `index.html`. The preview `<img>` now has no `src`; Task 3's `src/app.js` owns the centralized image URL and will assign it at runtime. Added a contract assertion that the HTML does not contain `./assets/bluey-puzzle.png`, while retaining the non-empty local asset assertion.

### Fix-round TDD evidence

RED command:

```text
node --test tests/page.test.js
```

Relevant RED output:

```text
✖ static page exposes the required puzzle contract and local image
AssertionError [ERR_ASSERTION]: image URL must be centralized in src/app.js
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

After removing the HTML `src`, GREEN commands:

```text
node --test tests/page.test.js
npm test
git diff --check
```

Results:

```text
focused: 1 passed, 0 failed
full suite: 4 passed, 0 failed
diff check: passed
```

Fix commit: `fix: centralize puzzle image URL` (includes this report update).
