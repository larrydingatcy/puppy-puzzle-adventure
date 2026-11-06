# Puppy Puzzle Plus Design

## Intent

Turn the existing local 5×5 picture puzzle into a richer, iPad-friendly public web game that can be shared through a GitHub Pages URL. The game should feel more challenging without becoming difficult to understand: players choose a piece count, drag one piece onto another to swap them, and can still use the existing two-click interaction when dragging is inconvenient.

## Goals

- Offer three difficulties: 5×5 (25 pieces), 7×7 (49 pieces), and 9×9 (81 pieces).
- Make drag-to-swap reliable with touch, Apple Pencil, mouse, and trackpad input on current iPadOS and desktop browsers.
- Preserve the existing click-two-pieces and keyboard interaction as an accessible fallback.
- Keep user-selected images entirely inside the browser and preserve their original aspect ratio.
- Track the best move count and best time for each difficulty in `localStorage`.
- Replace the temporary Bluey image and branding with an original, publishable 16:9 cartoon-dog illustration.
- Publish a dependency-free static site to a public GitHub repository and GitHub Pages.

## Non-goals

- No accounts, server, cloud storage, leaderboards, multiplayer, advertisements, or analytics.
- No free-position or interlocking jigsaw-piece shapes.
- No persistence of user-uploaded image bytes after the page closes or reloads.
- No app-store packaging; the deliverable is an HTTPS web link that works in iPad Safari.

## Constraints

- Preserve the current no-build, HTML/CSS/JavaScript architecture.
- Keep all asset paths relative so the site works under a GitHub Pages repository subpath.
- The deployed repository must not contain Bluey artwork, Bluey branding, or claims of affiliation with Ludo Studio or BBC Studios.
- A 9×9 puzzle must remain playable at iPad viewport sizes; pieces may be small, but the entire board must fit without horizontal scrolling.
- Dragging on the puzzle must not accidentally scroll the page, while normal scrolling outside the board remains available.

## Approaches Considered

### 1. Dynamic click-to-swap only

Keep the existing interaction and only add difficulty selection. This is the smallest change and easiest to maintain, but it does not make the iPad experience feel materially richer.

### 2. Drag-to-swap with click and keyboard fallback — selected

Use Pointer Events to recognize a deliberate drag from one board position onto another, then swap those two positions. Retain click-to-swap and keyboard activation. This gives iPad users a more tactile interaction while preserving accessibility and the existing mental model.

### 3. Free-position jigsaw pieces

Render pieces in a tray and let players place them into slots. This would feel more like a physical puzzle, but requires layout, collision, snapping, and substantially more state. It is outside the requested “a little more complex” scope.

## Game Flow

1. The landing card shows the original dog illustration, difficulty buttons, current personal best, and Start, Restart, and Upload Image controls.
2. The default difficulty is 5×5. Changing difficulty before or during a game immediately starts a new shuffled puzzle at the selected size and resets current moves and time.
3. A player can drag a piece onto another piece to swap them. A visible lifted state follows the pointer, and the target position is highlighted.
4. A short press or tap still uses the existing select-one/select-another behavior. Keyboard users can activate pieces with Enter or Space.
5. On completion, the dialog reports difficulty, moves, time, and whether either result is a new personal best. It offers Replay and Next Difficulty actions.
6. Uploading a valid local image replaces the current image for the session and immediately starts a fresh puzzle at the current difficulty. Refreshing restores the original default image.

## Interaction Details

- Each board button represents a stable board position; the piece image assigned to that position changes as pieces are swapped.
- Pointer handling uses `pointerdown`, `pointermove`, `pointerup`, and `pointercancel`, with pointer capture on the source button.
- Movement below a small threshold is treated as a normal click. Crossing the threshold enters drag mode and suppresses the synthetic click that follows pointer release.
- During drag, `document.elementFromPoint()` identifies the target puzzle button. Dropping on the source or outside the board cancels without adding a move.
- Successful drag swaps exactly once, increments the move count once, restores focus to the target button, and immediately checks completion.
- The board uses `touch-action: none`; the rest of the page retains normal touch scrolling.
- Difficulty controls use real buttons with `aria-pressed`. Drag state and drop target have visible classes, and live-region messages describe the swap or cancellation.

## State and Data

- `createGame(size)` remains the source of shuffled game state and supports sizes 5, 7, and 9.
- The application owns `selectedSize`, drag state, timer state, current image URL, and upload-object-URL cleanup.
- Best results are stored under a versioned localStorage key. Each difficulty stores independent `bestMoves` and `bestTimeMs` values.
- A result updates only a metric it improves. Clearing browser site data clears records; there is no remote synchronization.
- Corrupt or unavailable localStorage data falls back to an empty record without blocking play.

## Visual Design

- Keep the current bright sky/cream/coral palette and rounded card style, but rename the experience to “Puppy Puzzle Adventure.”
- Add a compact three-button difficulty selector above the board and a best-result row below the timer.
- Piece gaps and borders shrink as difficulty increases so the picture remains readable.
- Dragging adds scale, shadow, and reduced opacity to the source; the target receives a coral inset ring.
- Motion respects `prefers-reduced-motion`.
- The new default artwork is an original 16:9 cheerful cartoon scene with generic dog characters and no resemblance to protected Bluey characters, logos, or trade dress.

## Error Handling

- Reject empty or non-image uploads and keep the current image unchanged.
- If the browser cannot decode an uploaded image, revoke the temporary URL, show an inline error, and keep the current game unchanged.
- If localStorage access fails, continue without records and announce that best results are unavailable only when the user completes a puzzle.
- Pointer cancellation, dropping outside the board, or losing pointer capture must leave the board unchanged.

## Testing

- Unit tests cover supported difficulty sizes, dynamic solved arrays, shuffling, swapping at 5×5/7×7/9×9, best-result comparison, and corrupt storage normalization.
- Static page tests cover difficulty controls, branding, relative assets, upload controls, dialog actions, and the absence of Bluey references.
- Browser tests cover click swap, keyboard swap, pointer drag swap, drag cancellation, difficulty change, 81-piece rendering, image upload with preserved ratio, completion actions, and zero horizontal overflow at iPad widths.
- A final GitHub Pages smoke test opens the deployed HTTPS URL, verifies local assets load from the repository subpath, and checks for console errors.

## Deployment

- Create a public GitHub repository named `puppy-puzzle-adventure` in the user’s authenticated GitHub account.
- Add a GitHub Actions Pages workflow that runs the Node tests and deploys the repository root as a static artifact from `main`.
- Enable GitHub Pages with GitHub Actions as the source, wait for the first deployment, and return the final HTTPS Pages URL.
- Keep the original dirty checkout and the separate “彩虹汉字岛” work untouched; all puzzle work happens on `codex/bluey-puzzle-plus` in the managed worktree.

## Builder Calls

- The repository name and public visibility are implementation defaults chosen for a simple shareable URL; change them only if GitHub reports a naming conflict.
- Best scores are local to a device and difficulty, not to a specific uploaded image.
- Difficulty changes start immediately rather than requiring a second confirmation.
- The drag preview remains the real tile in place with visual lift; no floating cloned thumbnail is required.
- GitHub deployment may require the user to approve GitHub authorization or Pages settings if the connected account does not grant those permissions.
