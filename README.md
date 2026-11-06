# Puppy Puzzle Adventure

A dependency-free browser puzzle game with 5×5, 7×7, and 9×9 difficulties. Restore the original puppy illustration—or a picture from your own device—by swapping pieces.

## Run locally

From this project directory, start the static server:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a modern browser.

## Play

Choose a difficulty, select one puzzle piece, then select a different piece to swap the two. Selecting the same piece a second time cancels the selection and does not add a move. The move counter and timer begin when you start, restart, or change difficulty.

Select **Upload image** to choose a picture from your device. The image stays in your browser, is not uploaded anywhere, and starts a fresh puzzle while preserving the full image ratio. Refreshing the page restores the default image.

## Test

Run the dependency-free Node test suite with:

```bash
npm test
```

## Puzzle artwork

The default artwork is an original generated cartoon illustration stored at `assets/puppy-puzzle.png`. It contains generic puppy characters and no third-party branding, text, or logos.

## Privacy

Pictures selected with **Upload image** stay on your device. They are read locally by the browser, are never sent to a server, and disappear when the page is refreshed.
