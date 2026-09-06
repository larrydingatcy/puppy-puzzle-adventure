import { createGame, selectTile } from './puzzle.js';

const PUZZLE_SIZE = 5;
const DEFAULT_IMAGE_URL = './assets/bluey-puzzle.png';

export function isUsableImageFile(file) {
  return Boolean(file && file.size > 0 && /^image\//i.test(file.type));
}

export function imageAspectRatio(width, height) {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? width / height
    : 16 / 9;
}

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
  const uploadButton = document.querySelector('#upload-button');
  const imageUpload = document.querySelector('#image-upload');
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
  let currentImageUrl = DEFAULT_IMAGE_URL;
  let uploadedImageUrl = null;

  previewImage.src = currentImageUrl;
  previewImage.addEventListener('error', () => {
    imageError.textContent = 'We could not load that image. Please choose another image and try again.';
    imageError.hidden = false;
  });

  function applyImageDimensions(width, height) {
    const ratio = String(imageAspectRatio(width, height));
    previewImage.style.aspectRatio = ratio;
    puzzle.style.aspectRatio = ratio;
  }

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
    if (!game) {
      puzzle.replaceChildren();
      return;
    }

    const requiresNewBoard = puzzle.children.length !== game.tiles.length;

    if (requiresNewBoard) {
      puzzle.replaceChildren();
    }

    for (const [index, tile] of game.tiles.entries()) {
      let button = puzzle.children[index];
      const column = tile % PUZZLE_SIZE;
      const row = Math.floor(tile / PUZZLE_SIZE);

      if (requiresNewBoard) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'puzzle-piece';
        button.dataset.index = String(index);
        button.style.backgroundSize = `${PUZZLE_SIZE * 100}% ${PUZZLE_SIZE * 100}%`;
        button.addEventListener('click', () => selectPiece(index));
        puzzle.append(button);
      }

      button.style.backgroundImage = `url("${currentImageUrl}")`;
      button.style.backgroundPosition = `${column * 25}% ${row * 25}%`;
      button.setAttribute('aria-label', `Piece ${tile + 1}, position ${index + 1} of ${PUZZLE_SIZE * PUZZLE_SIZE}`);
      button.setAttribute('aria-pressed', String(game.selectedIndex === index));
      button.classList.toggle('is-selected', game.selectedIndex === index);
      button.disabled = game.status === 'completed';
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

    if (previousSelection === null) {
      announce(`Position ${index + 1} selected. Choose another piece to swap.`);
    } else if (previousSelection === index) {
      announce('Selection cleared.');
    } else {
      announce(`Pieces swapped. ${game.moves} moves.`);
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

  function loadUploadedImage(file) {
    if (!isUsableImageFile(file)) {
      imageError.textContent = 'Please choose a non-empty image file.';
      imageError.hidden = false;
      announce('The selected file is not a usable image.');
      return;
    }

    const candidateUrl = URL.createObjectURL(file);
    const candidate = new Image();

    candidate.addEventListener('load', () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }

      uploadedImageUrl = candidateUrl;
      currentImageUrl = candidateUrl;
      previewImage.src = currentImageUrl;
      imageError.hidden = true;
      applyImageDimensions(candidate.naturalWidth, candidate.naturalHeight);
      startGame();
      announce('New image loaded. The puzzle has started.');
    }, { once: true });

    candidate.addEventListener('error', () => {
      URL.revokeObjectURL(candidateUrl);
      imageError.textContent = 'We could not read that image. Please choose another image.';
      imageError.hidden = false;
      announce('The selected image could not be read.');
    }, { once: true });

    candidate.src = candidateUrl;
  }

  restartButton.disabled = true;
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  uploadButton.addEventListener('click', () => imageUpload.click());
  imageUpload.addEventListener('change', () => {
    const [file] = imageUpload.files;
    imageUpload.value = '';
    if (file) {
      loadUploadedImage(file);
    }
  });
  window.addEventListener('beforeunload', () => {
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }
  });
}
