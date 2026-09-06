import { createGame, selectTile } from './puzzle.js';

const PUZZLE_SIZE = 5;
const IMAGE_URL = './assets/bluey-puzzle.png';

export function formatElapsed(milliseconds) {
  const elapsedSeconds = Math.floor(milliseconds / 1_000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

if (typeof document !== 'undefined') {
  const puzzle = document.querySelector('#puzzle');
  const startButton = document.querySelector('#start-button');
  const restartButton = document.querySelector('#restart-button');
  const moves = document.querySelector('#moves');
  const timer = document.querySelector('#timer');
  const previewImage = document.querySelector('#preview-image');
  const imageError = document.querySelector('#image-error');
  const completionDialog = document.querySelector('#completion-dialog');
  const finalMoves = document.querySelector('#final-moves');
  const finalTime = document.querySelector('#final-time');
  const liveStatus = document.querySelector('#live-status');

  let game = null;
  let startedAt = 0;
  let timerInterval = null;

  previewImage.src = IMAGE_URL;
  previewImage.addEventListener('error', () => {
    imageError.hidden = false;
  });

  function announce(message) {
    liveStatus.textContent = message;
  }

  function updateTimer() {
    timer.textContent = formatElapsed(performance.now() - startedAt);
  }

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function renderBoard() {
    puzzle.replaceChildren();

    if (!game) {
      return;
    }

    for (const [index, tile] of game.tiles.entries()) {
      const button = document.createElement('button');
      const column = tile % PUZZLE_SIZE;
      const row = Math.floor(tile / PUZZLE_SIZE);

      button.type = 'button';
      button.className = 'puzzle-piece';
      button.dataset.index = String(index);
      button.style.backgroundImage = `url("${IMAGE_URL}")`;
      button.style.backgroundSize = `${PUZZLE_SIZE * 100}% ${PUZZLE_SIZE * 100}%`;
      button.style.backgroundPosition = `${column * 25}% ${row * 25}%`;
      button.setAttribute('aria-label', `Piece ${tile + 1}, position ${index + 1} of ${PUZZLE_SIZE * PUZZLE_SIZE}`);
      button.setAttribute('aria-pressed', String(game.selectedIndex === index));

      if (game.selectedIndex === index) {
        button.classList.add('is-selected');
      }

      if (game.status === 'completed') {
        button.disabled = true;
      }

      button.addEventListener('click', () => selectPiece(index));
      puzzle.append(button);
    }
  }

  function completeGame() {
    stopTimer();
    updateTimer();
    finalMoves.textContent = String(game.moves);
    finalTime.textContent = timer.textContent;
    announce(`Puzzle complete in ${game.moves} moves and ${timer.textContent}.`);
    renderBoard();
    completionDialog.showModal();
  }

  function selectPiece(index) {
    const previousSelection = game.selectedIndex;
    game = selectTile(game, index);
    moves.textContent = String(game.moves);
    renderBoard();

    if (game.status === 'completed') {
      completeGame();
      return;
    }

    if (game.selectedIndex === null && previousSelection !== null) {
      announce(`Pieces swapped. ${game.moves} moves.`);
    } else if (game.selectedIndex === index) {
      announce(`Piece ${index + 1} selected. Choose another piece to swap.`);
    } else {
      announce('Piece selection cleared.');
    }
  }

  function startGame() {
    stopTimer();
    game = createGame(PUZZLE_SIZE);
    startedAt = performance.now();
    moves.textContent = '0';
    updateTimer();
    timerInterval = setInterval(updateTimer, 1_000);
    restartButton.disabled = false;
    renderBoard();
    announce('New puzzle started. Select two pieces to swap them.');
  }

  restartButton.disabled = true;
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
}
