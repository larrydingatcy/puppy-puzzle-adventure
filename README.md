# Bluey 5×5 Puzzle Demo

A small, dependency-free browser puzzle demo. Restore the picture by swapping pieces in a fixed 5×5 grid.

## Run locally

From this project directory, start the static server:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a modern browser.

## Play

Select one puzzle piece, then select a different piece to swap the two. Selecting the same piece a second time cancels the selection and does not add a move. The board has 25 pieces arranged in a 5×5 difficulty grid; the move counter and timer begin when you start or restart a game.

## Test

Run the dependency-free Node test suite with:

```bash
npm test
```

## Puzzle image

The temporary local image is at `assets/bluey-puzzle.png`. To replace it with an image you are authorized to use, replace that file while keeping the same path (or update the centralized `IMAGE_URL` value in `src/app.js`). The current temporary image was sourced from the [official Bluey wallpapers page](https://www.bluey.tv/wallpapers/).

## Rights and use

This project is a non-commercial demo only. Bluey and related characters are the copyright and trademarks of Ludo Studio, BBC Studios, and other respective rights holders. Do not publish, distribute commercially, or otherwise use the included image without the appropriate permission; obtain authorization or replace it with properly licensed artwork before any formal release.
