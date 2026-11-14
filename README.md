# Puppy Puzzle Adventure

A dependency-free browser puzzle game with 5×5, 7×7, and 9×9 difficulties. Restore the original puppy illustration—or a picture from your own device—by swapping pieces.

## Run locally

From this project directory, start the static server:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a modern browser.

## Play

Choose the 5×5, 7×7, or 9×9 difficulty. Drag one piece onto another to swap them, or select two pieces with a click, tap, or keyboard. Selecting the same piece a second time cancels the selection and does not add a move. The move counter and timer begin when you start, restart, or change difficulty.

Your best move count and best time are stored separately for each difficulty in this browser. No account or network request is used. If browser storage is unavailable, the puzzle still works and explains that the result could not be saved after completion.

Select **Upload image** to choose a picture from your device. The image stays in your browser, is not uploaded anywhere, and starts a fresh puzzle while preserving the full image ratio. Refreshing the page restores the default image.

## Test

Run the dependency-free Node test suite with:

```bash
npm test
```

## Publish with GitHub Pages

The included GitHub Actions workflow runs the Node test suite and publishes the repository root whenever `main` is updated. It can also be started manually from the repository's **Actions** tab. In **Settings → Pages**, keep the source set to **GitHub Actions**.

## Puzzle artwork

The default artwork is an original generated cartoon illustration stored at `assets/puppy-puzzle.png`. It contains generic puppy characters and no third-party branding, text, or logos.

## Privacy

Pictures selected with **Upload image** stay on your device. They are read locally by the browser, are never sent to a server, and disappear when the page is refreshed.

## iPad and touch devices

Open the published link in Safari and play directly—there is nothing to install or sign in to. Dragging is limited to the puzzle board so the rest of the page still scrolls normally. Portrait and landscape layouts support all 81 pieces without horizontal page scrolling.
